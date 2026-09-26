import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateVoiceAudio, MediaValidationError } from "@/lib/ai/media-validator";
import { enforceAIRateLimit } from "@/lib/ai/rate-limiter";
import { getVoiceTranscriber, getFoodParser } from "@/lib/ai/provider-factory";
import { matchCandidateToDatabase } from "@/lib/ai/food-matcher";
import { getUserRecipes } from "@/lib/recipes/recipe-service";
import type { Recipe } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to transcribe voice food logs." },
        { status: 401 }
      );
    }

    let transcript = "";
    const contentType = request.headers.get("content-type") || "";

    // 1. Process either audio binary or raw transcript text
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audioFile = formData.get("audio");

      if (!audioFile || !(audioFile instanceof Blob)) {
        return NextResponse.json(
          { error: "Please upload an audio recording." },
          { status: 400 }
        );
      }

      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const declaredMime = audioFile.type || "audio/webm";

      // Validate Audio (MIME, size <= 10MB)
      const { mimeType } = validateVoiceAudio(audioBuffer, declaredMime);

      // Enforce Rate Limit for voice transcription
      await enforceAIRateLimit(user.id, "voice_transcription", supabase);

      // Transcribe via speech-to-text provider
      const transcriber = getVoiceTranscriber();
      const transcriptionResult = await transcriber.transcribeAudio(audioBuffer, mimeType);
      transcript = transcriptionResult.transcript;
    } else {
      // JSON body with typed or browser-transcribed text
      const body = await request.json();
      transcript = body.text || "";

      if (!transcript.trim()) {
        return NextResponse.json(
          { error: "Please provide food voice or text input." },
          { status: 400 }
        );
      }

      // Enforce Rate Limit for food parsing
      await enforceAIRateLimit(user.id, "food_parsing", supabase);
    }

    // 2. Fetch User Recipes for recipe suggestions
    let userRecipes: Recipe[] = [];
    try {
      userRecipes = await getUserRecipes(user.id, supabase);
    } catch {
      // Continue if recipes fail
    }

    // 3. Parse Natural Language into Food Entities
    const parser = getFoodParser();
    const parseResult = await parser.parseFoodText(transcript);

    // 4. Map Parsed Items to Verified Food Database
    const drafts = parseResult.entries.map((entry) => {
      return matchCandidateToDatabase({
        candidateName: entry.foodName,
        quantity: entry.quantity,
        unit: entry.unit,
        confidence: entry.isAmbiguous ? "low" : "high",
        assumptions: entry.ambiguities || [],
        source: "voice",
        userRecipes,
      });
    });

    return NextResponse.json({
      success: true,
      transcript,
      drafts,
      unparsedSegments: parseResult.unparsedSegments,
      message:
        drafts.length > 0
          ? "Items parsed successfully. Please review and confirm before adding to meal."
          : "Could not detect food items. Please type or re-record.",
    });
  } catch (err: unknown) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }

    const message = (err as Error).message || "An error occurred during voice transcription.";
    if (message.includes("Hourly limit reached")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateMealPhoto, MediaValidationError } from "@/lib/ai/media-validator";
import { enforceAIRateLimit } from "@/lib/ai/rate-limiter";
import { getVisionAnalyzer } from "@/lib/ai/provider-factory";
import { matchCandidateToDatabase } from "@/lib/ai/food-matcher";
import { getUserRecipes } from "@/lib/recipes/recipe-service";
import type { VisionAnalysisResponse } from "@/lib/ai/schemas";
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
        { error: "Unauthorized. Please log in to analyze meal photos." },
        { status: 401 }
      );
    }

    // 1. Parse Multipart Form Data
    const formData = await request.formData();
    const photoFile = formData.get("photo");

    if (!photoFile || !(photoFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Please upload a meal photo." },
        { status: 400 }
      );
    }

    const arrayBuffer = await photoFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const declaredMime = photoFile.type || "image/jpeg";

    // 2. Validate Image (Magic bytes, MIME, size <= 5MB)
    const { mimeType } = validateMealPhoto(imageBuffer, declaredMime);

    // 3. Enforce User Rate Limits
    await enforceAIRateLimit(user.id, "photo_analysis", supabase);

    // 4. Fetch User's Saved Recipes for recipe recognition
    let userRecipes: Recipe[] = [];
    try {
      userRecipes = await getUserRecipes(user.id, supabase);
    } catch {
      // Continue even if recipes fail to load
    }

    // 5. Call AI Vision Analyzer (transient processing, no persistent image storage)
    const visionAnalyzer = getVisionAnalyzer();
    const visionResult = await visionAnalyzer.analyzeMealPhoto(imageBuffer, mimeType);

    const rawResponse = visionResult.rawResponse as VisionAnalysisResponse | undefined;

    // 6. Map Detected Food Candidates to NammaCal Database and Recipes
    const drafts = visionResult.detectedItems.map((item, idx) => {
      const rawCandidate = rawResponse?.items?.[idx];
      const searchTerms = rawCandidate?.search_terms || [item.rawFoodName];
      const confidence =
        rawCandidate?.confidence ||
        (item.confidenceScore >= 0.85 ? "high" : item.confidenceScore >= 0.6 ? "medium" : "low");

      return matchCandidateToDatabase({
        candidateName: item.rawFoodName,
        searchTerms,
        quantity: item.estimatedQuantity || 100,
        unit: item.unit || "g",
        confidence,
        assumptions: item.visualAssumptions ? [item.visualAssumptions] : [],
        source: "photo",
        userRecipes,
      });
    });

    return NextResponse.json({
      success: true,
      drafts,
      overallAssumptions: rawResponse?.overall_assumptions || [
        "Oil and hidden ingredients cannot be reliably measured from a photo.",
      ],
      suggestedRecipes: rawResponse?.suggested_recipes || [],
      disclaimer:
        visionResult.disclaimer ||
        "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving.",
    });
  } catch (err: unknown) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }

    const message = (err as Error).message || "An error occurred during food photo analysis.";
    if (message.includes("Hourly limit reached")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

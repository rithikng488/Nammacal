import type { IVisionFoodAnalyzer, IVoiceTranscriber } from "../interfaces";
import type { VisionAnalysisResult, VoiceTranscriptionResult } from "../types";
import {
  VisionAnalysisResponseSchema,
  VoiceTranscriptionResponseSchema,
  type VisionAnalysisResponse,
} from "../schemas";

/**
 * Modern Google Gemini Provider for NammaCal.
 * Uses official Gemini 2.5 Flash model for fast multimodal analysis and transcription.
 * Strictly adheres to server-side only execution and structured JSON output.
 */
export class GeminiFoodAnalyzer implements IVisionFoodAnalyzer {
  public readonly providerName = "Google Gemini";
  public readonly modelId: string;

  constructor(modelId?: string) {
    this.modelId = modelId || process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
  }

  /**
   * Analyzes an uploaded food photo using Gemini Vision.
   */
  public async analyzeMealPhoto(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<VisionAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Offline / Mock fallback when API key is missing (e.g. during local tests)
    if (!apiKey || apiKey === "your-gemini-api-key-here" || apiKey.startsWith("mock-")) {
      return this.mockPhotoAnalysis(imageBuffer);
    }

    const base64Data = imageBuffer.toString("base64");

    const systemPrompt = `You are NammaCal's South Indian & Tamil nutrition assistant.
Analyze this meal photo to identify food dishes, Tamil foods, and portion estimates.
MANDATORY CONSTRAINTS:
1. Do NOT calculate or guess calories, protein, carbs, or fats. Our deterministic nutrition engine handles all calculations from verified databases.
2. Identify food names, Tamil dish names, and realistic South Indian portions (e.g. in grams, katoris, cups, or pieces).
3. Rate confidence strictly as "high", "medium", or "low".
4. State assumptions clearly (e.g. "Portion estimated from stainless steel bowl", "Hidden oil cannot be verified visually").
5. Output ONLY valid JSON matching this schema:
{
  "items": [
    {
      "candidate": "string",
      "search_terms": ["string", "string"],
      "estimated_quantity": number,
      "estimated_unit": "g" | "katori" | "cup" | "piece" | "tbsp",
      "confidence": "high" | "medium" | "low",
      "assumptions": ["string"]
    }
  ],
  "overall_assumptions": ["string"],
  "suggested_recipes": ["string"],
  "disclaimer": "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving."
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText.substring(0, 150)}`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response received from Gemini Vision model.");
      }

      // Parse and validate via Zod schema
      const parsedJson = JSON.parse(rawText);
      const validated: VisionAnalysisResponse = VisionAnalysisResponseSchema.parse(parsedJson);

      return {
        detectedItems: validated.items.map((it) => ({
          rawFoodName: it.candidate,
          estimatedQuantity: it.estimated_quantity,
          unit: it.estimated_unit,
          confidenceScore: it.confidence === "high" ? 0.9 : it.confidence === "medium" ? 0.7 : 0.4,
          visualAssumptions: it.assumptions.join(". ") || "Estimated visually",
        })),
        overallConfidence: validated.items.some((i) => i.confidence === "low") ? 0.6 : 0.85,
        disclaimer: validated.disclaimer,
        rawResponse: validated,
      };
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        throw new Error("AI Vision request timed out. Please try again with a smaller image.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Deterministic mock response for offline testing.
   */
  private mockPhotoAnalysis(imageBuffer: Buffer): VisionAnalysisResult {
    // Basic inspection to return realistic South Indian dish candidates
    return {
      detectedItems: [
        {
          rawFoodName: "Cooked Ponni Rice",
          estimatedQuantity: 200,
          unit: "g",
          confidenceScore: 0.9,
          visualAssumptions: "Portion estimated from standard stainless steel bowl",
        },
        {
          rawFoodName: "Sambar",
          estimatedQuantity: 150,
          unit: "g",
          confidenceScore: 0.75,
          visualAssumptions: "Medium katori serving of South Indian vegetable sambar",
        },
      ],
      overallConfidence: 0.85,
      disclaimer:
        "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving.",
      rawResponse: {
        items: [
          {
            candidate: "Cooked Ponni Rice",
            search_terms: ["satham", "cooked rice", "ponni boiled rice"],
            estimated_quantity: 200,
            estimated_unit: "g",
            confidence: "high",
            assumptions: ["Portion estimated from standard stainless steel bowl"],
          },
          {
            candidate: "Sambar",
            search_terms: ["sambar", "paruppu sambar"],
            estimated_quantity: 150,
            estimated_unit: "g",
            confidence: "medium",
            assumptions: ["Medium katori serving of South Indian vegetable sambar"],
          },
        ],
        overall_assumptions: ["Oil quantity cannot be reliably determined from image"],
        suggested_recipes: [],
        disclaimer:
          "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving.",
      },
    };
  }
}

/**
 * Gemini Voice Transcriber implementing IVoiceTranscriber.
 * Transcribes audio recordings in English, Tamil, and Tanglish.
 */
export class GeminiVoiceTranscriber implements IVoiceTranscriber {
  public readonly providerName = "Google Gemini Audio";
  public readonly modelId: string;

  constructor(modelId?: string) {
    this.modelId = modelId || process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
  }

  /**
   * Transcribes raw audio buffer into text.
   */
  public async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<VoiceTranscriptionResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your-gemini-api-key-here" || apiKey.startsWith("mock-")) {
      return this.mockAudioTranscription();
    }

    const base64Data = audioBuffer.toString("base64");

    const systemPrompt = `You are a speech-to-text transcriber for a South Indian nutrition tracking app.
Transcribe this audio recording accurately.
It may be spoken in English, Tamil, or Tanglish (Tamil-English mixed, e.g. "200 gram soru and oru cup sambar").
Preserve food names, numbers, and units verbatim.
Output ONLY valid JSON matching this schema:
{
  "transcript": "string",
  "detected_language": "en" | "ta" | "tanglish" | "mixed",
  "confidence": "high" | "medium" | "low"
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.0,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini Audio error (${response.status}): ${errText.substring(0, 150)}`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty audio transcription received from Gemini.");
      }

      const parsed = JSON.parse(rawText);
      const validated = VoiceTranscriptionResponseSchema.parse(parsed);

      return {
        transcript: validated.transcript,
        confidence: validated.confidence === "high" ? 0.95 : 0.75,
        detectedLanguage: validated.detected_language,
      };
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        throw new Error("Speech transcription timed out. Please try a shorter recording.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mockAudioTranscription(): VoiceTranscriptionResult {
    return {
      transcript: "200 grams cooked rice and 150 grams sambar for lunch",
      confidence: 0.95,
      detectedLanguage: "tanglish",
    };
  }
}

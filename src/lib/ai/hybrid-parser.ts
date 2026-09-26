import type { IFoodParser } from "./interfaces";
import type { FoodParseResult, ParsedFoodEntry } from "./types";
import { DeterministicFoodParser } from "./deterministic-parser";
import { FoodParseResponseSchema } from "./schemas";

/**
 * Hybrid Food Parser implementing IFoodParser.
 * Tries local high-speed deterministic regex/dictionary parsing first.
 * If conversational or unstructured phrases remain, falls back to Gemini LLM with strict JSON schema.
 */
export class HybridFoodParser implements IFoodParser {
  public readonly parserName = "HybridFoodParser (Deterministic + Gemini LLM)";
  private deterministicParser = new DeterministicFoodParser();

  public async parseFoodText(rawText: string): Promise<FoodParseResult> {
    const text = rawText.trim();
    if (!text) {
      return { entries: [], unparsedSegments: [] };
    }

    // 1. Try deterministic parser first
    const detResult = await this.deterministicParser.parseFoodText(text);

    // If deterministic parser parsed all clauses successfully, return immediately (zero cost, zero latency)
    if (detResult.entries.length > 0 && detResult.unparsedSegments.length === 0) {
      return detResult;
    }

    // 2. If unparsed segments or no entries and Gemini API key is configured, use LLM
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your-gemini-api-key-here" && !apiKey.startsWith("mock-")) {
      try {
        const llmResult = await this.parseWithGemini(text);
        if (llmResult.entries.length > 0) {
          return llmResult;
        }
      } catch {
        // Fall back gracefully to deterministic result on any LLM error
      }
    }

    return detResult;
  }

  private async parseWithGemini(text: string): Promise<FoodParseResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelId = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

    const systemPrompt = `You are a food and quantity parser for a South Indian nutrition tracking app.
Convert the user's spoken or typed meal text (which may be in English, Tamil, or Tanglish) into structured food items.
Do NOT calculate calories or macronutrients.
Extract:
- food_name: Clean food name (e.g. "cooked rice", "sambar", "idli")
- quantity: Positive number
- unit: Standard portion unit (e.g. "g", "cup", "katori", "piece", "tbsp")
- cooking_state: "cooked" | "raw" | "packaged"
- is_ambiguous: boolean
- ambiguity_reason: string if ambiguous

Output ONLY valid JSON matching this schema:
{
  "items": [
    {
      "food_name": "string",
      "quantity": number,
      "unit": "string",
      "cooking_state": "cooked" | "raw" | "packaged",
      "is_ambiguous": false,
      "assumptions": ["string"]
    }
  ],
  "unparsed_segments": ["string"]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser input: "${text}"` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`LLM parse error: ${response.status}`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty LLM parse response");

      const parsed = JSON.parse(rawText);
      const validated = FoodParseResponseSchema.parse(parsed);

      const entries: ParsedFoodEntry[] = validated.items.map((it) => ({
        foodName: it.food_name,
        quantity: it.quantity,
        unit: it.unit,
        isAmbiguous: it.is_ambiguous,
        ambiguities: it.ambiguity_reason ? [it.ambiguity_reason] : undefined,
      }));

      return {
        entries,
        unparsedSegments: validated.unparsed_segments,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

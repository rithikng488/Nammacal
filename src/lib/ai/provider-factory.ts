import type { IVisionFoodAnalyzer, IVoiceTranscriber, IFoodParser } from "./interfaces";
import { GeminiFoodAnalyzer, GeminiVoiceTranscriber } from "./providers/gemini-provider";
import { HybridFoodParser } from "./hybrid-parser";
import { DeterministicFoodParser } from "./deterministic-parser";

/**
 * Returns the configured vision food analyzer.
 */
export function getVisionAnalyzer(): IVisionFoodAnalyzer {
  const provider = process.env.AI_PROVIDER || "gemini";

  if (provider === "gemini") {
    return new GeminiFoodAnalyzer();
  }

  // Default to Gemini analyzer
  return new GeminiFoodAnalyzer();
}

/**
 * Returns the configured voice transcriber.
 */
export function getVoiceTranscriber(): IVoiceTranscriber {
  const provider = process.env.AI_PROVIDER || "gemini";

  if (provider === "gemini") {
    return new GeminiVoiceTranscriber();
  }

  return new GeminiVoiceTranscriber();
}

/**
 * Returns the configured food text parser.
 */
export function getFoodParser(preferDeterministicOnly: boolean = false): IFoodParser {
  if (preferDeterministicOnly) {
    return new DeterministicFoodParser();
  }
  return new HybridFoodParser();
}

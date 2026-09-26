export interface FoodItemCandidate {
  rawFoodName: string;
  matchedFoodId?: string;
  estimatedQuantity: number;
  unit: string;
  confidenceScore: number; // 0.0 to 1.0 (never claims 100% certainty)
  visualAssumptions: string; // Plain-English assumption (e.g. "Portion estimated from standard stainless steel bowl")
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
}

export interface VisionAnalysisResult {
  detectedItems: FoodItemCandidate[];
  overallConfidence: number;
  disclaimer: string;
  rawResponse?: unknown;
}

export interface VoiceTranscriptionResult {
  transcript: string;
  confidence?: number;
  detectedLanguage?: string; // 'en', 'ta', 'tanglish'
}

export interface ParsedFoodEntry {
  foodName: string;
  quantity: number;
  unit: string;
  matchedFoodId?: string;
  ambiguities?: string[]; // e.g. "Rice specified without cooking state. Defaulted to Cooked Rice (soru)."
  isAmbiguous: boolean;
}

export interface FoodParseResult {
  entries: ParsedFoodEntry[];
  unparsedSegments: string[];
}

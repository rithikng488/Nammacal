import type { Food, FoodState, Recipe, DataProvenance } from "../supabase/types";
import type { CalculatedNutrition } from "../nutrition/calc-engine";

export type DraftSource = "manual" | "photo" | "voice";
export type AICategoryConfidence = "high" | "medium" | "low";

export interface SuggestedAlternative {
  id: string;
  name: string;
  type: "food" | "recipe";
  state?: FoodState;
  score?: number;
  confidenceNote?: string;
}

/**
 * Standardized draft model for unconfirmed food candidates.
 * AI items stay in draft state until explicitly reviewed, edited, and approved by the user.
 */
export interface FoodInputDraft {
  id: string;
  source: DraftSource;
  candidateName: string;
  matchedFoodId: string | null;
  matchedRecipeId: string | null;
  matchedFood: Food | null;
  matchedRecipe: Recipe | null;
  quantity: number;
  unit: string;
  cookingState: FoodState;
  confidence: AICategoryConfidence;
  assumptions: string[];
  isAmbiguous: boolean;
  ambiguityReason?: string;
  suggestedAlternatives: SuggestedAlternative[];
  nutritionPreview: CalculatedNutrition | null;
  provenance: DataProvenance;
  needsConfirmation: true;
}

/**
 * Creates an empty or default draft item.
 */
export function createEmptyDraft(source: DraftSource = "manual"): FoodInputDraft {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    source,
    candidateName: "",
    matchedFoodId: null,
    matchedRecipeId: null,
    matchedFood: null,
    matchedRecipe: null,
    quantity: 100,
    unit: "g",
    cookingState: "cooked",
    confidence: "medium",
    assumptions: [],
    isAmbiguous: true,
    suggestedAlternatives: [],
    nutritionPreview: null,
    provenance: source === "photo" ? "ai_photo_estimate" : source === "voice" ? "ai_voice_parse" : "user_entered",
    needsConfirmation: true,
  };
}

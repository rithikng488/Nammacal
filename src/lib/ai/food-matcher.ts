import { searchFoods, computeSimilarity } from "../nutrition/food-service";
import { calculateNutrition, type CalculatedNutrition } from "../nutrition/calc-engine";
import { calculateRecipeServingNutrition } from "../nutrition/recipe-engine";
import { SEED_FOODS } from "../nutrition/food-dataset";
import type { Food, FoodState, Recipe, DataProvenance } from "../supabase/types";
import type { FoodInputDraft, SuggestedAlternative, AICategoryConfidence } from "./draft-model";

export interface CandidateMatchingInput {
  candidateName: string;
  searchTerms?: string[];
  quantity: number;
  unit: string;
  cookingState?: FoodState;
  confidence?: AICategoryConfidence;
  assumptions?: string[];
  ambiguityNote?: string;
  source: "photo" | "voice";
  userRecipes?: Recipe[];
  customFoods?: Food[];
}

/**
 * Normalizes input unit strings into recognizable database units.
 */
export function normalizeUnit(unit: string, food?: Food): string {
  const u = unit.toLowerCase().trim();

  if (["g", "gm", "gram", "grams"].includes(u)) return "g";
  if (["kg", "kilogram", "kilograms"].includes(u)) return "g"; // will scale quantity
  if (["ml", "milliliter", "milliliters"].includes(u)) return "ml";
  if (["cup", "cups"].includes(u)) return "cup";
  if (["katori", "bowl", "kinnam"].includes(u)) return "katori";
  if (["tbsp", "tablespoon", "tablespoons", "spoon", "spoons"].includes(u)) return "tbsp";
  if (["tsp", "teaspoon", "teaspoons"].includes(u)) return "tsp";
  if (["plate", "plates", "thattu"].includes(u)) return "plate";
  if (["ladle", "ladles", "karandi"].includes(u)) return "ladle";
  if (["tumbler", "glass"].includes(u)) return "tumbler";
  if (["piece", "pieces", "nos", "item", "items"].includes(u)) return "piece";

  // If the food has this exact unit in its standard portions, keep it
  if (food?.standard_portions?.some((p) => p.unit.toLowerCase() === u)) {
    return u;
  }

  // Common food-specific default units
  if (["idli", "idlis"].includes(u)) return "piece";
  if (["dosa", "dosai"].includes(u)) return "piece";
  if (["egg", "eggs", "muttai"].includes(u)) return "piece";
  if (["chapati", "chapatis", "roti"].includes(u)) return "piece";
  if (["vada", "vadai"].includes(u)) return "piece";

  return u || "g";
}

/**
 * Authoritative Food Matcher & Nutrition Linker.
 * Maps detected candidates from Vision or Voice to verified NammaCal foods and recipes.
 * STRICT INVARIANT: AI does NOT generate calories or macros; all nutrition is deterministically calculated.
 */
export function matchCandidateToDatabase(
  input: CandidateMatchingInput
): FoodInputDraft {
  const {
    candidateName,
    searchTerms = [],
    quantity,
    unit,
    cookingState = "cooked",
    confidence = "medium",
    assumptions = [],
    ambiguityNote,
    source,
    userRecipes = [],
    customFoods = [],
  } = input;

  const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const provenance: DataProvenance =
    source === "photo" ? "ai_photo_estimate" : "ai_voice_parse";

  const allQueries = [candidateName, ...searchTerms].filter(Boolean);

  // 1. Check for matching user-saved recipes
  let matchedRecipe: Recipe | null = null;
  const suggestedAlternatives: SuggestedAlternative[] = [];

  for (const recipe of userRecipes) {
    const sim = Math.max(
      ...allQueries.map((q) => computeSimilarity(q, recipe.name))
    );
    if (sim >= 0.7) {
      suggestedAlternatives.push({
        id: recipe.id,
        name: recipe.name,
        type: "recipe",
        score: sim,
        confidenceNote: `Matches your saved recipe: "${recipe.name}"`,
      });
    }
  }

  // 2. Search verified foods and custom foods
  let bestFoodMatch: Food | null = null;
  let highestScore = 0;

  for (const query of allQueries) {
    const searchResults = searchFoods(
      { query, state: cookingState, limit: 5 },
      customFoods
    );

    // If no results for requested state, try any state
    const fallbackResults =
      searchResults.length === 0
        ? searchFoods({ query, state: "all", limit: 5 }, customFoods)
        : searchResults;

    for (const res of fallbackResults) {
      const sim = Math.max(
        res.score,
        computeSimilarity(candidateName, res.food.name_en),
        res.food.name_tanglish ? computeSimilarity(candidateName, res.food.name_tanglish) : 0
      );

      // Add to suggestions if not already present
      if (!suggestedAlternatives.some((a) => a.id === res.food.id)) {
        suggestedAlternatives.push({
          id: res.food.id,
          name: res.food.name_en,
          type: "food",
          state: res.food.state,
          score: sim,
          confidenceNote: `${res.food.state === "cooked" ? "Cooked" : "Raw"} food record`,
        });
      }

      if (sim > highestScore) {
        highestScore = sim;
        bestFoodMatch = res.food;
      }
    }
  }

  // Sort alternatives by relevance score descending
  suggestedAlternatives.sort((a, b) => (b.score || 0) - (a.score || 0));

  // If no alternatives found for query, provide common staple suggestions
  if (suggestedAlternatives.length === 0) {
    SEED_FOODS.slice(0, 4).forEach((seed) => {
      suggestedAlternatives.push({
        id: seed.id,
        name: seed.name_en,
        type: "food",
        state: seed.state,
        score: 0.1,
        confidenceNote: "Staple South Indian food suggestion",
      });
    });
  }

  // Determine if match is confident
  const isConfidentMatch = bestFoodMatch !== null && highestScore >= 0.65;
  const isAmbiguous = !isConfidentMatch || confidence === "low";

  let ambiguityReason = ambiguityNote;
  if (!isConfidentMatch) {
    ambiguityReason =
      bestFoodMatch === null
        ? `No direct match found for "${candidateName}". Please select from suggestions or search the food database.`
        : `Possible match "${bestFoodMatch.name_en}" has low certainty (${Math.round(highestScore * 100)}%). Review before saving.`;
  }

  // 3. Compute deterministic nutrition preview
  let nutritionPreview: CalculatedNutrition | null = null;
  const normalizedUnitStr = normalizeUnit(unit, bestFoodMatch || undefined);
  let finalQty = quantity;

  // If unit was kg, convert to g
  if (unit.toLowerCase().trim() === "kg" || unit.toLowerCase().trim() === "kilogram") {
    finalQty = quantity * 1000;
  }

  if (bestFoodMatch) {
    try {
      nutritionPreview = calculateNutrition({
        food: bestFoodMatch,
        quantity: finalQty,
        unit: normalizedUnitStr,
      });
    } catch {
      // Fallback if portion unit conversion failed, try grams
      try {
        nutritionPreview = calculateNutrition({
          food: bestFoodMatch,
          quantity: finalQty,
          unit: "g",
        });
      } catch {
        nutritionPreview = null;
      }
    }
  }

  return {
    id: draftId,
    source,
    candidateName,
    matchedFoodId: bestFoodMatch ? bestFoodMatch.id : null,
    matchedRecipeId: matchedRecipe ? (matchedRecipe as Recipe).id : null,
    matchedFood: bestFoodMatch,
    matchedRecipe,
    quantity: finalQty,
    unit: normalizedUnitStr,
    cookingState: bestFoodMatch ? bestFoodMatch.state : cookingState,
    confidence: isConfidentMatch ? confidence : "low",
    assumptions,
    isAmbiguous,
    ambiguityReason,
    suggestedAlternatives: suggestedAlternatives.slice(0, 6),
    nutritionPreview,
    provenance,
    needsConfirmation: true,
  };
}

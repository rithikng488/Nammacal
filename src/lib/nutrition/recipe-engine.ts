import { calculateNutrition, type CalculatedNutrition } from "./calc-engine";
import type { Food, FoodState, DataProvenance, Recipe, RecipeIngredient } from "../supabase/types";

export interface RecipeIngredientInput {
  food: Food;
  quantity: number;
  unit: string;
  notes?: string | null;
  ingredientOrder?: number;
}

export interface CalculatedRecipeIngredient {
  foodId: string | null;
  foodName: string;
  foodState: FoodState;
  quantity: number;
  unit: string;
  gramWeight: number;
  ingredientOrder: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodiumMg: number | null;
  isEstimatedPortion: boolean;
  portionAssumption: string | null;
  dataProvenance: DataProvenance;
  sourceReference: string | null;
  notes: string | null;
}

export interface RecipeCalculationInput {
  ingredients: RecipeIngredientInput[];
  finalCookedWeightG?: number | null;
  servings?: number;
}

export interface CalculatedRecipeSummary {
  totalRawWeightG: number;
  finalCookedWeightG: number | null;
  servings: number;
  ingredients: CalculatedRecipeIngredient[];
  // Total Recipe Nutrition
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number | null;
  totalSodiumMg: number | null;
  // Density per 100g (only if finalCookedWeightG is defined and > 0)
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number | null;
    sodiumMg: number | null;
  } | null;
  // Per Serving Nutrition
  perServing: {
    servingWeightG: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number | null;
    sodiumMg: number | null;
  };
  isEstimatedPortion: boolean;
  dataProvenance: DataProvenance;
  cookingYieldFactor: number | null; // e.g. 700 / 850 = 0.82 (18% water loss)
}

export class RecipeCalculationError extends Error {
  constructor(message: string, public readonly code: "INVALID_WEIGHT" | "INVALID_SERVINGS" | "INVALID_INGREDIENT") {
    super(message);
    this.name = "RecipeCalculationError";
  }
}

/**
 * Rounds a number to a specified number of decimal places.
 */
function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Pure deterministic calculation engine for recipes.
 * Calculates total nutrient sums, density per 100g, and per-serving nutrition.
 */
export function calculateRecipeNutrition(input: RecipeCalculationInput): CalculatedRecipeSummary {
  const { ingredients: rawIngredients, finalCookedWeightG, servings = 1 } = input;

  if (servings <= 0) {
    throw new RecipeCalculationError("Recipe servings must be greater than zero.", "INVALID_SERVINGS");
  }

  if (finalCookedWeightG !== undefined && finalCookedWeightG !== null && finalCookedWeightG <= 0) {
    throw new RecipeCalculationError("Final cooked weight must be greater than zero.", "INVALID_WEIGHT");
  }

  const calculatedIngredients: CalculatedRecipeIngredient[] = [];
  let totalRawWeightG = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSugar = 0;
  let hasAnySugar = false;
  let totalSodiumMg = 0;
  let hasAnySodium = false;
  let hasEstimatedPortion = false;
  let hasUserEnteredProvenance = false;

  rawIngredients.forEach((item, index) => {
    if (!item?.food) {
      throw new RecipeCalculationError(
        `Food record missing for ingredient at index ${index}.`,
        "INVALID_INGREDIENT"
      );
    }

    if (item.quantity <= 0) {
      throw new RecipeCalculationError(
        `Quantity for ingredient "${item.food.name_en}" must be greater than zero.`,
        "INVALID_INGREDIENT"
      );
    }

    const calc = calculateNutrition({
      food: item.food,
      quantity: item.quantity,
      unit: item.unit,
    });

    const ingWeight = calc.effectiveWeightGrams;
    totalRawWeightG += ingWeight;
    totalCalories += calc.calories;
    totalProtein += calc.protein;
    totalCarbs += calc.carbs;
    totalFat += calc.fat;
    totalFiber += calc.fiber;

    if (calc.sugar !== null) {
      totalSugar += calc.sugar;
      hasAnySugar = true;
    }
    if (calc.sodiumMg !== null) {
      totalSodiumMg += calc.sodiumMg;
      hasAnySodium = true;
    }

    if (calc.isEstimatedPortion) {
      hasEstimatedPortion = true;
    }
    if (calc.dataProvenance === "user_entered" || calc.dataProvenance === "estimated") {
      hasUserEnteredProvenance = true;
    }

    calculatedIngredients.push({
      foodId: item.food.id || null,
      foodName: item.food.name_en,
      foodState: item.food.state,
      quantity: item.quantity,
      unit: item.unit,
      gramWeight: round(ingWeight, 1),
      ingredientOrder: item.ingredientOrder ?? index,
      calories: calc.calories,
      protein: calc.protein,
      carbs: calc.carbs,
      fat: calc.fat,
      fiber: calc.fiber,
      sugar: calc.sugar,
      sodiumMg: calc.sodiumMg,
      isEstimatedPortion: calc.isEstimatedPortion,
      portionAssumption: calc.portionAssumption || null,
      dataProvenance: calc.dataProvenance,
      sourceReference: item.food.source_reference,
      notes: item.notes || null,
    });
  });

  totalCalories = round(totalCalories, 1);
  totalProtein = round(totalProtein, 1);
  totalCarbs = round(totalCarbs, 1);
  totalFat = round(totalFat, 1);
  totalFiber = round(totalFiber, 1);
  totalRawWeightG = round(totalRawWeightG, 1);

  const finalTotalSugar = hasAnySugar ? round(totalSugar, 1) : null;
  const finalTotalSodium = hasAnySodium ? round(totalSodiumMg, 1) : null;

  // 1. Calculate Nutrition per 100g (Authoritative basis: Final Cooked Weight)
  let per100g: CalculatedRecipeSummary["per100g"] = null;
  let cookingYieldFactor: number | null = null;

  if (finalCookedWeightG && finalCookedWeightG > 0) {
    const factor = 100 / finalCookedWeightG;
    per100g = {
      calories: round(totalCalories * factor, 1),
      protein: round(totalProtein * factor, 1),
      carbs: round(totalCarbs * factor, 1),
      fat: round(totalFat * factor, 1),
      fiber: round(totalFiber * factor, 1),
      sugar: finalTotalSugar !== null ? round(finalTotalSugar * factor, 1) : null,
      sodiumMg: finalTotalSodium !== null ? round(finalTotalSodium * factor, 1) : null,
    };

    if (totalRawWeightG > 0) {
      cookingYieldFactor = round(finalCookedWeightG / totalRawWeightG, 2);
    }
  }

  // 2. Calculate Nutrition per Serving
  const servingWeightG = finalCookedWeightG && finalCookedWeightG > 0
    ? round(finalCookedWeightG / servings, 1)
    : round(totalRawWeightG / servings, 1);

  const perServing = {
    servingWeightG,
    calories: round(totalCalories / servings, 1),
    protein: round(totalProtein / servings, 1),
    carbs: round(totalCarbs / servings, 1),
    fat: round(totalFat / servings, 1),
    fiber: round(totalFiber / servings, 1),
    sugar: finalTotalSugar !== null ? round(finalTotalSugar / servings, 1) : null,
    sodiumMg: finalTotalSodium !== null ? round(finalTotalSodium / servings, 1) : null,
  };

  return {
    totalRawWeightG,
    finalCookedWeightG: finalCookedWeightG || null,
    servings,
    ingredients: calculatedIngredients,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    totalFiber,
    totalSugar: finalTotalSugar,
    totalSodiumMg: finalTotalSodium,
    per100g,
    perServing,
    isEstimatedPortion: hasEstimatedPortion,
    dataProvenance: hasUserEnteredProvenance ? "user_entered" : "verified_database",
    cookingYieldFactor,
  };
}

/**
 * Calculates the exact nutritional value of a specific serving portion (in grams) of a recipe.
 * Uses exact ratio: servingGrams / finalCookedWeightG (or totalRawWeightG if final cooked weight not specified).
 */
export function calculateRecipeServingNutrition(
  recipe: Pick<
    Recipe,
    | "id"
    | "name"
    | "final_cooked_weight_g"
    | "total_raw_weight_g"
    | "total_calories"
    | "total_protein"
    | "total_carbs"
    | "total_fat"
    | "total_fiber"
    | "total_sugar"
    | "total_sodium_mg"
    | "calories_per_100g"
    | "protein_per_100g"
    | "carbs_per_100g"
    | "fat_per_100g"
    | "fiber_per_100g"
    | "sugar_per_100g"
    | "sodium_mg_per_100g"
    | "is_estimated_portion"
    | "data_provenance"
  >,
  servingGrams: number
): {
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodiumMg: number | null;
  isEstimatedPortion: boolean;
  dataProvenance: DataProvenance;
} {
  if (servingGrams <= 0) {
    throw new RecipeCalculationError("Serving grams must be greater than zero.", "INVALID_WEIGHT");
  }

  // Authoritative basis: final_cooked_weight_g, fallback to total_raw_weight_g
  const baseWeightG = recipe.final_cooked_weight_g || recipe.total_raw_weight_g;
  if (!baseWeightG || baseWeightG <= 0) {
    throw new RecipeCalculationError(
      "Recipe has no recorded weight basis. Please edit the recipe to specify final cooked weight.",
      "INVALID_WEIGHT"
    );
  }

  const ratio = servingGrams / baseWeightG;

  return {
    servingGrams: round(servingGrams, 1),
    calories: round(recipe.total_calories * ratio, 1),
    protein: round(recipe.total_protein * ratio, 1),
    carbs: round(recipe.total_carbs * ratio, 1),
    fat: round(recipe.total_fat * ratio, 1),
    fiber: round(recipe.total_fiber * ratio, 1),
    sugar: recipe.total_sugar !== null && recipe.total_sugar !== undefined
      ? round(recipe.total_sugar * ratio, 1)
      : null,
    sodiumMg: recipe.total_sodium_mg !== null && recipe.total_sodium_mg !== undefined
      ? round(recipe.total_sodium_mg * ratio, 1)
      : null,
    isEstimatedPortion: recipe.is_estimated_portion,
    dataProvenance: recipe.data_provenance,
  };
}

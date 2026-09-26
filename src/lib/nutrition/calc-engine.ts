import type { Food, StandardPortion, FoodState, DataProvenance } from "../supabase/types";

export interface CalculationInput {
  food: Food;
  quantity: number;
  unit: string;
}

export interface CalculatedNutrition {
  foodId: string;
  foodName: string;
  state: FoodState;
  inputQuantity: number;
  inputUnit: string;
  effectiveWeightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodiumMg: number | null;
  isEstimatedPortion: boolean;
  portionAssumption?: string;
  dataProvenance: DataProvenance;
  sourceReference: string;
}

export class NutritionCalculationError extends Error {
  constructor(message: string, public readonly code: "INVALID_QUANTITY" | "UNKNOWN_UNIT" | "MISSING_FOOD") {
    super(message);
    this.name = "NutritionCalculationError";
  }
}

/**
 * Universal metric conversion factors to grams.
 * Pure physical constants.
 */
const METRIC_MASS_AND_VOLUME: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
  ml: 1,
  millilitre: 1,
  millilitres: 1,
  l: 1000,
  litre: 1000,
  litres: 1000,
};

/**
 * Generic kitchen fallbacks used ONLY when the specific food does NOT define
 * its own portion weight for tablespoons, teaspoons, or cups.
 */
const GENERIC_KITCHEN_FALLBACKS: Record<string, number> = {
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  cup: 200,
  cups: 200,
};

/**
 * Resolves the effective gram weight for a food given an input quantity and unit.
 * Priority order:
 * 1. Physical metric units (g, kg, mg, ml, l)
 * 2. Food-specific standard portions (katori, idli, custom tbsp, custom cup, piece, ladle, etc.)
 * 3. Default food serving sizes (serving, pieces)
 * 4. Generic kitchen fallbacks (generic tbsp, tsp)
 */
export function resolveGramWeight(
  food: Food,
  quantity: number,
  unit: string
): { gramWeight: number; isEstimate: boolean; assumption?: string } {
  if (typeof quantity !== "number" || isNaN(quantity) || !isFinite(quantity)) {
    throw new NutritionCalculationError("Quantity must be a valid finite number.", "INVALID_QUANTITY");
  }

  if (quantity <= 0) {
    throw new NutritionCalculationError("Quantity must be strictly greater than zero.", "INVALID_QUANTITY");
  }

  const normalizedUnit = unit.trim().toLowerCase();

  // 1. Direct standard metric physical units (g, kg, mg, ml, l)
  if (METRIC_MASS_AND_VOLUME[normalizedUnit] !== undefined) {
    return {
      gramWeight: round(quantity * METRIC_MASS_AND_VOLUME[normalizedUnit], 2),
      isEstimate: false,
    };
  }

  // 2. Check food-specific standard portions FIRST (e.g. katori, piece, bowl, plate, custom tbsp for oil, etc.)
  const portions: StandardPortion[] = food.standard_portions || [];
  const matchedPortion = portions.find(
    (p) => p.unit.toLowerCase() === normalizedUnit ||
           p.unit.toLowerCase().replace(/\s+/g, "_") === normalizedUnit ||
           normalizedUnit.includes(p.unit.toLowerCase())
  );

  if (matchedPortion) {
    const totalGrams = round(quantity * matchedPortion.gram_weight, 2);
    return {
      gramWeight: totalGrams,
      isEstimate: matchedPortion.is_estimate,
      assumption: matchedPortion.label_en + (matchedPortion.notes ? ` (${matchedPortion.notes})` : ""),
    };
  }

  // 3. Handle 'serving' or 'servings'
  if (normalizedUnit === "serving" || normalizedUnit === "servings") {
    const servingSize = food.serving_size_default || 100;
    return {
      gramWeight: round(quantity * servingSize, 2),
      isEstimate: false,
      assumption: `Standard serving size: ${servingSize} ${food.serving_unit_default}`,
    };
  }

  // 4. Handle generic 'piece' or 'pieces' fallback
  if (normalizedUnit === "piece" || normalizedUnit === "pieces") {
    const piecePortion = portions.find((p) => p.unit.toLowerCase() === "piece" || p.unit.toLowerCase() === "item");
    if (piecePortion) {
      return {
        gramWeight: round(quantity * piecePortion.gram_weight, 2),
        isEstimate: piecePortion.is_estimate,
        assumption: piecePortion.label_en,
      };
    }
    if (food.serving_unit_default === "piece" || food.serving_unit_default === "pieces") {
      return {
        gramWeight: round(quantity * food.serving_size_default, 2),
        isEstimate: true,
        assumption: `Estimated 1 piece ≈ ${food.serving_size_default} g`,
      };
    }
  }

  // 5. Generic kitchen fallbacks if not explicitly overridden by the food
  if (GENERIC_KITCHEN_FALLBACKS[normalizedUnit] !== undefined) {
    return {
      gramWeight: round(quantity * GENERIC_KITCHEN_FALLBACKS[normalizedUnit], 2),
      isEstimate: true,
      assumption: `Standard kitchen fallback: 1 ${normalizedUnit} ≈ ${GENERIC_KITCHEN_FALLBACKS[normalizedUnit]} g`,
    };
  }

  throw new NutritionCalculationError(
    `Unit '${unit}' is not configured for '${food.name_en}'. Please select from supported portions or enter grams directly.`,
    "UNKNOWN_UNIT"
  );
}

/**
 * Deterministic rounding utility to avoid floating point precision artifacts.
 */
export function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates exact nutrition for a food item and portion.
 * Formula: value = round(value_per_100g * (gramWeight / 100), precision)
 */
export function calculateNutrition(input: CalculationInput): CalculatedNutrition {
  const { food, quantity, unit } = input;

  if (!food) {
    throw new NutritionCalculationError("Food record is missing or null.", "MISSING_FOOD");
  }

  const { gramWeight, isEstimate, assumption } = resolveGramWeight(food, quantity, unit);
  const ratio = gramWeight / 100;

  const calories = round(food.calories_per_100g * ratio, 1);
  const protein = round(food.protein_per_100g * ratio, 2);
  const carbs = round(food.carbs_per_100g * ratio, 2);
  const fat = round(food.fat_per_100g * ratio, 2);
  const fiber = round(food.fiber_per_100g * ratio, 2);
  const sugar = food.sugar_per_100g !== null && food.sugar_per_100g !== undefined
    ? round(food.sugar_per_100g * ratio, 2)
    : null;
  const sodiumMg = food.sodium_mg_per_100g !== null && food.sodium_mg_per_100g !== undefined
    ? round(food.sodium_mg_per_100g * ratio, 1)
    : null;

  return {
    foodId: food.id,
    foodName: food.name_en,
    state: food.state,
    inputQuantity: quantity,
    inputUnit: unit,
    effectiveWeightGrams: gramWeight,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodiumMg,
    isEstimatedPortion: isEstimate,
    portionAssumption: assumption,
    dataProvenance: food.data_provenance,
    sourceReference: food.source_reference,
  };
}

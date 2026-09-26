import { describe, it, expect } from "vitest";
import {
  calculateRecipeNutrition,
  calculateRecipeServingNutrition,
  RecipeCalculationError,
  type RecipeIngredientInput,
} from "@/lib/nutrition/recipe-engine";
import { SEED_FOODS } from "@/lib/nutrition/food-dataset";
import type { Food, Recipe } from "@/lib/supabase/types";

describe("Recipe Calculation Engine (recipe-engine.ts)", () => {
  const chickenRaw = SEED_FOODS.find((f) => f.id === "f052-chicken-breast-raw")!;
  const onionRaw = SEED_FOODS.find((f) => f.id === "f112-veg-onion")!;
  const tomatoRaw = SEED_FOODS.find((f) => f.id === "f111-veg-tomato")!;
  const gingellyOil = SEED_FOODS.find((f) => f.id === "f090-oil-gingelly")!;

  it("verifies required seed foods exist for testing", () => {
    expect(chickenRaw).toBeDefined();
    expect(onionRaw).toBeDefined();
    expect(tomatoRaw).toBeDefined();
    expect(gingellyOil).toBeDefined();
  });

  describe("Mathematical Formula & Invariant Verification", () => {
    it("satisfies the prompt's mathematical benchmark: 1000 kcal batch / 500g cooked = 200 kcal/100g, 250g serving = 500 kcal", () => {
      // Mock food with exact 100 kcal per 100g
      const mockBenchmarkFood: Food = {
        id: "mock-benchmark-food",
        name_en: "Benchmark Food",
        name_ta: null,
        name_tanglish: null,
        category: "other",
        state: "raw",
        calories_per_100g: 100,
        protein_per_100g: 10,
        carbs_per_100g: 10,
        fat_per_100g: 2,
        fiber_per_100g: 1,
        sugar_per_100g: null,
        sodium_mg_per_100g: null,
        serving_unit_default: "g",
        serving_size_default: 100,
        standard_portions: [],
        data_provenance: "verified_database",
        source_reference: "Test Bench",
        is_verified: true,
        created_by: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      };

      // 1000g of Benchmark Food = 1000 kcal total
      const summary = calculateRecipeNutrition({
        ingredients: [
          {
            food: mockBenchmarkFood,
            quantity: 1000,
            unit: "g",
          },
        ],
        finalCookedWeightG: 500, // 500g cooked batch weight
        servings: 2,
      });

      expect(summary.totalRawWeightG).toBe(1000);
      expect(summary.totalCalories).toBe(1000);
      expect(summary.finalCookedWeightG).toBe(500);

      // Nutrition per 100g: 1000 kcal * 100 / 500 = 200 kcal
      expect(summary.per100g).not.toBeNull();
      expect(summary.per100g!.calories).toBe(200);

      // Serving of 250g:
      const mockRecipeRecord: Pick<
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
      > = {
        id: "rec-benchmark",
        name: "Benchmark Recipe",
        final_cooked_weight_g: summary.finalCookedWeightG,
        total_raw_weight_g: summary.totalRawWeightG,
        total_calories: summary.totalCalories,
        total_protein: summary.totalProtein,
        total_carbs: summary.totalCarbs,
        total_fat: summary.totalFat,
        total_fiber: summary.totalFiber,
        total_sugar: summary.totalSugar,
        total_sodium_mg: summary.totalSodiumMg,
        calories_per_100g: summary.per100g!.calories,
        protein_per_100g: summary.per100g!.protein,
        carbs_per_100g: summary.per100g!.carbs,
        fat_per_100g: summary.per100g!.fat,
        fiber_per_100g: summary.per100g!.fiber,
        sugar_per_100g: summary.per100g!.sugar,
        sodium_mg_per_100g: summary.per100g!.sodiumMg,
        is_estimated_portion: summary.isEstimatedPortion,
        data_provenance: summary.dataProvenance,
      };

      const servingNutrition = calculateRecipeServingNutrition(mockRecipeRecord, 250);
      expect(servingNutrition.servingGrams).toBe(250);
      expect(servingNutrition.calories).toBe(500); // exactly 500 kcal!
    });
  });

  describe("Multi-Ingredient South Indian Recipe (Chicken Curry)", () => {
    it("calculates realistic Chicken Curry recipe with water loss during cooking", () => {
      // Recipe:
      // Chicken breast (raw): 500g
      // Onion (raw): 100g
      // Tomato (raw): 150g
      // Gingelly Oil: 10g (or ~1 tbsp)
      // Raw ingredients total = 760g
      // Final cooked pot weight = 650g
      const ingredients: RecipeIngredientInput[] = [
        { food: chickenRaw, quantity: 500, unit: "g" },
        { food: onionRaw, quantity: 100, unit: "g" },
        { food: tomatoRaw, quantity: 150, unit: "g" },
        { food: gingellyOil, quantity: 10, unit: "g" },
      ];

      const summary = calculateRecipeNutrition({
        ingredients,
        finalCookedWeightG: 650,
        servings: 4,
      });

      expect(summary.totalRawWeightG).toBe(760);
      expect(summary.finalCookedWeightG).toBe(650);
      expect(summary.servings).toBe(4);

      // Ingredients snapshots
      expect(summary.ingredients.length).toBe(4);
      expect(summary.ingredients[0].foodName).toBe("Chicken Breast, Skinless (Raw)");
      expect(summary.ingredients[0].foodState).toBe("raw");
      expect(summary.ingredients[0].gramWeight).toBe(500);

      // Verify raw chicken calories (100g raw chicken = 119 kcal, 500g = 595 kcal, 109g protein)
      expect(summary.ingredients[0].calories).toBe(595);
      expect(summary.ingredients[0].protein).toBe(109);

      // Verify Oil calories (10g * 884 kcal/100g = 88.4 kcal, 10g fat)
      const oilIng = summary.ingredients.find((i) => i.foodName.includes("Gingelly"));
      expect(oilIng).toBeDefined();
      expect(oilIng!.calories).toBe(88.4);
      expect(oilIng!.fat).toBe(10);

      // Total recipe calories
      expect(summary.totalCalories).toBeGreaterThan(700);
      expect(summary.totalProtein).toBeGreaterThan(110);

      // Density per 100g: (total * 100) / 650
      expect(summary.per100g).not.toBeNull();
      const expectedPer100gCalories = Math.round((summary.totalCalories * 100) / 650 * 10) / 10;
      expect(summary.per100g!.calories).toBe(expectedPer100gCalories);

      // Per serving metrics (650g / 4 = 162.5g)
      expect(summary.perServing.servingWeightG).toBe(162.5);
      expect(summary.perServing.calories).toBe(Math.round((summary.totalCalories / 4) * 10) / 10);
      expect(summary.perServing.protein).toBe(Math.round((summary.totalProtein / 4) * 10) / 10);

      // Cooking yield factor
      expect(summary.cookingYieldFactor).toBe(Math.round((650 / 760) * 100) / 100);
    });
  });

  describe("Handling Missing Final Cooked Weight", () => {
    it("returns null per100g density when final cooked weight is not provided, but calculates total batch", () => {
      const summary = calculateRecipeNutrition({
        ingredients: [
          { food: chickenRaw, quantity: 300, unit: "g" },
          { food: onionRaw, quantity: 100, unit: "g" },
        ],
        finalCookedWeightG: null, // User has not weighed the cooked pot yet
        servings: 2,
      });

      expect(summary.totalCalories).toBeGreaterThan(300);
      expect(summary.finalCookedWeightG).toBeNull();
      // Crucial requirement: Do NOT invent or guess per 100g density without cooked weight
      expect(summary.per100g).toBeNull();
      expect(summary.cookingYieldFactor).toBeNull();
    });
  });

  describe("Household Portions in Recipes", () => {
    it("converts household portion measures (e.g. 2 tbsp oil, 1 piece tomato) accurately", () => {
      const summary = calculateRecipeNutrition({
        ingredients: [
          { food: gingellyOil, quantity: 2, unit: "tbsp" }, // 2 * 14g = 28g
          { food: tomatoRaw, quantity: 2, unit: "piece" }, // 2 * 80g = 160g
        ],
        finalCookedWeightG: 180,
      });

      expect(summary.ingredients[0].gramWeight).toBe(28); // 2 tbsp gingelly oil = 28g
      expect(summary.ingredients[1].gramWeight).toBe(160); // 2 tomatoes = 160g
      expect(summary.totalRawWeightG).toBe(188);
      expect(summary.isEstimatedPortion).toBe(true);
    });
  });

  describe("Validation & Error Cases", () => {
    it("rejects non-positive final cooked weight", () => {
      expect(() =>
        calculateRecipeNutrition({
          ingredients: [{ food: onionRaw, quantity: 100, unit: "g" }],
          finalCookedWeightG: 0,
        })
      ).toThrow(RecipeCalculationError);

      expect(() =>
        calculateRecipeNutrition({
          ingredients: [{ food: onionRaw, quantity: 100, unit: "g" }],
          finalCookedWeightG: -250,
        })
      ).toThrow("Final cooked weight must be greater than zero");
    });

    it("rejects non-positive servings", () => {
      expect(() =>
        calculateRecipeNutrition({
          ingredients: [{ food: onionRaw, quantity: 100, unit: "g" }],
          servings: 0,
        })
      ).toThrow(RecipeCalculationError);
    });

    it("rejects non-positive ingredient quantity", () => {
      expect(() =>
        calculateRecipeNutrition({
          ingredients: [{ food: onionRaw, quantity: 0, unit: "g" }],
        })
      ).toThrow("must be greater than zero");
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateNutrition,
  resolveGramWeight,
  NutritionCalculationError,
} from "@/lib/nutrition/calc-engine";
import { SEED_FOODS } from "@/lib/nutrition/food-dataset";
import type { Food } from "@/lib/supabase/types";

describe("Deterministic Nutrition Calculation Engine", () => {
  const rawRice = SEED_FOODS.find((f) => f.id === "f001-rice-ponni-raw")!;
  const cookedRice = SEED_FOODS.find((f) => f.id === "f002-rice-ponni-cooked")!;
  const idli = SEED_FOODS.find((f) => f.id === "f060-breakfast-idli")!;
  const chapati = SEED_FOODS.find((f) => f.id === "f021-wheat-chapati")!;
  const gingellyOil = SEED_FOODS.find((f) => f.id === "f090-oil-gingelly")!;
  const chickenBreastRaw = SEED_FOODS.find((f) => f.id === "f052-chicken-breast-raw")!;
  const chickenBreastCooked = SEED_FOODS.find((f) => f.id === "f053-chicken-breast-cooked")!;

  describe("Raw vs. Cooked Nutrition Integrity", () => {
    it("strictly separates 100g raw rice from 100g cooked rice", () => {
      const calcRaw = calculateNutrition({ food: rawRice, quantity: 100, unit: "g" });
      const calcCooked = calculateNutrition({ food: cookedRice, quantity: 100, unit: "g" });

      expect(calcRaw.calories).toBe(353);
      expect(calcRaw.protein).toBe(7.35);

      expect(calcCooked.calories).toBe(130);
      expect(calcCooked.protein).toBe(2.7);

      // Cooked rice has ~2.7x fewer calories per 100g due to water absorption
      expect(calcRaw.calories).toBeGreaterThan(calcCooked.calories * 2.5);
    });

    it("strictly separates raw chicken from cooked chicken due to moisture loss", () => {
      const calcRaw = calculateNutrition({ food: chickenBreastRaw, quantity: 100, unit: "g" });
      const calcCooked = calculateNutrition({ food: chickenBreastCooked, quantity: 100, unit: "g" });

      expect(calcRaw.protein).toBe(21.8);
      expect(calcCooked.protein).toBe(31.0); // Concentrated protein per 100g after cooking
      expect(calcCooked.calories).toBeGreaterThan(calcRaw.calories);
    });
  });

  describe("Standard Metric Unit Conversions", () => {
    it("converts kilograms (kg) to grams deterministically", () => {
      const { gramWeight } = resolveGramWeight(cookedRice, 0.5, "kg");
      expect(gramWeight).toBe(500);

      const calc = calculateNutrition({ food: cookedRice, quantity: 0.5, unit: "kg" });
      expect(calc.effectiveWeightGrams).toBe(500);
      expect(calc.calories).toBe(650); // 130 * 5
    });

    it("converts milligrams (mg) to grams", () => {
      const { gramWeight } = resolveGramWeight(rawRice, 50000, "mg");
      expect(gramWeight).toBe(50);
    });

    it("converts volume millilitres (ml) and litres (l)", () => {
      const milk = SEED_FOODS.find((f) => f.id === "f042-dairy-milk-cow")!;
      const { gramWeight: mlWeight } = resolveGramWeight(milk, 250, "ml");
      expect(mlWeight).toBe(250);

      const { gramWeight: lWeight } = resolveGramWeight(milk, 1, "l");
      expect(lWeight).toBe(1000);
    });
  });

  describe("Indian Household Portions & Estimation Flags", () => {
    it("calculates 1 medium South Indian katori of cooked rice (150 g)", () => {
      const calc = calculateNutrition({ food: cookedRice, quantity: 1, unit: "katori" });
      expect(calc.effectiveWeightGrams).toBe(150);
      expect(calc.calories).toBe(195); // 130 * 1.5
      expect(calc.protein).toBe(4.05); // 2.7 * 1.5
      expect(calc.isEstimatedPortion).toBe(true);
      expect(calc.portionAssumption).toContain("katori");
    });

    it("calculates exact nutrition for 2 medium idlis (45g each = 90g)", () => {
      const calc = calculateNutrition({ food: idli, quantity: 2, unit: "piece" });
      expect(calc.effectiveWeightGrams).toBe(90);
      expect(calc.calories).toBe(118.8); // 132 * 0.9
      expect(calc.protein).toBe(4.05); // 4.5 * 0.9
    });

    it("calculates exact nutrition for 3 plain chapatis (35g each = 105g)", () => {
      const calc = calculateNutrition({ food: chapati, quantity: 3, unit: "chapati" });
      expect(calc.effectiveWeightGrams).toBe(105);
      expect(calc.calories).toBe(277.2); // 264 * 1.05
      expect(calc.protein).toBe(8.93);
    });

    it("calculates 1 tablespoon of gingelly oil (14 g)", () => {
      const calc = calculateNutrition({ food: gingellyOil, quantity: 1, unit: "tbsp" });
      expect(calc.effectiveWeightGrams).toBe(14);
      expect(calc.calories).toBe(123.8); // 884 * 0.14 = 123.76 -> round 123.8
      expect(calc.fat).toBe(14.0);
    });
  });

  describe("Input Validation & Error Guardrails", () => {
    it("rejects zero quantity with INVALID_QUANTITY", () => {
      expect(() =>
        calculateNutrition({ food: cookedRice, quantity: 0, unit: "g" })
      ).toThrowError(NutritionCalculationError);
    });

    it("rejects negative quantities with INVALID_QUANTITY", () => {
      expect(() =>
        calculateNutrition({ food: cookedRice, quantity: -150, unit: "g" })
      ).toThrowError(NutritionCalculationError);
    });

    it("rejects NaN or Infinity quantities", () => {
      expect(() =>
        calculateNutrition({ food: cookedRice, quantity: NaN, unit: "g" })
      ).toThrowError(NutritionCalculationError);

      expect(() =>
        calculateNutrition({ food: cookedRice, quantity: Infinity, unit: "g" })
      ).toThrowError(NutritionCalculationError);
    });

    it("rejects unknown / unconfigured units with UNKNOWN_UNIT", () => {
      expect(() =>
        calculateNutrition({ food: cookedRice, quantity: 1, unit: "bucket" })
      ).toThrowError(NutritionCalculationError);
    });

    it("rejects null or undefined food", () => {
      // @ts-expect-error test null food
      expect(() => calculateNutrition({ food: null, quantity: 100, unit: "g" })).toThrow();
    });
  });

  describe("Rounding Rules Precision", () => {
    it("avoids floating point artifacts and rounds calories to 1 decimal, macros to 2", () => {
      const calc = calculateNutrition({ food: rawRice, quantity: 33.33, unit: "g" });
      expect(typeof calc.calories).toBe("number");
      expect(calc.calories.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(1);
      expect(calc.protein.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(calc.carbs.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });
});

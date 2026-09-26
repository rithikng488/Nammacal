import { describe, it, expect } from "vitest";
import {
  normalizeDateString,
  roundToDecimals,
  calculateDailyTotals,
  addFoodToMeal,
  updateMealItemQuantity,
  deleteMealItem,
  type MealWithItems,
} from "@/lib/meals/meal-service";
import { SEED_FOODS } from "@/lib/nutrition/food-dataset";
import type { MealItem, MealLog, Profile } from "@/lib/supabase/types";

// In-memory mock Supabase client for unit testing service methods
function createMockSupabase(initialLogs: MealLog[] = [], initialItems: MealItem[] = []) {
  const mealLogs = [...initialLogs];
  const mealItems = [...initialItems];

  const client: any = {
    from: (table: string) => {
      if (table === "meal_logs") {
        return {
          select: (_cols?: string) => ({
            eq: (field: string, val: any) => ({
              eq: (field2: string, val2: any) => ({
                eq: (field3: string, val3: any) => ({
                  maybeSingle: async () => {
                    const match = mealLogs.find(
                      (l) => l[field as keyof MealLog] === val &&
                             l[field2 as keyof MealLog] === val2 &&
                             l[field3 as keyof MealLog] === val3
                    );
                    return { data: match || null, error: null };
                  },
                  single: async () => {
                    const match = mealLogs.find(
                      (l) => l[field as keyof MealLog] === val &&
                             l[field2 as keyof MealLog] === val2 &&
                             l[field3 as keyof MealLog] === val3
                    );
                    return { data: match || null, error: match ? null : { message: "Not found" } };
                  },
                }),
                maybeSingle: async () => {
                  const match = mealLogs.find(
                    (l) => l[field as keyof MealLog] === val && l[field2 as keyof MealLog] === val2
                  );
                  return { data: match || null, error: null };
                },
              }),
              single: async () => {
                const match = mealLogs.find((l) => l[field as keyof MealLog] === val);
                return { data: match || null, error: match ? null : { message: "Not found" } };
              },
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const id = payload.id || `log-${Date.now()}-${Math.random()}`;
                const newRow: MealLog = {
                  id,
                  user_id: payload.user_id,
                  log_date: payload.log_date,
                  meal_type: payload.meal_type,
                  meal_name: payload.meal_name || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                mealLogs.push(newRow);
                return { data: newRow, error: null };
              },
            }),
          }),
        };
      }

      if (table === "meal_items") {
        return {
          select: (_cols?: string) => ({
            eq: (field: string, val: any) => ({
              eq: (field2: string, val2: any) => ({
                single: async () => {
                  const match = mealItems.find(
                    (it) => it[field as keyof MealItem] === val && it[field2 as keyof MealItem] === val2
                  );
                  return { data: match || null, error: match ? null : { message: "Not found" } };
                },
              }),
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const id = payload.id || `item-${Date.now()}-${Math.random()}`;
                const newRow: MealItem = {
                  id,
                  meal_log_id: payload.meal_log_id,
                  user_id: payload.user_id,
                  food_id: payload.food_id || null,
                  food_name: payload.food_name,
                  food_state: payload.food_state,
                  quantity: payload.quantity,
                  unit: payload.unit,
                  gram_weight: payload.gram_weight,
                  calories: payload.calories,
                  protein: payload.protein,
                  carbs: payload.carbs,
                  fat: payload.fat,
                  fiber: payload.fiber ?? 0,
                  sugar: payload.sugar ?? null,
                  sodium_mg: payload.sodium_mg ?? null,
                  is_estimated_portion: payload.is_estimated_portion ?? false,
                  portion_assumption: payload.portion_assumption || null,
                  data_provenance: payload.data_provenance || "verified_database",
                  source_reference: payload.source_reference || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                mealItems.push(newRow);
                return { data: newRow, error: null };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (f1: string, v1: any) => ({
              eq: (f2: string, v2: any) => ({
                select: () => ({
                  single: async () => {
                    const idx = mealItems.findIndex(
                      (it) => it[f1 as keyof MealItem] === v1 && it[f2 as keyof MealItem] === v2
                    );
                    if (idx === -1) return { data: null, error: { message: "Item not found" } };
                    mealItems[idx] = { ...mealItems[idx], ...payload };
                    return { data: mealItems[idx], error: null };
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (f1: string, v1: any) => ({
              eq: (f2: string, v2: any) => {
                const idx = mealItems.findIndex(
                  (it) => it[f1 as keyof MealItem] === v1 && it[f2 as keyof MealItem] === v2
                );
                if (idx !== -1) mealItems.splice(idx, 1);
                return { error: null };
              },
            }),
          }),
        };
      }

      if (table === "foods") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              maybeSingle: async () => {
                const f = SEED_FOODS.find((food) => food[field as keyof typeof food] === val);
                return { data: f || null, error: null };
              },
            }),
          }),
        };
      }

      return {};
    },
    _getLogs: () => mealLogs,
    _getItems: () => mealItems,
  };

  return client;
}

describe("Meal Service Layer Tests", () => {
  const userId = "user-test-123";
  const testDate = "2026-10-05";

  describe("Date Normalization & Rounding Helpers", () => {
    it("normalizes date strings and Date objects correctly to YYYY-MM-DD", () => {
      expect(normalizeDateString("2026-10-05")).toBe("2026-10-05");
      expect(normalizeDateString("2026-10-05T14:32:00.000Z")).toBe("2026-10-05");
      const d = new Date(2026, 9, 5); // month is 0-indexed: 9 = October
      expect(normalizeDateString(d)).toBe("2026-10-05");
    });

    it("rounds numbers accurately to specified decimal places", () => {
      expect(roundToDecimals(12.3456, 1)).toBe(12.3);
      expect(roundToDecimals(12.3656, 1)).toBe(12.4);
      expect(roundToDecimals(12.3456, 2)).toBe(12.35);
    });
  });

  describe("Daily Totals & Target Aggregation", () => {
    const mockProfile: Partial<Profile> = {
      daily_calorie_target: 2000,
      daily_protein_target: 120,
      daily_carb_target: 220,
      daily_fat_target: 60,
      daily_fiber_target: 30,
      daily_water_ml_target: 3000,
      daily_step_target: 10000,
    };

    it("returns zero consumed and full targets remaining when no items are logged", () => {
      const meals: MealWithItems[] = [
        {
          id: "log-1",
          userId,
          logDate: testDate,
          mealType: "breakfast",
          mealName: null,
          items: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
        },
      ];

      const { totals, targets } = calculateDailyTotals(meals, mockProfile);

      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
      expect(targets.calories).toBe(2000);
      expect(targets.remainingCalories).toBe(2000);
      expect(targets.remainingProtein).toBe(120);
    });

    it("accurately sums calories and macros across multiple meals", () => {
      const item1: MealItem = {
        id: "item-1",
        meal_log_id: "log-1",
        user_id: userId,
        food_id: "food-idli",
        food_name: "Idli",
        food_state: "cooked",
        quantity: 2,
        unit: "piece",
        gram_weight: 100,
        calories: 134,
        protein: 4.2,
        carbs: 27.2,
        fat: 0.6,
        fiber: 1.4,
        sugar: null,
        sodium_mg: null,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: "IFCT 2017",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const item2: MealItem = {
        id: "item-2",
        meal_log_id: "log-2",
        user_id: userId,
        food_id: "food-rice",
        food_name: "Ponni Boiled Rice (Cooked)",
        food_state: "cooked",
        quantity: 1,
        unit: "katori",
        gram_weight: 150,
        calories: 195,
        protein: 3.9,
        carbs: 42.0,
        fat: 0.8,
        fiber: 2.0,
        sugar: null,
        sodium_mg: null,
        is_estimated_portion: true,
        portion_assumption: "1 standard katori = 150g cooked rice",
        data_provenance: "verified_database",
        source_reference: "IFCT 2017",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const meals: MealWithItems[] = [
        {
          id: "log-1",
          userId,
          logDate: testDate,
          mealType: "breakfast",
          mealName: null,
          items: [item1],
          totalCalories: 134,
          totalProtein: 4.2,
          totalCarbs: 27.2,
          totalFat: 0.6,
          totalFiber: 1.4,
        },
        {
          id: "log-2",
          userId,
          logDate: testDate,
          mealType: "lunch",
          mealName: null,
          items: [item2],
          totalCalories: 195,
          totalProtein: 3.9,
          totalCarbs: 42.0,
          totalFat: 0.8,
          totalFiber: 2.0,
        },
      ];

      const { totals, targets } = calculateDailyTotals(meals, mockProfile);

      expect(totals.calories).toBe(329); // 134 + 195
      expect(totals.protein).toBe(8.1); // 4.2 + 3.9
      expect(totals.carbs).toBe(69.2); // 27.2 + 42.0
      expect(totals.fat).toBe(1.4); // 0.6 + 0.8
      expect(totals.fiber).toBe(3.4); // 1.4 + 2.0
      expect(totals.total_weight_g).toBe(250); // 100g + 150g

      // Remaining targets
      expect(targets.remainingCalories).toBe(2000 - 329); // 1671
      expect(targets.remainingProtein).toBe(roundToDecimals(120 - 8.1, 1)); // 111.9
    });

    it("clamps remaining calories and macros to zero if target is exceeded", () => {
      const item: MealItem = {
        id: "item-big",
        meal_log_id: "log-1",
        user_id: userId,
        food_id: null,
        food_name: "Feast",
        food_state: "cooked",
        quantity: 1,
        unit: "meal",
        gram_weight: 1200,
        calories: 2500, // exceeds 2000
        protein: 150, // exceeds 120
        carbs: 300,
        fat: 80,
        fiber: 35,
        sugar: null,
        sodium_mg: null,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "user_entered",
        source_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const meals: MealWithItems[] = [
        {
          id: "log-1",
          userId,
          logDate: testDate,
          mealType: "dinner",
          mealName: null,
          items: [item],
          totalCalories: 2500,
          totalProtein: 150,
          totalCarbs: 300,
          totalFat: 80,
          totalFiber: 35,
        },
      ];

      const { targets } = calculateDailyTotals(meals, mockProfile);
      expect(targets.remainingCalories).toBe(0);
      expect(targets.remainingProtein).toBe(0);
    });
  });

  describe("Logging Food Items (addFoodToMeal)", () => {
    it("logs a verified South Indian food using standard portion (Idli: 2 piece)", async () => {
      const mockClient = createMockSupabase();
      const idliFood = SEED_FOODS.find((f) => f.id === "f060-breakfast-idli")!;
      expect(idliFood).toBeDefined();

      const item = await addFoodToMeal(
        userId,
        {
          date: testDate,
          mealType: "breakfast",
          food: idliFood,
          quantity: 2,
          unit: "piece",
        },
        mockClient
      );

      // Verify nutrition snapshotting
      expect(item.user_id).toBe(userId);
      expect(item.food_name).toBe(idliFood.name_en);
      expect(item.food_state).toBe("cooked");
      expect(item.quantity).toBe(2);
      expect(item.unit).toBe("piece");
      expect(item.gram_weight).toBe(90); // 2 * 45g
      expect(item.calories).toBe(118.8); // 132 kcal per 100g * 0.9 = 118.8
      expect(item.protein).toBe(4.05); // 4.5g per 100g * 0.9 = 4.05
      expect(item.data_provenance).toBe("verified_database");

      // Verify container was created
      const logs = mockClient._getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].meal_type).toBe("breakfast");
      expect(logs[0].log_date).toBe(testDate);
    });

    it("logs raw food preserving uncooked weight and RAW state tag", async () => {
      const mockClient = createMockSupabase();
      const rawRice = SEED_FOODS.find((f) => f.id === "f001-rice-ponni-raw")!;
      expect(rawRice).toBeDefined();

      const item = await addFoodToMeal(
        userId,
        {
          date: testDate,
          mealType: "lunch",
          food: rawRice,
          quantity: 100,
          unit: "g",
        },
        mockClient
      );

      expect(item.food_state).toBe("raw");
      expect(item.calories).toBe(353); // ~353 kcal for raw rice vs 130 kcal cooked
      expect(item.gram_weight).toBe(100);
    });

    it("rejects zero or negative quantities", async () => {
      const mockClient = createMockSupabase();
      const idliFood = SEED_FOODS.find((f) => f.name_en === "Idli")!;

      await expect(
        addFoodToMeal(
          userId,
          {
            date: testDate,
            mealType: "breakfast",
            food: idliFood,
            quantity: 0,
            unit: "piece",
          },
          mockClient
        )
      ).rejects.toThrow("Quantity must be greater than zero");

      await expect(
        addFoodToMeal(
          userId,
          {
            date: testDate,
            mealType: "breakfast",
            food: idliFood,
            quantity: -2,
            unit: "piece",
          },
          mockClient
        )
      ).rejects.toThrow("Quantity must be greater than zero");
    });

    it("logs custom user entered food accurately", async () => {
      const mockClient = createMockSupabase();

      const item = await addFoodToMeal(
        userId,
        {
          date: testDate,
          mealType: "snack",
          customFood: {
            name: "Homemade Ragi Laddu",
            state: "cooked",
            calories: 180,
            protein: 3.5,
            carbs: 28,
            fat: 5.5,
            fiber: 2.1,
          },
          quantity: 1,
          unit: "piece",
        },
        mockClient
      );

      expect(item.food_name).toBe("Homemade Ragi Laddu");
      expect(item.calories).toBe(180);
      expect(item.protein).toBe(3.5);
      expect(item.data_provenance).toBe("user_entered");
    });
  });

  describe("Updating Food Portions (updateMealItemQuantity)", () => {
    it("recalculates nutrition when quantity is scaled up (e.g. from 2 to 4 idlis)", async () => {
      const idliFood = SEED_FOODS.find((f) => f.id === "f060-breakfast-idli")!;
      expect(idliFood).toBeDefined();

      const existingLog: MealLog = {
        id: "log-1",
        user_id: userId,
        log_date: testDate,
        meal_type: "breakfast",
        meal_name: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const existingItem: MealItem = {
        id: "item-idli",
        meal_log_id: "log-1",
        user_id: userId,
        food_id: idliFood.id,
        food_name: idliFood.name_en,
        food_state: "cooked",
        quantity: 2,
        unit: "piece",
        gram_weight: 90,
        calories: 119,
        protein: 3.6,
        carbs: 24.3,
        fat: 0.5,
        fiber: 1.3,
        sugar: null,
        sodium_mg: null,
        is_estimated_portion: true,
        portion_assumption: "1 medium idli = 45g",
        data_provenance: "verified_database",
        source_reference: "IFCT 2017",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockClient = createMockSupabase([existingLog], [existingItem]);

      const updated = await updateMealItemQuantity(
        userId,
        "item-idli",
        { quantity: 4 },
        mockClient
      );

      expect(updated.quantity).toBe(4);
      expect(updated.gram_weight).toBe(180); // 4 * 45g
      expect(updated.calories).toBe(237.6); // 132 kcal per 100g * 1.8 = 237.6
      expect(updated.protein).toBe(8.1); // 4.5g per 100g * 1.8 = 8.1
    });

    it("rejects unauthorized updates from a different user", async () => {
      const existingItem: MealItem = {
        id: "item-victim",
        meal_log_id: "log-1",
        user_id: "user-victim",
        food_id: null,
        food_name: "Item",
        food_state: "cooked",
        quantity: 1,
        unit: "g",
        gram_weight: 100,
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
        fiber: 1,
        sugar: null,
        sodium_mg: null,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "user_entered",
        source_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockClient = createMockSupabase([], [existingItem]);

      // Attacker tries to modify victim's item
      await expect(
        updateMealItemQuantity(
          "user-attacker",
          "item-victim",
          { quantity: 5 },
          mockClient
        )
      ).rejects.toThrow("Meal item not found or unauthorized");
    });
  });

  describe("Deleting Food Items (deleteMealItem)", () => {
    it("deletes a meal item successfully", async () => {
      const existingItem: MealItem = {
        id: "item-delete-me",
        meal_log_id: "log-1",
        user_id: userId,
        food_id: null,
        food_name: "Item",
        food_state: "cooked",
        quantity: 1,
        unit: "g",
        gram_weight: 100,
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
        fiber: 1,
        sugar: null,
        sodium_mg: null,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "user_entered",
        source_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockClient = createMockSupabase([], [existingItem]);
      expect(mockClient._getItems().length).toBe(1);

      const res = await deleteMealItem(userId, "item-delete-me", mockClient);
      expect(res.success).toBe(true);
      expect(mockClient._getItems().length).toBe(0);
    });
  });
});

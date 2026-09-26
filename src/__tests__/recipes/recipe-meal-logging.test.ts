import { describe, it, expect } from "vitest";
import { addFoodToMeal, updateMealItemQuantity, deleteMealItem } from "@/lib/meals/meal-service";
import type { MealItem, MealLog, Recipe } from "@/lib/supabase/types";

// In-memory mock Supabase client simulating foreign-key cascades and SET NULL
function createMockSupabaseWithRecipes(
  initialRecipes: Recipe[] = [],
  initialLogs: MealLog[] = [],
  initialItems: MealItem[] = []
) {
  const recipes = [...initialRecipes];
  const mealLogs = [...initialLogs];
  const mealItems = [...initialItems];

  const client: any = {
    from: (table: string) => {
      if (table === "recipes") {
        return {
          select: (_cols?: string) => ({
            eq: (field: string, val: any) => ({
              eq: (field2: string, val2: any) => ({
                single: async () => {
                  const match = recipes.find(
                    (r) => r[field as keyof Recipe] === val && r[field2 as keyof Recipe] === val2
                  );
                  return { data: match || null, error: match ? null : { message: "Recipe not found" } };
                },
                maybeSingle: async () => {
                  const match = recipes.find(
                    (r) => r[field as keyof Recipe] === val && r[field2 as keyof Recipe] === val2
                  );
                  return { data: match || null, error: null };
                },
              }),
            }),
          }),
          delete: () => ({
            eq: (field: string, val: any) => ({
              eq: (field2: string, val2: any) => {
                const idx = recipes.findIndex(
                  (r) => r[field as keyof Recipe] === val && r[field2 as keyof Recipe] === val2
                );
                if (idx !== -1) {
                  const deletedRecipeId = recipes[idx].id;
                  recipes.splice(idx, 1);
                  // Simulate foreign key ON DELETE SET NULL on meal_items:
                  mealItems.forEach((it) => {
                    if (it.recipe_id === deletedRecipeId) {
                      it.recipe_id = null;
                    }
                  });
                }
                return { error: null };
              },
            }),
          }),
        };
      }

      if (table === "meal_logs") {
        return {
          select: (_cols?: string) => ({
            eq: (f1: string, v1: any) => ({
              eq: (f2: string, v2: any) => ({
                eq: (f3: string, v3: any) => ({
                  maybeSingle: async () => {
                    const match = mealLogs.find(
                      (l) => l[f1 as keyof MealLog] === v1 &&
                             l[f2 as keyof MealLog] === v2 &&
                             l[f3 as keyof MealLog] === v3
                    );
                    return { data: match || null, error: null };
                  },
                }),
              }),
              single: async () => {
                const match = mealLogs.find((l) => l[f1 as keyof MealLog] === v1);
                return { data: match || null, error: match ? null : { message: "Not found" } };
              },
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const id = payload.id || `log-${Date.now()}-${Math.random()}`;
                const row: MealLog = {
                  id,
                  user_id: payload.user_id,
                  log_date: payload.log_date,
                  meal_type: payload.meal_type,
                  meal_name: payload.meal_name || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                mealLogs.push(row);
                return { data: row, error: null };
              },
            }),
          }),
        };
      }

      if (table === "meal_items") {
        return {
          select: (_cols?: string) => ({
            eq: (f1: string, v1: any) => ({
              eq: (f2: string, v2: any) => ({
                single: async () => {
                  const match = mealItems.find(
                    (it) => it[f1 as keyof MealItem] === v1 && it[f2 as keyof MealItem] === v2
                  );
                  return { data: match || null, error: match ? null : { message: "Item not found" } };
                },
              }),
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const id = payload.id || `item-${Date.now()}-${Math.random()}`;
                const row: MealItem = {
                  id,
                  meal_log_id: payload.meal_log_id,
                  user_id: payload.user_id,
                  food_id: payload.food_id || null,
                  recipe_id: payload.recipe_id || null,
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
                mealItems.push(row);
                return { data: row, error: null };
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

      return {};
    },
    _getRecipes: () => recipes,
    _getMealItems: () => mealItems,
  };

  return client;
}

describe("Recipe -> Meal Logging & Historical Snapshot Integrity", () => {
  const userId = "user-alice";
  const logDate = "2026-10-10";

  // Standard Recipe:
  // Batch: 800g raw ingredients -> 700g cooked batch weight
  // Total Nutrition: 1050 kcal, 112g Protein, 28g Carbs, 35g Fat, 7g Fiber
  // Per 100g: 150 kcal, 16g P, 4g C, 5g F, 1g Fiber
  const chickenCurryRecipe: Recipe = {
    id: "recipe-curry-1",
    user_id: userId,
    name: "Chettinad Chicken Curry",
    description: "Home batch curry",
    notes: null,
    final_cooked_weight_g: 700,
    total_weight_g: 700,
    total_raw_weight_g: 800,
    servings: 4,
    total_calories: 1050,
    total_protein: 112,
    total_carbs: 28,
    total_fat: 35,
    total_fiber: 7,
    total_sugar: null,
    total_sodium_mg: null,
    calories_per_100g: 150,
    protein_per_100g: 16,
    carbs_per_100g: 4,
    fat_per_100g: 5,
    fiber_per_100g: 1,
    sugar_per_100g: null,
    sodium_mg_per_100g: null,
    is_estimated_portion: false,
    data_provenance: "verified_database",
    is_public: false,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
  };

  it("successfully logs a 200g serving of a recipe into a dinner meal container", async () => {
    const mockClient = createMockSupabaseWithRecipes([chickenCurryRecipe]);

    // User logs 200g of Chettinad Chicken Curry
    const item = await addFoodToMeal(
      userId,
      {
        date: logDate,
        mealType: "dinner",
        recipeId: chickenCurryRecipe.id,
        quantity: 200,
        unit: "g",
      },
      mockClient
    );

    // Verify snapshot fields
    expect(item.user_id).toBe(userId);
    expect(item.food_name).toBe("Chettinad Chicken Curry");
    expect(item.food_state).toBe("cooked");
    expect(item.recipe_id).toBe(chickenCurryRecipe.id);
    expect(item.food_id).toBeNull();
    expect(item.quantity).toBe(200);
    expect(item.unit).toBe("g");
    expect(item.gram_weight).toBe(200);

    // Calculation: 200g / 700g * 1050 kcal = 300 kcal
    expect(item.calories).toBe(300);
    // Protein: 200g / 700g * 112g = 32g
    expect(item.protein).toBe(32);
    // Fat: 200g / 700g * 35g = 10g
    expect(item.fat).toBe(10);
    // Carbs: 200g / 700g * 28g = 8g
    expect(item.carbs).toBe(8);
  });

  it("CRITICAL: Historical meal snapshot is preserved when the original recipe is modified later", async () => {
    const mockClient = createMockSupabaseWithRecipes([chickenCurryRecipe]);

    // 1. Log 200g of recipe today
    const item = await addFoodToMeal(
      userId,
      {
        date: logDate,
        mealType: "lunch",
        recipeId: chickenCurryRecipe.id,
        quantity: 200,
        unit: "g",
      },
      mockClient
    );

    expect(item.calories).toBe(300);
    expect(item.protein).toBe(32);

    // 2. Tomorrow, user changes recipe: adds 50g ghee, increasing total calories to 1800 kcal
    const recipes = mockClient._getRecipes();
    recipes[0] = {
      ...recipes[0],
      total_calories: 1800, // modified!
      calories_per_100g: 257.1,
    };

    // 3. Inspect historical meal item - it MUST still have the original 300 kcal!
    const mealItems = mockClient._getMealItems();
    const historicalItem = mealItems.find((it: MealItem) => it.id === item.id);
    expect(historicalItem).toBeDefined();
    expect(historicalItem.calories).toBe(300);
    expect(historicalItem.protein).toBe(32);
  });

  it("CRITICAL: Deleting the recipe does NOT delete or corrupt the historical meal log item (ON DELETE SET NULL)", async () => {
    const mockClient = createMockSupabaseWithRecipes([chickenCurryRecipe]);

    // 1. Log recipe
    const item = await addFoodToMeal(
      userId,
      {
        date: logDate,
        mealType: "dinner",
        recipeId: chickenCurryRecipe.id,
        quantity: 200,
        unit: "g",
      },
      mockClient
    );

    expect(item.recipe_id).toBe(chickenCurryRecipe.id);
    expect(item.calories).toBe(300);

    // 2. User deletes the recipe from their recipe book
    const { error } = await mockClient
      .from("recipes")
      .delete()
      .eq("id", chickenCurryRecipe.id)
      .eq("user_id", userId);

    expect(error).toBeNull();
    expect(mockClient._getRecipes().length).toBe(0);

    // 3. Verify historical meal item still exists and has all nutrition data intact
    const mealItems = mockClient._getMealItems();
    expect(mealItems.length).toBe(1);
    expect(mealItems[0].id).toBe(item.id);
    expect(mealItems[0].recipe_id).toBeNull(); // Foreign key set to NULL
    expect(mealItems[0].food_name).toBe("Chettinad Chicken Curry");
    expect(mealItems[0].calories).toBe(300);
    expect(mealItems[0].protein).toBe(32);
  });

  it("allows updating the logged portion quantity of a recipe in the meal timeline", async () => {
    const mockClient = createMockSupabaseWithRecipes([chickenCurryRecipe]);

    // 1. Log 200g serving (300 kcal)
    const item = await addFoodToMeal(
      userId,
      {
        date: logDate,
        mealType: "dinner",
        recipeId: chickenCurryRecipe.id,
        quantity: 200,
        unit: "g",
      },
      mockClient
    );

    // 2. User realizes they actually ate 350g (half the pot: 350 / 700 * 1050 = 525 kcal)
    const updated = await updateMealItemQuantity(
      userId,
      item.id,
      { quantity: 350 },
      mockClient
    );

    expect(updated.quantity).toBe(350);
    expect(updated.gram_weight).toBe(350);
    expect(updated.calories).toBe(525);
    expect(updated.protein).toBe(56); // 350 / 700 * 112 = 56g
  });
});

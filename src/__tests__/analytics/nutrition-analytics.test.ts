import { describe, it, expect } from "vitest";
import { getNutritionAnalytics } from "@/lib/analytics/nutrition-analytics-service";
import { normalizeDateString } from "@/lib/meals/meal-service";
import type { MealItem, MealLog, Profile } from "@/lib/supabase/types";

function createMockSupabaseForAnalytics(
  profile: Profile,
  mealLogs: MealLog[],
  mealItems: MealItem[]
) {
  const client: any = {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_field: string, id: string) => ({
              single: async () => {
                if (profile.id === id) return { data: profile, error: null };
                return { data: null, error: { message: "Profile not found" } };
              },
            }),
          }),
        };
      }

      if (table === "meal_logs") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              gte: (startDateCol: string, startVal: string) => ({
                lte: async (endDateCol: string, endVal: string) => {
                  const filtered = mealLogs.filter(
                    (l) =>
                      (l as any)[field] === val &&
                      l.log_date >= startVal &&
                      l.log_date <= endVal
                  );
                  return { data: filtered, error: null };
                },
              }),
            }),
          }),
        };
      }

      if (table === "meal_items") {
        return {
          select: () => ({
            in: async (field: string, values: string[]) => {
              const filtered = mealItems.filter((i) =>
                values.includes((i as any)[field])
              );
              return { data: filtered, error: null };
            },
          }),
        };
      }

      return {};
    },
  };

  return client;
}

describe("Phase 6 - Nutrition Analytics & Historical Aggregation Service", () => {
  const userA = "user-analytics-test-1";

  const defaultProfile: Profile = {
    id: userA,
    email: "analyst@nammacal.local",
    full_name: "Analytics User",
    role: "member",
    status: "active",
    invited_by: null,
    daily_calorie_target: 2000,
    daily_protein_target: 120,
    daily_carb_target: 220,
    daily_fat_target: 60,
    daily_fiber_target: 35,
    daily_water_ml_target: 2500,
    daily_step_target: 8000,
    preferred_language: "en",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  it("aggregates saved snapshots accurately across a 7-day period", async () => {
    const today = new Date();
    const todayStr = normalizeDateString(today);

    const dMinus1 = new Date(today);
    dMinus1.setDate(dMinus1.getDate() - 1);
    const dMinus1Str = normalizeDateString(dMinus1);

    const dMinus2 = new Date(today);
    dMinus2.setDate(dMinus2.getDate() - 2);
    const dMinus2Str = normalizeDateString(dMinus2);

    const logs: MealLog[] = [
      {
        id: "log-1",
        user_id: userA,
        log_date: todayStr,
        meal_type: "breakfast",
        meal_name: null,
        created_at: "2026-10-05T08:00:00Z",
        updated_at: "2026-10-05T08:00:00Z",
      },
      {
        id: "log-2",
        user_id: userA,
        log_date: dMinus1Str,
        meal_type: "lunch",
        meal_name: null,
        created_at: "2026-10-04T13:00:00Z",
        updated_at: "2026-10-04T13:00:00Z",
      },
      {
        id: "log-3",
        user_id: userA,
        log_date: dMinus2Str,
        meal_type: "dinner",
        meal_name: null,
        created_at: "2026-10-03T20:00:00Z",
        updated_at: "2026-10-03T20:00:00Z",
      },
    ];

    // Historical snapshots in meal_items
    const items: MealItem[] = [
      {
        id: "item-1",
        meal_log_id: "log-1",
        user_id: userA,
        food_id: "food-1",
        recipe_id: null,
        food_name: "Item 1",
        food_state: "cooked",
        quantity: 2,
        unit: "piece",
        gram_weight: 100,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
        fiber: 4,
        sugar: 1,
        sodium_mg: 120,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-05T08:00:00Z",
        updated_at: "2026-10-05T08:00:00Z",
      },
      {
        id: "item-2",
        meal_log_id: "log-2",
        user_id: userA,
        food_id: "food-2",
        recipe_id: null,
        food_name: "Item 2",
        food_state: "cooked",
        quantity: 1,
        unit: "serving",
        gram_weight: 250,
        calories: 600,
        protein: 30,
        carbs: 80,
        fat: 15,
        fiber: 8,
        sugar: 2,
        sodium_mg: 300,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-04T13:00:00Z",
        updated_at: "2026-10-04T13:00:00Z",
      },
      {
        id: "item-3",
        meal_log_id: "log-3",
        user_id: userA,
        food_id: "food-3",
        recipe_id: null,
        food_name: "Item 3",
        food_state: "cooked",
        quantity: 1,
        unit: "serving",
        gram_weight: 200,
        calories: 500,
        protein: 20,
        carbs: 70,
        fat: 10,
        fiber: 6,
        sugar: 2,
        sodium_mg: 200,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-03T20:00:00Z",
        updated_at: "2026-10-03T20:00:00Z",
      },
    ];

    const client = createMockSupabaseForAnalytics(defaultProfile, logs, items);
    const analytics = await getNutritionAnalytics(userA, 7, client);

    expect(analytics.periodDays).toBe(7);
    expect(analytics.totalDays).toBe(7);
    expect(analytics.loggedDaysCount).toBe(3);
    expect(analytics.emptyDaysCount).toBe(4);
    // Adherence: 3 / 7 = 43%
    expect(analytics.adherencePercentage).toBe(43);

    // Averages across 3 logged days:
    // Calories: (300 + 600 + 500) / 3 = 1400 / 3 = 467 kcal
    expect(analytics.averageCalories).toBe(467);
    // Protein: (10 + 30 + 20) / 3 = 60 / 3 = 20g
    expect(analytics.averageProtein).toBe(20);
    // Carbs: (50 + 80 + 70) / 3 = 200 / 3 = 66.7g
    expect(analytics.averageCarbs).toBe(66.7);
    // Fat: (5 + 15 + 10) / 3 = 30 / 3 = 10g
    expect(analytics.averageFat).toBe(10);
    // Fiber: (4 + 8 + 6) / 3 = 18 / 3 = 6g
    expect(analytics.averageFiber).toBe(6);

    // Verify daily data points
    expect(analytics.dailyData.length).toBe(7);
    const todayPoint = analytics.dailyData.find((d) => d.date === todayStr);
    expect(todayPoint).toBeDefined();
    expect(todayPoint?.hasData).toBe(true);
    expect(todayPoint?.calories).toBe(300);
    expect(todayPoint?.protein).toBe(10);
    // Target difference: 300 - 2000 = -1700
    expect(todayPoint?.calorieDifference).toBe(-1700);
  });

  it("handles completely empty periods (0 logged days) gracefully", async () => {
    const client = createMockSupabaseForAnalytics(defaultProfile, [], []);
    const analytics = await getNutritionAnalytics(userA, 7, client);

    expect(analytics.loggedDaysCount).toBe(0);
    expect(analytics.emptyDaysCount).toBe(7);
    expect(analytics.adherencePercentage).toBe(0);
    expect(analytics.averageCalories).toBe(0);
    expect(analytics.averageProtein).toBe(0);
    expect(analytics.averageCarbs).toBe(0);
    expect(analytics.averageFat).toBe(0);
    expect(analytics.averageFiber).toBe(0);
    expect(analytics.dailyData.length).toBe(7);
    expect(analytics.dailyData.every((d) => !d.hasData && d.calories === 0)).toBe(true);
  });

  it("strictly aggregates snapshotted meal_items and does NOT recompute from current food table", async () => {
    // Invariant: If food item nutrition snapshot in meal_items differs from current food,
    // analytics must reflect the snapshot stored at log time.
    const today = normalizeDateString(new Date());
    const logs: MealLog[] = [
      {
        id: "snapshot-log-1",
        user_id: userA,
        log_date: today,
        meal_type: "breakfast",
        meal_name: null,
        created_at: "2026-10-05T08:00:00Z",
        updated_at: "2026-10-05T08:00:00Z",
      },
    ];

    // Arbitrary snapshotted numbers
    const items: MealItem[] = [
      {
        id: "snapshot-item-1",
        meal_log_id: "snapshot-log-1",
        user_id: userA,
        food_id: "food-changed-later",
        recipe_id: null,
        food_name: "Snapshotted Item",
        food_state: "cooked",
        quantity: 1,
        unit: "serving",
        gram_weight: 100,
        calories: 999,
        protein: 77.7,
        carbs: 88.8,
        fat: 44.4,
        fiber: 22.2,
        sugar: 5,
        sodium_mg: 100,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-05T08:00:00Z",
        updated_at: "2026-10-05T08:00:00Z",
      },
    ];

    const client = createMockSupabaseForAnalytics(defaultProfile, logs, items);
    const analytics = await getNutritionAnalytics(userA, 7, client);

    const loggedDay = analytics.dailyData.find((d) => d.date === today);
    expect(loggedDay?.calories).toBe(999);
    expect(loggedDay?.protein).toBe(77.7);
    expect(loggedDay?.carbs).toBe(88.8);
    expect(loggedDay?.fat).toBe(44.4);
    expect(loggedDay?.fiber).toBe(22.2);
  });

  it("calculates positive calorieDifference when calories exceed target (surplus)", async () => {
    const today = normalizeDateString(new Date());
    const logs: MealLog[] = [
      {
        id: "surplus-log",
        user_id: userA,
        log_date: today,
        meal_type: "lunch",
        meal_name: null,
        created_at: "2026-10-05T12:00:00Z",
        updated_at: "2026-10-05T12:00:00Z",
      },
    ];

    const items: MealItem[] = [
      {
        id: "surplus-item",
        meal_log_id: "surplus-log",
        user_id: userA,
        food_id: "food-feast",
        recipe_id: null,
        food_name: "Feast",
        food_state: "cooked",
        quantity: 1,
        unit: "serving",
        gram_weight: 500,
        calories: 2450, // 450 over 2000 target
        protein: 130,
        carbs: 300,
        fat: 80,
        fiber: 40,
        sugar: 10,
        sodium_mg: 800,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-05T12:00:00Z",
        updated_at: "2026-10-05T12:00:00Z",
      },
    ];

    const client = createMockSupabaseForAnalytics(defaultProfile, logs, items);
    const analytics = await getNutritionAnalytics(userA, 7, client);

    const loggedDay = analytics.dailyData.find((d) => d.date === today);
    expect(loggedDay?.calories).toBe(2450);
    expect(loggedDay?.calorieDifference).toBe(450);
  });
});

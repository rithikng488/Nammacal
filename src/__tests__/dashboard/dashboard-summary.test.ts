import { describe, it, expect } from "vitest";
import {
  calculateDailyTotals,
  getDailyMeals,
  normalizeDateString,
  type MealWithItems,
} from "@/lib/meals/meal-service";
import { calculateWeightChange } from "@/lib/weight/weight-service";
import { getUserTargets } from "@/lib/targets/target-service";
import type { MealItem, MealLog, Profile, WeightLog } from "@/lib/supabase/types";

function createMockDashboardSupabase(
  profile: Profile,
  mealLogs: MealLog[] = [],
  mealItems: MealItem[] = [],
  weightLogs: WeightLog[] = []
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
              maybeSingle: async () => {
                if (profile.id === id) return { data: profile, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        };
      }

      if (table === "meal_logs") {
        return {
          select: (_cols?: string) => ({
            eq: (f1: string, v1: any) => ({
              eq: (f2: string, v2: any) => {
                const filtered = mealLogs.filter(
                  (l) => (l as any)[f1] === v1 && (l as any)[f2] === v2
                );
                return {
                  order: (_col: string, _opts?: any) => {
                    return Promise.resolve({ data: filtered, error: null });
                  },
                  then: (resolve: any, reject?: any) => {
                    return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
                  },
                };
              },
            }),
          }),
        };
      }

      if (table === "meal_items") {
        return {
          select: (_cols?: string) => ({
            eq: (f1: string, v1: any) => ({
              in: (f2: string, values: string[]) => {
                const filtered = mealItems.filter(
                  (i) => (i as any)[f1] === v1 && values.includes((i as any)[f2])
                );
                return {
                  order: (_col: string, _opts?: any) => {
                    return Promise.resolve({ data: filtered, error: null });
                  },
                  then: (resolve: any, reject?: any) => {
                    return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
                  },
                };
              },
            }),
          }),
        };
      }

      if (table === "weight_logs") {
        return {
          select: () => {
            let filtered = [...weightLogs];
            let limitNum: number | null = null;
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((w) => (w as any)[f] === v);
                return builder;
              },
              order: (f: string, opts?: { ascending?: boolean }) => {
                const asc = opts?.ascending ?? true;
                filtered.sort((a: any, b: any) => {
                  if (a[f] < b[f]) return asc ? -1 : 1;
                  if (a[f] > b[f]) return asc ? 1 : -1;
                  return 0;
                });
                return builder;
              },
              limit: (lim: number) => {
                limitNum = lim;
                return builder;
              },
              then: (resolve: any, reject?: any) => {
                const res = limitNum !== null ? filtered.slice(0, limitNum) : filtered;
                return Promise.resolve({ data: res, error: null }).then(resolve, reject);
              },
            };
            return builder;
          },
        };
      }

      return {};
    },
  };

  return client;
}

describe("Phase 6 - Dashboard Daily Summary & Progress Logic", () => {
  const userA = "dashboard-user-1";
  const today = normalizeDateString(new Date());

  const profile: Profile = {
    id: userA,
    email: "dash@nammacal.local",
    full_name: "Dashboard User",
    role: "member",
    status: "active",
    invited_by: null,
    daily_calorie_target: 2100,
    daily_protein_target: 130,
    daily_carb_target: 240,
    daily_fat_target: 65,
    daily_fiber_target: 35,
    daily_water_ml_target: 3000,
    daily_step_target: 10000,
    preferred_language: "en",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  it("calculates accurate daily consumed totals, remaining targets, and meal breakdown", async () => {
    const mealLogs: MealLog[] = [
      {
        id: "log-breakfast",
        user_id: userA,
        log_date: today,
        meal_type: "breakfast",
        meal_name: null,
        created_at: "2026-10-06T08:00:00Z",
        updated_at: "2026-10-06T08:00:00Z",
      },
      {
        id: "log-lunch",
        user_id: userA,
        log_date: today,
        meal_type: "lunch",
        meal_name: null,
        created_at: "2026-10-06T13:00:00Z",
        updated_at: "2026-10-06T13:00:00Z",
      },
    ];

    const mealItems: MealItem[] = [
      {
        id: "item-idli",
        meal_log_id: "log-breakfast",
        user_id: userA,
        food_id: "food-idli",
        recipe_id: null,
        food_name: "Idli",
        food_state: "cooked",
        quantity: 3,
        unit: "piece",
        gram_weight: 150,
        calories: 210,
        protein: 6.0,
        carbs: 45.0,
        fat: 0.6,
        fiber: 2.1,
        sugar: 0.3,
        sodium_mg: 150,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-06T08:00:00Z",
        updated_at: "2026-10-06T08:00:00Z",
      },
      {
        id: "item-sambar",
        meal_log_id: "log-breakfast",
        user_id: userA,
        food_id: "food-sambar",
        recipe_id: null,
        food_name: "Sambar",
        food_state: "cooked",
        quantity: 1,
        unit: "bowl",
        gram_weight: 150,
        calories: 120,
        protein: 4.5,
        carbs: 18.0,
        fat: 3.5,
        fiber: 3.0,
        sugar: 1.0,
        sodium_mg: 350,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-06T08:00:00Z",
        updated_at: "2026-10-06T08:00:00Z",
      },
      {
        id: "item-biryani",
        meal_log_id: "log-lunch",
        user_id: userA,
        food_id: "food-biryani",
        recipe_id: null,
        food_name: "Chicken Biryani",
        food_state: "cooked",
        quantity: 1,
        unit: "plate",
        gram_weight: 350,
        calories: 650,
        protein: 35.0,
        carbs: 75.0,
        fat: 22.0,
        fiber: 4.0,
        sugar: 2.0,
        sodium_mg: 600,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "2026-10-06T13:00:00Z",
        updated_at: "2026-10-06T13:00:00Z",
      },
    ];

    const weightLogs: WeightLog[] = [
      {
        id: "w-latest",
        user_id: userA,
        weight_kg: 72.4,
        logged_at: today,
        note: "Morning fasted",
        created_at: "2026-10-06T07:00:00Z",
        updated_at: "2026-10-06T07:00:00Z",
      },
      {
        id: "w-previous",
        user_id: userA,
        weight_kg: 73.0,
        logged_at: "2026-10-03",
        note: null,
        created_at: "2026-10-03T07:00:00Z",
        updated_at: "2026-10-03T07:00:00Z",
      },
    ];

    const client = createMockDashboardSupabase(profile, mealLogs, mealItems, weightLogs);

    // 1. Fetch timeline
    const timeline = await getDailyMeals(userA, today, client);

    // Verify Breakfast totals: 210 + 120 = 330 kcal
    const breakfast = timeline.meals.find((m) => m.mealType === "breakfast");
    expect(breakfast).toBeDefined();
    expect(breakfast?.items.length).toBe(2);
    expect(breakfast?.totalCalories).toBe(330);
    expect(breakfast?.totalProtein).toBe(10.5);

    // Verify Lunch totals: 650 kcal
    const lunch = timeline.meals.find((m) => m.mealType === "lunch");
    expect(lunch).toBeDefined();
    expect(lunch?.items.length).toBe(1);
    expect(lunch?.totalCalories).toBe(650);
    expect(lunch?.totalProtein).toBe(35);

    // Verify Day Totals: 330 + 650 = 980 kcal
    expect(timeline.totals.calories).toBe(980);
    expect(timeline.totals.protein).toBe(45.5);
    expect(timeline.totals.carbs).toBe(138);
    expect(timeline.totals.fat).toBe(26.1);
    expect(timeline.totals.fiber).toBe(9.1);

    // Verify Remaining targets: 2100 - 980 = 1120 remaining kcal
    expect(timeline.targets.calories).toBe(2100);
    expect(timeline.targets.remainingCalories).toBe(1120);
    expect(timeline.targets.remainingProtein).toBe(84.5); // 130 - 45.5

    // 2. Fetch targets service
    const targets = await getUserTargets(userA, client);
    expect(targets.dailyCalories).toBe(2100);
    expect(targets.dailyProteinG).toBe(130);
    expect(targets.dailyWaterMl).toBe(3000);
    expect(targets.dailySteps).toBe(10000);

    // 3. Weight change
    const weightData = await calculateWeightChange(userA, client);
    expect(weightData.current?.weight_kg).toBe(72.4);
    expect(weightData.previous?.weight_kg).toBe(73.0);
    expect(weightData.changeKg).toBe(-0.6); // 72.4 - 73.0 = -0.6 kg
  });

  it("handles empty day state with 0 consumed and full targets remaining", async () => {
    const client = createMockDashboardSupabase(profile, [], [], []);

    const timeline = await getDailyMeals(userA, today, client);

    expect(timeline.totals.calories).toBe(0);
    expect(timeline.totals.protein).toBe(0);
    expect(timeline.totals.carbs).toBe(0);
    expect(timeline.totals.fat).toBe(0);
    expect(timeline.totals.fiber).toBe(0);

    expect(timeline.targets.remainingCalories).toBe(2100);
    expect(timeline.meals.length).toBe(4);
    expect(timeline.meals.every((m) => m.items.length === 0)).toBe(true);

    const weightData = await calculateWeightChange(userA, client);
    expect(weightData.current).toBeNull();
    expect(weightData.previous).toBeNull();
    expect(weightData.changeKg).toBeNull();
  });

  it("handles calorie target exceeded without negative remaining calories", () => {
    const mockMeals: MealWithItems[] = [
      {
        id: "log-heavy",
        userId: userA,
        logDate: today,
        mealType: "dinner",
        mealName: null,
        totalCalories: 2500,
        totalProtein: 150,
        totalCarbs: 300,
        totalFat: 80,
        totalFiber: 40,
        items: [
          {
            id: "heavy-item",
            meal_log_id: "log-heavy",
            user_id: userA,
            food_id: "food-heavy",
            recipe_id: null,
            food_name: "Heavy Meal",
            food_state: "cooked",
            quantity: 1,
            unit: "meal",
            gram_weight: 800,
            calories: 2500,
            protein: 150,
            carbs: 300,
            fat: 80,
            fiber: 40,
            sugar: 10,
            sodium_mg: 1000,
            is_estimated_portion: false,
            portion_assumption: null,
            data_provenance: "verified_database",
            source_reference: null,
            created_at: "2026-10-06T20:00:00Z",
            updated_at: "2026-10-06T20:00:00Z",
          },
        ],
      },
    ];

    const { totals, targets } = calculateDailyTotals(mockMeals, profile);
    expect(totals.calories).toBe(2500);
    expect(targets.remainingCalories).toBe(0);

    const surplusCalories = totals.calories - targets.calories;
    expect(surplusCalories).toBe(400); // 2500 - 2100 = 400 kcal surplus
  });
});

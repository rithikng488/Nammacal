import { describe, it, expect } from "vitest";
import { getDailyMeals, normalizeDateString } from "@/lib/meals/meal-service";
import { getUserTargets } from "@/lib/targets/target-service";
import { calculateWeightChange } from "@/lib/weight/weight-service";
import { getDailyActivitySummary } from "@/lib/activity/activity-service";
import { getDailyWaterSummary } from "@/lib/water/water-service";
import { getUserHabitsWithTodayStatus } from "@/lib/habits/habit-service";
import type {
  Profile,
  MealLog,
  MealItem,
  WeightLog,
  ActivityLog,
  DailyActivitySummary,
  WaterLog,
  Habit,
  HabitLog,
} from "@/lib/supabase/types";

function createMockFullDashboardSupabase(data: {
  profile: Profile;
  mealLogs?: MealLog[];
  mealItems?: MealItem[];
  weightLogs?: WeightLog[];
  activityLogs?: ActivityLog[];
  activitySummaries?: DailyActivitySummary[];
  waterLogs?: WaterLog[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
}) {
  const profile = { ...data.profile };
  const mealLogs = [...(data.mealLogs || [])];
  const mealItems = [...(data.mealItems || [])];
  const weightLogs = [...(data.weightLogs || [])];
  const activityLogs = [...(data.activityLogs || [])];
  const activitySummaries = [...(data.activitySummaries || [])];
  const waterLogs = [...(data.waterLogs || [])];
  const habits = [...(data.habits || [])];
  const habitLogs = [...(data.habitLogs || [])];

  const client: any = {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_f: string, idVal: string) => ({
              single: async () => {
                if (profile.id === idVal) return { data: profile, error: null };
                return { data: null, error: { message: "Profile not found" } };
              },
              maybeSingle: async () => {
                if (profile.id === idVal) return { data: profile, error: null };
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
                  order: () => Promise.resolve({ data: filtered, error: null }),
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
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
                  order: () => Promise.resolve({ data: filtered, error: null }),
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
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
              limit: (n: number) => {
                limitNum = n;
                return builder;
              },
              then: (resolve: any) => {
                const res = limitNum !== null ? filtered.slice(0, limitNum) : filtered;
                resolve({ data: res, error: null });
              },
            };
            return builder;
          },
        };
      }

      if (table === "activity_logs") {
        return {
          select: (_cols?: string) => {
            let filtered = [...activityLogs];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((a) => (a as any)[f] === v);
                return builder;
              },
              order: () => builder,
              then: (resolve: any) => resolve({ data: filtered, error: null }),
            };
            return builder;
          },
        };
      }

      if (table === "daily_activity_summary") {
        return {
          select: () => {
            let filtered = [...activitySummaries];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((s) => (s as any)[f] === v);
                return builder;
              },
              then: (resolve: any) => resolve({ data: filtered, error: null }),
            };
            return builder;
          },
        };
      }

      if (table === "water_logs") {
        return {
          select: () => {
            let filtered = [...waterLogs];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((w) => (w as any)[f] === v);
                return builder;
              },
              order: () => builder,
              then: (resolve: any) => resolve({ data: filtered, error: null }),
            };
            return builder;
          },
        };
      }

      if (table === "habits") {
        return {
          select: () => {
            let filtered = [...habits];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((h) => (h as any)[f] === v);
                return builder;
              },
              order: () => builder,
              then: (resolve: any) => resolve({ data: filtered, error: null }),
            };
            return builder;
          },
        };
      }

      if (table === "habit_logs") {
        return {
          select: () => {
            let filtered = [...habitLogs];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((l) => (l as any)[f] === v);
                return builder;
              },
              in: (f: string, vals: any[]) => {
                filtered = filtered.filter((l) => vals.includes((l as any)[f]));
                return builder;
              },
              gte: (f: string, v: any) => {
                filtered = filtered.filter((l) => (l as any)[f] >= v);
                return builder;
              },
              lte: (f: string, v: any) => {
                filtered = filtered.filter((l) => (l as any)[f] <= v);
                return builder;
              },
              then: (resolve: any) => resolve({ data: filtered, error: null }),
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

describe("Phase 7 - Dashboard Full Integration & Nutrition Invariant", () => {
  const userA = "user-dash-full-1";
  const today = normalizeDateString(new Date());

  const profile: Profile = {
    id: userA,
    email: "dashfull@nammacal.local",
    full_name: "Full Dash User",
    role: "member",
    status: "active",
    invited_by: null,
    daily_calorie_target: 2000,
    daily_protein_target: 120,
    daily_carb_target: 230,
    daily_fat_target: 65,
    daily_fiber_target: 35,
    daily_water_ml_target: 2500,
    daily_step_target: 10000,
    preferred_language: "en",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  it("assembles complete dashboard data across all Phase 1-7 subsystems", async () => {
    // 1. Food Meal
    const mealLogs: MealLog[] = [
      {
        id: "ml-1",
        user_id: userA,
        log_date: today,
        meal_type: "breakfast",
        meal_name: "South Indian Breakfast",
        created_at: "Z",
        updated_at: "Z",
      },
    ];
    const mealItems: MealItem[] = [
      {
        id: "mi-1",
        meal_log_id: "ml-1",
        user_id: userA,
        food_id: "food-dosa",
        recipe_id: null,
        food_name: "Masala Dosa",
        food_state: "cooked",
        quantity: 1,
        unit: "piece",
        gram_weight: 180,
        calories: 320,
        protein: 7,
        carbs: 45,
        fat: 12,
        fiber: 3.5,
        sugar: 1,
        sodium_mg: 300,
        is_estimated_portion: false,
        portion_assumption: null,
        data_provenance: "verified_database",
        source_reference: null,
        created_at: "Z",
        updated_at: "Z",
      },
    ];

    // 2. Weight
    const weightLogs: WeightLog[] = [
      { id: "w-latest", user_id: userA, weight_kg: 74.0, logged_at: today, note: null, created_at: "Z", updated_at: "Z" },
    ];

    // 3. Activity
    const activityLogs: ActivityLog[] = [
      {
        id: "act-1",
        user_id: userA,
        activity_type: "walking",
        duration_minutes: 45,
        distance_km: 3.2,
        steps: 4500,
        intensity: "moderate",
        calories_burned: 183.8,
        calorie_provenance: "calculated_activity_estimate",
        logged_at: today,
        note: null,
        source: "manual",
        created_at: "Z",
        updated_at: "Z",
      },
    ];

    const activitySummaries: DailyActivitySummary[] = [
      {
        id: "sum-1",
        user_id: userA,
        log_date: today,
        steps: 4500,
        step_source: "manual",
        active_duration_minutes: 45,
        estimated_calories_burned: 183.8,
        device_calories_burned: 0,
        created_at: "Z",
        updated_at: "Z",
      },
    ];

    // 4. Water
    const waterLogs: WaterLog[] = [
      { id: "wt-1", user_id: userA, amount_ml: 500, logged_at: today, created_at: "Z", updated_at: "Z" },
      { id: "wt-2", user_id: userA, amount_ml: 750, logged_at: today, created_at: "Z", updated_at: "Z" },
    ];

    // 5. Habits
    const habits: Habit[] = [
      { id: "h-1", user_id: userA, name: "Drink Water", description: null, frequency: "daily", active: true, created_at: "Z", updated_at: "Z" },
    ];
    const habitLogs: HabitLog[] = [
      { id: "hl-1", habit_id: "h-1", user_id: userA, logged_date: today, completed: true, note: null, created_at: "Z", updated_at: "Z" },
    ];

    const client = createMockFullDashboardSupabase({
      profile,
      mealLogs,
      mealItems,
      weightLogs,
      activityLogs,
      activitySummaries,
      waterLogs,
      habits,
      habitLogs,
    });

    const [
      timeline,
      targets,
      weightData,
      activitySummary,
      waterSummary,
      userHabits,
    ] = await Promise.all([
      getDailyMeals(userA, today, client),
      getUserTargets(userA, client),
      calculateWeightChange(userA, client),
      getDailyActivitySummary(userA, today, client),
      getDailyWaterSummary(userA, today, client),
      getUserHabitsWithTodayStatus(userA, today, client),
    ]);

    // Nutrition verification
    expect(timeline.totals.calories).toBe(320);
    expect(timeline.targets.remainingCalories).toBe(1680); // 2000 - 320

    // CRITICAL INVARIANT: Nutrition and Activity are SEPARATE.
    // Food calories remaining is NOT inflated by the 183.8 kcal burned in walking.
    // Food intake remains 320 kcal. Target remains 2000 kcal.
    expect(timeline.totals.calories).toBe(320);
    expect(targets.dailyCalories).toBe(2000);
    expect(activitySummary.estimatedCaloriesBurned).toBe(183.8);

    // Weight verification
    expect(weightData.current?.weight_kg).toBe(74.0);

    // Water verification: 500 + 750 = 1250 ml (50% of 2500 ml target)
    expect(waterSummary.totalMl).toBe(1250);
    expect(waterSummary.targetMl).toBe(2500);
    expect(waterSummary.percentage).toBe(50);

    // Activity verification: 4500 steps, 45 min duration
    expect(activitySummary.totalSteps).toBe(4500);
    expect(activitySummary.totalDurationMinutes).toBe(45);
    expect(activitySummary.sessionsCount).toBe(1);

    // Habits verification: 1 habit, completed today
    expect(userHabits.length).toBe(1);
    expect(userHabits[0].name).toBe("Drink Water");
    expect(userHabits[0].completedToday).toBe(true);
  });

  it("handles completely empty dashboard states gracefully without crashing", async () => {
    const client = createMockFullDashboardSupabase({
      profile,
      mealLogs: [],
      mealItems: [],
      weightLogs: [],
      activityLogs: [],
      activitySummaries: [],
      waterLogs: [],
      habits: [],
      habitLogs: [],
    });

    const [
      timeline,
      targets,
      weightData,
      activitySummary,
      waterSummary,
      userHabits,
    ] = await Promise.all([
      getDailyMeals(userA, today, client),
      getUserTargets(userA, client),
      calculateWeightChange(userA, client),
      getDailyActivitySummary(userA, today, client),
      getDailyWaterSummary(userA, today, client),
      getUserHabitsWithTodayStatus(userA, today, client),
    ]);

    expect(timeline.totals.calories).toBe(0);
    expect(targets.dailyCalories).toBe(2000);
    expect(weightData.current).toBeNull();
    expect(activitySummary.totalSteps).toBe(0);
    expect(activitySummary.totalDurationMinutes).toBe(0);
    expect(waterSummary.totalMl).toBe(0);
    expect(userHabits.length).toBe(0);
  });
});

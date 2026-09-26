import { createClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
import { normalizeDateString, roundToDecimals } from "../meals/meal-service";
import { getUserTargets, type UserNutritionTargets } from "../targets/target-service";

export interface DailyNutritionDataPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon" or "05 Oct"
  hasData: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calorieTarget: number;
  proteinTarget: number;
  calorieDifference: number; // positive = surplus/over, negative = remaining
  itemCount: number;
}

export interface NutritionAnalyticsSummary {
  periodDays: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  loggedDaysCount: number;
  emptyDaysCount: number;
  adherencePercentage: number; // % of days meals were logged
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  averageFiber: number;
  targets: UserNutritionTargets;
  dailyData: DailyNutritionDataPoint[];
}

/**
 * Computes historical nutrition trends and aggregates snapshotted meal data.
 * CRITICAL INVARIANT: Aggregates historical snapshots stored in meal_items.
 * Does NOT recalculate nutrition from current food database records.
 */
export async function getNutritionAnalytics(
  userId: string,
  days: number = 7,
  client?: SupabaseClient<Database>
): Promise<NutritionAnalyticsSummary> {
  const supabase = client || (await createClient());
  const userTargets = await getUserTargets(userId, supabase);

  // 1. Generate date sequence for the period (oldest to newest)
  const now = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(normalizeDateString(d));
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // 2. Fetch meal logs within range for user
  const { data: mealLogs, error: logError } = await supabase
    .from("meal_logs")
    .select("id, log_date")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate);

  if (logError) {
    throw new Error(`Failed to load historical meal logs: ${logError.message}`);
  }

  const logIds = (mealLogs || []).map((l) => l.id);
  const logDateMap = new Map<string, string>(); // log_id -> log_date
  (mealLogs || []).forEach((l) => logDateMap.set(l.id, l.log_date));

  // 3. Fetch meal items snapshots for these logs
  const dayItemsMap = new Map<string, Array<{ calories: number; protein: number; carbs: number; fat: number; fiber: number }>>();

  if (logIds.length > 0) {
    const { data: items, error: itemError } = await supabase
      .from("meal_items")
      .select("meal_log_id, calories, protein, carbs, fat, fiber")
      .in("meal_log_id", logIds);

    if (itemError) {
      throw new Error(`Failed to load meal snapshots: ${itemError.message}`);
    }

    (items || []).forEach((item) => {
      const date = logDateMap.get(item.meal_log_id);
      if (date) {
        const list = dayItemsMap.get(date) || [];
        list.push({
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          fiber: item.fiber || 0,
        });
        dayItemsMap.set(date, list);
      }
    });
  }

  // 4. Aggregate daily data points
  let sumCalories = 0;
  let sumProtein = 0;
  let sumCarbs = 0;
  let sumFat = 0;
  let sumFiber = 0;
  let loggedDaysCount = 0;

  const dailyData: DailyNutritionDataPoint[] = dates.map((dateStr) => {
    const items = dayItemsMap.get(dateStr) || [];
    const hasData = items.length > 0;

    let cal = 0;
    let prot = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;

    if (hasData) {
      loggedDaysCount++;
      items.forEach((it) => {
        cal += it.calories;
        prot += it.protein;
        carbs += it.carbs;
        fat += it.fat;
        fiber += it.fiber;
      });

      sumCalories += cal;
      sumProtein += prot;
      sumCarbs += carbs;
      sumFat += fat;
      sumFiber += fiber;
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayLabel = days <= 7
      ? dateObj.toLocaleDateString("en-IN", { weekday: "short" })
      : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    const totalCal = Math.round(cal);
    const diff = totalCal - userTargets.dailyCalories;

    return {
      date: dateStr,
      dayLabel,
      hasData,
      calories: totalCal,
      protein: roundToDecimals(prot, 1),
      carbs: roundToDecimals(carbs, 1),
      fat: roundToDecimals(fat, 1),
      fiber: roundToDecimals(fiber, 1),
      calorieTarget: userTargets.dailyCalories,
      proteinTarget: userTargets.dailyProteinG,
      calorieDifference: diff,
      itemCount: items.length,
    };
  });

  const emptyDaysCount = days - loggedDaysCount;
  const adherencePercentage = Math.round((loggedDaysCount / days) * 100);

  return {
    periodDays: days,
    startDate,
    endDate,
    totalDays: days,
    loggedDaysCount,
    emptyDaysCount,
    adherencePercentage,
    averageCalories: loggedDaysCount > 0 ? Math.round(sumCalories / loggedDaysCount) : 0,
    averageProtein: loggedDaysCount > 0 ? roundToDecimals(sumProtein / loggedDaysCount, 1) : 0,
    averageCarbs: loggedDaysCount > 0 ? roundToDecimals(sumCarbs / loggedDaysCount, 1) : 0,
    averageFat: loggedDaysCount > 0 ? roundToDecimals(sumFat / loggedDaysCount, 1) : 0,
    averageFiber: loggedDaysCount > 0 ? roundToDecimals(sumFiber / loggedDaysCount, 1) : 0,
    targets: userTargets,
    dailyData,
  };
}

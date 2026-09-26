import { createClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaterLog } from "../supabase/types";
import { normalizeDateString } from "../meals/meal-service";

export interface LogWaterInput {
  amountMl: number;
  loggedAt?: string; // YYYY-MM-DD
}

export interface DailyWaterSummaryResult {
  date: string;
  totalMl: number;
  targetMl: number | null;
  percentage: number | null;
  logsCount: number;
  logs: WaterLog[];
}

export interface HistoricalWaterDataPoint {
  date: string;
  dayLabel: string;
  totalMl: number;
  targetMl: number | null;
  percentage: number | null;
  logsCount: number;
}

/**
 * Validates water intake amount.
 * Bounded between 1 ml and 10,000 ml (10 Liters).
 */
export function validateWaterAmount(amountMl: number): number {
  if (typeof amountMl !== "number" || isNaN(amountMl) || amountMl <= 0 || amountMl > 10000) {
    throw new Error("Water amount must be an integer between 1 and 10,000 ml.");
  }
  return Math.floor(amountMl);
}

/**
 * Logs a water intake entry for a user.
 */
export async function logWater(
  userId: string,
  input: LogWaterInput,
  client?: SupabaseClient<Database>
): Promise<WaterLog> {
  const supabase = client || (await createClient());
  const validAmount = validateWaterAmount(input.amountMl);
  const targetDate = input.loggedAt ? normalizeDateString(input.loggedAt) : normalizeDateString(new Date());

  const { data, error } = await supabase
    .from("water_logs")
    .insert({
      user_id: userId,
      amount_ml: validAmount,
      logged_at: targetDate,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to log water: ${error?.message || "Unknown error"}`);
  }

  return data;
}

/**
 * Retrieves the daily water summary for a user on a specific date.
 * If user has not configured a target in profiles, targetMl and percentage will be null.
 * INVARIANT: Never assumes or fabricates a universal 2.5L hydration target.
 */
export async function getDailyWaterSummary(
  userId: string,
  date?: string,
  client?: SupabaseClient<Database>
): Promise<DailyWaterSummaryResult> {
  const supabase = client || (await createClient());
  const targetDate = date ? normalizeDateString(date) : normalizeDateString(new Date());

  // 1. Fetch user profile target
  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_water_ml_target")
    .eq("id", userId)
    .single();

  const userTarget =
    profile?.daily_water_ml_target && profile.daily_water_ml_target > 0
      ? profile.daily_water_ml_target
      : null;

  // 2. Fetch all water logs for this date
  const { data: logs, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_at", targetDate)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to retrieve water logs: ${error.message}`);
  }

  const logList = logs || [];
  const totalMl = logList.reduce((acc, l) => acc + l.amount_ml, 0);

  const percentage =
    userTarget !== null && userTarget > 0
      ? Math.round((totalMl / userTarget) * 100)
      : null;

  return {
    date: targetDate,
    totalMl,
    targetMl: userTarget,
    percentage,
    logsCount: logList.length,
    logs: logList,
  };
}

/**
 * Retrieves historical daily water intake for a range of days (e.g. 7, 30, 90).
 */
export async function getWaterHistory(
  userId: string,
  days: number = 7,
  client?: SupabaseClient<Database>
): Promise<{
  periodDays: number;
  averageMl: number;
  targetMl: number | null;
  history: HistoricalWaterDataPoint[];
}> {
  const supabase = client || (await createClient());

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_water_ml_target")
    .eq("id", userId)
    .single();

  const userTarget =
    profile?.daily_water_ml_target && profile.daily_water_ml_target > 0
      ? profile.daily_water_ml_target
      : null;

  const now = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(normalizeDateString(d));
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data: logs, error } = await supabase
    .from("water_logs")
    .select("logged_at, amount_ml")
    .eq("user_id", userId)
    .gte("logged_at", startDate)
    .lte("logged_at", endDate);

  if (error) {
    throw new Error(`Failed to load water history: ${error.message}`);
  }

  const dayTotals = new Map<string, { total: number; count: number }>();
  (logs || []).forEach((l) => {
    const curr = dayTotals.get(l.logged_at) || { total: 0, count: 0 };
    curr.total += l.amount_ml;
    curr.count += 1;
    dayTotals.set(l.logged_at, curr);
  });

  let sumLoggedMl = 0;
  let loggedDaysCount = 0;

  const history: HistoricalWaterDataPoint[] = dates.map((dateStr) => {
    const dayData = dayTotals.get(dateStr) || { total: 0, count: 0 };
    if (dayData.total > 0) {
      sumLoggedMl += dayData.total;
      loggedDaysCount++;
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayLabel = days <= 7
      ? dateObj.toLocaleDateString("en-IN", { weekday: "short" })
      : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    const percentage =
      userTarget !== null && userTarget > 0
        ? Math.round((dayData.total / userTarget) * 100)
        : null;

    return {
      date: dateStr,
      dayLabel,
      totalMl: dayData.total,
      targetMl: userTarget,
      percentage,
      logsCount: dayData.count,
    };
  });

  const averageMl = loggedDaysCount > 0 ? Math.round(sumLoggedMl / loggedDaysCount) : 0;

  return {
    periodDays: days,
    averageMl,
    targetMl: userTarget,
    history,
  };
}

/**
 * Deletes a water log strictly for owner.
 */
export async function deleteWaterLog(
  userId: string,
  id: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = client || (await createClient());

  const { error } = await supabase
    .from("water_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete water log: ${error.message}`);
  }
}

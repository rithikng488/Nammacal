import { createClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Habit, HabitLog } from "../supabase/types";
import { normalizeDateString } from "../meals/meal-service";
export { PRESET_HABIT_TEMPLATES } from "./habit-templates";

export interface CreateHabitInput {
  name: string;
  description?: string | null;
  frequency?: string;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface HabitWithTodayStatus extends Habit {
  completedToday: boolean;
  completedLogId: string | null;
  currentStreak: number;
}

export interface HabitHistoryResult {
  habit: Habit;
  periodDays: number;
  currentStreak: number;
  bestStreak: number;
  completionRatePercentage: number;
  completedDaysCount: number;
  totalDays: number;
  history: Array<{
    date: string;
    completed: boolean;
    note: string | null;
  }>;
}

/**
 * Creates a new personal habit.
 */
export async function createHabit(
  userId: string,
  input: CreateHabitInput,
  client?: SupabaseClient<Database>
): Promise<Habit> {
  const supabase = client || (await createClient());

  const name = input.name ? input.name.trim() : "";
  if (!name || name.length < 2 || name.length > 100) {
    throw new Error("Habit name must be between 2 and 100 characters.");
  }

  const description = input.description ? input.description.trim().slice(0, 300) : null;
  const frequency = input.frequency ? input.frequency.trim().toLowerCase() : "daily";

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      name,
      description,
      frequency,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create habit: ${error?.message || "Unknown error"}`);
  }

  return data;
}

/**
 * Retrieves all active habits for a user along with today's completion status and current streak.
 */
export async function getUserHabitsWithTodayStatus(
  userId: string,
  date?: string,
  client?: SupabaseClient<Database>
): Promise<HabitWithTodayStatus[]> {
  const supabase = client || (await createClient());
  const targetDate = date ? normalizeDateString(date) : normalizeDateString(new Date());

  // 1. Fetch active habits
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to load habits: ${habitsError.message}`);
  }

  const habitList = habits || [];
  if (habitList.length === 0) return [];

  const habitIds = habitList.map((h) => h.id);

  // 2. Fetch today's completion logs
  const { data: todayLogs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_date", targetDate)
    .in("habit_id", habitIds);

  const todayLogMap = new Map<string, HabitLog>();
  (todayLogs || []).forEach((l) => todayLogMap.set(l.habit_id, l));

  // 3. Fetch past 30 days logs to compute streaks
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const pastDateStr = normalizeDateString(pastDate);

  const { data: recentLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, logged_date, completed")
    .eq("user_id", userId)
    .gte("logged_date", pastDateStr)
    .lte("logged_date", targetDate);

  const habitDateLogsMap = new Map<string, Set<string>>();
  (recentLogs || []).forEach((l) => {
    if (l.completed) {
      const set = habitDateLogsMap.get(l.habit_id) || new Set<string>();
      set.add(l.logged_date);
      habitDateLogsMap.set(l.habit_id, set);
    }
  });

  return habitList.map((habit) => {
    const todayLog = todayLogMap.get(habit.id);
    const completedToday = !!(todayLog && todayLog.completed);

    // Compute streak backwards from targetDate (or yesterday if not completed today)
    const completedDates = habitDateLogsMap.get(habit.id) || new Set<string>();
    let streak = 0;
    const checkDate = new Date(targetDate);

    // If today is completed, start from today; else if yesterday completed, start from yesterday
    const targetDateStr = normalizeDateString(checkDate);
    if (!completedDates.has(targetDateStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = normalizeDateString(checkDate);
      if (completedDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      ...habit,
      completedToday,
      completedLogId: todayLog?.id || null,
      currentStreak: streak,
    };
  });
}

/**
 * Toggles or sets habit completion for a specific date.
 */
export async function toggleHabitCompletion(
  userId: string,
  habitId: string,
  date?: string,
  completed?: boolean,
  note?: string | null,
  client?: SupabaseClient<Database>
): Promise<HabitLog | null> {
  const supabase = client || (await createClient());
  const targetDate = date ? normalizeDateString(date) : normalizeDateString(new Date());

  // 1. Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single();

  if (habitError || !habit) {
    throw new Error("Habit not found or unauthorized.");
  }

  // 2. Check if a log already exists for this habit & date
  const { data: existingLog } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .eq("logged_date", targetDate)
    .maybeSingle();

  // If completed is explicitly provided, use it; otherwise toggle current state
  const targetCompleted = completed !== undefined ? completed : !(existingLog && existingLog.completed);

  if (!targetCompleted && existingLog) {
    // Delete log or set completed to false
    await supabase.from("habit_logs").delete().eq("id", existingLog.id);
    return null;
  }

  // Upsert completion
  const { data: log, error: upsertError } = await supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: habitId,
        user_id: userId,
        logged_date: targetDate,
        completed: true,
        note: note ? note.trim().slice(0, 300) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id,logged_date" }
    )
    .select()
    .single();

  if (upsertError || !log) {
    throw new Error(`Failed to log habit completion: ${upsertError?.message || "Unknown error"}`);
  }

  return log;
}

/**
 * Retrieves habit history and calculated informational streaks.
 * Non-judgmental tracking tone (no shame messaging).
 */
export async function getHabitHistory(
  userId: string,
  habitId: string,
  days: number = 30,
  client?: SupabaseClient<Database>
): Promise<HabitHistoryResult> {
  const supabase = client || (await createClient());

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single();

  if (habitError || !habit) {
    throw new Error("Habit not found or unauthorized.");
  }

  const now = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(normalizeDateString(d));
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .gte("logged_date", startDate)
    .lte("logged_date", endDate);

  if (logsError) {
    throw new Error(`Failed to load habit history: ${logsError.message}`);
  }

  const logsMap = new Map<string, HabitLog>();
  (logs || []).forEach((l) => logsMap.set(l.logged_date, l));

  let completedDaysCount = 0;
  const history = dates.map((dateStr) => {
    const log = logsMap.get(dateStr);
    const completed = !!(log && log.completed);
    if (completed) completedDaysCount++;
    return {
      date: dateStr,
      completed,
      note: log?.note || null,
    };
  });

  // Calculate streaks across history
  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < history.length; i++) {
    if (history[i].completed) {
      runningStreak++;
      if (runningStreak > bestStreak) bestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  // Current streak counting backwards from today (or yesterday if today isn't completed yet)
  const todayStr = dates[dates.length - 1];
  const todayCompleted = history[history.length - 1].completed;
  let checkIdx = todayCompleted ? history.length - 1 : history.length - 2;

  while (checkIdx >= 0 && history[checkIdx].completed) {
    currentStreak++;
    checkIdx--;
  }

  const completionRatePercentage = Math.round((completedDaysCount / days) * 100);

  return {
    habit,
    periodDays: days,
    currentStreak,
    bestStreak,
    completionRatePercentage,
    completedDaysCount,
    totalDays: days,
    history,
  };
}

/**
 * Updates a habit.
 */
export async function updateHabit(
  userId: string,
  habitId: string,
  input: UpdateHabitInput,
  client?: SupabaseClient<Database>
): Promise<Habit> {
  const supabase = client || (await createClient());

  const payload: Partial<Habit> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name || name.length < 2 || name.length > 100) {
      throw new Error("Habit name must be between 2 and 100 characters.");
    }
    payload.name = name;
  }

  if (input.description !== undefined) {
    payload.description = input.description ? input.description.trim().slice(0, 300) : null;
  }

  if (input.active !== undefined) {
    payload.active = Boolean(input.active);
  }

  const { data, error } = await supabase
    .from("habits")
    .update(payload)
    .eq("id", habitId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update habit: ${error?.message || "Unknown error"}`);
  }

  return data;
}

/**
 * Deletes a habit and all associated logs strictly for owner.
 */
export async function deleteHabit(
  userId: string,
  habitId: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = client || (await createClient());

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete habit: ${error.message}`);
  }
}

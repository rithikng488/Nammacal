import { createClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ActivityLog,
  ActivityType,
  ActivityIntensity,
  ActivitySource,
  CalorieProvenance,
  DailyActivitySummary,
  StepSource,
} from "../supabase/types";
import { normalizeDateString } from "../meals/meal-service";
import { calculateEstimatedActivityCalories } from "./activity-calculator";
import { getLatestWeight } from "../weight/weight-service";

export const ALLOWED_ACTIVITY_TYPES: ActivityType[] = [
  "walking",
  "running",
  "cycling",
  "strength_training",
  "gym_workout",
  "swimming",
  "yoga",
  "sports",
  "other",
];

export const ALLOWED_INTENSITIES: ActivityIntensity[] = ["light", "moderate", "vigorous"];

export const ALLOWED_SOURCES: ActivitySource[] = [
  "manual",
  "health_connect",
  "device",
  "import",
];

export interface CreateActivityInput {
  activityType: ActivityType;
  durationMinutes: number;
  intensity?: ActivityIntensity;
  distanceKm?: number | null;
  steps?: number | null;
  loggedAt?: string; // YYYY-MM-DD
  note?: string | null;
  source?: ActivitySource;
}

export interface UpdateActivityInput {
  activityType?: ActivityType;
  durationMinutes?: number;
  intensity?: ActivityIntensity;
  distanceKm?: number | null;
  steps?: number | null;
  note?: string | null;
}

export interface DayActivitySummaryResult {
  date: string;
  totalSteps: number;
  stepSource: StepSource | null;
  totalDurationMinutes: number;
  estimatedCaloriesBurned: number;
  deviceCaloriesBurned: number;
  sessionsCount: number;
  activities: ActivityLog[];
}

/**
 * Validates activity input.
 * CRITICAL RULE: NEVER convert distance to steps! Steps must be null unless explicitly provided.
 */
export function validateActivityInput(input: CreateActivityInput): {
  activityType: ActivityType;
  durationMinutes: number;
  intensity: ActivityIntensity;
  distanceKm: number | null;
  steps: number | null;
  loggedAt: string;
  note: string | null;
  source: ActivitySource;
} {
  const {
    activityType,
    durationMinutes,
    intensity = "moderate",
    distanceKm,
    steps,
    loggedAt,
    note,
    source = "manual",
  } = input;

  if (!ALLOWED_ACTIVITY_TYPES.includes(activityType)) {
    throw new Error(`Invalid activity type: "${activityType}". Allowed: ${ALLOWED_ACTIVITY_TYPES.join(", ")}`);
  }

  if (
    typeof durationMinutes !== "number" ||
    isNaN(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 1440
  ) {
    throw new Error("Activity duration must be an integer between 1 and 1440 minutes (24 hours).");
  }

  if (!ALLOWED_INTENSITIES.includes(intensity)) {
    throw new Error(`Invalid intensity: "${intensity}". Allowed: ${ALLOWED_INTENSITIES.join(", ")}`);
  }

  if (!ALLOWED_SOURCES.includes(source)) {
    throw new Error(`Invalid source: "${source}". Allowed: ${ALLOWED_SOURCES.join(", ")}`);
  }

  let validDistance: number | null = null;
  if (distanceKm !== undefined && distanceKm !== null) {
    if (typeof distanceKm !== "number" || isNaN(distanceKm) || distanceKm < 0 || distanceKm > 500) {
      throw new Error("Distance must be a positive number between 0 and 500 km.");
    }
    validDistance = Math.round(distanceKm * 100) / 100;
  }

  let validSteps: number | null = null;
  if (steps !== undefined && steps !== null) {
    if (typeof steps !== "number" || isNaN(steps) || steps < 0 || steps > 200000) {
      throw new Error("Steps must be a positive integer between 0 and 200,000.");
    }
    validSteps = Math.floor(steps);
  }

  const validDate = loggedAt ? normalizeDateString(loggedAt) : normalizeDateString(new Date());

  const validNote = note ? note.trim().slice(0, 500) : null;

  return {
    activityType,
    durationMinutes: Math.floor(durationMinutes),
    intensity,
    distanceKm: validDistance,
    steps: validSteps,
    loggedAt: validDate,
    note: validNote,
    source,
  };
}

/**
 * Logs a new activity session for a user.
 * Deterministically calculates estimated calories based on user weight and MET.
 */
export async function logActivity(
  userId: string,
  input: CreateActivityInput,
  client?: SupabaseClient<Database>
): Promise<ActivityLog> {
  const supabase = client || (await createClient());
  const validated = validateActivityInput(input);

  // 1. Fetch latest user weight for MET calculation
  let weightKg: number | null = null;
  try {
    const latestWeight = await getLatestWeight(userId, supabase);
    if (latestWeight) {
      weightKg = latestWeight.weight_kg;
    }
  } catch {
    // Graceful fallback to reference weight
  }

  // 2. Deterministically estimate calories burned
  const calorieCalc = calculateEstimatedActivityCalories({
    activityType: validated.activityType,
    durationMinutes: validated.durationMinutes,
    intensity: validated.intensity,
    weightKg,
  });

  const caloriesBurned = calorieCalc.calories;
  const calorieProvenance: CalorieProvenance = "calculated_activity_estimate";

  // 3. Insert activity log
  const { data: activity, error: insertError } = await supabase
    .from("activity_logs")
    .insert({
      user_id: userId,
      activity_type: validated.activityType,
      duration_minutes: validated.durationMinutes,
      distance_km: validated.distanceKm,
      steps: validated.steps,
      intensity: validated.intensity,
      calories_burned: caloriesBurned,
      calorie_provenance: calorieProvenance,
      logged_at: validated.loggedAt,
      note: validated.note,
      source: validated.source,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !activity) {
    throw new Error(`Failed to log activity: ${insertError?.message || "Unknown error"}`);
  }

  // 4. Update daily activity summary
  await refreshDailyActivitySummary(userId, validated.loggedAt, supabase);

  return activity;
}

/**
 * Manually logs or updates daily steps for a user and date.
 * Explicit source: 'manual'.
 * Invariant: Never allows GPS-to-step inference.
 */
export async function logDailySteps(
  userId: string,
  steps: number,
  date?: string,
  source: StepSource = "manual",
  client?: SupabaseClient<Database>
): Promise<DailyActivitySummary> {
  const supabase = client || (await createClient());

  if (typeof steps !== "number" || isNaN(steps) || steps < 0 || steps > 200000) {
    throw new Error("Steps must be a non-negative integer between 0 and 200,000.");
  }

  const targetDate = date ? normalizeDateString(date) : normalizeDateString(new Date());

  // Upsert step record for the specific source
  const { data, error } = await supabase
    .from("daily_activity_summary")
    .upsert(
      {
        user_id: userId,
        log_date: targetDate,
        steps: Math.floor(steps),
        step_source: source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date,step_source" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to log daily steps: ${error?.message || "Unknown error"}`);
  }

  return data;
}

/**
 * Re-aggregates daily activity totals for a given date into daily_activity_summary.
 */
export async function refreshDailyActivitySummary(
  userId: string,
  date: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = client || (await createClient());
  const targetDate = normalizeDateString(date);

  // Fetch all activities on this date
  const { data: activities, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_at", targetDate);

  if (error) {
    throw new Error(`Failed to load activities for date: ${error.message}`);
  }

  const list = activities || [];
  let totalActiveMinutes = 0;
  let totalEstimatedCalories = 0;
  let totalDeviceCalories = 0;
  let activitySteps = 0;

  for (const act of list) {
    totalActiveMinutes += act.duration_minutes || 0;
    if (act.calorie_provenance === "calculated_activity_estimate") {
      totalEstimatedCalories += act.calories_burned || 0;
    } else if (act.calorie_provenance === "device_reported") {
      totalDeviceCalories += act.calories_burned || 0;
    }
    if (act.steps) {
      activitySteps += act.steps;
    }
  }

  totalEstimatedCalories = Math.round(totalEstimatedCalories * 10) / 10;
  totalDeviceCalories = Math.round(totalDeviceCalories * 10) / 10;

  // Check if a manual step record already exists for this date
  const { data: existingSummary } = await supabase
    .from("daily_activity_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", targetDate)
    .eq("step_source", "manual")
    .maybeSingle();

  const finalSteps = existingSummary
    ? Math.max(existingSummary.steps, activitySteps)
    : activitySteps;

  await supabase.from("daily_activity_summary").upsert(
    {
      user_id: userId,
      log_date: targetDate,
      steps: finalSteps,
      step_source: "manual",
      active_duration_minutes: totalActiveMinutes,
      estimated_calories_burned: totalEstimatedCalories,
      device_calories_burned: totalDeviceCalories,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date,step_source" }
  );
}

/**
 * Retrieves daily activity summary for a user on a given date.
 * Resolves steps according to the priority hierarchy: health_connect > device > manual.
 */
export async function getDailyActivitySummary(
  userId: string,
  date?: string,
  client?: SupabaseClient<Database>
): Promise<DayActivitySummaryResult> {
  const supabase = client || (await createClient());
  const targetDate = date ? normalizeDateString(date) : normalizeDateString(new Date());

  // 1. Fetch activities for date
  const { data: activities, error: actError } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_at", targetDate)
    .order("created_at", { ascending: false });

  if (actError) {
    throw new Error(`Failed to load activities: ${actError.message}`);
  }

  const actList = activities || [];

  // 2. Fetch daily step summaries across sources
  const { data: summaries, error: sumError } = await supabase
    .from("daily_activity_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", targetDate);

  if (sumError) {
    throw new Error(`Failed to load activity summary: ${sumError.message}`);
  }

  const sumList = summaries || [];

  // Priority hierarchy: health_connect > device > manual
  const hcSource = sumList.find((s) => s.step_source === "health_connect");
  const deviceSource = sumList.find((s) => s.step_source === "device");
  const manualSource = sumList.find((s) => s.step_source === "manual");

  const chosenSource = hcSource || deviceSource || manualSource || null;

  let totalDurationMinutes = 0;
  let estimatedCaloriesBurned = 0;
  let deviceCaloriesBurned = 0;

  for (const act of actList) {
    totalDurationMinutes += act.duration_minutes || 0;
    if (act.calorie_provenance === "calculated_activity_estimate") {
      estimatedCaloriesBurned += act.calories_burned || 0;
    } else if (act.calorie_provenance === "device_reported") {
      deviceCaloriesBurned += act.calories_burned || 0;
    }
  }

  return {
    date: targetDate,
    totalSteps: chosenSource ? chosenSource.steps : 0,
    stepSource: chosenSource ? chosenSource.step_source : null,
    totalDurationMinutes,
    estimatedCaloriesBurned: Math.round(estimatedCaloriesBurned * 10) / 10,
    deviceCaloriesBurned: Math.round(deviceCaloriesBurned * 10) / 10,
    sessionsCount: actList.length,
    activities: actList,
  };
}

/**
 * Retrieves activity history with optional date range or limit filters.
 */
export async function getActivityHistory(
  userId: string,
  options?: { limit?: number; startDate?: string; endDate?: string },
  client?: SupabaseClient<Database>
): Promise<ActivityLog[]> {
  const supabase = client || (await createClient());
  const limit = options?.limit || 100;

  let query = supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId);

  if (options?.startDate) {
    query = query.gte("logged_at", normalizeDateString(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("logged_at", normalizeDateString(options.endDate));
  }

  query = query
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load activity history: ${error.message}`);
  }

  return data || [];
}

/**
 * Updates an activity log belonging to a user.
 */
export async function updateActivityLog(
  userId: string,
  id: string,
  input: UpdateActivityInput,
  client?: SupabaseClient<Database>
): Promise<ActivityLog> {
  const supabase = client || (await createClient());

  // 1. Fetch existing log to verify ownership and recalculate calories if needed
  const { data: existing, error: fetchError } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Activity log not found or unauthorized.");
  }

  const newType = input.activityType || existing.activity_type;
  const newDuration = input.durationMinutes ?? existing.duration_minutes;
  const newIntensity = input.intensity || existing.intensity;

  if (input.activityType && !ALLOWED_ACTIVITY_TYPES.includes(input.activityType)) {
    throw new Error(`Invalid activity type: ${input.activityType}`);
  }
  if (input.durationMinutes !== undefined && (input.durationMinutes <= 0 || input.durationMinutes > 1440)) {
    throw new Error("Duration must be between 1 and 1440 minutes.");
  }
  if (input.intensity && !ALLOWED_INTENSITIES.includes(input.intensity)) {
    throw new Error(`Invalid intensity: ${input.intensity}`);
  }

  let newCalories = existing.calories_burned;
  let newProvenance = existing.calorie_provenance;

  if (
    input.activityType !== undefined ||
    input.durationMinutes !== undefined ||
    input.intensity !== undefined
  ) {
    let weightKg: number | null = null;
    try {
      const latestWeight = await getLatestWeight(userId, supabase);
      if (latestWeight) weightKg = latestWeight.weight_kg;
    } catch {
      // fallback
    }
    const calc = calculateEstimatedActivityCalories({
      activityType: newType,
      durationMinutes: newDuration,
      intensity: newIntensity,
      weightKg,
    });
    newCalories = calc.calories;
    newProvenance = "calculated_activity_estimate";
  }

  const payload: Partial<ActivityLog> = {
    activity_type: newType,
    duration_minutes: newDuration,
    intensity: newIntensity,
    calories_burned: newCalories,
    calorie_provenance: newProvenance,
    updated_at: new Date().toISOString(),
  };

  if (input.distanceKm !== undefined) {
    payload.distance_km = input.distanceKm !== null ? Math.round(input.distanceKm * 100) / 100 : null;
  }
  if (input.steps !== undefined) {
    payload.steps = input.steps !== null ? Math.floor(input.steps) : null;
  }
  if (input.note !== undefined) {
    payload.note = input.note ? input.note.trim().slice(0, 500) : null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("activity_logs")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update activity: ${updateError?.message || "Unknown error"}`);
  }

  await refreshDailyActivitySummary(userId, existing.logged_at, supabase);

  return updated;
}

/**
 * Deletes an activity log strictly for owner.
 */
export async function deleteActivityLog(
  userId: string,
  id: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = client || (await createClient());

  const { data: existing, error: fetchError } = await supabase
    .from("activity_logs")
    .select("logged_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Activity log not found or unauthorized.");
  }

  const { error: deleteError } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Failed to delete activity log: ${deleteError.message}`);
  }

  await refreshDailyActivitySummary(userId, existing.logged_at, supabase);
}

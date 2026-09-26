import { createClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WeightLog } from "../supabase/types";
import { normalizeDateString } from "../meals/meal-service";

export interface LogWeightInput {
  weightKg: number;
  loggedAt?: string; // YYYY-MM-DD
  note?: string | null;
}

export interface WeightChangeResult {
  current: WeightLog | null;
  previous: WeightLog | null;
  changeKg: number | null; // e.g. -0.4 or +0.2
}

export interface WeightTrendResult {
  entries: WeightLog[];
  minWeight: number | null;
  maxWeight: number | null;
  overallChangeKg: number | null;
}

export class WeightValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeightValidationError";
  }
}

/**
 * Validates a weight value in kilograms.
 */
export function validateWeightKg(weightKg: number): number {
  if (typeof weightKg !== "number" || isNaN(weightKg)) {
    throw new WeightValidationError("Weight must be a valid number.");
  }
  const rounded = Math.round(weightKg * 10) / 10;
  if (rounded < 20.0 || rounded > 400.0) {
    throw new WeightValidationError("Weight must be between 20.0 kg and 400.0 kg.");
  }
  return rounded;
}

/**
 * Logs or updates a weight entry for a user on a given date.
 */
export async function logWeight(
  userId: string,
  input: LogWeightInput,
  client?: SupabaseClient<Database>
): Promise<WeightLog> {
  const supabase = client || (await createClient());
  const validatedWeight = validateWeightKg(input.weightKg);
  const targetDate = normalizeDateString(input.loggedAt || new Date());

  // Upsert on (user_id, logged_at)
  const { data, error } = await supabase
    .from("weight_logs")
    .upsert(
      {
        user_id: userId,
        weight_kg: validatedWeight,
        logged_at: targetDate,
        note: input.note ? input.note.trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,logged_at" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to log weight: ${error?.message || "Unknown error"}`);
  }

  return data;
}

/**
 * Retrieves chronological weight history for a user.
 */
export async function getWeightHistory(
  userId: string,
  options?: { limit?: number; startDate?: string; endDate?: string },
  client?: SupabaseClient<Database>
): Promise<WeightLog[]> {
  const supabase = client || (await createClient());
  const limit = options?.limit || 100;

  let query = supabase
    .from("weight_logs")
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
    throw new Error(`Failed to retrieve weight history: ${error.message}`);
  }

  return data || [];
}

/**
 * Retrieves the latest recorded weight log for a user.
 */
export async function getLatestWeight(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<WeightLog | null> {
  const history = await getWeightHistory(userId, { limit: 1 }, client);
  return history[0] || null;
}

/**
 * Retrieves the second latest (previous) recorded weight log for comparison.
 */
export async function getPreviousWeight(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<WeightLog | null> {
  const history = await getWeightHistory(userId, { limit: 2 }, client);
  return history.length >= 2 ? history[1] : null;
}

/**
 * Calculates the change between the two most recent weight entries.
 */
export async function calculateWeightChange(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<WeightChangeResult> {
  const history = await getWeightHistory(userId, { limit: 2 }, client);
  const current = history[0] || null;
  const previous = history.length >= 2 ? history[1] : null;

  let changeKg: number | null = null;
  if (current && previous) {
    changeKg = Math.round((current.weight_kg - previous.weight_kg) * 10) / 10;
  }

  return { current, previous, changeKg };
}

/**
 * Computes weight trend analytics over a specified number of days (e.g. 7, 30, 90).
 */
export async function getWeightTrend(
  userId: string,
  days: number = 30,
  client?: SupabaseClient<Database>
): Promise<WeightTrendResult> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = normalizeDateString(startDate);

  const entriesDesc = await getWeightHistory(
    userId,
    { startDate: startDateStr, limit: days + 10 },
    client
  );

  // Order chronologically for charts (oldest to newest)
  const entriesAsc = [...entriesDesc].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );

  if (entriesAsc.length === 0) {
    return { entries: [], minWeight: null, maxWeight: null, overallChangeKg: null };
  }

  const weights = entriesAsc.map((e) => e.weight_kg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);

  let overallChangeKg: number | null = null;
  if (entriesAsc.length >= 2) {
    const oldest = entriesAsc[0].weight_kg;
    const latest = entriesAsc[entriesAsc.length - 1].weight_kg;
    overallChangeKg = Math.round((latest - oldest) * 10) / 10;
  }

  return {
    entries: entriesAsc,
    minWeight,
    maxWeight,
    overallChangeKg,
  };
}

/**
 * Updates an existing weight entry.
 */
export async function updateWeightLog(
  userId: string,
  id: string,
  input: { weightKg?: number; note?: string | null },
  client?: SupabaseClient<Database>
): Promise<WeightLog> {
  const supabase = client || (await createClient());

  const payload: Partial<WeightLog> = {
    updated_at: new Date().toISOString(),
  };

  if (input.weightKg !== undefined) {
    payload.weight_kg = validateWeightKg(input.weightKg);
  }
  if (input.note !== undefined) {
    payload.note = input.note ? input.note.trim() : null;
  }

  const { data, error } = await supabase
    .from("weight_logs")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update weight entry: ${error?.message || "Not found"}`);
  }

  return data;
}

/**
 * Deletes a weight entry.
 */
export async function deleteWeightLog(
  userId: string,
  id: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = client || (await createClient());

  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete weight entry: ${error.message}`);
  }
}

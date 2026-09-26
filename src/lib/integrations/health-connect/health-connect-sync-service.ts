import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  HealthIntegration,
  ActivityType,
  ActivityLog,
  CalorieProvenance,
} from "@/lib/supabase/types";
import { ALLOWED_ACTIVITY_TYPES, refreshDailyActivitySummary } from "@/lib/activity/activity-service";
import { normalizeDateString } from "@/lib/meals/meal-service";

export interface HealthConnectStepInput {
  date: string;
  steps: number;
  sourceOrigins?: string[];
}

export interface HealthConnectExerciseInput {
  externalRecordId: string;
  activityType: string;
  durationMinutes: number;
  distanceKm?: number | null;
  steps?: number | null;
  caloriesBurned?: number | null;
  calorieProvenance?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  loggedAt?: string;
  title?: string | null;
  notes?: string | null;
  sourceOrigin?: string | null;
}

export interface HealthConnectSyncPayload {
  days?: HealthConnectStepInput[];
  sessions?: HealthConnectExerciseInput[];
}

export interface HealthConnectSyncResult {
  success: boolean;
  syncedDaysCount: number;
  syncedSessionsCount: number;
  skippedSessionsCount: number;
  errors: string[];
}

/**
 * Gets or creates the Health Connect integration record for a user.
 */
export async function getHealthIntegration(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<HealthIntegration | null> {
  const supabase = client || (await createClient());

  const { data, error } = await supabase
    .from("health_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "health_connect")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Health Connect integration: ${error.message}`);
  }

  return data;
}

/**
 * Enables or disables the Health Connect integration for a user.
 */
export async function setHealthIntegrationStatus(
  userId: string,
  enabled: boolean,
  client?: SupabaseClient<Database>
): Promise<HealthIntegration> {
  const supabase = client || (await createClient());

  const { data, error } = await supabase
    .from("health_integrations")
    .upsert(
      {
        user_id: userId,
        provider: "health_connect",
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update Health Connect status: ${error?.message || "Unknown error"}`);
  }

  return data;
}

/**
 * Normalizes incoming exercise type to NammaCal's ActivityType enum.
 */
export function normalizeActivityType(type: string): ActivityType {
  const lower = type.toLowerCase().trim();
  if (ALLOWED_ACTIVITY_TYPES.includes(lower as ActivityType)) {
    return lower as ActivityType;
  }
  return "other";
}

/**
 * Synchronizes steps and exercise sessions from Health Connect.
 *
 * Invariants:
 * 1. Idempotency: Duplicate sessions are reconciled using activity_external_records.
 * 2. Step priority: Daily steps are written with step_source = 'health_connect'.
 * 3. NO GPS / distance-to-step inference: If steps are absent, they remain null.
 * 4. Calorie provenance: Health Connect calories are saved as 'device_reported'.
 * 5. Net calorie invariant: Does not touch nutrition targets or subtract food calories.
 */
export async function syncHealthConnectData(
  userId: string,
  payload: HealthConnectSyncPayload,
  client?: SupabaseClient<Database>
): Promise<HealthConnectSyncResult> {
  const supabase = client || (await createClient());
  const errors: string[] = [];
  let syncedDaysCount = 0;
  let syncedSessionsCount = 0;
  let skippedSessionsCount = 0;

  const now = new Date().toISOString();

  // 1. Verify integration is enabled
  const integration = await getHealthIntegration(userId, supabase);
  if (integration && !integration.enabled) {
    throw new Error("Health Connect integration is disabled for this user.");
  }

  // 2. Process Daily Steps
  if (payload.days && Array.isArray(payload.days)) {
    for (const day of payload.days) {
      try {
        if (!day.date || typeof day.steps !== "number" || day.steps < 0) {
          continue;
        }

        const dateStr = normalizeDateString(day.date);
        const stepsCount = Math.floor(day.steps);

        // Upsert step record for health_connect in daily_activity_summary
        const { error: stepUpsertError } = await supabase
          .from("daily_activity_summary")
          .upsert(
            {
              user_id: userId,
              log_date: dateStr,
              steps: stepsCount,
              step_source: "health_connect",
              updated_at: now,
            },
            { onConflict: "user_id,log_date,step_source" }
          );

        if (stepUpsertError) {
          errors.push(`Step sync failed for ${dateStr}: ${stepUpsertError.message}`);
          continue;
        }

        // Record provenance in activity_external_records
        const extRecordId = `hc_steps_${dateStr}`;
        const sourceOrigin = day.sourceOrigins?.join(", ") || "health_connect";

        await supabase.from("activity_external_records").upsert(
          {
            user_id: userId,
            provider: "health_connect",
            external_record_id: extRecordId,
            external_record_type: "steps",
            source_data_origin: sourceOrigin,
            updated_at: now,
          },
          { onConflict: "user_id,provider,external_record_id" }
        );

        syncedDaysCount++;
      } catch (err: unknown) {
        errors.push(`Day sync error: ${(err as Error).message}`);
      }
    }
  }

  // 3. Process Exercise Sessions
  if (payload.sessions && Array.isArray(payload.sessions)) {
    for (const session of payload.sessions) {
      try {
        if (!session.externalRecordId) {
          continue;
        }

        const externalId = session.externalRecordId.trim();
        const activityType = normalizeActivityType(session.activityType);
        const durationMinutes = Math.min(Math.max(Math.floor(session.durationMinutes || 1), 1), 1440);
        const loggedAt = session.loggedAt
          ? normalizeDateString(session.loggedAt)
          : session.startTime
          ? normalizeDateString(session.startTime)
          : normalizeDateString(new Date());

        // Validate and format distance
        let distanceKm: number | null = null;
        if (session.distanceKm !== undefined && session.distanceKm !== null && !isNaN(session.distanceKm)) {
          distanceKm = Math.round(session.distanceKm * 100) / 100;
        }

        // CRITICAL INVARIANT: Steps must NEVER be inferred from distance or GPS.
        let steps: number | null = null;
        if (session.steps !== undefined && session.steps !== null && !isNaN(session.steps) && session.steps >= 0) {
          steps = Math.floor(session.steps);
        }

        // Calorie provenance
        let caloriesBurned: number | null = null;
        let calorieProvenance: CalorieProvenance | null = null;
        if (session.caloriesBurned !== undefined && session.caloriesBurned !== null && !isNaN(session.caloriesBurned)) {
          caloriesBurned = Math.round(session.caloriesBurned * 10) / 10;
          calorieProvenance = "device_reported";
        }

        const note = session.title
          ? session.notes
            ? `${session.title}: ${session.notes}`
            : session.title
          : session.notes || null;

        // Check if this session was already imported
        const { data: existingExt } = await supabase
          .from("activity_external_records")
          .select("*")
          .eq("user_id", userId)
          .eq("provider", "health_connect")
          .eq("external_record_id", externalId)
          .maybeSingle();

        let activityLogId: string | null = null;

        if (existingExt?.activity_log_id) {
          // Verify existing activity log
          const { data: existingLog } = await supabase
            .from("activity_logs")
            .select("id")
            .eq("id", existingExt.activity_log_id)
            .eq("user_id", userId)
            .maybeSingle();

          if (existingLog) {
            // Update existing activity log
            await supabase
              .from("activity_logs")
              .update({
                activity_type: activityType,
                duration_minutes: durationMinutes,
                distance_km: distanceKm,
                steps,
                calories_burned: caloriesBurned,
                calorie_provenance: calorieProvenance,
                logged_at: loggedAt,
                note: note ? note.slice(0, 500) : null,
                updated_at: now,
              })
              .eq("id", existingLog.id);

            activityLogId = existingLog.id;
            skippedSessionsCount++;
          }
        }

        if (!activityLogId) {
          // Insert new activity log
          const { data: newLog, error: logInsertError } = await supabase
            .from("activity_logs")
            .insert({
              user_id: userId,
              activity_type: activityType,
              duration_minutes: durationMinutes,
              distance_km: distanceKm,
              steps,
              intensity: "moderate",
              calories_burned: caloriesBurned,
              calorie_provenance: calorieProvenance,
              logged_at: loggedAt,
              note: note ? note.slice(0, 500) : null,
              source: "health_connect",
              updated_at: now,
            })
            .select("id")
            .single();

          if (logInsertError || !newLog) {
            errors.push(`Exercise insert failed for ${externalId}: ${logInsertError?.message || "Unknown"}`);
            continue;
          }

          activityLogId = newLog.id;
          syncedSessionsCount++;
        }

        // Upsert external record mapping
        await supabase.from("activity_external_records").upsert(
          {
            user_id: userId,
            provider: "health_connect",
            external_record_id: externalId,
            external_record_type: "exercise_session",
            activity_log_id: activityLogId,
            source_data_origin: session.sourceOrigin || "health_connect",
            start_time: session.startTime || null,
            end_time: session.endTime || null,
            updated_at: now,
          },
          { onConflict: "user_id,provider,external_record_id" }
        );

        // Refresh daily activity summary
        await refreshDailyActivitySummary(userId, loggedAt, supabase);
      } catch (err: unknown) {
        errors.push(`Session sync error: ${(err as Error).message}`);
      }
    }
  }

  // 4. Update Health Integration sync status
  await supabase.from("health_integrations").upsert(
    {
      user_id: userId,
      provider: "health_connect",
      enabled: true,
      last_sync_at: now,
      last_successful_sync_at: errors.length === 0 ? now : integration?.last_successful_sync_at || null,
      last_error: errors.length > 0 ? errors.join("; ") : null,
      updated_at: now,
    },
    { onConflict: "user_id,provider" }
  );

  return {
    success: errors.length === 0,
    syncedDaysCount,
    syncedSessionsCount,
    skippedSessionsCount,
    errors,
  };
}

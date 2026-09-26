import { describe, it, expect } from "vitest";
import {
  syncHealthConnectData,
  setHealthIntegrationStatus,
  getHealthIntegration,
  normalizeActivityType,
} from "@/lib/integrations/health-connect/health-connect-sync-service";
import { getDailyActivitySummary } from "@/lib/activity/activity-service";
import type {
  ActivityLog,
  DailyActivitySummary,
  HealthIntegration,
  ActivityExternalRecord,
} from "@/lib/supabase/types";

function createMockSupabaseForHealthConnect(initialData?: {
  integrations?: HealthIntegration[];
  externalRecords?: ActivityExternalRecord[];
  activityLogs?: ActivityLog[];
  summaries?: DailyActivitySummary[];
}) {
  let integrations: HealthIntegration[] = [...(initialData?.integrations || [])];
  let externalRecords: ActivityExternalRecord[] = [...(initialData?.externalRecords || [])];
  let activityLogs: ActivityLog[] = [...(initialData?.activityLogs || [])];
  let summaries: DailyActivitySummary[] = [...(initialData?.summaries || [])];

  const client: any = {
    _integrations: integrations,
    _externalRecords: externalRecords,
    _activityLogs: activityLogs,
    _summaries: summaries,

    from: (table: string) => {
      if (table === "health_integrations") {
        return {
          select: () => {
            const builder: any = {
              eq: (f: string, v: any) => {
                let filtered = integrations.filter((i) => (i as any)[f] === v);
                const subBuilder: any = {
                  eq: (f2: string, v2: any) => {
                    filtered = filtered.filter((i) => (i as any)[f2] === v2);
                    return subBuilder;
                  },
                  maybeSingle: async () => ({
                    data: filtered[0] || null,
                    error: null,
                  }),
                  single: async () => ({
                    data: filtered[0] || null,
                    error: filtered[0] ? null : { message: "Not found" },
                  }),
                };
                return subBuilder;
              },
            };
            return builder;
          },
          upsert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const idx = integrations.findIndex(
                  (i) => i.user_id === payload.user_id && i.provider === payload.provider
                );
                const updated: HealthIntegration = {
                  id: idx >= 0 ? integrations[idx].id : `hi-${Date.now()}`,
                  connected_at: idx >= 0 ? integrations[idx].connected_at : new Date().toISOString(),
                  created_at: idx >= 0 ? integrations[idx].created_at : new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  last_sync_at: null,
                  last_successful_sync_at: null,
                  last_error: null,
                  sync_cursor: null,
                  ...payload,
                };
                if (idx >= 0) {
                  integrations[idx] = updated;
                } else {
                  integrations.push(updated);
                }
                return { data: updated, error: null };
              },
            }),
            then: (resolve: any) => {
              const idx = integrations.findIndex(
                (i) => i.user_id === payload.user_id && i.provider === payload.provider
              );
              const updated: HealthIntegration = {
                id: idx >= 0 ? integrations[idx].id : `hi-${Date.now()}`,
                connected_at: idx >= 0 ? integrations[idx].connected_at : new Date().toISOString(),
                created_at: idx >= 0 ? integrations[idx].created_at : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_sync_at: null,
                last_successful_sync_at: null,
                last_error: null,
                sync_cursor: null,
                ...payload,
              };
              if (idx >= 0) {
                integrations[idx] = updated;
              } else {
                integrations.push(updated);
              }
              resolve({ data: updated, error: null });
            },
          }),
        };
      }

      if (table === "activity_external_records") {
        return {
          select: () => {
            const builder: any = {
              eq: (f: string, v: any) => {
                let filtered = externalRecords.filter((r) => (r as any)[f] === v);
                const subBuilder: any = {
                  eq: (f2: string, v2: any) => {
                    filtered = filtered.filter((r) => (r as any)[f2] === v2);
                    return subBuilder;
                  },
                  maybeSingle: async () => ({
                    data: filtered[0] || null,
                    error: null,
                  }),
                };
                return subBuilder;
              },
            };
            return builder;
          },
          upsert: async (payload: any) => {
            const idx = externalRecords.findIndex(
              (r) =>
                r.user_id === payload.user_id &&
                r.provider === payload.provider &&
                r.external_record_id === payload.external_record_id
            );
            const updated: ActivityExternalRecord = {
              id: idx >= 0 ? externalRecords[idx].id : `ext-${Date.now()}-${Math.random()}`,
              created_at: idx >= 0 ? externalRecords[idx].created_at : new Date().toISOString(),
              updated_at: new Date().toISOString(),
              activity_log_id: null,
              source_data_origin: null,
              start_time: null,
              end_time: null,
              ...payload,
            };
            if (idx >= 0) {
              externalRecords[idx] = updated;
            } else {
              externalRecords.push(updated);
            }
            return { data: updated, error: null };
          },
        };
      }

      if (table === "activity_logs") {
        return {
          select: () => {
            const builder: any = {
              eq: (f: string, v: any) => {
                let filtered = activityLogs.filter((a) => (a as any)[f] === v);
                const subBuilder: any = {
                  eq: (f2: string, v2: any) => {
                    filtered = filtered.filter((a) => (a as any)[f2] === v2);
                    return subBuilder;
                  },
                  order: () => subBuilder,
                  maybeSingle: async () => ({
                    data: filtered[0] || null,
                    error: null,
                  }),
                  single: async () => ({
                    data: filtered[0] || null,
                    error: filtered[0] ? null : { message: "Not found" },
                  }),
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
                };
                return subBuilder;
              },
            };
            return builder;
          },
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const newRow: ActivityLog = {
                  id: `act-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  distance_km: null,
                  steps: null,
                  calories_burned: null,
                  calorie_provenance: null,
                  note: null,
                  ...payload,
                };
                activityLogs.push(newRow);
                return { data: newRow, error: null };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (f: string, v: any) => {
              const idx = activityLogs.findIndex((a) => (a as any)[f] === v);
              if (idx >= 0) {
                activityLogs[idx] = { ...activityLogs[idx], ...payload };
              }
              return {
                then: (resolve: any) => resolve({ data: activityLogs[idx], error: null }),
              };
            },
          }),
        };
      }

      if (table === "daily_activity_summary") {
        return {
          select: () => {
            const builder: any = {
              eq: (f: string, v: any) => {
                let filtered = summaries.filter((s) => (s as any)[f] === v);
                const subBuilder: any = {
                  eq: (f2: string, v2: any) => {
                    filtered = filtered.filter((s) => (s as any)[f2] === v2);
                    return subBuilder;
                  },
                  maybeSingle: async () => ({
                    data: filtered[0] || null,
                    error: null,
                  }),
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
                };
                return subBuilder;
              },
            };
            return builder;
          },
          upsert: async (payload: any) => {
            const idx = summaries.findIndex(
              (s) =>
                s.user_id === payload.user_id &&
                s.log_date === payload.log_date &&
                s.step_source === payload.step_source
            );
            const updated: DailyActivitySummary = {
              id: idx >= 0 ? summaries[idx].id : `sum-${Date.now()}-${Math.random()}`,
              active_duration_minutes: 0,
              estimated_calories_burned: 0,
              device_calories_burned: 0,
              created_at: idx >= 0 ? summaries[idx].created_at : new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...payload,
            };
            if (idx >= 0) {
              summaries[idx] = updated;
            } else {
              summaries.push(updated);
            }
            return { data: updated, error: null };
          },
        };
      }

      throw new Error(`Unhandled mock table: ${table}`);
    },
  };

  return client;
}

describe("Health Connect Sync & Integration Engine", () => {
  const userId = "user-test-hc-123";

  it("normalizes Health Connect exercise types deterministically", () => {
    expect(normalizeActivityType("walking")).toBe("walking");
    expect(normalizeActivityType("running")).toBe("running");
    expect(normalizeActivityType("cycling")).toBe("cycling");
    expect(normalizeActivityType("strength_training")).toBe("strength_training");
    expect(normalizeActivityType("gym_workout")).toBe("gym_workout");
    expect(normalizeActivityType("swimming")).toBe("swimming");
    expect(normalizeActivityType("yoga")).toBe("yoga");
    expect(normalizeActivityType("sports")).toBe("sports");
    expect(normalizeActivityType("unknown_galactic_sport")).toBe("other");
  });

  it("updates and retrieves health integration status", async () => {
    const mockSupabase = createMockSupabaseForHealthConnect();

    const initial = await getHealthIntegration(userId, mockSupabase);
    expect(initial).toBeNull();

    const created = await setHealthIntegrationStatus(userId, true, mockSupabase);
    expect(created.enabled).toBe(true);
    expect(created.provider).toBe("health_connect");

    const fetched = await getHealthIntegration(userId, mockSupabase);
    expect(fetched?.enabled).toBe(true);

    const disabled = await setHealthIntegrationStatus(userId, false, mockSupabase);
    expect(disabled.enabled).toBe(false);
  });

  it("prevents sync when integration is explicitly disabled", async () => {
    const mockSupabase = createMockSupabaseForHealthConnect({
      integrations: [
        {
          id: "hi-1",
          user_id: userId,
          provider: "health_connect",
          enabled: false,
          connected_at: new Date().toISOString(),
          last_sync_at: null,
          last_successful_sync_at: null,
          last_error: null,
          sync_cursor: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    await expect(
      syncHealthConnectData(userId, { days: [{ date: "2026-10-08", steps: 5000 }] }, mockSupabase)
    ).rejects.toThrow("Health Connect integration is disabled");
  });

  it("syncs daily steps into daily_activity_summary with step_source = 'health_connect'", async () => {
    const mockSupabase = createMockSupabaseForHealthConnect();

    const result = await syncHealthConnectData(
      userId,
      {
        days: [
          { date: "2026-10-07", steps: 8420, sourceOrigins: ["com.google.android.apps.fitness"] },
          { date: "2026-10-08", steps: 11300, sourceOrigins: ["com.samsung.health"] },
        ],
      },
      mockSupabase
    );

    expect(result.success).toBe(true);
    expect(result.syncedDaysCount).toBe(2);
    expect(mockSupabase._summaries.length).toBe(2);

    const day8 = mockSupabase._summaries.find(
      (s: DailyActivitySummary) => s.log_date === "2026-10-08" && s.step_source === "health_connect"
    );
    expect(day8).toBeDefined();
    expect(day8?.steps).toBe(11300);

    // Verify activity_external_records tracks origin
    expect(mockSupabase._externalRecords.length).toBe(2);
    expect(mockSupabase._externalRecords[1].source_data_origin).toBe("com.samsung.health");
  });

  it("respects step source priority hierarchy: health_connect > device > manual", async () => {
    const targetDate = "2026-10-08";

    // Setup both manual steps (8,000) and health connect steps (10,234)
    const mockSupabase = createMockSupabaseForHealthConnect({
      summaries: [
        {
          id: "sum-manual",
          user_id: userId,
          log_date: targetDate,
          steps: 8000,
          step_source: "manual",
          active_duration_minutes: 0,
          estimated_calories_burned: 0,
          device_calories_burned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "sum-hc",
          user_id: userId,
          log_date: targetDate,
          steps: 10234,
          step_source: "health_connect",
          active_duration_minutes: 0,
          estimated_calories_burned: 0,
          device_calories_burned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    const summary = await getDailyActivitySummary(userId, targetDate, mockSupabase);

    // Priority hierarchy selects health_connect!
    expect(summary.totalSteps).toBe(10234);
    expect(summary.stepSource).toBe("health_connect");
    // CRITICAL: NEVER sum manual and health_connect (not 18,234)
    expect(summary.totalSteps).not.toBe(18234);
  });

  it("preserves device_reported calorie provenance and does NOT run MET calculator", async () => {
    const mockSupabase = createMockSupabaseForHealthConnect();

    const result = await syncHealthConnectData(
      userId,
      {
        sessions: [
          {
            externalRecordId: "hc_run_999",
            activityType: "running",
            durationMinutes: 45,
            distanceKm: 6.2,
            steps: 5400,
            caloriesBurned: 412.5,
            calorieProvenance: "device_reported",
            loggedAt: "2026-10-08",
            title: "Morning 6k Run",
            sourceOrigin: "com.google.android.apps.fitness",
          },
        ],
      },
      mockSupabase
    );

    expect(result.success).toBe(true);
    expect(result.syncedSessionsCount).toBe(1);

    const log = mockSupabase._activityLogs[0];
    expect(log).toBeDefined();
    expect(log.activity_type).toBe("running");
    expect(log.duration_minutes).toBe(45);
    expect(log.distance_km).toBe(6.2);
    expect(log.steps).toBe(5400);
    expect(log.calories_burned).toBe(412.5);
    // CRITICAL: provenance is device_reported, exact device calories preserved
    expect(log.calorie_provenance).toBe("device_reported");
    expect(log.source).toBe("health_connect");
  });

  it("NEVER infers steps from distance or GPS when steps are omitted", async () => {
    const mockSupabase = createMockSupabaseForHealthConnect();

    const result = await syncHealthConnectData(
      userId,
      {
        sessions: [
          {
            externalRecordId: "hc_outdoor_cycle_101",
            activityType: "cycling",
            durationMinutes: 60,
            distanceKm: 18.5,
            steps: null, // GPS distance without pedometer steps
            caloriesBurned: 380,
            loggedAt: "2026-10-08",
            sourceOrigin: "com.strava",
          },
        ],
      },
      mockSupabase
    );

    expect(result.success).toBe(true);
    const log = mockSupabase._activityLogs[0];
    expect(log).toBeDefined();
    expect(log.distance_km).toBe(18.5);
    // Invariant: steps must remain null, never inferred from distance
    expect(log.steps).toBeNull();
  });

  it("is idempotent: syncing identical workout session twice does NOT duplicate activity log", async () => {
    const mockSupabase = createMockSupabaseForHealthConnect();

    const workout = {
      externalRecordId: "session_hc_unique_123",
      activityType: "strength_training",
      durationMinutes: 50,
      caloriesBurned: 260,
      loggedAt: "2026-10-08",
      sourceOrigin: "com.fitbit",
    };

    // First sync
    const res1 = await syncHealthConnectData(userId, { sessions: [workout] }, mockSupabase);
    expect(res1.syncedSessionsCount).toBe(1);
    expect(res1.skippedSessionsCount).toBe(0);
    expect(mockSupabase._activityLogs.length).toBe(1);

    // Second sync of same workout
    const res2 = await syncHealthConnectData(userId, { sessions: [workout] }, mockSupabase);
    expect(res2.syncedSessionsCount).toBe(0);
    expect(res2.skippedSessionsCount).toBe(1);
    // Activity logs count remains 1, no duplicates created
    expect(mockSupabase._activityLogs.length).toBe(1);
  });
});

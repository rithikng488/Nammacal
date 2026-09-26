import { describe, it, expect } from "vitest";
import {
  validateActivityInput,
  logActivity,
  logDailySteps,
  getDailyActivitySummary,
  getActivityHistory,
  updateActivityLog,
  deleteActivityLog,
} from "@/lib/activity/activity-service";
import type {
  ActivityLog,
  DailyActivitySummary,
  WeightLog,
} from "@/lib/supabase/types";

function createMockSupabaseForActivity(
  initialActivities: ActivityLog[] = [],
  initialSummaries: DailyActivitySummary[] = [],
  initialWeights: WeightLog[] = []
) {
  let activities = [...initialActivities];
  let summaries = [...initialSummaries];
  let weights = [...initialWeights];

  const client: any = {
    from: (table: string) => {
      if (table === "weight_logs") {
        return {
          select: () => {
            let filtered = [...weights];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((w) => (w as any)[f] === v);
                return builder;
              },
              order: () => builder,
              limit: (n: number) => ({
                then: (resolve: any) => resolve({ data: filtered.slice(0, n), error: null }),
              }),
            };
            return builder;
          },
        };
      }

      if (table === "activity_logs") {
        return {
          select: (_cols?: string) => {
            let filtered = [...activities];
            let limitNum: number | null = null;
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((a) => (a as any)[f] === v);
                return builder;
              },
              gte: (f: string, v: any) => {
                filtered = filtered.filter((a) => (a as any)[f] >= v);
                return builder;
              },
              lte: (f: string, v: any) => {
                filtered = filtered.filter((a) => (a as any)[f] <= v);
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
              single: async () => {
                const item = filtered[0] || null;
                return { data: item, error: item ? null : { message: "Not found" } };
              },
              then: (resolve: any) => {
                const res = limitNum !== null ? filtered.slice(0, limitNum) : filtered;
                resolve({ data: res, error: null });
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
                  ...payload,
                };
                activities.unshift(newRow);
                return { data: newRow, error: null };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (_f1: string, idVal: string) => ({
              eq: (_f2: string, userVal: string) => ({
                select: () => ({
                  single: async () => {
                    const idx = activities.findIndex(
                      (a) => a.id === idVal && a.user_id === userVal
                    );
                    if (idx < 0) return { data: null, error: { message: "Not found" } };
                    activities[idx] = { ...activities[idx], ...payload };
                    return { data: activities[idx], error: null };
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_f1: string, idVal: string) => ({
              eq: async (_f2: string, userVal: string) => {
                const idx = activities.findIndex(
                  (a) => a.id === idVal && a.user_id === userVal
                );
                if (idx < 0) return { error: { message: "Not found" } };
                activities.splice(idx, 1);
                return { error: null };
              },
            }),
          }),
        };
      }

      if (table === "daily_activity_summary") {
        return {
          select: () => {
            let filtered = [...summaries];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((s) => (s as any)[f] === v);
                return builder;
              },
              maybeSingle: async () => {
                return { data: filtered[0] || null, error: null };
              },
              single: async () => {
                const item = filtered[0] || null;
                return { data: item, error: item ? null : { message: "Not found" } };
              },
              then: (resolve: any) => {
                resolve({ data: filtered, error: null });
              },
            };
            return builder;
          },
          upsert: (payload: any, _opts: any) => {
            const idx = summaries.findIndex(
              (s) =>
                s.user_id === payload.user_id &&
                s.log_date === payload.log_date &&
                s.step_source === payload.step_source
            );
            const updated: DailyActivitySummary = {
              id: idx >= 0 ? summaries[idx].id : `sum-${Date.now()}-${Math.random()}`,
              created_at: idx >= 0 ? summaries[idx].created_at : new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...payload,
            };
            if (idx >= 0) {
              summaries[idx] = updated;
            } else {
              summaries.push(updated);
            }

            return {
              select: () => ({
                single: async () => ({ data: updated, error: null }),
              }),
              then: (resolve: any) => resolve({ data: updated, error: null }),
            };
          },
        };
      }

      return {};
    },
  };

  return { client, getActivities: () => activities, getSummaries: () => summaries };
}

describe("Phase 7 - Activity & Step Tracking Service", () => {
  const userA = "user-activity-1";
  const userB = "user-activity-2";

  describe("Validation & Architectural Rule", () => {
    it("validates correct activity inputs", () => {
      const validated = validateActivityInput({
        activityType: "walking",
        durationMinutes: 45,
        intensity: "moderate",
        distanceKm: 3.5,
        steps: 4200,
        loggedAt: "2026-10-07",
        note: "Evening walk",
      });

      expect(validated.activityType).toBe("walking");
      expect(validated.durationMinutes).toBe(45);
      expect(validated.intensity).toBe("moderate");
      expect(validated.distanceKm).toBe(3.5);
      expect(validated.steps).toBe(4200);
      expect(validated.source).toBe("manual");
    });

    it("CRITICAL RULE: does NOT calculate or infer steps from distance", () => {
      // When distance is provided without steps, steps MUST remain null
      const validated = validateActivityInput({
        activityType: "running",
        durationMinutes: 30,
        distanceKm: 5.0,
      });

      expect(validated.distanceKm).toBe(5.0);
      expect(validated.steps).toBeNull(); // Strictly null, NO GPS/distance conversion!
    });

    it("rejects non-positive duration or durations > 24 hours", () => {
      expect(() =>
        validateActivityInput({
          activityType: "walking",
          durationMinutes: 0,
        })
      ).toThrow("Activity duration must be an integer between 1 and 1440 minutes");

      expect(() =>
        validateActivityInput({
          activityType: "walking",
          durationMinutes: -10,
        })
      ).toThrow("Activity duration must be an integer between 1 and 1440 minutes");

      expect(() =>
        validateActivityInput({
          activityType: "walking",
          durationMinutes: 1500,
        })
      ).toThrow("Activity duration must be an integer between 1 and 1440 minutes");
    });

    it("rejects invalid activity types or intensities", () => {
      expect(() =>
        validateActivityInput({
          activityType: "flying" as any,
          durationMinutes: 30,
        })
      ).toThrow("Invalid activity type");

      expect(() =>
        validateActivityInput({
          activityType: "walking",
          durationMinutes: 30,
          intensity: "super-extreme" as any,
        })
      ).toThrow("Invalid intensity");
    });

    it("rejects negative distance or negative steps", () => {
      expect(() =>
        validateActivityInput({
          activityType: "walking",
          durationMinutes: 30,
          distanceKm: -2.5,
        })
      ).toThrow("Distance must be a positive number");

      expect(() =>
        validateActivityInput({
          activityType: "walking",
          durationMinutes: 30,
          steps: -500,
        })
      ).toThrow("Steps must be a positive integer");
    });
  });

  describe("Logging Activities & Deterministic Calorie Estimation", () => {
    it("logs activity with calculated estimated calories based on user weight", async () => {
      const weights: WeightLog[] = [
        {
          id: "w1",
          user_id: userA,
          weight_kg: 80.0,
          logged_at: "2026-10-06",
          note: null,
          created_at: "2026-10-06T00:00:00Z",
          updated_at: "2026-10-06T00:00:00Z",
        },
      ];

      const { client } = createMockSupabaseForActivity([], [], weights);

      // Moderate strength training for 60 min (MET 4.0) for 80 kg user:
      // 4.0 * 80 * (60 / 60) = 320.0 kcal
      const activity = await logActivity(
        userA,
        {
          activityType: "strength_training",
          durationMinutes: 60,
          intensity: "moderate",
          loggedAt: "2026-10-07",
        },
        client
      );

      expect(activity.user_id).toBe(userA);
      expect(activity.activity_type).toBe("strength_training");
      expect(activity.duration_minutes).toBe(60);
      expect(activity.calories_burned).toBe(320.0);
      expect(activity.calorie_provenance).toBe("calculated_activity_estimate");
      expect(activity.source).toBe("manual");
    });

    it("updates daily activity summary with duration and estimated calories", async () => {
      const { client } = createMockSupabaseForActivity([], [], []);

      await logActivity(
        userA,
        {
          activityType: "walking",
          durationMinutes: 40,
          intensity: "moderate",
          steps: 4000,
          loggedAt: "2026-10-07",
        },
        client
      );

      await logActivity(
        userA,
        {
          activityType: "yoga",
          durationMinutes: 30,
          intensity: "light",
          loggedAt: "2026-10-07",
        },
        client
      );

      const summary = await getDailyActivitySummary(userA, "2026-10-07", client);

      expect(summary.sessionsCount).toBe(2);
      expect(summary.totalDurationMinutes).toBe(70);
      expect(summary.totalSteps).toBe(4000);
      expect(summary.stepSource).toBe("manual");
      expect(summary.estimatedCaloriesBurned).toBeGreaterThan(0);
    });
  });

  describe("Step Source Prioritization", () => {
    it("prioritizes health_connect and device steps over manual steps", async () => {
      const summaries: DailyActivitySummary[] = [
        {
          id: "s-man",
          user_id: userA,
          log_date: "2026-10-07",
          steps: 5000,
          step_source: "manual",
          active_duration_minutes: 40,
          estimated_calories_burned: 150,
          device_calories_burned: 0,
          created_at: "Z",
          updated_at: "Z",
        },
        {
          id: "s-hc",
          user_id: userA,
          log_date: "2026-10-07",
          steps: 7500,
          step_source: "health_connect",
          active_duration_minutes: 60,
          estimated_calories_burned: 0,
          device_calories_burned: 240,
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const { client } = createMockSupabaseForActivity([], summaries, []);
      const summary = await getDailyActivitySummary(userA, "2026-10-07", client);

      // Should choose health_connect source (7500 steps)
      expect(summary.totalSteps).toBe(7500);
      expect(summary.stepSource).toBe("health_connect");
    });

    it("allows manual step logging directly", async () => {
      const { client } = createMockSupabaseForActivity([], [], []);

      const stepLog = await logDailySteps(userA, 8421, "2026-10-07", "manual", client);
      expect(stepLog.steps).toBe(8421);
      expect(stepLog.step_source).toBe("manual");

      const summary = await getDailyActivitySummary(userA, "2026-10-07", client);
      expect(summary.totalSteps).toBe(8421);
      expect(summary.stepSource).toBe("manual");
    });
  });

  describe("Update, Delete & User Isolation", () => {
    it("updates activity log and recalculates calories if duration changes", async () => {
      const initial: ActivityLog[] = [
        {
          id: "act-1",
          user_id: userA,
          activity_type: "walking",
          duration_minutes: 30,
          distance_km: 2.0,
          steps: 3000,
          intensity: "moderate",
          calories_burned: 122.5,
          calorie_provenance: "calculated_activity_estimate",
          logged_at: "2026-10-07",
          note: null,
          source: "manual",
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const { client } = createMockSupabaseForActivity(initial, [], []);

      const updated = await updateActivityLog(
        userA,
        "act-1",
        { durationMinutes: 60 },
        client
      );

      expect(updated.duration_minutes).toBe(60);
      // Doubled duration should double estimated calories (245 kcal)
      expect(updated.calories_burned).toBe(245.0);
    });

    it("strictly isolates activity mutations and prevents cross-user access", async () => {
      const initial: ActivityLog[] = [
        {
          id: "act-secret",
          user_id: userA,
          activity_type: "gym_workout",
          duration_minutes: 60,
          distance_km: null,
          steps: null,
          intensity: "vigorous",
          calories_burned: 490,
          calorie_provenance: "calculated_activity_estimate",
          logged_at: "2026-10-07",
          note: "Private session",
          source: "manual",
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const { client } = createMockSupabaseForActivity(initial, [], []);

      // User B tries to update User A's activity
      await expect(
        updateActivityLog(userB, "act-secret", { durationMinutes: 90 }, client)
      ).rejects.toThrow("Activity log not found or unauthorized");

      // User B tries to delete User A's activity
      await expect(
        deleteActivityLog(userB, "act-secret", client)
      ).rejects.toThrow("Activity log not found or unauthorized");

      // User B's history is empty
      const historyB = await getActivityHistory(userB, {}, client);
      expect(historyB.length).toBe(0);
    });
  });
});

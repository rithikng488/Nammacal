import { describe, it, expect } from "vitest";
import {
  validateWaterAmount,
  logWater,
  getDailyWaterSummary,
  getWaterHistory,
  deleteWaterLog,
} from "@/lib/water/water-service";
import { normalizeDateString } from "@/lib/meals/meal-service";
import type { WaterLog, Profile } from "@/lib/supabase/types";

function createMockSupabaseForWater(
  initialProfile: Partial<Profile>,
  initialLogs: WaterLog[] = []
) {
  let profile = { ...initialProfile };
  let logs = [...initialLogs];

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
            }),
          }),
        };
      }

      if (table === "water_logs") {
        return {
          select: (_cols?: string) => {
            let filtered = [...logs];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((l) => (l as any)[f] === v);
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
              order: (f: string, opts?: { ascending?: boolean }) => {
                const asc = opts?.ascending ?? true;
                filtered.sort((a: any, b: any) => {
                  if (a[f] < b[f]) return asc ? -1 : 1;
                  if (a[f] > b[f]) return asc ? 1 : -1;
                  return 0;
                });
                return builder;
              },
              then: (resolve: any) => {
                resolve({ data: filtered, error: null });
              },
            };
            return builder;
          },
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const newRow: WaterLog = {
                  id: `water-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...payload,
                };
                logs.unshift(newRow);
                return { data: newRow, error: null };
              },
            }),
          }),
          delete: () => ({
            eq: (_f1: string, idVal: string) => ({
              eq: async (_f2: string, userVal: string) => {
                const idx = logs.findIndex((l) => l.id === idVal && l.user_id === userVal);
                if (idx < 0) return { error: { message: "Not found or unauthorized" } };
                logs.splice(idx, 1);
                return { error: null };
              },
            }),
          }),
        };
      }

      return {};
    },
  };

  return { client, getLogs: () => logs };
}

describe("Phase 7 - Water Tracking Service", () => {
  const userA = "user-water-1";
  const userB = "user-water-2";

  const defaultProfileWithTarget: Partial<Profile> = {
    id: userA,
    daily_water_ml_target: 2500,
  };

  const profileWithoutTarget: Partial<Profile> = {
    id: userA,
    daily_water_ml_target: 0, // Unconfigured
  };

  describe("Amount Validation", () => {
    it("validates valid milliliter amounts", () => {
      expect(validateWaterAmount(250)).toBe(250);
      expect(validateWaterAmount(500.8)).toBe(500);
      expect(validateWaterAmount(10000)).toBe(10000);
    });

    it("rejects non-positive amounts or amounts exceeding 10 Liters", () => {
      expect(() => validateWaterAmount(0)).toThrow("Water amount must be an integer between 1 and 10,000 ml.");
      expect(() => validateWaterAmount(-250)).toThrow("Water amount must be an integer between 1 and 10,000 ml.");
      expect(() => validateWaterAmount(10001)).toThrow("Water amount must be an integer between 1 and 10,000 ml.");
    });
  });

  describe("Daily Logging & Aggregation", () => {
    it("logs multiple quick intake amounts and aggregates them correctly", async () => {
      const { client } = createMockSupabaseForWater(defaultProfileWithTarget);

      await logWater(userA, { amountMl: 250, loggedAt: "2026-10-07" }, client);
      await logWater(userA, { amountMl: 500, loggedAt: "2026-10-07" }, client);
      await logWater(userA, { amountMl: 750, loggedAt: "2026-10-07" }, client);

      const summary = await getDailyWaterSummary(userA, "2026-10-07", client);

      // Total = 250 + 500 + 750 = 1500 ml
      expect(summary.totalMl).toBe(1500);
      expect(summary.logsCount).toBe(3);
      expect(summary.targetMl).toBe(2500);
      // Progress: 1500 / 2500 = 60%
      expect(summary.percentage).toBe(60);
    });

    it("INVARIANT: does NOT fabricate a 2.5L target if user has no target configured", async () => {
      const { client } = createMockSupabaseForWater(profileWithoutTarget);

      await logWater(userA, { amountMl: 750, loggedAt: "2026-10-07" }, client);

      const summary = await getDailyWaterSummary(userA, "2026-10-07", client);

      expect(summary.totalMl).toBe(750);
      expect(summary.targetMl).toBeNull();
      expect(summary.percentage).toBeNull(); // No invented percentage
    });
  });

  describe("Historical Intake", () => {
    it("computes 7-day historical intake and average without fabricating missing days", async () => {
      const today = new Date();
      const todayStr = normalizeDateString(today);

      const dMinus1 = new Date(today);
      dMinus1.setDate(dMinus1.getDate() - 1);
      const dMinus1Str = normalizeDateString(dMinus1);

      const dMinus2 = new Date(today);
      dMinus2.setDate(dMinus2.getDate() - 2);
      const dMinus2Str = normalizeDateString(dMinus2);

      const logs: WaterLog[] = [
        { id: "w1", user_id: userA, amount_ml: 1500, logged_at: todayStr, created_at: "Z", updated_at: "Z" },
        { id: "w2", user_id: userA, amount_ml: 2000, logged_at: dMinus1Str, created_at: "Z", updated_at: "Z" },
        { id: "w3", user_id: userA, amount_ml: 2500, logged_at: dMinus2Str, created_at: "Z", updated_at: "Z" },
      ];

      const { client } = createMockSupabaseForWater(defaultProfileWithTarget, logs);

      const history = await getWaterHistory(userA, 7, client);

      expect(history.periodDays).toBe(7);
      expect(history.history.length).toBe(7);
      // Average across 3 logged days: (1500 + 2000 + 2500) / 3 = 2000 ml
      expect(history.averageMl).toBe(2000);
    });
  });

  describe("Deletion & User Isolation", () => {
    it("deletes a water log strictly for owner and rejects unauthorized user", async () => {
      const logs: WaterLog[] = [
        { id: "w-own", user_id: userA, amount_ml: 500, logged_at: "2026-10-07", created_at: "Z", updated_at: "Z" },
      ];

      const { client, getLogs } = createMockSupabaseForWater(defaultProfileWithTarget, logs);

      // User B cannot delete User A's log
      await expect(deleteWaterLog(userB, "w-own", client)).rejects.toThrow("Failed to delete water log");
      expect(getLogs().length).toBe(1);

      // User A can delete their own log
      await deleteWaterLog(userA, "w-own", client);
      expect(getLogs().length).toBe(0);
    });
  });
});

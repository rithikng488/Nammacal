import { describe, it, expect } from "vitest";
import {
  logWeight,
  getWeightHistory,
  getLatestWeight,
  getPreviousWeight,
  calculateWeightChange,
  getWeightTrend,
  updateWeightLog,
  deleteWeightLog,
  validateWeightKg,
  WeightValidationError,
} from "@/lib/weight/weight-service";
import type { WeightLog } from "@/lib/supabase/types";

function createMockSupabase(initialLogs: WeightLog[] = []) {
  let logs = [...initialLogs];

  const client: any = {
    from: (table: string) => {
      if (table === "weight_logs") {
        return {
          select: () => {
            let filtered = [...logs];
            let limitNum: number | null = null;

            const queryBuilder: any = {
              eq: (field: string, val: any) => {
                filtered = filtered.filter((l) => (l as any)[field] === val);
                return queryBuilder;
              },
              gte: (field: string, val: any) => {
                filtered = filtered.filter((l) => (l as any)[field] >= val);
                return queryBuilder;
              },
              lte: (field: string, val: any) => {
                filtered = filtered.filter((l) => (l as any)[field] <= val);
                return queryBuilder;
              },
              order: (field: string, opts?: { ascending?: boolean }) => {
                const asc = opts?.ascending ?? true;
                filtered.sort((a: any, b: any) => {
                  if (a[field] < b[field]) return asc ? -1 : 1;
                  if (a[field] > b[field]) return asc ? 1 : -1;
                  return 0;
                });
                return queryBuilder;
              },
              limit: (num: number) => {
                limitNum = num;
                return queryBuilder;
              },
              single: async () => {
                const item = filtered[0] || null;
                return { data: item, error: item ? null : { message: "Not found" } };
              },
              then: (resolve: any, reject?: any) => {
                const result = limitNum !== null ? filtered.slice(0, limitNum) : filtered;
                return Promise.resolve({ data: result, error: null }).then(resolve, reject);
              },
            };
            return queryBuilder;
          },
          upsert: (payload: any, _opts: any) => ({
            select: () => ({
              single: async () => {
                const existingIndex = logs.findIndex(
                  (l) => l.user_id === payload.user_id && l.logged_at === payload.logged_at
                );
                const updatedItem: WeightLog = {
                  id: existingIndex >= 0 ? logs[existingIndex].id : `weight-${Date.now()}-${Math.random()}`,
                  created_at: existingIndex >= 0 ? logs[existingIndex].created_at : new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...payload,
                };

                if (existingIndex >= 0) {
                  logs[existingIndex] = updatedItem;
                } else {
                  logs.unshift(updatedItem);
                }
                return { data: updatedItem, error: null };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (_field: string, idVal: string) => ({
              eq: (_field2: string, userVal: string) => ({
                select: () => ({
                  single: async () => {
                    const idx = logs.findIndex((l) => l.id === idVal && l.user_id === userVal);
                    if (idx < 0) return { data: null, error: { message: "Not found or unauthorized" } };
                    logs[idx] = { ...logs[idx], ...payload };
                    return { data: logs[idx], error: null };
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_field: string, idVal: string) => ({
              eq: async (_field2: string, userVal: string) => {
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

describe("Phase 6 - Weight Tracking Service & Validation", () => {
  const userA = "user-weight-a";
  const userB = "user-weight-b";

  describe("Validation & Bounds Checks", () => {
    it("validates and rounds weight values to 1 decimal place", () => {
      expect(validateWeightKg(72.44)).toBe(72.4);
      expect(validateWeightKg(72.46)).toBe(72.5);
    });

    it("rejects non-numeric or out-of-bounds weight inputs", () => {
      expect(() => validateWeightKg(15)).toThrow(WeightValidationError); // < 20 kg
      expect(() => validateWeightKg(450)).toThrow(WeightValidationError); // > 400 kg
      expect(() => validateWeightKg(NaN)).toThrow(WeightValidationError);
    });
  });

  describe("Weight Logging & History", () => {
    it("logs a new weight entry and returns it", async () => {
      const { client, getLogs } = createMockSupabase();

      const entry = await logWeight(
        userA,
        {
          weightKg: 70.4,
          loggedAt: "2026-10-05",
          note: "Morning empty stomach",
        },
        client
      );

      expect(entry).toBeDefined();
      expect(entry.weight_kg).toBe(70.4);
      expect(entry.logged_at).toBe("2026-10-05");
      expect(entry.note).toBe("Morning empty stomach");
      expect(getLogs().length).toBe(1);
    });

    it("upserts weight if logged on the same date for the same user", async () => {
      const { client, getLogs } = createMockSupabase();

      await logWeight(userA, { weightKg: 70.4, loggedAt: "2026-10-05" }, client);
      const updated = await logWeight(userA, { weightKg: 70.1, loggedAt: "2026-10-05" }, client);

      expect(getLogs().length).toBe(1);
      expect(updated.weight_kg).toBe(70.1);
    });
  });

  describe("Latest, Previous & Weight Change Analytics", () => {
    it("calculates accurate change between the two most recent measurements", async () => {
      const sampleLogs: WeightLog[] = [
        {
          id: "w2",
          user_id: userA,
          weight_kg: 70.0,
          logged_at: "2026-10-05",
          note: null,
          created_at: "2026-10-05T08:00:00Z",
          updated_at: "2026-10-05T08:00:00Z",
        },
        {
          id: "w1",
          user_id: userA,
          weight_kg: 70.4,
          logged_at: "2026-10-04",
          note: null,
          created_at: "2026-10-04T08:00:00Z",
          updated_at: "2026-10-04T08:00:00Z",
        },
      ];

      const { client } = createMockSupabase(sampleLogs);

      const latest = await getLatestWeight(userA, client);
      expect(latest?.weight_kg).toBe(70.0);

      const previous = await getPreviousWeight(userA, client);
      expect(previous?.weight_kg).toBe(70.4);

      const change = await calculateWeightChange(userA, client);
      expect(change.changeKg).toBe(-0.4); // 70.0 - 70.4 = -0.4 kg
    });

    it("returns null change if only one weight entry exists", async () => {
      const singleLog: WeightLog[] = [
        {
          id: "w1",
          user_id: userA,
          weight_kg: 70.0,
          logged_at: "2026-10-05",
          note: null,
          created_at: "2026-10-05T08:00:00Z",
          updated_at: "2026-10-05T08:00:00Z",
        },
      ];

      const { client } = createMockSupabase(singleLog);
      const change = await calculateWeightChange(userA, client);

      expect(change.current?.weight_kg).toBe(70.0);
      expect(change.previous).toBeNull();
      expect(change.changeKg).toBeNull();
    });
  });

  describe("Weight Trend Over Time", () => {
    it("returns chronological entries, min, max, and overall change", async () => {
      const trendLogs: WeightLog[] = [
        { id: "w3", user_id: userA, weight_kg: 69.5, logged_at: "2026-10-05", note: null, created_at: "Z", updated_at: "Z" },
        { id: "w2", user_id: userA, weight_kg: 70.2, logged_at: "2026-10-03", note: null, created_at: "Z", updated_at: "Z" },
        { id: "w1", user_id: userA, weight_kg: 71.0, logged_at: "2026-10-01", note: null, created_at: "Z", updated_at: "Z" },
      ];

      const { client } = createMockSupabase(trendLogs);
      const trend = await getWeightTrend(userA, 30, client);

      expect(trend.entries.length).toBe(3);
      // Chronological order: 2026-10-01 first, 2026-10-05 last
      expect(trend.entries[0].logged_at).toBe("2026-10-01");
      expect(trend.entries[2].logged_at).toBe("2026-10-05");
      expect(trend.minWeight).toBe(69.5);
      expect(trend.maxWeight).toBe(71.0);
      expect(trend.overallChangeKg).toBe(-1.5); // 69.5 - 71.0 = -1.5 kg
    });
  });

  describe("Update, Delete & User Isolation", () => {
    it("updates and deletes weight logs strictly for owner", async () => {
      const initial: WeightLog[] = [
        { id: "wA", user_id: userA, weight_kg: 70.0, logged_at: "2026-10-05", note: null, created_at: "Z", updated_at: "Z" },
      ];
      const { client, getLogs } = createMockSupabase(initial);

      // User A can update
      const updated = await updateWeightLog(userA, "wA", { weightKg: 70.5 }, client);
      expect(updated.weight_kg).toBe(70.5);

      // User B cannot update User A's log
      await expect(updateWeightLog(userB, "wA", { weightKg: 65.0 }, client)).rejects.toThrow();

      // User B cannot delete User A's log
      await expect(deleteWeightLog(userB, "wA", client)).rejects.toThrow();

      // User A can delete
      await deleteWeightLog(userA, "wA", client);
      expect(getLogs().length).toBe(0);
    });
  });
});

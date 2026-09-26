import { describe, it, expect } from "vitest";
import {
  createHabit,
  getUserHabitsWithTodayStatus,
  toggleHabitCompletion,
  getHabitHistory,
  updateHabit,
  deleteHabit,
} from "@/lib/habits/habit-service";
import { normalizeDateString } from "@/lib/meals/meal-service";
import type { Habit, HabitLog } from "@/lib/supabase/types";

function createMockSupabaseForHabits(
  initialHabits: Habit[] = [],
  initialLogs: HabitLog[] = []
) {
  let habits = [...initialHabits];
  let logs = [...initialLogs];

  const client: any = {
    from: (table: string) => {
      if (table === "habits") {
        return {
          select: (_cols?: string) => {
            let filtered = [...habits];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((h) => (h as any)[f] === v);
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
              single: async () => {
                const item = filtered[0] || null;
                return { data: item, error: item ? null : { message: "Habit not found" } };
              },
              then: (resolve: any) => resolve({ data: filtered, error: null }),
            };
            return builder;
          },
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const newRow: Habit = {
                  id: `habit-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...payload,
                };
                habits.push(newRow);
                return { data: newRow, error: null };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (_f1: string, idVal: string) => ({
              eq: (_f2: string, userVal: string) => ({
                select: () => ({
                  single: async () => {
                    const idx = habits.findIndex((h) => h.id === idVal && h.user_id === userVal);
                    if (idx < 0) return { data: null, error: { message: "Not found or unauthorized" } };
                    habits[idx] = { ...habits[idx], ...payload };
                    return { data: habits[idx], error: null };
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_f1: string, idVal: string) => ({
              eq: async (_f2: string, userVal: string) => {
                const idx = habits.findIndex((h) => h.id === idVal && h.user_id === userVal);
                if (idx < 0) return { error: { message: "Not found or unauthorized" } };
                habits.splice(idx, 1);
                logs = logs.filter((l) => l.habit_id !== idVal);
                return { error: null };
              },
            }),
          }),
        };
      }

      if (table === "habit_logs") {
        return {
          select: (_cols?: string) => {
            let filtered = [...logs];
            const builder: any = {
              eq: (f: string, v: any) => {
                filtered = filtered.filter((l) => (l as any)[f] === v);
                return builder;
              },
              in: (f: string, vals: any[]) => {
                filtered = filtered.filter((l) => vals.includes((l as any)[f]));
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
              maybeSingle: async () => ({ data: filtered[0] || null, error: null }),
              single: async () => {
                const item = filtered[0] || null;
                return { data: item, error: item ? null : { message: "Log not found" } };
              },
              then: (resolve: any) => resolve({ data: filtered, error: null }),
            };
            return builder;
          },
          upsert: (payload: any, _opts: any) => {
            const idx = logs.findIndex(
              (l) => l.habit_id === payload.habit_id && l.logged_date === payload.logged_date
            );
            const updated: HabitLog = {
              id: idx >= 0 ? logs[idx].id : `hlog-${Date.now()}-${Math.random()}`,
              created_at: idx >= 0 ? logs[idx].created_at : new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...payload,
            };
            if (idx >= 0) {
              logs[idx] = updated;
            } else {
              logs.push(updated);
            }
            return {
              select: () => ({
                single: async () => ({ data: updated, error: null }),
              }),
              then: (resolve: any) => resolve({ data: updated, error: null }),
            };
          },
          delete: () => ({
            eq: async (_f: string, idVal: string) => {
              const idx = logs.findIndex((l) => l.id === idVal);
              if (idx >= 0) logs.splice(idx, 1);
              return { error: null };
            },
          }),
        };
      }

      return {};
    },
  };

  return { client, getHabits: () => habits, getLogs: () => logs };
}

describe("Phase 7 - Habit Tracking & Streak Service", () => {
  const userA = "user-habit-1";
  const userB = "user-habit-2";

  describe("Habit Creation & Validation", () => {
    it("creates a new habit with name, description, and daily frequency", async () => {
      const { client } = createMockSupabaseForHabits();

      const habit = await createHabit(
        userA,
        {
          name: "Morning Stretching",
          description: "10 mins mobility after waking",
          frequency: "daily",
        },
        client
      );

      expect(habit.user_id).toBe(userA);
      expect(habit.name).toBe("Morning Stretching");
      expect(habit.description).toBe("10 mins mobility after waking");
      expect(habit.active).toBe(true);
    });

    it("rejects empty or excessively short/long names", async () => {
      const { client } = createMockSupabaseForHabits();

      await expect(createHabit(userA, { name: "" }, client)).rejects.toThrow(
        "Habit name must be between 2 and 100 characters"
      );
      await expect(createHabit(userA, { name: "A" }, client)).rejects.toThrow(
        "Habit name must be between 2 and 100 characters"
      );
      await expect(
        createHabit(userA, { name: "x".repeat(101) }, client)
      ).rejects.toThrow("Habit name must be between 2 and 100 characters");
    });
  });

  describe("Toggling Completion & Single-Date Uniqueness", () => {
    it("toggles habit completion on and off without creating duplicate records", async () => {
      const initialHabits: Habit[] = [
        {
          id: "h1",
          user_id: userA,
          name: "Drink Water",
          description: null,
          frequency: "daily",
          active: true,
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const { client, getLogs } = createMockSupabaseForHabits(initialHabits, []);
      const today = normalizeDateString(new Date());

      // 1. Mark complete
      const log = await toggleHabitCompletion(userA, "h1", today, undefined, null, client);
      expect(log).not.toBeNull();
      expect(log?.completed).toBe(true);
      expect(getLogs().length).toBe(1);

      // 2. Toggle off (unmark)
      const logOff = await toggleHabitCompletion(userA, "h1", today, undefined, null, client);
      expect(logOff).toBeNull();
      expect(getLogs().length).toBe(0);
    });

    it("prevents duplicate logs for the same habit and date (unique constraint)", async () => {
      const initialHabits: Habit[] = [
        {
          id: "h1",
          user_id: userA,
          name: "Walk",
          description: null,
          frequency: "daily",
          active: true,
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const { client, getLogs } = createMockSupabaseForHabits(initialHabits, []);
      const today = normalizeDateString(new Date());

      // Mark complete twice explicitly
      await toggleHabitCompletion(userA, "h1", today, true, "note 1", client);
      await toggleHabitCompletion(userA, "h1", today, true, "note 2", client);

      // Upsert must maintain exactly 1 row
      expect(getLogs().length).toBe(1);
      expect(getLogs()[0].note).toBe("note 2");
    });
  });

  describe("Streaks & History Calculation", () => {
    it("calculates current streak, best streak, and completion rate neutrally", async () => {
      const initialHabits: Habit[] = [
        {
          id: "h-streak",
          user_id: userA,
          name: "Log Meals",
          description: null,
          frequency: "daily",
          active: true,
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const today = new Date();
      const todayStr = normalizeDateString(today);

      const dMinus1 = new Date(today);
      dMinus1.setDate(dMinus1.getDate() - 1);
      const dMinus1Str = normalizeDateString(dMinus1);

      const dMinus2 = new Date(today);
      dMinus2.setDate(dMinus2.getDate() - 2);
      const dMinus2Str = normalizeDateString(dMinus2);

      const initialLogs: HabitLog[] = [
        { id: "l1", habit_id: "h-streak", user_id: userA, logged_date: todayStr, completed: true, note: null, created_at: "Z", updated_at: "Z" },
        { id: "l2", habit_id: "h-streak", user_id: userA, logged_date: dMinus1Str, completed: true, note: null, created_at: "Z", updated_at: "Z" },
        { id: "l3", habit_id: "h-streak", user_id: userA, logged_date: dMinus2Str, completed: true, note: null, created_at: "Z", updated_at: "Z" },
      ];

      const { client } = createMockSupabaseForHabits(initialHabits, initialLogs);

      const history = await getHabitHistory(userA, "h-streak", 7, client);

      expect(history.completedDaysCount).toBe(3);
      expect(history.currentStreak).toBe(3);
      expect(history.bestStreak).toBeGreaterThanOrEqual(3);
      // 3 of 7 days = 43%
      expect(history.completionRatePercentage).toBe(43);
    });
  });

  describe("Update, Deactivate & User Isolation", () => {
    it("updates habit details and strictly prevents cross-user mutations", async () => {
      const initialHabits: Habit[] = [
        {
          id: "h-userA",
          user_id: userA,
          name: "User A Habit",
          description: null,
          frequency: "daily",
          active: true,
          created_at: "Z",
          updated_at: "Z",
        },
      ];

      const { client, getHabits } = createMockSupabaseForHabits(initialHabits, []);

      // User B tries to update User A's habit
      await expect(
        updateHabit(userB, "h-userA", { name: "Hacked" }, client)
      ).rejects.toThrow("Failed to update habit");

      // User B tries to toggle User A's habit
      await expect(
        toggleHabitCompletion(userB, "h-userA", undefined, true, null, client)
      ).rejects.toThrow("Habit not found or unauthorized");

      // User B tries to delete User A's habit
      await expect(
        deleteHabit(userB, "h-userA", client)
      ).rejects.toThrow("Failed to delete habit");

      expect(getHabits().length).toBe(1);

      // User A updates their own habit
      const updated = await updateHabit(userA, "h-userA", { description: "Updated" }, client);
      expect(updated.description).toBe("Updated");

      // User A deletes their own habit
      await deleteHabit(userA, "h-userA", client);
      expect(getHabits().length).toBe(0);
    });
  });
});

"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Settings2, Plus, Sparkles } from "lucide-react";
import type { HabitWithTodayStatus } from "@/lib/habits/habit-service";

interface HabitsDashboardCardProps {
  habits: HabitWithTodayStatus[];
  onOpenManageHabits: () => void;
  onHabitsUpdated: () => void;
}

export function HabitsDashboardCard({
  habits,
  onOpenManageHabits,
  onHabitsUpdated,
}: HabitsDashboardCardProps) {
  const [togglingHabitId, setTogglingHabitId] = useState<string | null>(null);

  const completedCount = habits.filter((h) => h.completedToday).length;
  const totalCount = habits.length;

  const handleToggle = async (habitId: string) => {
    if (togglingHabitId) return;
    setTogglingHabitId(habitId);

    try {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        onHabitsUpdated();
      }
    } finally {
      setTogglingHabitId(null);
    }
  };

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Today&apos;s Habits
            </h3>
            <span className="text-[10px] text-stone-400">
              {completedCount} of {totalCount} completed
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenManageHabits}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Manage</span>
        </button>
      </div>

      {/* Habit Items */}
      {habits.length === 0 ? (
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-2">
          <p className="text-xs text-stone-500">No active habits set yet</p>
          <button
            type="button"
            onClick={onOpenManageHabits}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Habits</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {habits.map((habit) => {
            const isCompleted = habit.completedToday;
            const isToggling = togglingHabitId === habit.id;

            return (
              <div
                key={habit.id}
                onClick={() => handleToggle(habit.id)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                  isCompleted
                    ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-900/50"
                    : "bg-stone-50/50 dark:bg-stone-800/40 border-stone-100 dark:border-stone-800/60 hover:border-stone-300"
                } ${isToggling ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    aria-label={`Toggle habit: ${habit.name}`}
                    className="shrink-0 focus:outline-hidden"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 fill-purple-600/10" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-300 dark:text-stone-600 hover:text-purple-500 transition-colors" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <span
                      className={`text-xs font-bold block truncate ${
                        isCompleted
                          ? "text-stone-500 line-through decoration-stone-400"
                          : "text-stone-800 dark:text-stone-200"
                      }`}
                    >
                      {habit.name}
                    </span>
                    {habit.description && (
                      <p className="text-[10px] text-stone-400 truncate">
                        {habit.description}
                      </p>
                    )}
                  </div>
                </div>

                {habit.currentStreak > 0 && (
                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/40 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {habit.currentStreak}d streak
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

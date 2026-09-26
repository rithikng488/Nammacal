"use client";

import React from "react";
import { Activity, Footprints, Clock, Flame, Info, Plus } from "lucide-react";
import type { DayActivitySummaryResult } from "@/lib/activity/activity-service";

interface ActivityDashboardCardProps {
  activitySummary: DayActivitySummaryResult | null;
  onOpenLogActivity: () => void;
  onOpenLogSteps: () => void;
}

export function ActivityDashboardCard({
  activitySummary,
  onOpenLogActivity,
  onOpenLogSteps,
}: ActivityDashboardCardProps) {
  const steps = activitySummary?.totalSteps ?? 0;
  const stepSource = activitySummary?.stepSource ?? "manual";
  const duration = activitySummary?.totalDurationMinutes ?? 0;
  const estimatedCalories = activitySummary?.estimatedCaloriesBurned ?? 0;
  const deviceCalories = activitySummary?.deviceCaloriesBurned ?? 0;
  const sessionsCount = activitySummary?.sessionsCount ?? 0;

  const sourceLabel =
    stepSource === "health_connect"
      ? "Health Connect"
      : stepSource === "device"
      ? "Device"
      : "Manual";

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Activity & Movement
            </h3>
            <span className="text-[10px] text-stone-400">
              Separate from nutrition intake
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenLogSteps}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 transition-colors"
          >
            <Footprints className="w-3.5 h-3.5 text-stone-500" />
            <span>Steps</span>
          </button>
          <button
            type="button"
            onClick={onOpenLogActivity}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Steps */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-stone-500 flex items-center gap-1">
              <Footprints className="w-3 h-3 text-orange-500" />
              Steps
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
              {sourceLabel}
            </span>
          </div>
          <div className="text-lg font-black text-stone-900 dark:text-stone-100">
            {steps.toLocaleString()}
          </div>
          <span className="text-[10px] text-stone-400">
            {steps > 0 ? "Logged for today" : "0 steps logged"}
          </span>
        </div>

        {/* Sessions & Duration */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/60">
          <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-stone-500">
            <Clock className="w-3 h-3 text-blue-500" />
            Duration
          </div>
          <div className="text-lg font-black text-stone-900 dark:text-stone-100">
            {duration} <span className="text-xs font-semibold text-stone-500">min</span>
          </div>
          <span className="text-[10px] text-stone-400">
            {sessionsCount} {sessionsCount === 1 ? "session" : "sessions"}
          </span>
        </div>

        {/* Estimated Calories */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/60">
          <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-stone-500">
            <Flame className="w-3 h-3 text-amber-500" />
            Est. Burn
          </div>
          <div className="text-lg font-black text-stone-900 dark:text-stone-100">
            {Math.round(estimatedCalories + deviceCalories)} <span className="text-xs font-semibold text-stone-500">kcal</span>
          </div>
          <span className="text-[10px] text-stone-400">
            {deviceCalories > 0 ? "Device reported" : "MET estimate"}
          </span>
        </div>
      </div>

      {/* Activity Disclosure Note */}
      <div className="flex items-start gap-1.5 p-2 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 text-[10px] text-stone-500 dark:text-stone-400">
        <Info className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
        <span>
          Activity calorie values are deterministic estimates based on standard MET tables and do not alter food calorie budgets.
        </span>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Flame, Target, ShieldAlert } from "lucide-react";
import type { DailyTimeline } from "@/lib/meals/meal-service";
import type { UserNutritionTargets } from "@/lib/targets/target-service";

interface DailyNutritionSummaryProps {
  timeline: DailyTimeline | null;
  targets: UserNutritionTargets;
  onEditTargets?: () => void;
}

export function DailyNutritionSummary({
  timeline,
  targets,
  onEditTargets,
}: DailyNutritionSummaryProps) {
  const caloriesConsumed = timeline?.totals.calories || 0;
  const calTarget = targets.dailyCalories;
  const calDifference = caloriesConsumed - calTarget;
  const calRemaining = Math.max(0, calTarget - caloriesConsumed);
  const calPercent = Math.min(200, Math.round((caloriesConsumed / calTarget) * 100));

  const proteinConsumed = timeline?.totals.protein || 0;
  const proteinTarget = targets.dailyProteinG;
  const proteinRemaining = Math.max(0, Math.round((proteinTarget - proteinConsumed) * 10) / 10);
  const proteinPercent = Math.min(200, Math.round((proteinConsumed / proteinTarget) * 100));

  const carbsConsumed = timeline?.totals.carbs || 0;
  const carbsTarget = targets.dailyCarbsG;
  const carbsPercent = Math.min(200, Math.round((carbsConsumed / carbsTarget) * 100));

  const fatConsumed = timeline?.totals.fat || 0;
  const fatTarget = targets.dailyFatG;
  const fatPercent = Math.min(200, Math.round((fatConsumed / fatTarget) * 100));

  const fiberConsumed = timeline?.totals.fiber || 0;
  const fiberTarget = targets.dailyFiberG;
  const fiberPercent = Math.min(200, Math.round((fiberConsumed / fiberTarget) * 100));

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl p-5 shadow-lg shadow-emerald-900/15 space-y-4">
      {/* Header: Calorie Balance */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Calorie Balance</span>
          </div>

          <div className="text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-1.5">
            {calDifference > 0 ? (
              <>
                <span>+{calDifference.toLocaleString()}</span>
                <span className="text-xs font-medium text-amber-200">kcal over target</span>
              </>
            ) : (
              <>
                <span>{calRemaining.toLocaleString()}</span>
                <span className="text-xs font-medium text-emerald-200">kcal remaining</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-emerald-200 block font-medium">Consumed / Target</span>
          <span className="text-base sm:text-lg font-bold">
            {caloriesConsumed.toLocaleString()}{" "}
            <span className="text-xs font-normal text-emerald-200">/ {calTarget.toLocaleString()} kcal</span>
          </span>
          {onEditTargets && (
            <button
              onClick={onEditTargets}
              className="text-[11px] text-emerald-200 hover:text-white underline block mt-0.5"
            >
              Adjust targets
            </button>
          )}
        </div>
      </div>

      {/* Main Calorie Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-emerald-950/40 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              caloriesConsumed > calTarget ? "bg-amber-400" : "bg-white"
            }`}
            style={{ width: `${Math.min(100, calPercent)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-emerald-100 font-medium">
          <span>{calPercent}% of calorie target</span>
          <span>
            {calDifference > 0
              ? `${calDifference} kcal above target`
              : `${calRemaining} kcal remaining`}
          </span>
        </div>
      </div>

      {/* Protein Highlight Card */}
      <div className="bg-emerald-900/40 rounded-2xl p-3 border border-emerald-500/30 flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold block">
            Protein Target
          </span>
          <span className="text-lg font-black text-white">
            {proteinConsumed} <span className="text-xs font-normal text-emerald-200">/ {proteinTarget} g</span>
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-emerald-100">
            {proteinRemaining > 0 ? `${proteinRemaining} g left` : "Target reached"}
          </span>
          <div className="w-24 bg-emerald-950/60 rounded-full h-2 mt-1 overflow-hidden">
            <div
              className="bg-emerald-300 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, proteinPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Macro Grid with Numerical Values */}
      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-emerald-500/30 text-center">
        <div className="bg-emerald-900/30 rounded-xl p-2">
          <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
            Protein
          </span>
          <span className="text-sm font-black text-white">{proteinConsumed}g</span>
          <span className="text-[10px] text-emerald-300 block">/ {proteinTarget}g</span>
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-2">
          <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
            Carbs
          </span>
          <span className="text-sm font-black text-white">{carbsConsumed}g</span>
          <span className="text-[10px] text-emerald-300 block">/ {carbsTarget}g</span>
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-2">
          <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
            Fat
          </span>
          <span className="text-sm font-black text-white">{fatConsumed}g</span>
          <span className="text-[10px] text-emerald-300 block">/ {fatTarget}g</span>
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-2">
          <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
            Fiber
          </span>
          <span className="text-sm font-black text-white">{fiberConsumed}g</span>
          <span className="text-[10px] text-emerald-300 block">/ {fiberTarget}g</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import type { NutritionAnalyticsSummary } from "@/lib/analytics/nutrition-analytics-service";

export function NutritionTrendChart() {
  const [days, setDays] = useState<number>(7);
  const [metric, setMetric] = useState<"calories" | "protein">("calories");
  const [data, setData] = useState<NutritionAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics/nutrition?days=${days}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load nutrition analytics");
        setData(json.analytics);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [days]);

  const dailyPoints = data?.dailyData || [];
  const targetVal = metric === "calories" ? data?.targets.dailyCalories || 2000 : data?.targets.dailyProteinG || 100;
  const maxVal = Math.max(
    targetVal * 1.25,
    ...dailyPoints.map((p) => (metric === "calories" ? p.calories : p.protein)),
    100
  );

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 shadow-xs space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Nutrition Trends
            </h3>
            <span className="text-[11px] text-stone-500">
              Aggregated from saved meal snapshots
            </span>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl self-start sm:self-auto">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                days === d
                  ? "bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric Toggle */}
      <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
        <button
          onClick={() => setMetric("calories")}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
            metric === "calories"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300"
          }`}
        >
          Calories (kcal)
        </button>
        <button
          onClick={() => setMetric("protein")}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
            metric === "protein"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300"
          }`}
        >
          Protein (g)
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-stone-400 animate-pulse">
          Loading nutrition trends...
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</div>
      ) : data?.loggedDaysCount === 0 ? (
        <div className="text-center py-8 text-xs text-stone-400 space-y-1">
          <p className="font-semibold text-stone-700 dark:text-stone-300">
            No meal data in the last {days} days.
          </p>
          <p className="text-[11px]">
            Log meals for a few days to see your daily nutrition trend and averages.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Descriptive Statistics Bar */}
          <div className="grid grid-cols-3 gap-2 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-2xl text-center text-xs">
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Daily Average</span>
              <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {metric === "calories" ? `${data?.averageCalories} kcal` : `${data?.averageProtein} g`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Daily Target</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {metric === "calories" ? `${targetVal} kcal` : `${targetVal} g`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Days Logged</span>
              <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {data?.loggedDaysCount} / {days}d
              </span>
            </div>
          </div>

          {/* Accessible Chart (Bar Visualization) */}
          <div className="pt-2">
            <div className="h-36 flex items-end gap-1.5 sm:gap-2 px-1 pb-1 border-b border-stone-200 dark:border-stone-700 relative">
              {/* Target Line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-emerald-500 z-10 pointer-events-none"
                style={{
                  bottom: `${Math.min(95, Math.max(5, (targetVal / maxVal) * 100))}%`,
                }}
              >
                <span className="absolute -top-3.5 right-1 text-[9px] font-bold text-emerald-600 bg-white/80 dark:bg-stone-900/80 px-1 rounded">
                  Target ({targetVal})
                </span>
              </div>

              {dailyPoints.map((point) => {
                const val = metric === "calories" ? point.calories : point.protein;
                const heightPercent = point.hasData ? Math.min(100, Math.max(4, (val / maxVal) * 100)) : 0;
                const isOver = val > targetVal;

                return (
                  <div
                    key={point.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover/touch */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-stone-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {point.date}: {val} {metric === "calories" ? "kcal" : "g"}
                    </div>

                    {point.hasData ? (
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          isOver ? "bg-amber-500/80" : "bg-emerald-600/80"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    ) : (
                      <div className="w-full h-1 bg-stone-200 dark:bg-stone-700 rounded-t" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* X-Axis Day Labels */}
            <div className="flex justify-between text-[10px] text-stone-400 font-medium px-1 pt-1.5">
              <span>{dailyPoints[0]?.dayLabel}</span>
              {dailyPoints.length > 7 && (
                <span>{dailyPoints[Math.floor(dailyPoints.length / 2)]?.dayLabel}</span>
              )}
              <span>{dailyPoints[dailyPoints.length - 1]?.dayLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

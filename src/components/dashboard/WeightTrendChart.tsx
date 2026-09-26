"use client";

import React, { useState, useEffect } from "react";
import { Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { WeightTrendResult } from "@/lib/weight/weight-service";

export function WeightTrendChart() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<WeightTrendResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeightTrend() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics/weight?days=${days}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load weight trend");
        setData(json.trend);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeightTrend();
  }, [days]);

  const entries = data?.entries || [];
  const minWeight = data?.minWeight ?? 0;
  const maxWeight = data?.maxWeight ?? 100;
  const weightRange = Math.max(1, maxWeight - minWeight);

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 shadow-xs space-y-4">
      {/* Header and Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Weight Progress Trend
            </h3>
            <span className="text-[11px] text-stone-500">
              Recorded body weight over time
            </span>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl self-start sm:self-auto">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                days === d
                  ? "bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-300 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {d === 365 ? "All" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-stone-400 animate-pulse">
          Loading weight trend...
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</div>
      ) : entries.length < 2 ? (
        <div className="text-center py-8 text-xs text-stone-400 space-y-1">
          <p className="font-semibold text-stone-700 dark:text-stone-300">
            Log at least two weight entries to see your trend.
          </p>
          <p className="text-[11px]">
            {entries.length === 1
              ? `You have 1 entry (${entries[0].weight_kg} kg on ${entries[0].logged_at}). Log another entry to view changes.`
              : "No weight entries recorded in this period."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-3 gap-2 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-2xl text-center text-xs">
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Lowest</span>
              <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {minWeight.toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Highest</span>
              <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {maxWeight.toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Period Change</span>
              <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                {data?.overallChangeKg !== null ? (
                  data!.overallChangeKg > 0 ? (
                    `+${data!.overallChangeKg.toFixed(1)} kg`
                  ) : (
                    `${data!.overallChangeKg.toFixed(1)} kg`
                  )
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>

          {/* SVG Trend Line */}
          <div className="pt-2">
            <div className="h-36 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* SVG path connecting points */}
                <path
                  d={entries
                    .map((e, idx) => {
                      const x = (idx / (entries.length - 1)) * 100;
                      // Invert Y axis: higher weight = lower SVG Y
                      const y = 90 - ((e.weight_kg - minWeight) / weightRange) * 80;
                      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="dark:stroke-blue-400"
                />

                {/* SVG dots for each entry */}
                {entries.map((e, idx) => {
                  const x = (idx / (entries.length - 1)) * 100;
                  const y = 90 - ((e.weight_kg - minWeight) / weightRange) * 80;
                  return (
                    <circle
                      key={e.id}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>

            {/* X-Axis Dates */}
            <div className="flex justify-between text-[10px] text-stone-400 font-medium px-1 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span>{entries[0].logged_at}</span>
              {entries.length > 2 && (
                <span>{entries[Math.floor(entries.length / 2)].logged_at}</span>
              )}
              <span>{entries[entries.length - 1].logged_at}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

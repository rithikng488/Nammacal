"use client";

import React, { useState } from "react";
import { Droplet, Plus } from "lucide-react";
import type { DailyWaterSummaryResult } from "@/lib/water/water-service";

interface WaterDashboardCardProps {
  waterSummary: DailyWaterSummaryResult | null;
  onOpenCustomLog: () => void;
  onWaterUpdated: () => void;
}

export function WaterDashboardCard({
  waterSummary,
  onOpenCustomLog,
  onWaterUpdated,
}: WaterDashboardCardProps) {
  const [isQuickLogging, setIsQuickLogging] = useState(false);
  const totalMl = waterSummary?.totalMl ?? 0;
  const targetMl = waterSummary?.targetMl ?? null;
  const percentage = waterSummary?.percentage ?? null;

  // Format in Liters with 2 decimals
  const litersLogged = (totalMl / 1000).toFixed(2);
  const targetLiters = targetMl !== null ? (targetMl / 1000).toFixed(2) : null;

  const handleQuickAdd = async (amount: number) => {
    if (isQuickLogging) return;
    setIsQuickLogging(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: amount }),
      });
      if (res.ok) {
        onWaterUpdated();
      }
    } finally {
      setIsQuickLogging(false);
    }
  };

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Droplet className="w-4 h-4 fill-sky-600/20" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Water Intake
            </h3>
            <span className="text-[10px] text-stone-400">
              {waterSummary?.logsCount || 0} logs today
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCustomLog}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Custom</span>
        </button>
      </div>

      {/* Progress & Value Display */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900 dark:text-stone-100">
              {litersLogged}
            </span>
            <span className="text-xs font-semibold text-stone-500">L</span>
            {targetLiters && (
              <span className="text-xs text-stone-400">
                / {targetLiters} L target
              </span>
            )}
          </div>
          {percentage !== null ? (
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg">
              {percentage}%
            </span>
          ) : (
            <span className="text-[11px] text-stone-400">
              No target configured
            </span>
          )}
        </div>

        {/* Progress Bar (if target exists) */}
        {targetMl !== null && targetMl > 0 && (
          <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-sky-500 dark:bg-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, percentage ?? 0)}%` }}
            />
          </div>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        {[250, 500, 750, 1000].map((amt) => (
          <button
            key={amt}
            type="button"
            disabled={isQuickLogging}
            onClick={() => handleQuickAdd(amt)}
            className="py-1.5 rounded-xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors disabled:opacity-50 text-center"
          >
            +{amt >= 1000 ? `${amt / 1000}L` : `${amt}ml`}
          </button>
        ))}
      </div>
    </div>
  );
}

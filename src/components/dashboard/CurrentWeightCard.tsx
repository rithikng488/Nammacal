"use client";

import React from "react";
import { Scale, ArrowDown, ArrowUp, Minus, Plus } from "lucide-react";
import type { WeightChangeResult } from "@/lib/weight/weight-service";

interface CurrentWeightCardProps {
  weightData: WeightChangeResult | null;
  onOpenLogWeight: () => void;
}

export function CurrentWeightCard({ weightData, onOpenLogWeight }: CurrentWeightCardProps) {
  const current = weightData?.current;
  const previous = weightData?.previous;
  const changeKg = weightData?.changeKg;

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return "Today";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Body Weight
            </h3>
            <span className="text-[11px] text-stone-500">
              {current ? `Recorded: ${formatDate(current.logged_at)}` : "Tracking & Trend"}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenLogWeight}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{current ? "Update" : "Log Weight"}</span>
        </button>
      </div>

      {current ? (
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              {current.weight_kg.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-stone-500">kg</span>
          </div>

          {previous && typeof changeKg === "number" ? (
            <div className="flex items-center gap-1 text-xs font-semibold">
              {changeKg < 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowDown className="w-3.5 h-3.5" />
                  {Math.abs(changeKg).toFixed(1)} kg since previous entry
                </span>
              ) : changeKg > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <ArrowUp className="w-3.5 h-3.5" />
                  +{changeKg.toFixed(1)} kg since previous entry
                </span>
              ) : (
                <span className="text-stone-500 flex items-center gap-0.5">
                  <Minus className="w-3.5 h-3.5" />
                  0.0 kg (Unchanged)
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-stone-400">First recorded entry</span>
          )}
        </div>
      ) : (
        <div className="text-center py-3 space-y-1">
          <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
            No weight recorded yet.
          </p>
          <p className="text-[11px] text-stone-400">
            Log your body weight to track historical changes over time.
          </p>
        </div>
      )}
    </div>
  );
}

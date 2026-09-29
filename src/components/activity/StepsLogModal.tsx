"use client";

import React, { useState } from "react";
import { X, Footprints, AlertCircle, Info } from "lucide-react";
import { normalizeDateString } from "@/lib/utils/date-utils";

interface StepsLogModalProps {
  isOpen: boolean;
  initialSteps?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function StepsLogModal({
  isOpen,
  initialSteps = 0,
  onClose,
  onSuccess,
}: StepsLogModalProps) {
  const [steps, setSteps] = useState<string>(initialSteps > 0 ? String(initialSteps) : "");
  const [date, setDate] = useState<string>(normalizeDateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedSteps = parseInt(steps, 10);
    if (isNaN(parsedSteps) || parsedSteps < 0 || parsedSteps > 200000) {
      setError("Please enter a valid step count between 0 and 200,000.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/activity/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: parsedSteps,
          date,
          source: "manual",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log daily steps.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto -mt-2 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Log Daily Steps
              </h2>
              <span className="text-[10px] font-semibold text-stone-400">
                Source: Manual Entry
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Total Steps for Day
            </label>
            <input
              type="number"
              min="0"
              max="200000"
              placeholder="e.g. 8420"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 text-base font-black text-stone-900 dark:text-stone-100 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Explicit GPS step exclusion disclosure */}
          <div className="flex items-start gap-1.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 text-[10px] text-stone-500 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span>
              Steps are recorded as manual entries. NammaCal does not infer steps from GPS or vehicle travel.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Steps"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

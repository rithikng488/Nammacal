"use client";

import React, { useState } from "react";
import { X, Droplet, AlertCircle } from "lucide-react";
import { normalizeDateString } from "@/lib/utils/date-utils";

interface WaterLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WaterLogModal({ isOpen, onClose, onSuccess }: WaterLogModalProps) {
  const [amountMl, setAmountMl] = useState<number>(350);
  const [loggedAt, setLoggedAt] = useState<string>(normalizeDateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountMl <= 0 || amountMl > 10000) {
      setError("Please enter a valid amount between 1 and 10,000 ml.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMl,
          loggedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log water.");
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
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Droplet className="w-4 h-4 fill-sky-600/20" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Log Water Intake
              </h2>
              <span className="text-[10px] text-stone-400">Custom amount entry</span>
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
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Amount (ml)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              step="10"
              value={amountMl || ""}
              onChange={(e) => setAmountMl(parseInt(e.target.value, 10) || 0)}
              required
              className="w-full px-3 py-2 text-xl font-black text-stone-900 dark:text-stone-100 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {[150, 250, 350, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountMl(preset)}
                  className={`py-1 rounded-lg text-xs font-semibold border transition-all ${
                    amountMl === preset
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-bold"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100"
                  }`}
                >
                  {preset} ml
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Date
            </label>
            <input
              type="date"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

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
              className="flex-1 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Water"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

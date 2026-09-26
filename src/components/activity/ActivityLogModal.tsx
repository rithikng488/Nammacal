"use client";

import React, { useState, useMemo } from "react";
import { X, Flame, AlertCircle, Info } from "lucide-react";
import type { ActivityType, ActivityIntensity } from "@/lib/supabase/types";
import { calculateEstimatedActivityCalories } from "@/lib/activity/activity-calculator";
import { normalizeDateString } from "@/lib/utils/date-utils";

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userWeightKg?: number | null;
}

const ACTIVITY_OPTIONS: { type: ActivityType; label: string; hasDistance?: boolean; hasSteps?: boolean }[] = [
  { type: "walking", label: "Walking", hasDistance: true, hasSteps: true },
  { type: "running", label: "Running", hasDistance: true, hasSteps: true },
  { type: "cycling", label: "Cycling", hasDistance: true },
  { type: "strength_training", label: "Strength Training / Gym" },
  { type: "gym_workout", label: "Gym Workout / HIIT / Cardio" },
  { type: "swimming", label: "Swimming", hasDistance: true },
  { type: "yoga", label: "Yoga / Stretching" },
  { type: "sports", label: "Sports (Cricket, Badminton, Football)" },
  { type: "other", label: "Other Activity" },
];

export function ActivityLogModal({
  isOpen,
  onClose,
  onSuccess,
  userWeightKg,
}: ActivityLogModalProps) {
  const [activityType, setActivityType] = useState<ActivityType>("walking");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [intensity, setIntensity] = useState<ActivityIntensity>("moderate");
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [loggedAt, setLoggedAt] = useState<string>(normalizeDateString(new Date()));
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = ACTIVITY_OPTIONS.find((a) => a.type === activityType);

  // Live estimated calories preview
  const estimatedPreview = useMemo(() => {
    try {
      if (!durationMinutes || durationMinutes <= 0 || durationMinutes > 1440) return null;
      return calculateEstimatedActivityCalories({
        activityType,
        durationMinutes,
        intensity,
        weightKg: userWeightKg,
      });
    } catch {
      return null;
    }
  }, [activityType, durationMinutes, intensity, userWeightKg]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        activityType,
        durationMinutes: Number(durationMinutes),
        intensity,
        distanceKm: distanceKm ? parseFloat(distanceKm) : null,
        steps: steps ? parseInt(steps, 10) : null,
        loggedAt,
        note: note.trim() || null,
        source: "manual",
      };

      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log activity.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Log Activity
            </h2>
            <p className="text-xs text-stone-500">Record a workout or movement session</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Activity Type Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Activity Type
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration & Intensity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Duration (min)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={durationMinutes || ""}
                onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 0))}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-bold"
              />
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Intensity Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Effort / Intensity
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["light", "moderate", "vigorous"] as ActivityIntensity[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setIntensity(level)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                    intensity === level
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Distance & Steps for Walking / Running / Cycling */}
          {(selectedOption?.hasDistance || selectedOption?.hasSteps) && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-100 dark:border-stone-800">
              {selectedOption.hasDistance && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Distance (km) <span className="font-normal text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 3.5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              {selectedOption.hasSteps && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Steps <span className="font-normal text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 4500"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Optional Note */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Notes <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Morning walk in the park"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Live Calorie Preview Card */}
          {estimatedPreview && (
            <div className="p-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/60 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-600" />
                  Estimated activity calories:
                </span>
                <span className="font-black text-orange-600 dark:text-orange-400 text-sm">
                  {estimatedPreview.calories} kcal
                </span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                Activity calorie values are estimates and may differ from actual energy expenditure.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
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
              {isSubmitting ? "Saving..." : "Save Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

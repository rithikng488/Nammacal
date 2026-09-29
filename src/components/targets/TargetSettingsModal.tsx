"use client";

import React, { useState, useEffect } from "react";
import { X, Target, Sparkles, Check, Loader2, AlertCircle } from "lucide-react";
import type { UserNutritionTargets } from "@/lib/targets/target-service";

interface TargetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTargets?: UserNutritionTargets;
}

export function TargetSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  initialTargets,
}: TargetSettingsModalProps) {
  const [targets, setTargets] = useState<UserNutritionTargets>(
    initialTargets || {
      dailyCalories: 2000,
      dailyProteinG: 100,
      dailyCarbsG: 250,
      dailyFatG: 65,
      dailyFiberG: 30,
      dailyWaterMl: 3000,
      dailySteps: 8000,
    }
  );

  const [activeTab, setActiveTab] = useState<"manual" | "suggested">("manual");
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionRationale, setSuggestionRationale] = useState<string[]>([]);

  // Biometrics for calculator
  const [weightKg, setWeightKg] = useState("70");
  const [heightCm, setHeightCm] = useState("170");
  const [age, setAge] = useState("28");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [activityLevel, setActivityLevel] = useState<
    "sedentary" | "light" | "moderate" | "very_active" | "extra_active"
  >("light");
  const [goal, setGoal] = useState<"lose_weight" | "maintain" | "gain_muscle">("maintain");

  useEffect(() => {
    if (initialTargets) {
      setTargets(initialTargets);
    }
  }, [initialTargets]);

  if (!isOpen) return null;

  const handleCalculateSuggested = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setError(null);

    try {
      const res = await fetch("/api/targets/calculate-suggested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: parseFloat(weightKg),
          heightCm: parseFloat(heightCm),
          age: parseInt(age, 10),
          gender,
          activityLevel,
          goal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate suggested targets");

      setTargets(data.suggested);
      setSuggestionRationale(data.rationale || []);
      setActiveTab("manual"); // Switch back to manual review tab
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save daily targets");

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Daily Nutrition Targets
              </h3>
              <p className="text-[11px] text-stone-500">Configure calories and macronutrients</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 px-4 pt-2 gap-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === "manual"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Custom Targets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suggested")}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "suggested"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Target Calculator</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <p>{error}</p>
            </div>
          )}

          {suggestionRationale.length > 0 && activeTab === "manual" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-bold block">Suggested Targets Applied:</span>
              {suggestionRationale.map((r, i) => (
                <p key={i} className="text-[11px] opacity-90">• {r}</p>
              ))}
              <span className="font-semibold block pt-1 text-emerald-700 dark:text-emerald-400">
                Review below and click Save Targets to apply to your profile.
              </span>
            </div>
          )}

          {activeTab === "manual" ? (
            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Daily Calorie Target (kcal)
                  </label>
                  <input
                    type="number"
                    min="800"
                    max="10000"
                    value={targets.dailyCalories}
                    onChange={(e) =>
                      setTargets({ ...targets, dailyCalories: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-base font-bold px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="500"
                    value={targets.dailyProteinG}
                    onChange={(e) =>
                      setTargets({ ...targets, dailyProteinG: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Carbohydrates (g)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="1000"
                    value={targets.dailyCarbsG}
                    onChange={(e) =>
                      setTargets({ ...targets, dailyCarbsG: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={targets.dailyFatG}
                    onChange={(e) =>
                      setTargets({ ...targets, dailyFatG: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Dietary Fiber (g)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="150"
                    value={targets.dailyFiberG}
                    onChange={(e) =>
                      setTargets({ ...targets, dailyFiberG: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Water Target (ml)
                  </label>
                  <input
                    type="number"
                    min="500"
                    max="10000"
                    value={targets.dailyWaterMl}
                    onChange={(e) =>
                      setTargets({ ...targets, dailyWaterMl: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Daily Step Target
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="50000"
                    value={targets.dailySteps}
                    onChange={(e) =>
                      setTargets({ ...targets, dailySteps: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Targets
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCalculateSuggested} className="space-y-3 text-xs">
              <p className="text-stone-500 text-[11px] leading-relaxed">
                Calculates suggested targets using the Mifflin-St Jeor formula & ICMR-NIN nutritional standards.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Biological Sex</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "male" | "female" | "other")}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Average</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={(e) =>
                    setActivityLevel(
                      e.target.value as "sedentary" | "light" | "moderate" | "very_active" | "extra_active"
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="sedentary">Sedentary (Desk job, little exercise)</option>
                  <option value="light">Lightly Active (1-3 workouts / week)</option>
                  <option value="moderate">Moderately Active (3-5 workouts / week)</option>
                  <option value="very_active">Very Active (6-7 intense workouts)</option>
                  <option value="extra_active">Extra Active (Physical job + training)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Primary Nutrition Goal</label>
                <select
                  value={goal}
                  onChange={(e) =>
                    setGoal(e.target.value as "lose_weight" | "maintain" | "gain_muscle")
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="maintain">Maintain Body Weight</option>
                  <option value="lose_weight">Gradual Fat Loss (~400 kcal deficit)</option>
                  <option value="gain_muscle">Lean Muscle Gain (~300 kcal surplus)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCalculating}
                className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Calculate & Review Suggestions
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Utensils, ChevronRight, Sparkles, Plus } from "lucide-react";
import type { DailyTimeline } from "@/lib/meals/meal-service";
import type { MealType } from "@/lib/supabase/types";

interface TodayMealsSummaryProps {
  timeline: DailyTimeline | null;
  onAddFood: (mealType: MealType) => void;
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, { title: string; timeHint: string }> = {
  breakfast: { title: "Breakfast", timeHint: "Morning" },
  lunch: { title: "Lunch", timeHint: "Afternoon" },
  dinner: { title: "Dinner", timeHint: "Night" },
  snack: { title: "Snacks", timeHint: "Anytime" },
  other: { title: "Other", timeHint: "Extra" },
};

export function TodayMealsSummary({ timeline, onAddFood }: TodayMealsSummaryProps) {
  const totalItemsCount = timeline?.meals.reduce((acc, m) => acc + m.items.length, 0) || 0;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Today&apos;s Meals
            </h3>
            <span className="text-[11px] text-stone-500">
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} logged
            </span>
          </div>
        </div>

        <Link
          href="/meals"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5"
        >
          <span>View/Edit Timeline</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Meals List */}
      {totalItemsCount === 0 ? (
        <div className="text-center py-6 px-4 rounded-2xl bg-stone-50/70 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-800 space-y-2">
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            No meals logged today.
          </p>
          <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
            Log your breakfast, lunch, dinner, or snacks using Search, Photo AI, or Voice.
          </p>
          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              onClick={() => onAddFood("breakfast")}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              Log Breakfast
            </button>
            <button
              onClick={() => onAddFood("lunch")}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 transition-colors"
            >
              Log Lunch
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {MEAL_ORDER.map((type) => {
            const mealSection = timeline?.meals.find((m) => m.mealType === type);
            const items = mealSection?.items || [];
            const hasItems = items.length > 0;
            const cals = mealSection?.totalCalories || 0;
            const protein = mealSection?.totalProtein || 0;

            return (
              <div
                key={type}
                className="p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800 flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      {MEAL_LABELS[type].title}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      • {MEAL_LABELS[type].timeHint}
                    </span>
                  </div>

                  {hasItems ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-stone-600 dark:text-stone-300 font-medium truncate">
                        {items.map((i) => i.food_name).join(", ")}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        {cals} kcal • {protein}g protein
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 italic mt-0.5">Not logged yet</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onAddFood(type)}
                  className="p-1.5 rounded-xl bg-white dark:bg-stone-700 text-stone-500 hover:text-emerald-600 shadow-xs border border-stone-200/60 dark:border-stone-600 transition-colors"
                  title={`Add food to ${MEAL_LABELS[type].title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

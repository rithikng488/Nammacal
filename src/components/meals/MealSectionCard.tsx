"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { MealWithItems } from "@/lib/meals/meal-service";
import type { MealItem, MealType } from "@/lib/supabase/types";
import {
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Plus,
  Trash2,
  Edit2,
  Flame,
  AlertCircle,
} from "lucide-react";

interface MealSectionCardProps {
  meal: MealWithItems;
  onAddFood: (mealType: MealType) => void;
  onEditItem: (item: MealItem) => void;
  onDeleteItem: (itemId: string) => void;
  isDeletingId?: string | null;
}

const MEAL_ICONS: Record<string, React.ElementType> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Coffee,
  other: Flame,
};

const MEAL_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  breakfast: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
  },
  lunch: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  dinner: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  snack: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-400",
  },
  other: {
    bg: "bg-slate-50 dark:bg-slate-850",
    text: "text-slate-700 dark:text-slate-300",
    icon: "text-slate-500",
  },
};

export function MealSectionCard({
  meal,
  onAddFood,
  onEditItem,
  onDeleteItem,
  isDeletingId,
}: MealSectionCardProps) {
  const Icon = MEAL_ICONS[meal.mealType] || Flame;
  const colors = MEAL_COLORS[meal.mealType] || MEAL_COLORS.other;

  const mealTitle =
    meal.mealName ||
    meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);

  return (
    <Card className="p-3.5 space-y-3 border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
      {/* Meal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl ${colors.bg} ${colors.icon} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize leading-tight">
              {mealTitle}
            </h3>
            <span className="text-[11px] text-slate-400">
              {meal.items.length} {meal.items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-end gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            {meal.totalCalories}{" "}
            <span className="text-xs font-normal text-slate-400">kcal</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {meal.totalProtein}g Protein
          </span>
        </div>
      </div>

      {/* Meal Items List */}
      {meal.items.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-400">
            No foods logged for {mealTitle.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {meal.items.map((item) => {
            const isDeleting = isDeletingId === item.id;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-850/60 flex items-center justify-between gap-2.5 transition-all ${
                  isDeleting ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.food_name}
                    </span>
                    <Badge
                      variant={item.food_state === "raw" ? "amber" : "blue"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {item.food_state.toUpperCase()}
                    </Badge>
                    {item.is_estimated_portion && (
                      <span
                        title={item.portion_assumption || "Estimated portion"}
                        className="text-amber-500 inline-flex items-center"
                      >
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.quantity} {item.unit}
                    </span>{" "}
                    ({Math.round(item.gram_weight)}g) •{" "}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {Math.round(item.calories)} kcal
                    </span>{" "}
                    •{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.protein}g P
                    </span>{" "}
                    • {item.carbs}g C • {item.fat}g F
                  </p>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    title="Edit portion"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Food Button */}
      <button
        type="button"
        onClick={() => onAddFood(meal.mealType)}
        className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99]"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Food to {mealTitle}</span>
      </button>
    </Card>
  );
}

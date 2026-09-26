"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MealSectionCard } from "@/components/meals/MealSectionCard";
import { AddFoodModal } from "@/components/meals/AddFoodModal";
import { EditMealItemModal } from "@/components/meals/EditMealItemModal";
import { PhotoUploadModal } from "@/components/ai/PhotoUploadModal";
import { VoiceLogModal } from "@/components/ai/VoiceLogModal";
import type { DailyTimeline } from "@/lib/meals/meal-service";
import type { MealItem, MealType } from "@/lib/supabase/types";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Calendar,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Camera,
  Mic,
} from "lucide-react";

/**
 * Returns today's date formatted as YYYY-MM-DD in the local timezone.
 */
function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD into a human-friendly string (e.g. "Friday, 26 Sep").
 */
function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const todayStr = getTodayIsoDate();

  const formatted = date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (dateStr === todayStr) {
    return `Today • ${formatted}`;
  }
  return formatted;
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 */
function offsetDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newDay = String(date.getDate()).padStart(2, "0");
  return `${newYear}-${newMonth}-${newDay}`;
}

export default function MealsPage() {
  const [currentDate, setCurrentDate] = useState<string>(getTodayIsoDate());
  const [timeline, setTimeline] = useState<DailyTimeline | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [addFoodMealType, setAddFoodMealType] = useState<MealType | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTimeline = useCallback(async (date: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/meals?date=${date}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to load meal data");
      }
      const json = await res.json();
      setTimeline(json.timeline);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading meals";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline(currentDate);
  }, [currentDate, fetchTimeline]);

  const handlePrevDay = () => {
    setCurrentDate((d) => offsetDays(d, -1));
  };

  const handleNextDay = () => {
    setCurrentDate((d) => offsetDays(d, 1));
  };

  const handleTodayJump = () => {
    setCurrentDate(getTodayIsoDate());
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setDeletingId(itemId);
      const res = await fetch(`/api/meals/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete item");
      }
      await fetchTimeline(currentDate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete item";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const isToday = currentDate === getTodayIsoDate();

  // Targets and Totals
  const totals = timeline?.totals;
  const targets = timeline?.targets;
  const calConsumed = totals?.calories || 0;
  const calTarget = targets?.calories || 2000;
  const calRemaining = targets?.remainingCalories ?? Math.max(0, calTarget - calConsumed);
  const calPercent = Math.min(100, Math.round((calConsumed / calTarget) * 100));

  const proteinConsumed = totals?.protein || 0;
  const proteinTarget = targets?.protein || 100;
  const carbConsumed = totals?.carbs || 0;
  const carbTarget = targets?.carbs || 250;
  const fatConsumed = totals?.fat || 0;
  const fatTarget = targets?.fat || 65;
  const fiberConsumed = totals?.fiber || 0;
  const fiberTarget = targets?.fiber || 30;

  return (
    <div className="space-y-4 pb-12">
      {/* Top Date Navigator Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={handlePrevDay}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatDisplayDate(currentDate)}
          </span>
          {!isToday && (
            <button
              type="button"
              onClick={handleTodayJump}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Daily Calorie & Macro Target Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg shadow-emerald-900/15 border-0 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 text-emerald-100 text-[11px] font-semibold uppercase tracking-wider mb-0.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Calories Remaining</span>
            </div>
            <div className="text-3xl font-black tracking-tight">
              {calRemaining.toLocaleString()}
              <span className="text-xs font-normal text-emerald-200 ml-1.5">
                kcal
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-emerald-100 block">Consumed</span>
            <span className="text-base font-bold text-white">
              {calConsumed.toLocaleString()} / {calTarget.toLocaleString()}{" "}
              <span className="text-[10px] font-normal text-emerald-200">kcal</span>
            </span>
          </div>
        </div>

        {/* Calorie Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-emerald-950/40 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                calConsumed > calTarget ? "bg-amber-400" : "bg-white"
              }`}
              style={{ width: `${Math.min(100, calPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-emerald-200">
            <span>{calPercent}% of target</span>
            <span>{calConsumed > calTarget ? `${calConsumed - calTarget} kcal over` : `${calRemaining} kcal left`}</span>
          </div>
        </div>

        {/* 4 Macros Row */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-emerald-500/40 text-center">
          <div className="bg-emerald-900/30 rounded-xl p-1.5">
            <span className="text-[9px] uppercase tracking-wider text-emerald-200 block">
              Protein
            </span>
            <span className="text-xs font-bold text-white">
              {proteinConsumed}g
            </span>
            <span className="text-[9px] text-emerald-300 block">
              / {proteinTarget}g
            </span>
          </div>

          <div className="bg-emerald-900/30 rounded-xl p-1.5">
            <span className="text-[9px] uppercase tracking-wider text-emerald-200 block">
              Carbs
            </span>
            <span className="text-xs font-bold text-white">
              {carbConsumed}g
            </span>
            <span className="text-[9px] text-emerald-300 block">
              / {carbTarget}g
            </span>
          </div>

          <div className="bg-emerald-900/30 rounded-xl p-1.5">
            <span className="text-[9px] uppercase tracking-wider text-emerald-200 block">
              Fat
            </span>
            <span className="text-xs font-bold text-white">
              {fatConsumed}g
            </span>
            <span className="text-[9px] text-emerald-300 block">
              / {fatTarget}g
            </span>
          </div>

          <div className="bg-emerald-900/30 rounded-xl p-1.5">
            <span className="text-[9px] uppercase tracking-wider text-emerald-200 block">
              Fiber
            </span>
            <span className="text-xs font-bold text-white">
              {fiberConsumed}g
            </span>
            <span className="text-[9px] text-emerald-300 block">
              / {fiberTarget}g
            </span>
          </div>
        </div>
      </Card>

      {/* Quick AI & Voice Food Logging Bar */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setIsPhotoModalOpen(true)}
          className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-xs font-bold text-slate-800 dark:text-slate-100"
        >
          <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Photo AI Log</span>
        </button>

        <button
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-xs font-bold text-slate-800 dark:text-slate-100"
        >
          <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Voice Food Log</span>
        </button>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchTimeline(currentDate)}
            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Meal Timeline List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Meals Timeline
          </h2>
          <span className="text-[11px] text-slate-400">
            {timeline?.meals.reduce((acc, m) => acc + m.items.length, 0) || 0} items logged
          </span>
        </div>

        {isLoading && !timeline ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-850"
              />
            ))}
          </div>
        ) : (
          timeline?.meals.map((meal) => (
            <MealSectionCard
              key={meal.mealType}
              meal={meal}
              onAddFood={(mealType) => setAddFoodMealType(mealType)}
              onEditItem={(item) => setEditingItem(item)}
              onDeleteItem={handleDeleteItem}
              isDeletingId={deletingId}
            />
          ))
        )}
      </div>

      {/* Verified Indian Food Database Notice */}
      <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <b>NammaCal Verified Indian Database:</b> Foods are tagged with raw vs cooked state and standardized portion weights from IFCT 2017 to ensure your macros are never skewed.
        </div>
      </div>

      {/* Add Food Modal */}
      {addFoodMealType && (
        <AddFoodModal
          isOpen={Boolean(addFoodMealType)}
          date={currentDate}
          mealType={addFoodMealType}
          onClose={() => setAddFoodMealType(null)}
          onFoodLogged={() => fetchTimeline(currentDate)}
        />
      )}

      {/* Edit Meal Item Modal */}
      {editingItem && (
        <EditMealItemModal
          isOpen={Boolean(editingItem)}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onItemUpdated={() => fetchTimeline(currentDate)}
          onItemDeleted={() => fetchTimeline(currentDate)}
        />
      )}

      {/* Photo AI Modal */}
      {isPhotoModalOpen && (
        <PhotoUploadModal
          isOpen={isPhotoModalOpen}
          selectedDate={currentDate}
          onClose={() => setIsPhotoModalOpen(false)}
          onSuccess={() => fetchTimeline(currentDate)}
        />
      )}

      {/* Voice Food Log Modal */}
      {isVoiceModalOpen && (
        <VoiceLogModal
          isOpen={isVoiceModalOpen}
          selectedDate={currentDate}
          onClose={() => setIsVoiceModalOpen(false)}
          onSuccess={() => fetchTimeline(currentDate)}
        />
      )}
    </div>
  );
}

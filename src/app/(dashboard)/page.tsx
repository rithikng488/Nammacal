"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Flame,
  PlusCircle,
  Camera,
  Mic,
  Scale,
  Target,
  BookOpen,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { DailyNutritionSummary } from "@/components/dashboard/DailyNutritionSummary";
import { CurrentWeightCard } from "@/components/dashboard/CurrentWeightCard";
import { TodayMealsSummary } from "@/components/dashboard/TodayMealsSummary";
import { NutritionTrendChart } from "@/components/dashboard/NutritionTrendChart";
import { WeightTrendChart } from "@/components/dashboard/WeightTrendChart";
import { PhotoUploadModal } from "@/components/ai/PhotoUploadModal";
import { VoiceLogModal } from "@/components/ai/VoiceLogModal";
import { WeightLogModal } from "@/components/weight/WeightLogModal";
import { TargetSettingsModal } from "@/components/targets/TargetSettingsModal";
import type { DailyTimeline } from "@/lib/meals/meal-service";
import type { UserNutritionTargets } from "@/lib/targets/target-service";
import type { WeightChangeResult } from "@/lib/weight/weight-service";
import type { MealType } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [timeline, setTimeline] = useState<DailyTimeline | null>(null);
  const [targets, setTargets] = useState<UserNutritionTargets>({
    dailyCalories: 2000,
    dailyProteinG: 100,
    dailyCarbsG: 250,
    dailyFatG: 65,
    dailyFiberG: 30,
    dailyWaterMl: 3000,
    dailySteps: 8000,
  });
  const [weightData, setWeightData] = useState<WeightChangeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal triggers
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        throw new Error(data.error || "Failed to load dashboard data");
      }
      const json = await res.json();
      setTimeline(json.timeline);
      if (json.targets) setTargets(json.targets);
      if (json.weight) setWeightData(json.weight);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const todayDisplayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const handleAddFoodDirect = (mealType: MealType) => {
    router.push(`/meals?addMeal=${mealType}`);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Date Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-stone-900 dark:text-stone-100">
            Today • {todayDisplayDate}
          </span>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1"
          title="Refresh dashboard"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* 1. Daily Nutrition Targets Summary Card */}
      <DailyNutritionSummary
        timeline={timeline}
        targets={targets}
        onEditTargets={() => setIsTargetsModalOpen(true)}
      />

      {/* 2. Quick Action Buttons Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Link
          href="/meals"
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-emerald-500/50 hover:bg-emerald-50/20 transition-all text-center group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">Log Food</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsPhotoModalOpen(true)}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-amber-500/50 hover:bg-amber-50/20 transition-all text-center group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">Photo AI</span>
        </button>

        <button
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-indigo-500/50 hover:bg-indigo-50/20 transition-all text-center group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">Voice Log</span>
        </button>

        <button
          type="button"
          onClick={() => setIsWeightModalOpen(true)}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-blue-500/50 hover:bg-blue-50/20 transition-all text-center group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <Scale className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">Log Weight</span>
        </button>

        <Link
          href="/recipes"
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-emerald-500/50 hover:bg-emerald-50/20 transition-all text-center group"
        >
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">Recipes</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsTargetsModalOpen(true)}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-purple-500/50 hover:bg-purple-50/20 transition-all text-center group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <Target className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">Targets</span>
        </button>
      </div>

      {/* 3. Current Body Weight Card */}
      <CurrentWeightCard
        weightData={weightData}
        onOpenLogWeight={() => setIsWeightModalOpen(true)}
      />

      {/* 4. Today's Meals Section */}
      <TodayMealsSummary
        timeline={timeline}
        onAddFood={handleAddFoodDirect}
      />

      {/* 5. Historical Progress Analytics: Nutrition Trends & Weight Trend */}
      <div className="space-y-4">
        <NutritionTrendChart />
        <WeightTrendChart />
      </div>

      {/* Modal Dialogs */}
      {isPhotoModalOpen && (
        <PhotoUploadModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {isVoiceModalOpen && (
        <VoiceLogModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {isWeightModalOpen && (
        <WeightLogModal
          isOpen={isWeightModalOpen}
          initialWeight={weightData?.current?.weight_kg}
          onClose={() => setIsWeightModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {isTargetsModalOpen && (
        <TargetSettingsModal
          isOpen={isTargetsModalOpen}
          initialTargets={targets}
          onClose={() => setIsTargetsModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}

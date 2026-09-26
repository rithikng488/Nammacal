import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { MacroCard } from "@/components/dashboard/MacroCard";
import { QuickActionButtons } from "@/components/dashboard/QuickActionButtons";
import {
  Flame,
  Droplet,
  Footprints,
  Scale,
  Sparkles,
  Calendar,
  Utensils,
} from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Placeholder / Default Target Data for Phase 1
  const calorieTarget = profile?.daily_calorie_target || 2000;
  const caloriesConsumed = 0; // Will be aggregated in Phase 3
  const caloriesRemaining = Math.max(0, calorieTarget - caloriesConsumed);

  const proteinTarget = profile?.daily_protein_target || 100;
  const carbTarget = profile?.daily_carb_target || 250;
  const fatTarget = profile?.daily_fat_target || 65;
  const fiberTarget = profile?.daily_fiber_target || 30;

  const waterConsumedMl = 0; // Aggregated in Phase 3
  const waterTargetMl = profile?.daily_water_ml_target || 3000;

  const currentWeightKg = 72.5; // Placeholder for Phase 7
  const stepCount = 0; // Connected to Health Connect in Phase 8
  const stepTarget = profile?.daily_step_target || 8000;

  const todayDateString = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-4">
      {/* Date Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {todayDateString}
          </span>
        </div>
        <span className="text-[11px] bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full font-medium">
          Phase 1 Active
        </span>
      </div>

      {/* Main Calorie Summary Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg shadow-emerald-900/15 border-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Calories Remaining</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              {caloriesRemaining.toLocaleString()}
              <span className="text-sm font-normal text-emerald-200 ml-1.5">
                kcal
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-emerald-100 block">Daily Target</span>
            <span className="text-lg font-bold text-white">
              {calorieTarget.toLocaleString()} <span className="text-xs">kcal</span>
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-emerald-500/40 flex items-center justify-between text-xs text-emerald-100">
          <div>
            Consumed: <span className="font-bold text-white">{caloriesConsumed} kcal</span>
          </div>
          <div>
            Burned Est.: <span className="font-bold text-white">0 kcal</span>
          </div>
        </div>
      </Card>

      {/* Macro Breakdown Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Daily Macros
          </h3>
          <span className="text-[11px] text-slate-400">Target Based</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <MacroCard
            label="Protein"
            consumed={0}
            target={proteinTarget}
            color="emerald"
          />
          <MacroCard
            label="Carbohydrates"
            consumed={0}
            target={carbTarget}
            color="blue"
          />
          <MacroCard
            label="Fat"
            consumed={0}
            target={fatTarget}
            color="amber"
          />
          <MacroCard
            label="Fiber"
            consumed={0}
            target={fiberTarget}
            color="indigo"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1.5 pt-1">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
          Quick Actions
        </h3>
        <QuickActionButtons />
      </div>

      {/* Activity & Vitals Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Step Tracker Card */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Footprints className="w-3.5 h-3.5 text-emerald-600" /> Steps
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-medium">
              Health Connect
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {stepCount.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {stepTarget.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Direct step sensor only (GPS driving speed rejected).
          </p>
        </Card>

        {/* Weight Tracker Card */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Scale className="w-3.5 h-3.5 text-blue-600" /> Weight
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-medium">
              Phase 7
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {currentWeightKg}
            <span className="text-xs font-normal text-slate-400 ml-1">kg</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Last logged: Just now
          </p>
        </Card>
      </div>

      {/* Water Hydration Card */}
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Water Hydration
            </div>
            <div className="text-xs text-slate-400">
              {waterConsumedMl} / {waterTargetMl} ml
            </div>
          </div>
        </div>
        <span className="text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/50 px-2 py-1 rounded-lg">
          {Math.round((waterConsumedMl / (waterTargetMl || 1)) * 100)}%
        </span>
      </Card>

      {/* Recent Meals Section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Today&apos;s Meals
          </h3>
          <span className="text-xs text-emerald-600 font-medium">0 logged</span>
        </div>

        <Card className="text-center py-8 space-y-2 border-dashed">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No meals logged yet today
          </p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Food logging with the South Indian verified database will be enabled in Phase 3.
          </p>
        </Card>
      </div>

      {/* Security & Private App Indicator */}
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          NammaCal operates under strict private access. Your nutritional and activity data is isolated via PostgreSQL Row Level Security.
        </p>
      </div>
    </div>
  );
}

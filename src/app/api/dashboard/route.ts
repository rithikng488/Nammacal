import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDailyMeals, normalizeDateString } from "@/lib/meals/meal-service";
import { getUserTargets } from "@/lib/targets/target-service";
import { calculateWeightChange } from "@/lib/weight/weight-service";
import { getDailyActivitySummary } from "@/lib/activity/activity-service";
import { getDailyWaterSummary } from "@/lib/water/water-service";
import { getUserHabitsWithTodayStatus } from "@/lib/habits/habit-service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayDate = normalizeDateString(new Date());

    const [
      dailyTimeline,
      targets,
      weightData,
      activitySummary,
      waterSummary,
      habits,
    ] = await Promise.all([
      getDailyMeals(user.id, todayDate, supabase),
      getUserTargets(user.id, supabase),
      calculateWeightChange(user.id, supabase),
      getDailyActivitySummary(user.id, todayDate, supabase),
      getDailyWaterSummary(user.id, todayDate, supabase),
      getUserHabitsWithTodayStatus(user.id, todayDate, supabase),
    ]);

    return NextResponse.json({
      success: true,
      todayDate,
      timeline: dailyTimeline,
      targets,
      weight: weightData,
      activity: activitySummary,
      water: waterSummary,
      habits,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}

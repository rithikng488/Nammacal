import { createClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "../supabase/types";

export interface BiometricInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: "male" | "female" | "other";
  activityLevel: "sedentary" | "light" | "moderate" | "very_active" | "extra_active";
  goal: "lose_weight" | "maintain" | "gain_muscle";
}

export interface UserNutritionTargets {
  dailyCalories: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  dailyFiberG: number;
  dailyWaterMl: number;
  dailySteps: number;
}

export interface SuggestedTargetsResult {
  suggested: UserNutritionTargets;
  bmr: number;
  tdee: number;
  rationale: string[];
}

/**
 * Pure deterministic calculation for suggested daily nutrition targets based on
 * the validated Mifflin-St Jeor formula and ICMR-NIN nutritional guidelines for Indian adults.
 * IMPORTANT: Results are strictly advisory and require user approval before saving.
 */
export function calculateSuggestedTargets(input: BiometricInput): SuggestedTargetsResult {
  const { weightKg, heightCm, age, gender, activityLevel, goal } = input;

  if (weightKg < 20 || weightKg > 350) {
    throw new Error("Weight must be between 20 kg and 350 kg.");
  }
  if (heightCm < 80 || heightCm > 250) {
    throw new Error("Height must be between 80 cm and 250 cm.");
  }
  if (age < 12 || age > 110) {
    throw new Error("Age must be between 12 and 110.");
  }

  // 1. Mifflin-St Jeor BMR Formula
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // Neutral average for 'other'
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }

  // 2. Activity Multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.2;
  const tdee = Math.round(bmr * multiplier);

  // 3. Goal Calorie Adjustment
  let targetCalories: number;
  const rationale: string[] = [
    `Basal Metabolic Rate (BMR): ${Math.round(bmr)} kcal/day.`,
    `Total Daily Energy Expenditure (TDEE): ${tdee} kcal/day (${activityLevel} activity).`,
  ];

  if (goal === "lose_weight") {
    targetCalories = Math.max(1200, tdee - 400); // Safe 400 kcal deficit
    rationale.push("Target includes a safe ~400 kcal deficit for steady fat loss.");
  } else if (goal === "gain_muscle") {
    targetCalories = tdee + 300; // Lean surplus
    rationale.push("Target includes a ~300 kcal surplus for lean muscle hypertrophy.");
  } else {
    targetCalories = tdee;
    rationale.push("Target matches maintenance expenditure to stabilize body weight.");
  }

  // 4. Macro Splits
  // Protein: ~1.8g/kg for muscle gain/loss, ~1.5g/kg for maintenance
  const proteinPerKg = goal === "maintain" ? 1.5 : 1.8;
  const targetProteinG = Math.round(Math.min(weightKg * proteinPerKg, (targetCalories * 0.35) / 4));

  // Fat: 25% of daily calories (9 kcal/g)
  const targetFatG = Math.round((targetCalories * 0.25) / 9);

  // Carbs: Remaining calories (4 kcal/g)
  const caloriesFromProteinAndFat = targetProteinG * 4 + targetFatG * 9;
  const remainingCarbCalories = Math.max(0, targetCalories - caloriesFromProteinAndFat);
  const targetCarbsG = Math.round(remainingCarbCalories / 4);

  // Fiber: 14g per 1000 kcal (ICMR-NIN recommendation: min 25-35g)
  const targetFiberG = Math.max(25, Math.round((targetCalories / 1000) * 14));

  // Water: 35ml per kg bodyweight
  const targetWaterMl = Math.round(Math.min(4500, Math.max(2000, weightKg * 35)));

  // Steps:
  const stepGoals: Record<string, number> = {
    sedentary: 6000,
    light: 8000,
    moderate: 10000,
    very_active: 12000,
    extra_active: 14000,
  };
  const targetSteps = stepGoals[activityLevel] || 8000;

  return {
    suggested: {
      dailyCalories: Math.round(targetCalories),
      dailyProteinG: targetProteinG,
      dailyCarbsG: targetCarbsG,
      dailyFatG: targetFatG,
      dailyFiberG: targetFiberG,
      dailyWaterMl: targetWaterMl,
      dailySteps: targetSteps,
    },
    bmr: Math.round(bmr),
    tdee,
    rationale,
  };
}

/**
 * Retrieves the user's active daily nutrition targets.
 */
export async function getUserTargets(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<UserNutritionTargets> {
  const supabase = client || (await createClient());

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, daily_fiber_target, daily_water_ml_target, daily_step_target"
    )
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error(`Failed to load user targets: ${error?.message || "User profile not found"}`);
  }

  return {
    dailyCalories: profile.daily_calorie_target ?? 2000,
    dailyProteinG: profile.daily_protein_target ?? 100,
    dailyCarbsG: profile.daily_carb_target ?? 250,
    dailyFatG: profile.daily_fat_target ?? 65,
    dailyFiberG: profile.daily_fiber_target ?? 30,
    dailyWaterMl: profile.daily_water_ml_target ?? 3000,
    dailySteps: profile.daily_step_target ?? 8000,
  };
}

/**
 * Updates user daily targets upon explicit user confirmation.
 */
export async function updateUserTargets(
  userId: string,
  targets: Partial<UserNutritionTargets>,
  client?: SupabaseClient<Database>
): Promise<UserNutritionTargets> {
  const supabase = client || (await createClient());

  const updatePayload: Partial<Profile> = {};
  if (targets.dailyCalories !== undefined) updatePayload.daily_calorie_target = Math.round(targets.dailyCalories);
  if (targets.dailyProteinG !== undefined) updatePayload.daily_protein_target = Math.round(targets.dailyProteinG);
  if (targets.dailyCarbsG !== undefined) updatePayload.daily_carb_target = Math.round(targets.dailyCarbsG);
  if (targets.dailyFatG !== undefined) updatePayload.daily_fat_target = Math.round(targets.dailyFatG);
  if (targets.dailyFiberG !== undefined) updatePayload.daily_fiber_target = Math.round(targets.dailyFiberG);
  if (targets.dailyWaterMl !== undefined) updatePayload.daily_water_ml_target = Math.round(targets.dailyWaterMl);
  if (targets.dailySteps !== undefined) updatePayload.daily_step_target = Math.round(targets.dailySteps);

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select(
      "daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, daily_fiber_target, daily_water_ml_target, daily_step_target"
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to update daily targets: ${error?.message}`);
  }

  return {
    dailyCalories: data.daily_calorie_target,
    dailyProteinG: data.daily_protein_target,
    dailyCarbsG: data.daily_carb_target,
    dailyFatG: data.daily_fat_target,
    dailyFiberG: data.daily_fiber_target,
    dailyWaterMl: data.daily_water_ml_target,
    dailySteps: data.daily_step_target,
  };
}

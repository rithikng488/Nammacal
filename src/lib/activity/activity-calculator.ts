import type { ActivityType, ActivityIntensity, CalorieProvenance } from "@/lib/supabase/types";

export const DEFAULT_REFERENCE_WEIGHT_KG = 70.0;

/**
 * Standard MET (Metabolic Equivalent of Task) values derived from the
 * 2011 Compendium of Physical Activities for each activity type and intensity.
 */
export const ACTIVITY_MET_TABLE: Record<ActivityType, Record<ActivityIntensity, number>> = {
  walking: {
    light: 2.8,    // casual stroll, < 3.2 km/h
    moderate: 3.5, // brisk walking, ~4.8 km/h
    vigorous: 4.5, // very brisk / incline, > 6.0 km/h
  },
  running: {
    light: 7.0,    // slow jogging, ~8 km/h
    moderate: 9.8, // steady run, ~10 km/h
    vigorous: 11.5,// fast pace, > 12 km/h
  },
  cycling: {
    light: 4.0,    // leisure, < 16 km/h
    moderate: 6.8, // moderate effort, 16-20 km/h
    vigorous: 8.5, // racing / vigorous, > 20 km/h
  },
  strength_training: {
    light: 3.0,    // light resistance / rehab
    moderate: 4.0, // standard resistance training with set rests
    vigorous: 6.0, // heavy compound lifts, intense circuit / supersets
  },
  gym_workout: {
    light: 3.5,    // warm-up, light cardio machines
    moderate: 5.0, // mixed resistance and cardio
    vigorous: 7.0, // high intensity interval training (HIIT)
  },
  swimming: {
    light: 4.8,    // leisurely recreational swimming
    moderate: 7.0, // lap swimming, freestyle / breaststroke
    vigorous: 9.8, // fast laps / butterfly
  },
  yoga: {
    light: 2.5,    // Hatha / gentle stretching / restorative
    moderate: 3.3, // Vinyasa flow, Ashtanga, Surya Namaskar series
    vigorous: 4.5, // Power yoga, hot yoga
  },
  sports: {
    light: 4.5,    // casual badminton, table tennis
    moderate: 6.5, // cricket, competitive badminton, volleyball
    vigorous: 8.5, // football, basketball, squash, singles tennis
  },
  other: {
    light: 3.0,
    moderate: 4.5,
    vigorous: 6.5,
  },
};

export interface CalculateActivityCaloriesOptions {
  activityType: ActivityType;
  durationMinutes: number;
  intensity?: ActivityIntensity;
  weightKg?: number | null;
}

export interface ActivityCalorieCalculationResult {
  calories: number;
  provenance: CalorieProvenance;
  met: number;
  weightUsedKg: number;
}

/**
 * Returns the MET value for an activity type and intensity.
 */
export function getActivityMet(
  activityType: ActivityType,
  intensity: ActivityIntensity = "moderate"
): number {
  const typeMap = ACTIVITY_MET_TABLE[activityType] || ACTIVITY_MET_TABLE.other;
  return typeMap[intensity] ?? typeMap.moderate;
}

/**
 * Deterministically estimates calories burned during an activity using standard MET formulas:
 * Calories = MET * Weight (kg) * (durationMinutes / 60)
 * 
 * IMPORTANT:
 * 1. This calculation is strictly transparent and deterministic. AI is NEVER used.
 * 2. Calories are labeled with provenance "calculated_activity_estimate".
 * 3. Never subtracts or adds to nutritional food calorie budgets automatically.
 */
export function calculateEstimatedActivityCalories(
  options: CalculateActivityCaloriesOptions
): ActivityCalorieCalculationResult {
  const { activityType, durationMinutes, intensity = "moderate", weightKg } = options;

  if (durationMinutes <= 0 || durationMinutes > 1440) {
    throw new Error("Activity duration must be between 1 and 1440 minutes (24 hours).");
  }

  // Use provided weight or fallback to standard reference weight
  const weightUsedKg =
    typeof weightKg === "number" && weightKg >= 20.0 && weightKg <= 400.0
      ? weightKg
      : DEFAULT_REFERENCE_WEIGHT_KG;

  const met = getActivityMet(activityType, intensity);
  const rawCalories = met * weightUsedKg * (durationMinutes / 60);
  const calories = Math.round(rawCalories * 10) / 10;

  return {
    calories,
    provenance: "calculated_activity_estimate",
    met,
    weightUsedKg,
  };
}

import { describe, it, expect } from "vitest";
import {
  getActivityMet,
  calculateEstimatedActivityCalories,
  ACTIVITY_MET_TABLE,
  DEFAULT_REFERENCE_WEIGHT_KG,
} from "@/lib/activity/activity-calculator";

describe("Phase 7 - Deterministic Activity Calorie Calculator", () => {
  it("provides valid MET values for all activity types and intensities", () => {
    const types = Object.keys(ACTIVITY_MET_TABLE) as (keyof typeof ACTIVITY_MET_TABLE)[];
    expect(types.length).toBeGreaterThanOrEqual(9);

    for (const t of types) {
      expect(getActivityMet(t, "light")).toBeGreaterThan(0);
      expect(getActivityMet(t, "moderate")).toBeGreaterThan(getActivityMet(t, "light"));
      expect(getActivityMet(t, "vigorous")).toBeGreaterThan(getActivityMet(t, "moderate"));
    }
  });

  it("calculates accurate calories burned using standard MET formula", () => {
    // 60 minutes moderate walking (MET 3.5) for 70 kg person:
    // 3.5 * 70 * (60 / 60) = 245.0 kcal
    const result = calculateEstimatedActivityCalories({
      activityType: "walking",
      durationMinutes: 60,
      intensity: "moderate",
      weightKg: 70.0,
    });

    expect(result.calories).toBe(245.0);
    expect(result.provenance).toBe("calculated_activity_estimate");
    expect(result.met).toBe(3.5);
    expect(result.weightUsedKg).toBe(70.0);
  });

  it("calculates accurate calories for 45 min vigorous running for 60 kg person", () => {
    // 45 min vigorous running (MET 11.5) for 60 kg person:
    // 11.5 * 60 * (45 / 60) = 11.5 * 60 * 0.75 = 517.5 kcal
    const result = calculateEstimatedActivityCalories({
      activityType: "running",
      durationMinutes: 45,
      intensity: "vigorous",
      weightKg: 60.0,
    });

    expect(result.calories).toBe(517.5);
    expect(result.met).toBe(11.5);
    expect(result.weightUsedKg).toBe(60.0);
  });

  it("uses default reference weight (70 kg) if weight is null or unrecorded", () => {
    const result = calculateEstimatedActivityCalories({
      activityType: "yoga",
      durationMinutes: 30,
      intensity: "moderate", // MET 3.3
      weightKg: null,
    });

    // 3.3 * 70 * (30 / 60) = 3.3 * 70 * 0.5 = 115.5 kcal
    expect(result.weightUsedKg).toBe(DEFAULT_REFERENCE_WEIGHT_KG);
    expect(result.calories).toBe(115.5);
  });

  it("rejects non-positive or absurdly long durations", () => {
    expect(() =>
      calculateEstimatedActivityCalories({
        activityType: "walking",
        durationMinutes: 0,
      })
    ).toThrow("Activity duration must be between 1 and 1440 minutes");

    expect(() =>
      calculateEstimatedActivityCalories({
        activityType: "walking",
        durationMinutes: -15,
      })
    ).toThrow("Activity duration must be between 1 and 1440 minutes");

    expect(() =>
      calculateEstimatedActivityCalories({
        activityType: "walking",
        durationMinutes: 1441,
      })
    ).toThrow("Activity duration must be between 1 and 1440 minutes");
  });

  it("correctly defaults intensity to moderate when omitted", () => {
    const explicitMod = calculateEstimatedActivityCalories({
      activityType: "strength_training",
      durationMinutes: 60,
      intensity: "moderate",
      weightKg: 80,
    });

    const defaultMod = calculateEstimatedActivityCalories({
      activityType: "strength_training",
      durationMinutes: 60,
      weightKg: 80,
    });

    expect(defaultMod.calories).toBe(explicitMod.calories);
    expect(defaultMod.met).toBe(4.0);
  });
});

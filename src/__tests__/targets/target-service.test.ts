import { describe, it, expect } from "vitest";
import {
  calculateSuggestedTargets,
  getUserTargets,
  updateUserTargets,
  type BiometricInput,
} from "@/lib/targets/target-service";
import type { Profile } from "@/lib/supabase/types";

function createMockSupabase(initialProfile: Profile) {
  let profile = { ...initialProfile };

  const client: any = {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_field: string, id: string) => ({
              single: async () => {
                if (profile.id === id) {
                  return { data: profile, error: null };
                }
                return { data: null, error: { message: "Profile not found" } };
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (_field: string, id: string) => ({
              select: () => ({
                single: async () => {
                  if (profile.id === id) {
                    profile = { ...profile, ...payload };
                    return { data: profile, error: null };
                  }
                  return { data: null, error: { message: "Profile not found" } };
                },
              }),
            }),
          }),
        };
      }
      return {};
    },
  };

  return { client, getProfile: () => profile };
}

describe("Phase 6 - Daily Nutrition Targets & Calculation Service", () => {
  const sampleProfile: Profile = {
    id: "user-target-test-1",
    email: "test@nammacal.local",
    full_name: "Test User",
    role: "member",
    status: "active",
    invited_by: null,
    daily_calorie_target: 2000,
    daily_protein_target: 120,
    daily_carb_target: 230,
    daily_fat_target: 60,
    daily_fiber_target: 30,
    daily_water_ml_target: 3000,
    daily_step_target: 8000,
    preferred_language: "en",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  describe("Mifflin-St Jeor Target Calculation", () => {
    it("calculates accurate maintenance targets for an active male", () => {
      const input: BiometricInput = {
        weightKg: 70,
        heightCm: 175,
        age: 28,
        gender: "male",
        activityLevel: "moderate", // 1.55 multiplier
        goal: "maintain",
      };

      // BMR = 10 * 70 + 6.25 * 175 - 5 * 28 + 5 = 700 + 1093.75 - 140 + 5 = 1658.75
      // TDEE = 1658.75 * 1.55 = ~2571 kcal
      const result = calculateSuggestedTargets(input);

      expect(result.bmr).toBe(1659);
      expect(result.tdee).toBe(2571);
      expect(result.suggested.dailyCalories).toBe(2571);

      // Protein ~ 1.5g/kg for maintenance = ~105g
      expect(result.suggested.dailyProteinG).toBe(105);
      // Fat ~ 25% of 2571 = 642.75 / 9 = ~71g
      expect(result.suggested.dailyFatG).toBe(71);
      // Fiber ~ 14g / 1000 kcal = 2.571 * 14 = ~36g
      expect(result.suggested.dailyFiberG).toBe(36);
      // Water ~ 35ml / kg = 2450ml
      expect(result.suggested.dailyWaterMl).toBe(2450);
      expect(result.suggested.dailySteps).toBe(10000);
    });

    it("applies a safe 400 kcal deficit for fat loss without dropping below 1200 kcal", () => {
      const input: BiometricInput = {
        weightKg: 65,
        heightCm: 160,
        age: 32,
        gender: "female",
        activityLevel: "light", // 1.375 multiplier
        goal: "lose_weight",
      };

      // BMR = 10 * 65 + 6.25 * 160 - 5 * 32 - 161 = 650 + 1000 - 160 - 161 = 1329
      // TDEE = 1329 * 1.375 = ~1827 kcal
      // Deficit target = 1827 - 400 = 1427 kcal
      const result = calculateSuggestedTargets(input);

      expect(result.bmr).toBe(1329);
      expect(result.tdee).toBe(1827);
      expect(result.suggested.dailyCalories).toBe(1427);
      // Protein ~ 1.8g/kg for weight loss = ~117g
      expect(result.suggested.dailyProteinG).toBe(117);
      expect(result.rationale.some((r) => r.includes("safe ~400 kcal deficit"))).toBe(true);
    });

    it("rejects invalid biometric bounds", () => {
      expect(() =>
        calculateSuggestedTargets({
          weightKg: 15, // < 20 kg
          heightCm: 170,
          age: 25,
          gender: "male",
          activityLevel: "light",
          goal: "maintain",
        })
      ).toThrow("Weight must be between 20 kg and 350 kg.");

      expect(() =>
        calculateSuggestedTargets({
          weightKg: 70,
          heightCm: 50, // < 80 cm
          age: 25,
          gender: "male",
          activityLevel: "light",
          goal: "maintain",
        })
      ).toThrow("Height must be between 80 cm and 250 cm.");

      expect(() =>
        calculateSuggestedTargets({
          weightKg: 70,
          heightCm: 170,
          age: 5, // < 12
          gender: "male",
          activityLevel: "light",
          goal: "maintain",
        })
      ).toThrow("Age must be between 12 and 110.");
    });
  });

  describe("Target Retrieval & Update Persistence", () => {
    it("retrieves user nutrition targets from profile", async () => {
      const { client } = createMockSupabase(sampleProfile);
      const targets = await getUserTargets(sampleProfile.id, client);

      expect(targets.dailyCalories).toBe(2000);
      expect(targets.dailyProteinG).toBe(120);
      expect(targets.dailyCarbsG).toBe(230);
      expect(targets.dailyFatG).toBe(60);
      expect(targets.dailyFiberG).toBe(30);
    });

    it("updates targets only upon explicit user confirmation", async () => {
      const { client, getProfile } = createMockSupabase(sampleProfile);

      const updated = await updateUserTargets(
        sampleProfile.id,
        {
          dailyCalories: 2200,
          dailyProteinG: 140,
        },
        client
      );

      expect(updated.dailyCalories).toBe(2200);
      expect(updated.dailyProteinG).toBe(140);
      // Unmodified targets are preserved
      expect(updated.dailyCarbsG).toBe(230);
      expect(getProfile().daily_calorie_target).toBe(2200);
    });
  });
});

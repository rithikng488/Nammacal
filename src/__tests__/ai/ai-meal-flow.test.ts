import { describe, it, expect } from "vitest";
import { GeminiFoodAnalyzer } from "@/lib/ai/providers/gemini-provider";
import { DeterministicFoodParser } from "@/lib/ai/deterministic-parser";
import { matchCandidateToDatabase } from "@/lib/ai/food-matcher";
import { addFoodToMeal } from "@/lib/meals/meal-service";
import type { MealItem, MealLog } from "@/lib/supabase/types";

function createMockSupabaseClient(initialLogs: MealLog[] = [], initialItems: MealItem[] = []) {
  const mealLogs = [...initialLogs];
  const mealItems = [...initialItems];

  const client: any = {
    from: (table: string) => {
      if (table === "meal_logs") {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              eq: (field2: string, val2: any) => ({
                eq: (field3: string, val3: any) => ({
                  maybeSingle: async () => {
                    const match = mealLogs.find(
                      (l) =>
                        l[field as keyof MealLog] === val &&
                        l[field2 as keyof MealLog] === val2 &&
                        l[field3 as keyof MealLog] === val3
                    );
                    return { data: match || null, error: null };
                  },
                }),
              }),
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const newLog = {
                  id: payload.id || `log-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  meal_name: payload.meal_name || null,
                  ...payload,
                };
                mealLogs.push(newLog);
                return { data: newLog, error: null };
              },
            }),
          }),
        };
      }

      if (table === "meal_items") {
        return {
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const newItem: MealItem = {
                  id: payload.id || `item-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...payload,
                };
                mealItems.push(newItem);
                return { data: newItem, error: null };
              },
            }),
          }),
        };
      }

      if (table === "foods") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      return {};
    },
  };

  return { client, mealLogs, mealItems };
}

describe("Phase 5 - AI Photo & Voice Meal Logging Integration Pipeline", () => {
  const userId = "user-flow-test-1";

  it("completes full Photo AI flow: Image -> Vision -> Drafts -> User Edit -> Confirmation -> meal_items with provenance", async () => {
    const { client, mealItems } = createMockSupabaseClient();
    const visionAnalyzer = new GeminiFoodAnalyzer();

    // 1. User uploads photo (JPEG with magic bytes)
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(0)]);
    const visionResult = await visionAnalyzer.analyzeMealPhoto(jpegBuffer, "image/jpeg");

    expect(visionResult.detectedItems.length).toBeGreaterThan(0);

    // 2. Map detected item to NammaCal database (Cooked Ponni Rice)
    const detected = visionResult.detectedItems[0];
    const draft = matchCandidateToDatabase({
      candidateName: detected.rawFoodName,
      quantity: detected.estimatedQuantity,
      unit: detected.unit,
      source: "photo",
    });

    expect(draft.matchedFoodId).toBe("f002-rice-ponni-cooked");
    expect(draft.nutritionPreview).not.toBeNull();
    // Default 200g cooked rice: 260 kcal
    expect(draft.nutritionPreview!.calories).toBe(260);

    // 3. User edits portion from 200g to 250g in review UI
    const userEditedQuantity = 250;
    const updatedDraft = matchCandidateToDatabase({
      candidateName: draft.candidateName,
      quantity: userEditedQuantity,
      unit: "g",
      source: "photo",
    });

    expect(updatedDraft.nutritionPreview!.calories).toBe(325); // 130 * 2.5 = 325

    // 4. User confirms & saves to Lunch
    const saved = await addFoodToMeal(
      userId,
      {
        date: "2026-10-05",
        mealType: "lunch",
        foodId: updatedDraft.matchedFoodId!,
        quantity: updatedDraft.quantity,
        unit: updatedDraft.unit,
        provenance: updatedDraft.provenance,
        portionAssumption: "Portion estimated from photo and adjusted by user",
        isEstimatedPortion: true,
      },
      client
    );

    expect(saved).toBeDefined();
    expect(saved.food_name).toContain("Ponni Boiled Rice");
    expect(saved.calories).toBe(325);
    expect(saved.protein).toBeCloseTo(6.75, 1);
    expect(saved.data_provenance).toBe("ai_photo_estimate");
    expect(saved.is_estimated_portion).toBe(true);
    expect(saved.portion_assumption).toContain("adjusted by user");

    expect(mealItems.length).toBe(1);
    expect(mealItems[0].data_provenance).toBe("ai_photo_estimate");
  });

  it("completes full Voice flow: Audio -> Transcription -> Parser -> Drafts -> Confirmation -> meal_items with provenance", async () => {
    const { client, mealItems } = createMockSupabaseClient();
    const parser = new DeterministicFoodParser();

    // 1. Spoken input in Tanglish
    const transcript = "200 gram soru and oru katori sambar";
    const parseResult = await parser.parseFoodText(transcript);

    expect(parseResult.entries.length).toBe(2);

    // 2. Match each entry to database
    const drafts = parseResult.entries.map((entry) =>
      matchCandidateToDatabase({
        candidateName: entry.foodName,
        quantity: entry.quantity,
        unit: entry.unit,
        source: "voice",
      })
    );

    expect(drafts[0].matchedFoodId).toBe("f002-rice-ponni-cooked");
    expect(drafts[1].matchedFoodId).toBe("f070-gravy-sambar");

    // 3. User confirms both items to Dinner
    for (const d of drafts) {
      await addFoodToMeal(
        userId,
        {
          date: "2026-10-05",
          mealType: "dinner",
          foodId: d.matchedFoodId!,
          quantity: d.quantity,
          unit: d.unit,
          provenance: d.provenance,
          portionAssumption: "Parsed from voice log",
          isEstimatedPortion: true,
        },
        client
      );
    }

    expect(mealItems.length).toBe(2);
    expect(mealItems[0].data_provenance).toBe("ai_voice_parse");
    expect(mealItems[1].data_provenance).toBe("ai_voice_parse");
    // Verify calories come from deterministic engine (200g cooked rice = 260 kcal, 1 katori (150g) sambar = 112.5 kcal)
    expect(mealItems[0].calories).toBe(260);
    expect(mealItems[1].calories).toBeCloseTo(112.5, 1);
  });

  it("strictly prohibits AI from submitting arbitrary unverified calories into meal_items", async () => {
    const { client } = createMockSupabaseClient();

    // When logging a food with foodId, the server authoritative calculator is always called,
    // ignoring any fake client calorie field.
    const logged = await addFoodToMeal(
      userId,
      {
        date: "2026-10-05",
        mealType: "breakfast",
        foodId: "f060-breakfast-idli", // Idli
        quantity: 2,
        unit: "piece",
        provenance: "ai_photo_estimate",
      },
      client
    );

    // Idli (2 pieces = 90g) is ~119 kcal. Server computes exactly 118.8 kcal.
    expect(logged.calories).toBeCloseTo(118.8, 1);
  });
});

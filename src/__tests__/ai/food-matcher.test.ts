import { describe, it, expect } from "vitest";
import { matchCandidateToDatabase, normalizeUnit } from "@/lib/ai/food-matcher";
import type { Recipe } from "@/lib/supabase/types";

describe("Phase 5 - AI Candidate Matcher & Nutrition Engine Integration", () => {
  const mockUserRecipe: Recipe = {
    id: "recipe-chicken-curry-123",
    user_id: "user-test-1",
    name: "Chettinad Chicken Curry",
    description: "Homemade authentic chicken curry",
    servings: 4,
    final_cooked_weight_g: 650,
    total_raw_weight_g: 760,
    notes: null,
    is_estimated_portion: false,
    total_calories: 763,
    total_protein: 111,
    total_carbs: 16,
    total_fat: 26,
    total_fiber: 4,
    total_sugar: 4,
    total_sodium_mg: 350,
    calories_per_100g: 117.4,
    protein_per_100g: 17.1,
    carbs_per_100g: 2.5,
    fat_per_100g: 4.0,
    fiber_per_100g: 0.6,
    sugar_per_100g: 0.6,
    sodium_mg_per_100g: 53.8,
    is_public: false,
    data_provenance: "verified_database",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  describe("Verified Food Database Matching", () => {
    it("maps candidate 'Cooked Ponni Rice' (200g) directly to verified cooked rice record and computes authoritative nutrition", () => {
      const draft = matchCandidateToDatabase({
        candidateName: "Cooked Ponni Rice",
        searchTerms: ["ponni boiled rice", "satham"],
        quantity: 200,
        unit: "g",
        confidence: "high",
        source: "photo",
      });

      expect(draft.matchedFoodId).toBe("f002-rice-ponni-cooked");
      expect(draft.matchedFood).not.toBeNull();
      expect(draft.matchedFood?.name_en).toContain("Ponni Boiled Rice (Cooked");
      expect(draft.isAmbiguous).toBe(false);

      // Verify DETERMINISTIC nutrition from database (130 kcal / 100g -> 260 kcal for 200g)
      expect(draft.nutritionPreview).not.toBeNull();
      expect(draft.nutritionPreview!.calories).toBe(260);
      expect(draft.nutritionPreview!.protein).toBe(5.4); // 2.7 * 2
      expect(draft.nutritionPreview!.carbs).toBe(57); // 28.5 * 2
      expect(draft.provenance).toBe("ai_photo_estimate");
    });

    it("maps Tamil alias 'soru' from voice input directly to cooked rice record", () => {
      const draft = matchCandidateToDatabase({
        candidateName: "soru",
        quantity: 150,
        unit: "g",
        confidence: "high",
        source: "voice",
      });

      expect(draft.matchedFoodId).toBe("f002-rice-ponni-cooked");
      expect(draft.nutritionPreview).not.toBeNull();
      expect(draft.nutritionPreview!.calories).toBe(195); // 130 * 1.5 = 195
      expect(draft.provenance).toBe("ai_voice_parse");
    });

    it("maps 'idli' with unit 'piece' to verified idli record using household weight (45g/piece)", () => {
      const draft = matchCandidateToDatabase({
        candidateName: "idli",
        quantity: 2,
        unit: "piece",
        confidence: "high",
        source: "voice",
      });

      expect(draft.matchedFoodId).toBe("f060-breakfast-idli");
      expect(draft.nutritionPreview).not.toBeNull();
      // 2 idlis = 90g. Idli is 132 kcal / 100g -> ~118.8 kcal for 90g
      expect(draft.nutritionPreview!.calories).toBeCloseTo(118.8, 1);
      expect(draft.nutritionPreview!.effectiveWeightGrams).toBe(90);
    });
  });

  describe("User Saved Recipe Matching", () => {
    it("suggests user's custom saved recipe when photo or voice candidate matches recipe name", () => {
      const draft = matchCandidateToDatabase({
        candidateName: "Chicken Curry",
        searchTerms: ["chicken gravy", "curry"],
        quantity: 200,
        unit: "g",
        confidence: "medium",
        source: "photo",
        userRecipes: [mockUserRecipe],
      });

      // Verify that the user recipe is present in suggestedAlternatives
      const recipeSuggestion = draft.suggestedAlternatives.find(
        (alt) => alt.type === "recipe" && alt.id === mockUserRecipe.id
      );
      expect(recipeSuggestion).toBeDefined();
      expect(recipeSuggestion!.name).toBe("Chettinad Chicken Curry");
      expect(recipeSuggestion!.confidenceNote).toContain("Matches your saved recipe");
    });
  });

  describe("Ambiguous & Unidentified Foods", () => {
    it("flags ambiguous candidates with low confidence and provides alternative database suggestions without inventing calories", () => {
      const draft = matchCandidateToDatabase({
        candidateName: "Mysterious Greenish Curry",
        searchTerms: ["green curry"],
        quantity: 100,
        unit: "g",
        confidence: "low",
        source: "photo",
      });

      expect(draft.isAmbiguous).toBe(true);
      expect(draft.ambiguityReason).toBeDefined();
      expect(draft.confidence).toBe("low");
      // Alternatives are offered
      expect(draft.suggestedAlternatives.length).toBeGreaterThan(0);
    });
  });

  describe("Unit Normalization Helper", () => {
    it("normalizes colloquial unit names", () => {
      expect(normalizeUnit("gm")).toBe("g");
      expect(normalizeUnit("grams")).toBe("g");
      expect(normalizeUnit("bowl")).toBe("katori");
      expect(normalizeUnit("kinnam")).toBe("katori");
      expect(normalizeUnit("spoon")).toBe("tbsp");
      expect(normalizeUnit("thattu")).toBe("plate");
      expect(normalizeUnit("nos")).toBe("piece");
    });
  });
});

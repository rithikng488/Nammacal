import { describe, it, expect } from "vitest";
import { searchFoods, computeSimilarity } from "@/lib/nutrition/food-service";
import type { Food } from "@/lib/supabase/types";

describe("Indian & Tamil Food Search Engine", () => {
  describe("English Name Matching", () => {
    it("searches and finds 'paneer' with high relevance", () => {
      const results = searchFoods({ query: "paneer" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_en.toLowerCase()).toContain("paneer");
    });

    it("searches and finds 'chicken breast'", () => {
      const results = searchFoods({ query: "chicken breast" });
      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.food.name_en.toLowerCase());
      expect(names.some((n) => n.includes("chicken"))).toBe(true);
    });
  });

  describe("Tamil Script (Unicode) Matching", () => {
    it("finds cooked rice using Tamil script 'சாதம்'", () => {
      const results = searchFoods({ query: "சாதம்" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_ta).toContain("சாதம்");
    });

    it("finds idli using Tamil script 'இட்லி'", () => {
      const results = searchFoods({ query: "இட்லி" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_ta).toContain("இட்லி");
    });

    it("finds curd using Tamil script 'தயிர்'", () => {
      const results = searchFoods({ query: "தயிர்" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_ta).toContain("தயிர்");
    });
  });

  describe("Tanglish & Transliterated Tamil Alias Matching", () => {
    it("matches 'soru' to Cooked Ponni Rice via alias", () => {
      const results = searchFoods({ query: "soru" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.id).toBe("f002-rice-ponni-cooked");
      expect(results[0].food.state).toBe("cooked");
    });

    it("matches 'satham' or 'saatham' to Cooked Rice", () => {
      const results1 = searchFoods({ query: "satham" });
      expect(results1.length).toBeGreaterThan(0);
      expect(results1[0].food.id).toBe("f002-rice-ponni-cooked");

      const results2 = searchFoods({ query: "saatham" });
      expect(results2.length).toBeGreaterThan(0);
      expect(results2[0].food.id).toBe("f002-rice-ponni-cooked");
    });

    it("matches 'thayir' to Curd / Dahi", () => {
      const results = searchFoods({ query: "thayir" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_en.toLowerCase()).toContain("curd");
    });

    it("matches 'muttai' to Boiled Egg", () => {
      const results = searchFoods({ query: "muttai" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_en.toLowerCase()).toContain("egg");
    });

    it("matches 'nallenai' to Gingelly / Sesame Oil", () => {
      const results = searchFoods({ query: "nallenai" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_en.toLowerCase()).toContain("gingelly");
    });
  });

  describe("Typo Tolerance & Fuzzy Trigram Scoring", () => {
    it("tolerates common spelling variations: 'idly' for 'idli'", () => {
      const results = searchFoods({ query: "idly" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.id).toBe("f060-breakfast-idli");
    });

    it("tolerates 'dosai' for 'dosa'", () => {
      const results = searchFoods({ query: "dosai" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.id).toBe("f061-breakfast-dosa");
    });

    it("tolerates typos like 'paner' for 'paneer'", () => {
      const results = searchFoods({ query: "paner" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.name_en.toLowerCase()).toContain("paneer");
    });

    it("tolerates 'sambhar' for 'sambar'", () => {
      const results = searchFoods({ query: "sambhar" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.id).toBe("f070-gravy-sambar");
    });
  });

  describe("Category & Cooking State Filtering", () => {
    it("filters strictly by category 'millets'", () => {
      const results = searchFoods({ category: "millets" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.food.category === "millets")).toBe(true);
    });

    it("filters strictly by cooking state: 'raw'", () => {
      const results = searchFoods({ query: "rice", state: "raw" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.food.state === "raw")).toBe(true);
    });

    it("filters strictly by cooking state: 'cooked'", () => {
      const results = searchFoods({ query: "rice", state: "cooked" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.food.state === "cooked")).toBe(true);
    });
  });

  describe("Custom User Foods Integration", () => {
    it("merges and searches user-created custom foods", () => {
      const customFood: Food = {
        id: "custom-chems-dosa",
        name_en: "Grandma Special Wheat Dosa",
        name_ta: "பாட்டி ஸ்பெஷல் கோதுமை தோசை",
        name_tanglish: "Paatti Special Godhumai Dosa",
        category: "breakfast_south",
        state: "cooked",
        calories_per_100g: 175,
        protein_per_100g: 5.5,
        carbs_per_100g: 28.0,
        fat_per_100g: 4.5,
        fiber_per_100g: 3.0,
        sugar_per_100g: null,
        sodium_mg_per_100g: null,
        serving_unit_default: "piece",
        serving_size_default: 80,
        standard_portions: [{ unit: "piece", gram_weight: 80, label_en: "1 dosa", is_estimate: true }],
        data_provenance: "user_entered",
        source_reference: "User Custom Recipe",
        is_verified: false,
        created_by: "user-test-uuid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const results = searchFoods({ query: "paatti special" }, [customFood]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].food.id).toBe("custom-chems-dosa");
      expect(results[0].food.is_verified).toBe(false);
      expect(results[0].food.data_provenance).toBe("user_entered");
    });
  });
});

import { describe, it, expect } from "vitest";
import { DeterministicFoodParser } from "@/lib/ai/deterministic-parser";
import { HybridFoodParser } from "@/lib/ai/hybrid-parser";
import { validateVoiceAudio, MediaValidationError } from "@/lib/ai/media-validator";

describe("Phase 5 - Voice Food Logging & Natural Language Parsing", () => {
  const parser = new DeterministicFoodParser();

  describe("English Spoken Food Inputs", () => {
    it("parses multi-food sentence with quantities and units: '200 grams cooked rice and 150 grams sambar for lunch'", async () => {
      const result = await parser.parseFoodText(
        "200 grams cooked rice and 150 grams sambar for lunch"
      );

      expect(result.entries.length).toBe(2);

      const rice = result.entries[0];
      expect(rice.foodName.toLowerCase()).toContain("rice");
      expect(rice.quantity).toBe(200);
      expect(rice.unit).toBe("g");

      const sambar = result.entries[1];
      expect(sambar.foodName.toLowerCase()).toContain("sambar");
      expect(sambar.quantity).toBe(150);
      expect(sambar.unit).toBe("g");
    });

    it("parses decimal quantity and cup unit: '1.5 cups boiled rice'", async () => {
      const result = await parser.parseFoodText("1.5 cups boiled rice");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(1.5);
      expect(result.entries[0].unit).toBe("cup");
      expect(result.entries[0].foodName.toLowerCase()).toContain("boiled rice");
    });

    it("parses tablespoon unit: '2 tbsp oil'", async () => {
      const result = await parser.parseFoodText("2 tbsp oil");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(2);
      expect(result.entries[0].unit).toBe("tbsp");
      expect(result.entries[0].foodName.toLowerCase()).toBe("oil");
    });

    it("parses countable items with implicit piece unit: '3 eggs'", async () => {
      const result = await parser.parseFoodText("3 eggs");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(3);
      expect(result.entries[0].unit).toBe("piece");
    });
  });

  describe("Tamil & Tanglish Spoken Food Inputs", () => {
    it("parses '200 gram soru'", async () => {
      const result = await parser.parseFoodText("200 gram soru");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(200);
      expect(result.entries[0].unit).toBe("g");
      expect(result.entries[0].foodName.toLowerCase()).toBe("soru");
    });

    it("parses 'oru katori sambar'", async () => {
      const result = await parser.parseFoodText("oru katori sambar");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(1); // "oru" = 1
      expect(result.entries[0].unit).toBe("katori");
      expect(result.entries[0].foodName.toLowerCase()).toBe("sambar");
    });

    it("parses 'rendu idli'", async () => {
      const result = await parser.parseFoodText("rendu idli");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(2); // "rendu" = 2
      expect(result.entries[0].unit).toBe("piece");
      expect(result.entries[0].foodName.toLowerCase()).toBe("idli");
    });

    it("parses '150 gram chicken'", async () => {
      const result = await parser.parseFoodText("150 gram chicken");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(150);
      expect(result.entries[0].unit).toBe("g");
      expect(result.entries[0].foodName.toLowerCase()).toBe("chicken");
    });

    it("parses 'lunch ku 200 gram rice'", async () => {
      const result = await parser.parseFoodText("lunch ku 200 gram rice");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(200);
      expect(result.entries[0].unit).toBe("g");
      expect(result.entries[0].foodName.toLowerCase()).toBe("rice");
    });

    it("parses mixed clause: '2 dosa and one egg'", async () => {
      const result = await parser.parseFoodText("2 dosa and one egg");
      expect(result.entries.length).toBe(2);
      expect(result.entries[0].quantity).toBe(2);
      expect(result.entries[0].unit).toBe("piece");
      expect(result.entries[0].foodName.toLowerCase()).toBe("dosa");

      expect(result.entries[1].quantity).toBe(1);
      expect(result.entries[1].unit).toBe("piece");
      expect(result.entries[1].foodName.toLowerCase()).toBe("egg");
    });

    it("parses fractional spoken words: 'ara spoon ghee' (0.5 tbsp)", async () => {
      const result = await parser.parseFoodText("ara spoon ghee");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(0.5); // "ara" = 0.5
      expect(result.entries[0].unit).toBe("tbsp");
      expect(result.entries[0].foodName.toLowerCase()).toBe("ghee");
    });
  });

  describe("Ambiguous & Incomplete Speech Handling", () => {
    it("handles food with missing quantity gracefully by defaulting to 1 portion and marking ambiguous", async () => {
      const result = await parser.parseFoodText("sambar");
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].quantity).toBe(1);
      expect(result.entries[0].isAmbiguous).toBe(true);
      expect(result.entries[0].ambiguities?.[0]).toContain("Quantity not specified");
    });

    it("returns empty result on empty or whitespace audio transcript", async () => {
      const result = await parser.parseFoodText("   ");
      expect(result.entries).toEqual([]);
      expect(result.unparsedSegments).toEqual([]);
    });
  });

  describe("Audio File Validation", () => {
    it("accepts valid audio MIME types (webm, mp4, wav)", () => {
      const sampleAudio = Buffer.alloc(1024);
      expect(validateVoiceAudio(sampleAudio, "audio/webm").isValid).toBe(true);
      expect(validateVoiceAudio(sampleAudio, "audio/mp4").isValid).toBe(true);
      expect(validateVoiceAudio(sampleAudio, "audio/wav").isValid).toBe(true);
    });

    it("rejects oversized audio exceeding 10MB", () => {
      const hugeAudio = Buffer.alloc(11 * 1024 * 1024);
      expect(() => validateVoiceAudio(hugeAudio, "audio/webm")).toThrow(MediaValidationError);
      expect(() => validateVoiceAudio(hugeAudio, "audio/webm")).toThrow("exceeds maximum limit of 10 MB");
    });

    it("rejects unsupported audio MIME type (e.g. video/avi or application/octet-stream)", () => {
      const sampleAudio = Buffer.alloc(500);
      expect(() => validateVoiceAudio(sampleAudio, "video/avi")).toThrow("Unsupported audio format");
    });
  });
});

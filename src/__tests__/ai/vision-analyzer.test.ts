import { describe, it, expect } from "vitest";
import {
  VisionAnalysisResponseSchema,
  VisionCandidateSchema,
} from "@/lib/ai/schemas";
import { GeminiFoodAnalyzer } from "@/lib/ai/providers/gemini-provider";
import { validateMealPhoto, MediaValidationError } from "@/lib/ai/media-validator";

describe("Phase 5 - AI Vision Analyzer & Output Contract", () => {
  const analyzer = new GeminiFoodAnalyzer();

  describe("Structured AI Output Validation (Zod Schema)", () => {
    it("validates a compliant multi-food South Indian vision response", () => {
      const validPayload = {
        items: [
          {
            candidate: "Cooked Ponni Rice",
            search_terms: ["ponni boiled rice", "satham", "cooked rice"],
            estimated_quantity: 200,
            estimated_unit: "g",
            estimated_gram_range: { min: 180, max: 220 },
            confidence: "high",
            assumptions: ["Portion estimated from stainless steel katori"],
          },
          {
            candidate: "Sambar",
            search_terms: ["sambar", "vegetable sambar"],
            estimated_quantity: 1,
            estimated_unit: "katori",
            confidence: "medium",
            assumptions: ["Standard home katori serving ~150g"],
          },
        ],
        overall_assumptions: [
          "Oil quantity cannot be reliably determined from image.",
          "Salt and spices are unquantified visually.",
        ],
        suggested_recipes: ["Amma Sambar"],
        disclaimer:
          "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving.",
      };

      const parsed = VisionAnalysisResponseSchema.parse(validPayload);
      expect(parsed.items.length).toBe(2);
      expect(parsed.items[0].candidate).toBe("Cooked Ponni Rice");
      expect(parsed.items[0].confidence).toBe("high");
      expect(parsed.items[1].confidence).toBe("medium");
      expect(parsed.overall_assumptions.length).toBe(2);
    });

    it("rejects non-positive quantity in vision candidate", () => {
      const invalidCandidate = {
        candidate: "Rice",
        search_terms: ["rice"],
        estimated_quantity: 0, // Invalid: must be positive
        estimated_unit: "g",
        confidence: "high",
        assumptions: [],
      };

      expect(() => VisionCandidateSchema.parse(invalidCandidate)).toThrow();
    });

    it("rejects invalid confidence value (e.g. pseudo-scientific percentage or unrecognized string)", () => {
      const invalidCandidate = {
        candidate: "Dosa",
        search_terms: ["dosa"],
        estimated_quantity: 2,
        estimated_unit: "piece",
        confidence: "82% certain", // Invalid: must be "high" | "medium" | "low"
        assumptions: [],
      };

      expect(() => VisionCandidateSchema.parse(invalidCandidate)).toThrow();
    });

    it("guarantees AI output schema does NOT accept or mandate authoritative nutrition fields", () => {
      // The schema must not have calories, protein, carbs, or fat as authoritative fields
      const candidateKeys = Object.keys(VisionCandidateSchema.shape);
      expect(candidateKeys).not.toContain("calories");
      expect(candidateKeys).not.toContain("protein");
      expect(candidateKeys).not.toContain("carbohydrates");
      expect(candidateKeys).not.toContain("fat");
    });
  });

  describe("Media Validation & Security", () => {
    it("accepts valid JPEG buffer with correct magic bytes", () => {
      // JPEG magic bytes: FF D8 FF E0 ...
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, ...new Array(200).fill(0)]);
      const result = validateMealPhoto(jpegBuffer, "image/jpeg");
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("accepts valid PNG buffer with correct magic bytes", () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(200).fill(0)]);
      const result = validateMealPhoto(pngBuffer, "image/png");
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe("image/png");
    });

    it("rejects spoofed image file with mismatching magic bytes", () => {
      const fakeJpeg = Buffer.from(
        "THIS IS AN EXECUTABLE SCRIPT NOT A REAL JPEG FILE CONTENT 1234567890 AND HAS SUFFICIENT LENGTH TO EXCEED MINIMUM MEDIA BYTES THRESHOLD"
      );
      expect(() => validateMealPhoto(fakeJpeg, "image/jpeg")).toThrow(MediaValidationError);
      expect(() => validateMealPhoto(fakeJpeg, "image/jpeg")).toThrow("Malformed or spoofed image detected");
    });

    it("rejects oversized image exceeding 5MB", () => {
      const hugeBuffer = Buffer.alloc(5.5 * 1024 * 1024);
      hugeBuffer[0] = 0xff;
      hugeBuffer[1] = 0xd8;
      hugeBuffer[2] = 0xff;

      expect(() => validateMealPhoto(hugeBuffer, "image/jpeg")).toThrow("exceeds maximum limit of 5 MB");
    });

    it("rejects unsupported MIME type (e.g. image/gif or application/pdf)", () => {
      const dummyBuffer = Buffer.alloc(500);
      expect(() => validateMealPhoto(dummyBuffer, "image/gif")).toThrow("Unsupported image type");
      expect(() => validateMealPhoto(dummyBuffer, "application/pdf")).toThrow("Unsupported image type");
    });
  });

  describe("Offline Fallback & Analyzer Execution", () => {
    it("returns realistic South Indian candidates in mock/offline mode", async () => {
      const sampleJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(0)]);
      const result = await analyzer.analyzeMealPhoto(sampleJpeg, "image/jpeg");

      expect(result.detectedItems.length).toBeGreaterThan(0);
      expect(result.disclaimer).toContain("Oil and hidden ingredients cannot be reliably measured");
      expect(result.detectedItems[0].rawFoodName).toBe("Cooked Ponni Rice");
      expect(result.detectedItems[0].estimatedQuantity).toBe(200);
      expect(result.detectedItems[0].unit).toBe("g");
    });
  });
});

import { z } from "zod";

/**
 * Strict Zod schema for individual food candidate items detected by Vision AI.
 * Mandatory constraints:
 * - Never claims 100% certainty.
 * - Confidence is categorized ("high" | "medium" | "low").
 * - Does NOT include authoritative nutrition fields (nutrition must come from database).
 */
export const VisionCandidateSchema = z.object({
  candidate: z.string().min(1, "Candidate food name is required").trim(),
  search_terms: z.array(z.string().trim()).default([]),
  estimated_quantity: z.number().positive("Estimated quantity must be greater than zero"),
  estimated_unit: z.string().min(1, "Estimated unit is required").trim(),
  estimated_gram_range: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().positive(),
    })
    .optional(),
  confidence: z.enum(["high", "medium", "low"]),
  assumptions: z.array(z.string().trim()).default([]),
  ambiguity_note: z.string().optional(),
});

export type VisionCandidate = z.infer<typeof VisionCandidateSchema>;

/**
 * Strict schema for the complete Vision AI output payload.
 */
export const VisionAnalysisResponseSchema = z.object({
  items: z.array(VisionCandidateSchema).default([]),
  overall_assumptions: z.array(z.string().trim()).default([]),
  suggested_recipes: z.array(z.string().trim()).default([]),
  disclaimer: z.string().default(
    "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving."
  ),
});

export type VisionAnalysisResponse = z.infer<typeof VisionAnalysisResponseSchema>;

/**
 * Strict schema for audio transcription result.
 */
export const VoiceTranscriptionResponseSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty").trim(),
  detected_language: z.enum(["en", "ta", "tanglish", "mixed"]).default("mixed"),
  confidence: z.enum(["high", "medium", "low"]).default("high"),
});

export type VoiceTranscriptionResponse = z.infer<typeof VoiceTranscriptionResponseSchema>;

/**
 * Strict schema for individual food item parsed from natural language or voice.
 */
export const ParsedFoodItemSchema = z.object({
  food_name: z.string().min(1, "Food name is required").trim(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unit: z.string().min(1, "Unit is required").trim(),
  cooking_state: z.enum(["cooked", "raw", "packaged", "unknown"]).default("cooked"),
  meal_type_hint: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  is_ambiguous: z.boolean().default(false),
  ambiguity_reason: z.string().optional(),
  assumptions: z.array(z.string().trim()).default([]),
});

export type ParsedFoodItem = z.infer<typeof ParsedFoodItemSchema>;

/**
 * Strict schema for the natural language food parser output.
 */
export const FoodParseResponseSchema = z.object({
  items: z.array(ParsedFoodItemSchema).default([]),
  unparsed_segments: z.array(z.string().trim()).default([]),
});

export type FoodParseResponse = z.infer<typeof FoodParseResponseSchema>;

/**
 * Client submission schema for batch confirming drafts to a meal.
 */
export const ConfirmDraftsSchema = z.object({
  mealLogId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]),
  items: z
    .array(
      z.object({
        foodId: z.string().optional(),
        recipeId: z.string().uuid().optional(),
        customFoodName: z.string().optional(),
        quantity: z.number().positive("Quantity must be greater than zero"),
        unit: z.string().min(1, "Unit is required"),
        provenance: z.enum(["ai_photo_estimate", "ai_voice_parse", "user_entered", "verified_database"]),
        portionAssumption: z.string().optional(),
        isEstimatedPortion: z.boolean().default(true),
      })
    )
    .min(1, "At least one item must be confirmed to log"),
});

export type ConfirmDraftsInput = z.infer<typeof ConfirmDraftsSchema>;

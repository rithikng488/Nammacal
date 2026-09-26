import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordAuditEvent } from "@/lib/audit/audit-service";
import type { AuditEventType, AuditEventSeverity } from "@/lib/supabase/types";

describe("Audit Events System Flows - Domain Coverage", () => {
  const mockInsert = vi.fn();
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      insert: (args: any) => {
        mockInsert(args);
        return {
          select: () => ({
            single: async () => ({
              data: { id: "evt-mock-id", ...args, created_at: new Date().toISOString() },
              error: null,
            }),
          }),
        };
      },
    }),
  } as any;

  beforeEach(() => {
    mockInsert.mockClear();
  });

  it("records food photo AI analysis flow (uploaded -> analyzed -> confirmed)", async () => {
    const userId = "user-nutrition-101";

    // 1. Food photo uploaded
    await recordAuditEvent(
      {
        eventType: "food_photo_uploaded",
        userId,
        entityType: "food_photo",
        entityId: "photo-001",
        metadata: {
          file_name: "lunch_thali.jpg",
          file_size_bytes: 1048576,
          mime_type: "image/jpeg",
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "food_photo_uploaded",
        user_id: userId,
        entity_type: "food_photo",
        entity_id: "photo-001",
        severity: "info",
      })
    );

    // 2. Food photo analyzed by AI
    await recordAuditEvent(
      {
        eventType: "food_photo_analyzed",
        userId,
        entityType: "food_photo",
        entityId: "photo-001",
        metadata: {
          detected_items: [
            { food_name: "Idli", quantity: 3, unit: "piece", confidence: 0.95 },
            { food_name: "Sambar", quantity: 1, unit: "bowl", confidence: 0.88 },
          ],
          ai_provider: "gemini",
          latency_ms: 1420,
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "food_photo_analyzed",
        metadata: expect.objectContaining({
          ai_provider: "gemini",
          latency_ms: 1420,
        }),
      })
    );

    // 3. User confirms photo draft into deterministic meal log
    await recordAuditEvent(
      {
        eventType: "food_photo_confirmed",
        userId,
        entityType: "meal_log",
        entityId: "meal-999",
        metadata: {
          source_photo_id: "photo-001",
          items_confirmed_count: 2,
          total_calories: 320,
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "food_photo_confirmed",
        entity_type: "meal_log",
        entity_id: "meal-999",
      })
    );
  });

  it("records voice logging flow (started -> transcribed -> confirmed)", async () => {
    const userId = "user-voice-202";

    // 1. Voice recording started
    await recordAuditEvent(
      {
        eventType: "voice_log_started",
        userId,
        entityType: "voice_log",
        metadata: { client: "web_microphone" },
      },
      mockSupabase
    );

    // 2. Voice log transcribed
    await recordAuditEvent(
      {
        eventType: "voice_log_transcribed",
        userId,
        entityType: "voice_log",
        metadata: {
          raw_transcript: "two dosas and one cup filter coffee",
          parsed_items: 2,
          latency_ms: 950,
        },
      },
      mockSupabase
    );

    // 3. User confirms voice log into meal
    await recordAuditEvent(
      {
        eventType: "voice_log_confirmed",
        userId,
        entityType: "meal_log",
        entityId: "meal-888",
        metadata: {
          meal_type: "breakfast",
          total_calories: 380,
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("records meal item modifications and deletions", async () => {
    const userId = "user-meal-303";

    await recordAuditEvent(
      {
        eventType: "meal_item_updated",
        userId,
        entityType: "meal_item",
        entityId: "item-456",
        metadata: {
          food_name: "Curd Rice",
          old_quantity: 1,
          new_quantity: 1.5,
          unit: "bowl",
        },
      },
      mockSupabase
    );

    await recordAuditEvent(
      {
        eventType: "meal_item_deleted",
        userId,
        entityType: "meal_item",
        entityId: "item-456",
        metadata: {
          food_name: "Curd Rice",
          meal_id: "meal-123",
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("records Health Connect sync flow with external deduplication events", async () => {
    const userId = "user-hc-404";

    // Health Connect connected
    await recordAuditEvent(
      {
        eventType: "health_connect_connected",
        userId,
        entityType: "health_integration",
        entityId: "hi-404",
      },
      mockSupabase
    );

    // Sync started
    await recordAuditEvent(
      {
        eventType: "health_connect_sync_started",
        userId,
        entityType: "health_connect_sync",
        metadata: { record_types: ["steps", "active_calories", "exercise_session"] },
      },
      mockSupabase
    );

    // Sync completed successfully
    await recordAuditEvent(
      {
        eventType: "health_connect_sync_completed",
        userId,
        entityType: "health_connect_sync",
        metadata: {
          synced_steps: 8450,
          synced_calories: 320,
          records_inserted: 3,
          records_deduplicated: 2,
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it("records lifestyle habit, water, weight, and recipe events", async () => {
    const userId = "user-lifestyle-505";

    // Weight logged
    await recordAuditEvent(
      {
        eventType: "weight_logged",
        userId,
        entityType: "weight_log",
        entityId: "wt-1",
        metadata: { weight_kg: 72.5 },
      },
      mockSupabase
    );

    // Water logged
    await recordAuditEvent(
      {
        eventType: "water_logged",
        userId,
        entityType: "water_log",
        entityId: "wtr-1",
        metadata: { amount_ml: 500 },
      },
      mockSupabase
    );

    // Habit completed
    await recordAuditEvent(
      {
        eventType: "habit_completed",
        userId,
        entityType: "habit",
        entityId: "hbt-1",
        metadata: { habit_name: "Morning Walk" },
      },
      mockSupabase
    );

    // Recipe created
    await recordAuditEvent(
      {
        eventType: "recipe_created",
        userId,
        entityType: "recipe",
        entityId: "rcp-1",
        metadata: { recipe_name: "Amma's Rasam", servings: 4 },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledTimes(4);
  });

  it("records screenshot detection event safely without capturing screen pixels", async () => {
    const userId = "user-screenshot-606";

    await recordAuditEvent(
      {
        eventType: "screenshot_detected",
        userId,
        entityType: "security",
        severity: "security",
        metadata: {
          platform: "android",
          detection_method: "Activity.ScreenCaptureCallback",
          pixels_captured: false, // Invariant: Zero screen capture / zero media projection
          gallery_scanned: false,
        },
      },
      mockSupabase
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "screenshot_detected",
        severity: "security",
        metadata: expect.objectContaining({
          pixels_captured: false,
          gallery_scanned: false,
        }),
      })
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  sanitizeAuditMetadata,
  hashIpAddress,
  recordAuditEvent,
  getAuditEvents,
  getAuditStats,
} from "@/lib/audit/audit-service";
import type { AdminAuditEvent } from "@/lib/supabase/types";

describe("Admin Audit Service - Data Sanitization & IP Hashing", () => {
  it("redacts sensitive authentication tokens, passwords, and API keys", () => {
    const rawMetadata = {
      user_id: "u123",
      email: "user@example.com",
      password: "SuperSecretPassword123!",
      token: "secret-token-xyz",
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
      authorization: "Bearer my-secret-jwt",
      api_key: "ai-provider-api-key-999",
      access_token: "tok_access_live",
      refresh_token: "tok_refresh_live",
      safe_data: "Keep this untouched",
      food_name: "Idli Sambar",
      calories: 250,
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata);

    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.jwt).toBe("[REDACTED]");
    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.api_key).toBe("[REDACTED]");
    expect(sanitized.access_token).toBe("[REDACTED]");
    expect(sanitized.refresh_token).toBe("[REDACTED]");
    expect(sanitized.safe_data).toBe("Keep this untouched");
    expect(sanitized.food_name).toBe("Idli Sambar");
    expect(sanitized.calories).toBe(250);
  });

  it("redacts raw binary data and large base64 media payloads", () => {
    const rawMetadata = {
      image_base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
      audio_base64: "data:audio/wav;base64,UklGR...",
      item_count: 3,
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata);

    expect(sanitized.image_base64).toBe("[BINARY_MEDIA_OMITTED]");
    expect(sanitized.audio_base64).toBe("[BINARY_MEDIA_OMITTED]");
    expect(sanitized.item_count).toBe(3);
  });

  it("recursively sanitizes deeply nested metadata objects and arrays", () => {
    const nestedMetadata = {
      event_context: {
        request_headers: {
          authorization: "Bearer secret-token",
          "x-api-key": "secret-key",
          "user-agent": "Mozilla/5.0",
        },
        payload: {
          user_credentials: {
            password: "nestedPassword!",
          },
          items: [
            { name: "Dosa", calories: 150 },
            { name: "Chutney", secret_token: "do-not-leak" },
          ],
        },
      },
    };

    const sanitized = sanitizeAuditMetadata(nestedMetadata);

    expect(sanitized.event_context.request_headers.authorization).toBe("[REDACTED]");
    expect(sanitized.event_context.request_headers["x-api-key"]).toBe("[REDACTED]");
    expect(sanitized.event_context.request_headers["user-agent"]).toBe("Mozilla/5.0");
    expect(sanitized.event_context.payload.user_credentials.password).toBe("[REDACTED]");
    expect(sanitized.event_context.payload.items[0]).toEqual({ name: "Dosa", calories: 150 });
    expect(sanitized.event_context.payload.items[1].name).toBe("Chutney");
    expect(sanitized.event_context.payload.items[1].secret_token).toBe("[REDACTED]");
  });

  it("deterministically hashes IP addresses with SHA-256 and privacy salt", () => {
    const ip = "192.168.1.50";
    const hash1 = hashIpAddress(ip);
    const hash2 = hashIpAddress(ip);

    expect(hash1).toBeTruthy();
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16); // 16-char truncated hex hash
    expect(hash1).not.toBe(ip); // Never leak raw IP
  });

  it("handles null, empty, or undefined IP strings safely", () => {
    expect(hashIpAddress(null)).toBeNull();
    expect(hashIpAddress(undefined)).toBeNull();
    expect(hashIpAddress("")).toBeNull();
    expect(hashIpAddress("127.0.0.1")).toBe("local");
  });
});

describe("Admin Audit Service - Fault Tolerance Invariant", () => {
  it("never throws or interrupts user operation when database audit insertion fails", async () => {
    // Mock Supabase client where insert throws an error
    const faultySupabase = {
      from: () => ({
        insert: () => {
          throw new Error("Supabase connection timeout during audit event insertion");
        },
      }),
    } as any;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Must resolve safely returning null without throwing
    const result = await recordAuditEvent(
      {
        eventType: "meal_created",
        userId: "user-123",
        entityType: "meal_log",
        severity: "info",
        metadata: { meal_type: "breakfast" },
      },
      faultySupabase
    );

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("gracefully records audit event when supabase client succeeds", async () => {
    let insertedRow: any = null;
    const mockSupabase = {
      from: (table: string) => ({
        insert: (data: any) => {
          expect(table).toBe("admin_audit_events");
          insertedRow = data;
          return {
            select: () => ({
              single: async () => ({
                data: { id: "evt-new-1", ...data, created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
      }),
    } as any;

    const result = await recordAuditEvent(
      {
        eventType: "food_photo_analyzed",
        userId: "user-456",
        actorUserId: "user-456",
        entityType: "food_photo",
        entityId: "photo-999",
        severity: "info",
        metadata: {
          detected_items: [{ name: "Idli", quantity: 2 }],
          password: "should_be_stripped",
        },
        ipAddress: "203.0.113.195",
        userAgent: "NammaCal Android / Capacitor",
      },
      mockSupabase
    );

    expect(result).toBeTruthy();
    expect(insertedRow).toBeTruthy();
    expect(insertedRow.event_type).toBe("food_photo_analyzed");
    expect(insertedRow.user_id).toBe("user-456");
    expect(insertedRow.entity_type).toBe("food_photo");
    expect(insertedRow.entity_id).toBe("photo-999");
    expect(insertedRow.metadata.password).toBe("[REDACTED]");
    expect(insertedRow.metadata.detected_items[0].name).toBe("Idli");
    expect(insertedRow.ip_hash).toBeTruthy();
    expect(insertedRow.user_agent_summary).toBe("NammaCal Android");
  });
});

describe("Admin Audit Service - Querying & Stats Aggregation", () => {
  it("fetches paginated audit events with applied filters", async () => {
    const mockAuditRecords: AdminAuditEvent[] = [
      {
        id: "evt-1",
        event_type: "meal_created",
        user_id: "user-1",
        actor_user_id: "user-1",
        entity_type: "meal_log",
        entity_id: "meal-1",
        severity: "info",
        metadata: { meal_type: "lunch" },
        ip_hash: "hash123",
        user_agent_summary: "Mozilla",
        created_at: "2026-09-27T00:00:00Z",
      },
      {
        id: "evt-2",
        event_type: "ai_error",
        user_id: "user-2",
        actor_user_id: "user-2",
        entity_type: "ai_vision",
        entity_id: null,
        severity: "error",
        metadata: { error: "Timeout" },
        ip_hash: "hash456",
        user_agent_summary: "Android",
        created_at: "2026-09-27T01:00:00Z",
      },
    ];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "admin_audit_events") {
          return {
            select: () => ({
              order: () => ({
                range: () => Promise.resolve({ data: mockAuditRecords, count: 2, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    { id: "user-1", email: "user1@example.com", full_name: "User One" },
                    { id: "user-2", email: "user2@example.com", full_name: "User Two" },
                  ],
                  error: null,
                }),
            }),
          };
        }
        return {} as any;
      },
    } as any;

    const result = await getAuditEvents({ page: 1, pageSize: 10 }, mockSupabase);

    expect(result.events).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.events[0].user_email).toBe("user1@example.com");
    expect(result.events[1].user_email).toBe("user2@example.com");
  });

  it("calculates dashboard overview stats correctly", async () => {
    const mockEvents: AdminAuditEvent[] = [
      {
        id: "1",
        event_type: "food_photo_analyzed",
        user_id: "u1",
        actor_user_id: "u1",
        entity_type: "food_photo",
        entity_id: "p1",
        severity: "info",
        metadata: {},
        ip_hash: null,
        user_agent_summary: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        event_type: "voice_log_transcribed",
        user_id: "u1",
        actor_user_id: "u1",
        entity_type: "voice_log",
        entity_id: "v1",
        severity: "info",
        metadata: {},
        ip_hash: null,
        user_agent_summary: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "3",
        event_type: "health_connect_sync_completed",
        user_id: "u2",
        actor_user_id: "u2",
        entity_type: "health_connect_sync",
        entity_id: "s1",
        severity: "info",
        metadata: {},
        ip_hash: null,
        user_agent_summary: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "4",
        event_type: "unauthorized_admin_access_attempt",
        user_id: "u3",
        actor_user_id: "u3",
        entity_type: "admin_endpoint",
        entity_id: null,
        severity: "security",
        metadata: {},
        ip_hash: null,
        user_agent_summary: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "5",
        event_type: "ai_error",
        user_id: "u1",
        actor_user_id: "u1",
        entity_type: "ai_vision",
        entity_id: null,
        severity: "error",
        metadata: {},
        ip_hash: null,
        user_agent_summary: null,
        created_at: new Date().toISOString(),
      },
    ];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "admin_audit_events") {
          return {
            select: () => ({
              gte: () => Promise.resolve({ data: mockEvents, error: null }),
              order: () => ({
                range: () => Promise.resolve({ data: mockEvents, count: 5, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        return {} as any;
      },
    } as any;

    const stats = await getAuditStats(mockSupabase);

    expect(stats.activeUsersToday).toBe(3); // u1, u2, u3
    expect(stats.foodUploadsToday).toBe(1);
    expect(stats.voiceLogsToday).toBe(1);
    expect(stats.healthConnectSyncsToday).toBe(1);
    expect(stats.securityEventsToday).toBe(1);
    expect(stats.errorsToday).toBe(1);
    expect(stats.recentActivityPreview).toHaveLength(5);
  });
});

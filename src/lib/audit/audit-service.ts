import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  AdminAuditEvent,
  AuditEventSeverity,
  AuditEventType,
} from "@/lib/supabase/types";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import crypto from "crypto";

export interface RecordAuditEventInput {
  eventType: AuditEventType | string;
  userId?: string | null;
  actorUserId?: string | null;
  entityType: string;
  entityId?: string | null;
  severity?: AuditEventSeverity;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEventFilters {
  eventType?: string;
  severity?: AuditEventSeverity;
  userId?: string;
  entityType?: string;
  startDate?: string; // ISO string or YYYY-MM-DD
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditEventWithUser extends AdminAuditEvent {
  user_email?: string | null;
  user_name?: string | null;
}

export interface AuditEventsResult {
  events: AuditEventWithUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditDashboardStats {
  activeUsersToday: number;
  foodUploadsToday: number;
  voiceLogsToday: number;
  mealsLoggedToday: number;
  healthConnectSyncsToday: number;
  errorsToday: number;
  securityEventsToday: number;
  recentActivityPreview: AuditEventWithUser[];
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /access_token/i,
  /refresh_token/i,
  /api[-_]?key/i,
  /service_?role/i,
  /bearer/i,
  /jwt/i,
];

/**
 * Pure function that sanitizes metadata by removing or redacting sensitive fields,
 * credentials, authentication tokens, and bulky binary/base64 strings.
 */
export function sanitizeAuditMetadata(metadata?: Record<string, any> | null): Record<string, any> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Check if key matches sensitive patterns
    const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitiveKey) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (value === null || value === undefined) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "string") {
      // Redact potential JWT tokens or data URIs
      if (value.startsWith("eyJh") && value.includes(".")) {
        sanitized[key] = "[REDACTED_JWT]";
      } else if (value.startsWith("data:image/") || value.startsWith("data:audio/")) {
        sanitized[key] = "[BINARY_MEDIA_OMITTED]";
      } else if (value.length > 2000) {
        sanitized[key] = value.slice(0, 2000) + "... [TRUNCATED]";
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditMetadata(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === "object" && item !== null) {
          return sanitizeAuditMetadata(item);
        }
        if (typeof item === "string" && item.length > 1000) {
          return item.slice(0, 1000) + "... [TRUNCATED]";
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Creates a privacy-preserving hash of an IP address.
 * Never stores raw IP addresses.
 */
export function hashIpAddress(ip?: string | null): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "::1" || trimmed === "127.0.0.1") {
    return "local";
  }
  const salt = process.env.IP_HASH_SALT || "nammacal_audit_salt";
  return crypto.createHash("sha256").update(`${trimmed}:${salt}`).digest("hex").slice(0, 16);
}

/**
 * Summarizes User Agent string for clean audit presentation.
 */
export function summarizeUserAgent(ua?: string | null): string | null {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (lower.includes("nammacal android") || lower.includes("capacitor")) {
    return "NammaCal Android";
  }
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) {
    return "Mobile Browser";
  }
  if (lower.includes("windows")) return "Windows Desktop";
  if (lower.includes("macintosh") || lower.includes("mac os")) return "macOS Desktop";
  if (lower.includes("linux")) return "Linux Desktop";
  return "Web Client";
}

/**
 * Authoritatively records an audit event in the admin_audit_events table.
 *
 * CRITICAL FAULT-TOLERANCE INVARIANT:
 * Audit logging failures must NEVER crash or roll back the primary user action!
 */
export async function recordAuditEvent(
  input: RecordAuditEventInput,
  client?: SupabaseClient<Database>
): Promise<AdminAuditEvent | null> {
  try {
    const supabase = client || (await createClient());
    const sanitizedMeta = sanitizeAuditMetadata(input.metadata);
    const ipHash = hashIpAddress(input.ipAddress);
    const uaSummary = summarizeUserAgent(input.userAgent);

    const { data, error } = await supabase
      .from("admin_audit_events")
      .insert({
        user_id: input.userId || null,
        actor_user_id: input.actorUserId || input.userId || null,
        event_type: input.eventType,
        entity_type: input.entityType,
        entity_id: input.entityId || null,
        severity: input.severity || "info",
        metadata: sanitizedMeta,
        ip_hash: ipHash,
        user_agent_summary: uaSummary,
      })
      .select()
      .single();

    if (error) {
      console.warn("Non-fatal: Failed to record audit event:", error.message);
      return null;
    }

    return data;
  } catch (err: unknown) {
    console.warn("Non-fatal audit logging exception:", (err as Error).message);
    return null;
  }
}

/**
 * Retrieves paginated audit events with server-side filters for Admin.
 * Verifies admin or owner permissions.
 */
export async function getAuditEvents(
  filters: AuditEventFilters = {},
  client?: SupabaseClient<Database>
): Promise<AuditEventsResult> {
  const supabase = client || (await createClient());
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("admin_audit_events")
    .select("*", { count: "exact" });

  if (filters.eventType) {
    query = query.eq("event_type", filters.eventType);
  }
  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to load audit events: ${error.message}`);
  }

  const rawEvents = data || [];
  const total = count || 0;

  // Enrich with user profile names and emails where available
  const userIds = Array.from(
    new Set(rawEvents.map((e) => e.user_id).filter(Boolean) as string[])
  );

  let profilesMap = new Map<string, { email: string; full_name: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profiles) {
      for (const p of profiles) {
        profilesMap.set(p.id, { email: p.email, full_name: p.full_name });
      }
    }
  }

  const enriched: AuditEventWithUser[] = rawEvents.map((evt) => {
    const prof = evt.user_id ? profilesMap.get(evt.user_id) : undefined;
    return {
      ...evt,
      user_email: prof?.email || null,
      user_name: prof?.full_name || null,
    };
  });

  return {
    events: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Calculates aggregated high-level KPIs for the Admin Overview.
 */
export async function getAuditStats(
  client?: SupabaseClient<Database>
): Promise<AuditDashboardStats> {
  const supabase = client || (await createClient());

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // 1. Fetch today's audit events
  const { data: todayEvents, error } = await supabase
    .from("admin_audit_events")
    .select("user_id, event_type, severity, created_at")
    .gte("created_at", todayIso);

  if (error) {
    throw new Error(`Failed to load audit stats: ${error.message}`);
  }

  const events = todayEvents || [];

  const uniqueUsersToday = new Set<string>();
  let foodUploadsToday = 0;
  let voiceLogsToday = 0;
  let mealsLoggedToday = 0;
  let healthConnectSyncsToday = 0;
  let errorsToday = 0;
  let securityEventsToday = 0;

  for (const e of events) {
    if (e.user_id) {
      uniqueUsersToday.add(e.user_id);
    }

    if (e.event_type.startsWith("food_photo_")) {
      foodUploadsToday++;
    } else if (e.event_type.startsWith("voice_log_")) {
      voiceLogsToday++;
    } else if (e.event_type === "meal_created" || e.event_type === "recipe_logged") {
      mealsLoggedToday++;
    } else if (e.event_type.startsWith("health_connect_sync_")) {
      healthConnectSyncsToday++;
    }

    if (e.severity === "error") {
      errorsToday++;
    } else if (e.severity === "security") {
      securityEventsToday++;
    }
  }

  // 2. Fetch 10 most recent activity items
  const recentResult = await getAuditEvents({ page: 1, pageSize: 10 }, supabase);

  return {
    activeUsersToday: uniqueUsersToday.size,
    foodUploadsToday,
    voiceLogsToday,
    mealsLoggedToday,
    healthConnectSyncsToday,
    errorsToday,
    securityEventsToday,
    recentActivityPreview: recentResult.events,
  };
}

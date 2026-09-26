import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncHealthConnectData,
  type HealthConnectSyncPayload,
} from "@/lib/integrations/health-connect/health-connect-sync-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let supabaseClient: any = null;

  try {
    const supabase = await createClient();
    supabaseClient = supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    const body: HealthConnectSyncPayload = await request.json();

    // Audit: Log sync started
    await recordAuditEvent(
      {
        eventType: "health_connect_sync_started",
        userId: user.id,
        entityType: "health_connect",
        severity: "info",
        metadata: {
          days_payload_count: body.days?.length || 0,
          sessions_payload_count: body.sessions?.length || 0,
        },
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    const result = await syncHealthConnectData(user.id, body, supabase);

    // Audit: Log sync completed
    await recordAuditEvent(
      {
        eventType: result.success ? "health_connect_sync_completed" : "health_connect_sync_failed",
        userId: user.id,
        entityType: "health_connect",
        severity: result.success ? "info" : "error",
        metadata: {
          synced_days: result.syncedDaysCount,
          synced_sessions: result.syncedSessionsCount,
          skipped_sessions: result.skippedSessionsCount,
          errors: result.errors,
        },
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    if (userId && supabaseClient) {
      await recordAuditEvent(
        {
          eventType: "health_connect_sync_failed",
          userId,
          entityType: "health_connect",
          severity: "error",
          metadata: {
            error_message: (err as Error).message,
          },
          userAgent: request.headers.get("user-agent"),
        },
        supabaseClient
      );
    }

    return NextResponse.json(
      { error: (err as Error).message || "Failed to sync Health Connect data." },
      { status: 500 }
    );
  }
}

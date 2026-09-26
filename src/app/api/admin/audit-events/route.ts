import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import { getAuditEvents, recordAuditEvent, type AuditEventFilters } from "@/lib/audit/audit-service";
import type { AuditEventSeverity } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || !isAdminOrOwner(profile.role) || profile.status !== "active") {
      // Record unauthorized admin access attempt as a security audit event
      await recordAuditEvent(
        {
          eventType: "unauthorized_admin_access_attempt",
          userId: user.id,
          actorUserId: user.id,
          entityType: "admin_endpoint",
          entityId: "/api/admin/audit-events",
          severity: "security",
          metadata: { attempted_role: profile?.role || "none", status: profile?.status || "unknown" },
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );

      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType") || undefined;
    const severity = (searchParams.get("severity") as AuditEventSeverity) || undefined;
    const userId = searchParams.get("userId") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const filters: AuditEventFilters = {
      eventType,
      severity,
      userId,
      entityType,
      startDate,
      endDate,
      search,
      page,
      pageSize,
    };

    const result = await getAuditEvents(filters, supabase);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("GET /api/admin/audit-events error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

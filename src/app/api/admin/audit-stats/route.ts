import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import { getAuditStats, recordAuditEvent } from "@/lib/audit/audit-service";

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
      await recordAuditEvent(
        {
          eventType: "unauthorized_admin_access_attempt",
          userId: user.id,
          actorUserId: user.id,
          entityType: "admin_endpoint",
          entityId: "/api/admin/audit-stats",
          severity: "security",
          metadata: { attempted_role: profile?.role || "none" },
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );

      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const stats = await getAuditStats(supabase);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("GET /api/admin/audit-stats error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

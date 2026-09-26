import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import { getAuditEvents, recordAuditEvent } from "@/lib/audit/audit-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
          entityId: "/api/admin/users/[id]",
          severity: "security",
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );

      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: targetUserId } = await params;

    // 1. Fetch user profile
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // 2. Fetch user's audit events
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "30", 10);

    const userEvents = await getAuditEvents(
      {
        userId: targetUserId,
        page,
        pageSize,
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      user: targetUser,
      timeline: userEvents,
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

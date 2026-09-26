import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import { getAuditEvents, recordAuditEvent } from "@/lib/audit/audit-service";

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
          entityId: "/api/admin/media-events",
          severity: "security",
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );

      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Fetch food photo analysis audit events
    const result = await getAuditEvents(
      {
        entityType: "food_photo",
        userId,
        startDate,
        endDate,
        page,
        pageSize,
      },
      supabase
    );

    // Generate signed URLs if media is retained
    const mediaRetentionDays = parseInt(process.env.MEDIA_RETENTION_DAYS || "0", 10);
    const eventsWithSignedUrls = await Promise.all(
      result.events.map(async (evt) => {
        let signedUrl: string | null = null;
        const mediaPath = evt.metadata?.storage_path;

        if (mediaRetentionDays > 0 && mediaPath && typeof mediaPath === "string") {
          try {
            const { data: urlData } = await supabase.storage
              .from("food-analysis-media")
              .createSignedUrl(mediaPath, 300); // 5 minutes expiration
            signedUrl = urlData?.signedUrl || null;
          } catch {
            signedUrl = null;
          }
        }

        return {
          ...evt,
          signedUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: eventsWithSignedUrls,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("GET /api/admin/media-events error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

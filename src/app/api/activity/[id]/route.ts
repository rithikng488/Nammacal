import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateActivityLog, deleteActivityLog, type UpdateActivityInput } from "@/lib/activity/activity-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export async function PATCH(
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const input: UpdateActivityInput = {};
    if (body.activityType !== undefined) input.activityType = body.activityType;
    if (body.durationMinutes !== undefined) input.durationMinutes = Number(body.durationMinutes);
    if (body.intensity !== undefined) input.intensity = body.intensity;
    if (body.distanceKm !== undefined) input.distanceKm = body.distanceKm !== null ? Number(body.distanceKm) : null;
    if (body.steps !== undefined) input.steps = body.steps !== null ? Number(body.steps) : null;
    if (body.note !== undefined) input.note = body.note;

    const updated = await updateActivityLog(user.id, id, input, supabase);

    // Audit: Log activity updated
    await recordAuditEvent(
      {
        eventType: "activity_updated",
        userId: user.id,
        entityType: "activity_log",
        entityId: id,
        severity: "info",
        metadata: {
          activity_type: updated.activity_type,
          duration_minutes: updated.duration_minutes,
          calories_burned: updated.calories_burned,
        },
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      activity: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update activity log." },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteActivityLog(user.id, id, supabase);

    // Audit: Log activity deleted
    await recordAuditEvent(
      {
        eventType: "activity_deleted",
        userId: user.id,
        entityType: "activity_log",
        entityId: id,
        severity: "info",
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      message: "Activity log deleted successfully.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete activity log." },
      { status: 400 }
    );
  }
}

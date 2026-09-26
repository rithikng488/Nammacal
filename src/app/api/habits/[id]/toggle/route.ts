import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toggleHabitCompletion } from "@/lib/habits/habit-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export async function POST(
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
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional for toggle
    }

    const date = body?.date || undefined;
    const completed = body?.completed !== undefined ? Boolean(body.completed) : undefined;
    const note = body?.note || null;

    const log = await toggleHabitCompletion(user.id, id, date, completed, note, supabase);

    if (log && log.completed) {
      await recordAuditEvent(
        {
          eventType: "habit_completed",
          userId: user.id,
          entityType: "habit_log",
          entityId: log.id,
          severity: "info",
          metadata: {
            habit_id: id,
            logged_date: log.logged_date,
          },
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );
    }

    return NextResponse.json({
      success: true,
      log,
      completed: log ? log.completed : false,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to toggle habit completion." },
      { status: 400 }
    );
  }
}

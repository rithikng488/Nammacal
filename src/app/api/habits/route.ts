import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createHabit,
  getUserHabitsWithTodayStatus,
  type CreateHabitInput,
} from "@/lib/habits/habit-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const habits = await getUserHabitsWithTodayStatus(user.id, date, supabase);

    return NextResponse.json({
      success: true,
      habits,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load habits." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input: CreateHabitInput = {
      name: body.name,
      description: body.description,
      frequency: body.frequency,
    };

    const habit = await createHabit(user.id, input, supabase);

    // Audit: Log habit creation
    await recordAuditEvent(
      {
        eventType: "habit_created",
        userId: user.id,
        entityType: "habit",
        entityId: habit.id,
        severity: "info",
        metadata: {
          habit_name: habit.name,
          frequency: habit.frequency,
        },
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      habit,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create habit." },
      { status: 400 }
    );
  }
}

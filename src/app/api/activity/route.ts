import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, getActivityHistory, type CreateActivityInput } from "@/lib/activity/activity-service";

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
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const history = await getActivityHistory(user.id, { limit, startDate, endDate }, supabase);

    return NextResponse.json({
      success: true,
      activities: history,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to retrieve activity history." },
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
    const input: CreateActivityInput = {
      activityType: body.activityType,
      durationMinutes: Number(body.durationMinutes),
      intensity: body.intensity,
      distanceKm: body.distanceKm !== undefined && body.distanceKm !== null ? Number(body.distanceKm) : null,
      steps: body.steps !== undefined && body.steps !== null ? Number(body.steps) : null,
      loggedAt: body.loggedAt,
      note: body.note,
      source: body.source || "manual",
    };

    const activity = await logActivity(user.id, input, supabase);

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to log activity." },
      { status: 400 }
    );
  }
}

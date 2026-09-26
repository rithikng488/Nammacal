import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logDailySteps } from "@/lib/activity/activity-service";

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
    const steps = Number(body.steps);
    const date = body.date || undefined;
    const source = body.source || "manual";

    const summary = await logDailySteps(user.id, steps, date, source, supabase);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to log daily steps." },
      { status: 400 }
    );
  }
}

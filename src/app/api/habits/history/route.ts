import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHabitHistory } from "@/lib/habits/habit-service";

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
    const habitId = searchParams.get("habitId");
    const days = searchParams.get("days") ? parseInt(searchParams.get("days")!, 10) : 30;

    if (!habitId) {
      return NextResponse.json({ error: "habitId query parameter is required." }, { status: 400 });
    }

    const history = await getHabitHistory(user.id, habitId, days, supabase);

    return NextResponse.json({
      success: true,
      ...history,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load habit history." },
      { status: 500 }
    );
  }
}

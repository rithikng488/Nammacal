import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeightTrend } from "@/lib/weight/weight-service";

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
    const daysParam = parseInt(searchParams.get("days") || "30", 10);
    const validDays = [7, 30, 90, 180, 365].includes(daysParam) ? daysParam : 30;

    const trend = await getWeightTrend(user.id, validDays, supabase);

    return NextResponse.json({
      success: true,
      trend,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load weight trend." },
      { status: 500 }
    );
  }
}

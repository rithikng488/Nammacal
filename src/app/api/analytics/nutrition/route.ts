import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNutritionAnalytics } from "@/lib/analytics/nutrition-analytics-service";

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
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const validDays = [7, 14, 30, 90].includes(daysParam) ? daysParam : 7;

    const analytics = await getNutritionAnalytics(user.id, validDays, supabase);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load nutrition analytics." },
      { status: 500 }
    );
  }
}

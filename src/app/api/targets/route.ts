import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserTargets, updateUserTargets } from "@/lib/targets/target-service";
import { z } from "zod";

const TargetUpdateSchema = z.object({
  dailyCalories: z.number().min(800).max(10000).optional(),
  dailyProteinG: z.number().min(20).max(500).optional(),
  dailyCarbsG: z.number().min(20).max(1000).optional(),
  dailyFatG: z.number().min(10).max(300).optional(),
  dailyFiberG: z.number().min(5).max(150).optional(),
  dailyWaterMl: z.number().min(500).max(10000).optional(),
  dailySteps: z.number().min(1000).max(50000).optional(),
});

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

    const targets = await getUserTargets(user.id, supabase);
    return NextResponse.json({ success: true, targets });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load targets." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const parsed = TargetUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid target values.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateUserTargets(user.id, parsed.data, supabase);

    return NextResponse.json({
      success: true,
      message: "Daily nutrition targets updated successfully.",
      targets: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update targets." },
      { status: 500 }
    );
  }
}

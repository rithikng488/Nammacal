import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getWeightHistory,
  logWeight,
  WeightValidationError,
} from "@/lib/weight/weight-service";
import { z } from "zod";

const LogWeightSchema = z.object({
  weightKg: z.number().min(20).max(400),
  loggedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  note: z.string().max(500).optional().nullable(),
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const history = await getWeightHistory(
      user.id,
      { limit, startDate, endDate },
      supabase
    );

    return NextResponse.json({ success: true, history });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load weight history." },
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
    const parsed = LogWeightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid weight data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const logged = await logWeight(
      user.id,
      {
        weightKg: parsed.data.weightKg,
        loggedAt: parsed.data.loggedAt,
        note: parsed.data.note,
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      message: `Weight recorded: ${logged.weight_kg} kg`,
      weightLog: logged,
    });
  } catch (err: unknown) {
    if (err instanceof WeightValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save weight entry." },
      { status: 500 }
    );
  }
}

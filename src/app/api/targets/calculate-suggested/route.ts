import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateSuggestedTargets } from "@/lib/targets/target-service";
import { z } from "zod";

const BiometricSchema = z.object({
  weightKg: z.number().min(20).max(350),
  heightCm: z.number().min(80).max(250),
  age: z.number().min(12).max(110),
  gender: z.enum(["male", "female", "other"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active", "extra_active"]),
  goal: z.enum(["lose_weight", "maintain", "gain_muscle"]),
});

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
    const parsed = BiometricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid biometric inputs.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = calculateSuggestedTargets(parsed.data);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to calculate suggested targets." },
      { status: 500 }
    );
  }
}

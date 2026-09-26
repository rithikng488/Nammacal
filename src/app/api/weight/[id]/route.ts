import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateWeightLog,
  deleteWeightLog,
  WeightValidationError,
} from "@/lib/weight/weight-service";
import { z } from "zod";

const UpdateWeightSchema = z.object({
  weightKg: z.number().min(20).max(400).optional(),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateWeightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid weight data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateWeightLog(user.id, id, parsed.data, supabase);

    return NextResponse.json({
      success: true,
      message: "Weight entry updated successfully.",
      weightLog: updated,
    });
  } catch (err: unknown) {
    if (err instanceof WeightValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update weight entry." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteWeightLog(user.id, id, supabase);

    return NextResponse.json({
      success: true,
      message: "Weight entry deleted successfully.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete weight entry." },
      { status: 500 }
    );
  }
}

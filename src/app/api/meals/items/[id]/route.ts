import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateMealItemQuantity,
  deleteMealItem,
} from "@/lib/meals/meal-service";
import { z } from "zod";

const UpdateMealItemSchema = z.object({
  quantity: z.number().positive("Quantity must be greater than zero"),
  unit: z.string().min(1).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/meals/items/[id]
 * Updates a logged meal item's portion quantity or unit, triggering deterministic recalculation.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ITEM_ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = UpdateMealItemSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedItem = await updateMealItemQuantity(
      user.id,
      id,
      parseResult.data,
      supabase
    );

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update item";
    console.error("Error updating meal item:", error);
    return NextResponse.json({ error: "UPDATE_MEAL_ITEM_FAILED", message }, { status: 400 });
  }
}

/**
 * DELETE /api/meals/items/[id]
 * Deletes a logged meal item owned by the authenticated user.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "MISSING_ITEM_ID" }, { status: 400 });
    }

    await deleteMealItem(user.id, id, supabase);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete item";
    console.error("Error deleting meal item:", error);
    return NextResponse.json({ error: "DELETE_MEAL_ITEM_FAILED", message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRecipeById,
  updateRecipe,
  deleteRecipe,
} from "@/lib/recipes/recipe-service";
import { z } from "zod";

const RecipeIngredientSchema = z.object({
  foodId: z.string().optional().nullable(),
  quantity: z.number().positive("Ingredient quantity must be greater than zero"),
  unit: z.string().min(1, "Ingredient unit is required"),
  notes: z.string().optional().nullable(),
  ingredientOrder: z.number().int().optional(),
});

const UpdateRecipeSchema = z.object({
  name: z.string().trim().min(1, "Recipe name is required").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  finalCookedWeightG: z
    .number()
    .positive("Final cooked weight must be greater than zero")
    .optional()
    .nullable(),
  servings: z.number().positive("Servings must be greater than zero").default(1),
  ingredients: z
    .array(RecipeIngredientSchema)
    .min(1, "Recipe must contain at least one ingredient"),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recipes/[id]
 * Retrieves a single recipe with all its ingredient snapshots and calculated nutrition.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    const recipe = await getRecipeById(user.id, id, supabase);

    return NextResponse.json({
      success: true,
      recipe,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Recipe not found";
    return NextResponse.json({ error: "RECIPE_NOT_FOUND", message }, { status: 404 });
  }
}

/**
 * PATCH /api/recipes/[id]
 * Updates a recipe and recalculates all nutrition values authoritatively on the server.
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
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = UpdateRecipeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedRecipe = await updateRecipe(user.id, id, parseResult.data, supabase);

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update recipe";
    console.error("Error updating recipe:", error);
    return NextResponse.json({ error: "UPDATE_RECIPE_FAILED", message }, { status: 400 });
  }
}

/**
 * DELETE /api/recipes/[id]
 * Deletes a recipe owned by the authenticated user.
 * Historical meal logs are preserved via ON DELETE SET NULL.
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
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }

    await deleteRecipe(user.id, id, supabase);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete recipe";
    console.error("Error deleting recipe:", error);
    return NextResponse.json({ error: "DELETE_RECIPE_FAILED", message }, { status: 400 });
  }
}

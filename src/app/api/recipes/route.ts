import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRecipes, createRecipe } from "@/lib/recipes/recipe-service";
import { z } from "zod";

const RecipeIngredientSchema = z.object({
  foodId: z.string().optional().nullable(),
  quantity: z.number().positive("Ingredient quantity must be greater than zero"),
  unit: z.string().min(1, "Ingredient unit is required"),
  notes: z.string().optional().nullable(),
  ingredientOrder: z.number().int().optional(),
});

const CreateRecipeSchema = z.object({
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

/**
 * GET /api/recipes
 * Retrieves all private recipes created by the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const recipes = await getUserRecipes(user.id, supabase);

    return NextResponse.json({
      success: true,
      count: recipes.length,
      recipes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error fetching recipes:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message }, { status: 500 });
  }
}

/**
 * POST /api/recipes
 * Creates a new recipe with authoritative server-side nutrition calculation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = CreateRecipeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const recipe = await createRecipe(user.id, parseResult.data, supabase);

    return NextResponse.json(
      {
        success: true,
        recipe,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create recipe";
    console.error("Error creating recipe:", error);
    return NextResponse.json({ error: "CREATE_RECIPE_FAILED", message }, { status: 400 });
  }
}

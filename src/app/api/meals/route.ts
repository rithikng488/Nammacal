import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyMeals,
  addFoodToMeal,
  normalizeDateString,
} from "@/lib/meals/meal-service";
import { z } from "zod";

const AddMealItemSchema = z
  .object({
    mealLogId: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]).optional(),
    foodId: z.string().optional(),
    food: z.any().optional(),
    recipeId: z.string().optional(),
    customFood: z
      .object({
        name: z.string().min(1),
        state: z.enum(["raw", "cooked", "packaged"]),
        calories: z.number().nonnegative(),
        protein: z.number().nonnegative(),
        carbs: z.number().nonnegative(),
        fat: z.number().nonnegative(),
        fiber: z.number().nonnegative().optional(),
        sugar: z.number().nonnegative().nullable().optional(),
        sodium_mg: z.number().nonnegative().nullable().optional(),
      })
      .optional(),
    quantity: z.number().positive("Quantity must be greater than zero"),
    unit: z.string().min(1, "Unit is required"),
  })
  .refine((data) => data.mealLogId || (data.date && data.mealType), {
    message: "Either mealLogId or both date and mealType must be specified",
  })
  .refine((data) => data.foodId || data.food || data.recipeId || data.customFood, {
    message: "Either foodId, food object, recipeId, or customFood must be specified",
  });

/**
 * GET /api/meals?date=YYYY-MM-DD
 * Retrieves daily meals, items, totals, and remaining targets for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const requestedDate = searchParams.get("date") || normalizeDateString(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return NextResponse.json(
        { error: "INVALID_DATE_FORMAT", message: "Date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const timeline = await getDailyMeals(user.id, requestedDate, supabase);

    return NextResponse.json({
      success: true,
      timeline,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error fetching daily meals:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message }, { status: 500 });
  }
}

/**
 * POST /api/meals
 * Logs a food item into a meal container with verified deterministic calculation.
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
    const parseResult = AddMealItemSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newItem = await addFoodToMeal(user.id, parseResult.data, supabase);

    return NextResponse.json(
      {
        success: true,
        item: newItem,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to log meal item";
    console.error("Error adding meal item:", error);
    return NextResponse.json({ error: "ADD_MEAL_FAILED", message }, { status: 400 });
  }
}

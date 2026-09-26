import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateNutrition, NutritionCalculationError } from "@/lib/nutrition/calc-engine";
import { getFoodById } from "@/lib/nutrition/food-service";
import type { Food } from "@/lib/supabase/types";
import { z } from "zod";

const CalculateNutritionSchema = z.object({
  foodId: z.string().min(1, "foodId is required"),
  quantity: z.number().positive("Quantity must be strictly greater than zero"),
  unit: z.string().trim().min(1, "Unit is required"),
});

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
    const parseResult = CalculateNutritionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "INVALID_PARAMETERS", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { foodId, quantity, unit } = parseResult.data;

    // Check seed database or database for custom food
    let food: Food | null = getFoodById(foodId);
    if (!food) {
      try {
        const { data } = await supabase
          .from("foods")
          .select("*")
          .eq("id", foodId)
          .single();
        food = data;
      } catch {
        food = null;
      }
    }

    if (!food) {
      return NextResponse.json(
        { error: "FOOD_NOT_FOUND", message: `Food with ID '${foodId}' was not found.` },
        { status: 404 }
      );
    }

    const calculation = calculateNutrition({ food, quantity, unit });

    return NextResponse.json({
      success: true,
      calculation,
    });
  } catch (error) {
    if (error instanceof NutritionCalculationError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("Nutrition calculation error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

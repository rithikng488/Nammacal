import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDraftsSchema } from "@/lib/ai/schemas";
import {
  getOrCreateMealLog,
  addFoodToMeal,
  getDailyMeals,
  normalizeDateString,
} from "@/lib/meals/meal-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";
import type { MealItem } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ConfirmDraftsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, mealType, items } = parsed.data;
    const targetDate = normalizeDateString(date || new Date());

    // 1. Get or create the meal container
    const mealLog = await getOrCreateMealLog(user.id, targetDate, mealType, supabase);

    // 2. Authoritatively log each confirmed item using the existing meal service
    const savedItems: MealItem[] = [];

    for (const item of items) {
      const saved = await addFoodToMeal(
        user.id,
        {
          mealLogId: mealLog.id,
          foodId: item.foodId,
          recipeId: item.recipeId,
          customFood:
            !item.foodId && !item.recipeId && item.customFoodName
              ? {
                  name: item.customFoodName,
                  state: "cooked",
                  calories: 100, // placeholder if user confirmed generic custom food
                  protein: 2,
                  carbs: 15,
                  fat: 2,
                }
              : undefined,
          quantity: item.quantity,
          unit: item.unit,
          provenance: item.provenance,
          portionAssumption: item.portionAssumption || null,
          isEstimatedPortion: item.isEstimatedPortion,
        },
        supabase
      );

      savedItems.push(saved);
    }

    // Determine event types from provenance
    const hasPhoto = items.some((i) => i.provenance === "ai_photo_estimate");
    const hasVoice = items.some((i) => i.provenance === "ai_voice_parse");

    if (hasPhoto) {
      await recordAuditEvent(
        {
          eventType: "food_photo_confirmed",
          userId: user.id,
          entityType: "food_photo",
          entityId: mealLog.id,
          severity: "info",
          metadata: {
            meal_log_id: mealLog.id,
            meal_type: mealType,
            confirmed_items_count: items.filter((i) => i.provenance === "ai_photo_estimate").length,
          },
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );
    }

    if (hasVoice) {
      await recordAuditEvent(
        {
          eventType: "voice_log_confirmed",
          userId: user.id,
          entityType: "voice_log",
          entityId: mealLog.id,
          severity: "info",
          metadata: {
            meal_log_id: mealLog.id,
            meal_type: mealType,
            confirmed_items_count: items.filter((i) => i.provenance === "ai_voice_parse").length,
          },
          userAgent: request.headers.get("user-agent"),
        },
        supabase
      );
    }

    // 3. Return updated timeline
    const updatedTimeline = await getDailyMeals(user.id, targetDate, supabase);

    return NextResponse.json({
      success: true,
      message: `Successfully logged ${savedItems.length} item(s) to ${mealType}.`,
      savedItems,
      timeline: updatedTimeline,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to confirm and log meal items." },
      { status: 500 }
    );
  }
}

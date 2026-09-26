import { createClient } from "@/lib/supabase/server";
import { getFoodById } from "@/lib/nutrition/food-service";
import { calculateNutrition, type CalculatedNutrition } from "@/lib/nutrition/calc-engine";
import type {
  Food,
  FoodState,
  MealLog,
  MealItem,
  MealType,
  Profile,
  DataProvenance,
} from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type MealWithItems = {
  id: string;
  userId: string;
  logDate: string;
  mealType: MealType;
  mealName: string | null;
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
};

export type DailyNutritionalSummary = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium_mg: number;
  total_weight_g: number;
};

export type DailyTimeline = {
  date: string; // YYYY-MM-DD
  meals: MealWithItems[];
  totals: DailyNutritionalSummary;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water_ml: number;
    steps: number;
    remainingCalories: number;
    remainingProtein: number;
    remainingCarbs: number;
    remainingFat: number;
    remainingFiber: number;
  };
};

export type AddMealItemInput = {
  mealLogId?: string;
  date?: string; // YYYY-MM-DD
  mealType?: MealType;
  foodId?: string;
  food?: Food;
  customFood?: {
    name: string;
    state: FoodState;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number | null;
    sodium_mg?: number | null;
  };
  quantity: number;
  unit: string;
};

export type UpdateMealItemInput = {
  quantity: number;
  unit?: string;
};

export const STANDARD_MEAL_TYPES: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

/**
 * Normalizes a date or date string into YYYY-MM-DD format.
 */
export function normalizeDateString(dateInput: Date | string): string {
  if (typeof dateInput === "string") {
    // If it's already YYYY-MM-DD
    const match = dateInput.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Rounds a number to a specified number of decimal places.
 */
export function roundToDecimals(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Pure calculation helper to aggregate daily totals and target comparisons.
 */
export function calculateDailyTotals(
  meals: MealWithItems[],
  profileTargets?: Partial<Profile> | null
): {
  totals: DailyNutritionalSummary;
  targets: DailyTimeline["targets"];
} {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sugar = 0;
  let sodium_mg = 0;
  let total_weight_g = 0;

  for (const meal of meals) {
    for (const item of meal.items) {
      calories += item.calories || 0;
      protein += item.protein || 0;
      carbs += item.carbs || 0;
      fat += item.fat || 0;
      fiber += item.fiber || 0;
      sugar += item.sugar || 0;
      sodium_mg += item.sodium_mg || 0;
      total_weight_g += item.gram_weight || 0;
    }
  }

  const totals: DailyNutritionalSummary = {
    calories: Math.round(calories),
    protein: roundToDecimals(protein, 1),
    carbs: roundToDecimals(carbs, 1),
    fat: roundToDecimals(fat, 1),
    fiber: roundToDecimals(fiber, 1),
    sugar: roundToDecimals(sugar, 1),
    sodium_mg: roundToDecimals(sodium_mg, 1),
    total_weight_g: roundToDecimals(total_weight_g, 1),
  };

  const targetCal = profileTargets?.daily_calorie_target || 2000;
  const targetProtein = profileTargets?.daily_protein_target || 100;
  const targetCarbs = profileTargets?.daily_carb_target || 250;
  const targetFat = profileTargets?.daily_fat_target || 65;
  const targetFiber = profileTargets?.daily_fiber_target || 30;
  const targetWater = profileTargets?.daily_water_ml_target || 3000;
  const targetSteps = profileTargets?.daily_step_target || 8000;

  const targets = {
    calories: targetCal,
    protein: targetProtein,
    carbs: targetCarbs,
    fat: targetFat,
    fiber: targetFiber,
    water_ml: targetWater,
    steps: targetSteps,
    remainingCalories: Math.max(0, targetCal - totals.calories),
    remainingProtein: Math.max(0, roundToDecimals(targetProtein - totals.protein, 1)),
    remainingCarbs: Math.max(0, roundToDecimals(targetCarbs - totals.carbs, 1)),
    remainingFat: Math.max(0, roundToDecimals(targetFat - totals.fat, 1)),
    remainingFiber: Math.max(0, roundToDecimals(targetFiber - totals.fiber, 1)),
  };

  return { totals, targets };
}

/**
 * Finds or creates a meal_log container for a given user, date, and meal type.
 */
export async function getOrCreateMealLog(
  userId: string,
  date: string,
  mealType: MealType,
  client?: SupabaseClient<Database>
): Promise<MealLog> {
  const supabase = client || (await createClient());
  const formattedDate = normalizeDateString(date);

  // 1. Check if the meal log already exists
  const { data: existing, error: selectError } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", formattedDate)
    .eq("meal_type", mealType)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to query meal log: ${selectError.message}`);
  }

  if (existing) {
    return existing;
  }

  // 2. Insert new meal log
  const { data: inserted, error: insertError } = await supabase
    .from("meal_logs")
    .insert({
      user_id: userId,
      log_date: formattedDate,
      meal_type: mealType,
    })
    .select()
    .single();

  if (insertError) {
    // Handle potential concurrent insert race condition gracefully
    if (insertError.code === "23505") {
      const { data: retryData } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", formattedDate)
        .eq("meal_type", mealType)
        .single();
      if (retryData) return retryData;
    }
    throw new Error(`Failed to create meal log: ${insertError.message}`);
  }

  return inserted;
}

/**
 * Retrieves the daily meals timeline with all meal sections, items, and nutritional summary.
 */
export async function getDailyMeals(
  userId: string,
  date: string,
  client?: SupabaseClient<Database>
): Promise<DailyTimeline> {
  const supabase = client || (await createClient());
  const formattedDate = normalizeDateString(date);

  // 1. Fetch user profile for targets
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  // 2. Fetch all meal logs for this user on this date
  const { data: mealLogs, error: logsError } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", formattedDate);

  if (logsError) {
    throw new Error(`Failed to load meal logs: ${logsError.message}`);
  }

  const logs = mealLogs || [];
  const logIds = logs.map((l) => l.id);

  // 3. Fetch all meal items belonging to these meal logs
  let mealItems: MealItem[] = [];
  if (logIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("meal_items")
      .select("*")
      .eq("user_id", userId)
      .in("meal_log_id", logIds)
      .order("created_at", { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to load meal items: ${itemsError.message}`);
    }
    mealItems = items || [];
  }

  // 4. Construct canonical list of meals (Breakfast, Lunch, Dinner, Snack + any Other)
  const existingMap = new Map<MealType, MealLog>();
  const otherLogs: MealLog[] = [];

  for (const log of logs) {
    if (STANDARD_MEAL_TYPES.includes(log.meal_type)) {
      existingMap.set(log.meal_type, log);
    } else {
      otherLogs.push(log);
    }
  }

  const structuredMeals: MealWithItems[] = [];

  for (const mealType of STANDARD_MEAL_TYPES) {
    const existingLog = existingMap.get(mealType);
    const logId = existingLog?.id || "";
    const items = logId ? mealItems.filter((it) => it.meal_log_id === logId) : [];

    const totalCalories = Math.round(items.reduce((acc, it) => acc + (it.calories || 0), 0));
    const totalProtein = roundToDecimals(items.reduce((acc, it) => acc + (it.protein || 0), 0), 1);
    const totalCarbs = roundToDecimals(items.reduce((acc, it) => acc + (it.carbs || 0), 0), 1);
    const totalFat = roundToDecimals(items.reduce((acc, it) => acc + (it.fat || 0), 0), 1);
    const totalFiber = roundToDecimals(items.reduce((acc, it) => acc + (it.fiber || 0), 0), 1);

    structuredMeals.push({
      id: logId,
      userId,
      logDate: formattedDate,
      mealType,
      mealName: existingLog?.meal_name || null,
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
    });
  }

  // Add any custom 'other' meals
  for (const log of otherLogs) {
    const items = mealItems.filter((it) => it.meal_log_id === log.id);
    structuredMeals.push({
      id: log.id,
      userId,
      logDate: formattedDate,
      mealType: log.meal_type,
      mealName: log.meal_name || null,
      items,
      totalCalories: Math.round(items.reduce((acc, it) => acc + (it.calories || 0), 0)),
      totalProtein: roundToDecimals(items.reduce((acc, it) => acc + (it.protein || 0), 0), 1),
      totalCarbs: roundToDecimals(items.reduce((acc, it) => acc + (it.carbs || 0), 0), 1),
      totalFat: roundToDecimals(items.reduce((acc, it) => acc + (it.fat || 0), 0), 1),
      totalFiber: roundToDecimals(items.reduce((acc, it) => acc + (it.fiber || 0), 0), 1),
    });
  }

  // 5. Compute daily totals & targets
  const { totals, targets } = calculateDailyTotals(structuredMeals, profile);

  return {
    date: formattedDate,
    meals: structuredMeals,
    totals,
    targets,
  };
}

/**
 * Adds a food item to a meal log with accurate nutrition calculation and historical snapshotting.
 */
export async function addFoodToMeal(
  userId: string,
  input: AddMealItemInput,
  client?: SupabaseClient<Database>
): Promise<MealItem> {
  const supabase = client || (await createClient());

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  // 1. Resolve meal_log_id
  let mealLogId = input.mealLogId;
  if (!mealLogId) {
    if (!input.date || !input.mealType) {
      throw new Error("Either mealLogId or date + mealType must be provided.");
    }
    const log = await getOrCreateMealLog(userId, input.date, input.mealType, supabase);
    mealLogId = log.id;
  } else {
    // Verify ownership of the meal log
    const { data: log, error: logErr } = await supabase
      .from("meal_logs")
      .select("id, user_id")
      .eq("id", mealLogId)
      .single();

    if (logErr || !log || log.user_id !== userId) {
      throw new Error("Meal container not found or unauthorized.");
    }
  }

  // 2. Resolve Food and Nutrition
  let calculated: CalculatedNutrition | null = null;
  let foodName = "";
  let foodState: FoodState = "cooked";
  let provenance: DataProvenance = "verified_database";
  let sourceRef: string | null = "IFCT 2017";

  if (input.food) {
    calculated = calculateNutrition({
      food: input.food,
      quantity: input.quantity,
      unit: input.unit,
    });
    foodName = input.food.name_en;
    foodState = input.food.state;
    provenance = input.food.data_provenance;
    sourceRef = input.food.source_reference;
  } else if (input.foodId) {
    let food = getFoodById(input.foodId);
    if (!food) {
      const { data: dbFood } = await supabase
        .from("foods")
        .select("*")
        .eq("id", input.foodId)
        .maybeSingle();
      if (dbFood) food = dbFood;
    }

    if (!food) {
      throw new Error(`Food with ID "${input.foodId}" not found in database.`);
    }

    calculated = calculateNutrition({
      food,
      quantity: input.quantity,
      unit: input.unit,
    });
    foodName = food.name_en;
    foodState = food.state;
    provenance = food.data_provenance;
    sourceRef = food.source_reference;
  } else if (input.customFood) {
    foodName = input.customFood.name;
    foodState = input.customFood.state;
    provenance = "user_entered";
    sourceRef = "Manual Custom Entry";
  } else {
    throw new Error("Either foodId, food object, or customFood must be provided.");
  }

  // 3. Prepare snapshot payload
  const newItemPayload = {
    meal_log_id: mealLogId,
    user_id: userId,
    food_id: input.food?.id || input.foodId || null,
    food_name: foodName,
    food_state: foodState,
    quantity: input.quantity,
    unit: input.unit,
    gram_weight: calculated
      ? calculated.effectiveWeightGrams
      : input.quantity,
    calories: calculated ? calculated.calories : input.customFood!.calories,
    protein: calculated ? calculated.protein : input.customFood!.protein,
    carbs: calculated ? calculated.carbs : input.customFood!.carbs,
    fat: calculated ? calculated.fat : input.customFood!.fat,
    fiber: calculated ? calculated.fiber : input.customFood?.fiber || 0,
    sugar: calculated ? calculated.sugar : input.customFood?.sugar ?? null,
    sodium_mg: calculated ? calculated.sodiumMg : input.customFood?.sodium_mg ?? null,
    is_estimated_portion: calculated ? calculated.isEstimatedPortion : false,
    portion_assumption: calculated?.portionAssumption || null,
    data_provenance: provenance,
    source_reference: sourceRef,
  };

  // 4. Insert into meal_items
  const { data, error } = await supabase
    .from("meal_items")
    .insert(newItemPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add meal item: ${error.message}`);
  }

  return data;
}

/**
 * Updates a meal item's quantity or unit, recalculating nutrition values.
 */
export async function updateMealItemQuantity(
  userId: string,
  itemId: string,
  input: UpdateMealItemInput,
  client?: SupabaseClient<Database>
): Promise<MealItem> {
  const supabase = client || (await createClient());

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  // 1. Fetch the existing item to verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("meal_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Meal item not found or unauthorized.");
  }

  const newUnit = input.unit || existing.unit;

  // 2. Recalculate nutrition
  let updatePayload: Partial<MealItem> = {
    quantity: input.quantity,
    unit: newUnit,
    updated_at: new Date().toISOString(),
  };

  if (existing.food_id) {
    let food = getFoodById(existing.food_id);
    if (!food) {
      const { data: dbFood } = await supabase
        .from("foods")
        .select("*")
        .eq("id", existing.food_id)
        .maybeSingle();
      if (dbFood) food = dbFood;
    }

    if (food) {
      const calculated = calculateNutrition({
        food,
        quantity: input.quantity,
        unit: newUnit,
      });

      updatePayload = {
        ...updatePayload,
        gram_weight: calculated.effectiveWeightGrams,
        calories: calculated.calories,
        protein: calculated.protein,
        carbs: calculated.carbs,
        fat: calculated.fat,
        fiber: calculated.fiber,
        sugar: calculated.sugar,
        sodium_mg: calculated.sodiumMg,
        is_estimated_portion: calculated.isEstimatedPortion,
        portion_assumption: calculated.portionAssumption || null,
      };
    }
  } else {
    // Proportional scaling for custom entered items
    const ratio = input.quantity / (existing.quantity || 1);
    updatePayload = {
      ...updatePayload,
      gram_weight: roundToDecimals(existing.gram_weight * ratio, 1),
      calories: Math.round(existing.calories * ratio),
      protein: roundToDecimals(existing.protein * ratio, 1),
      carbs: roundToDecimals(existing.carbs * ratio, 1),
      fat: roundToDecimals(existing.fat * ratio, 1),
      fiber: roundToDecimals(existing.fiber * ratio, 1),
      sugar: existing.sugar !== null ? roundToDecimals(existing.sugar * ratio, 1) : null,
      sodium_mg: existing.sodium_mg !== null ? roundToDecimals(existing.sodium_mg * ratio, 1) : null,
    };
  }

  // 3. Update database
  const { data: updated, error: updateErr } = await supabase
    .from("meal_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`Failed to update meal item: ${updateErr.message}`);
  }

  return updated;
}

/**
 * Deletes a meal item, strictly enforcing user ownership via RLS and query conditions.
 */
export async function deleteMealItem(
  userId: string,
  itemId: string,
  client?: SupabaseClient<Database>
): Promise<{ success: boolean }> {
  const supabase = client || (await createClient());

  const { error } = await supabase
    .from("meal_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete meal item: ${error.message}`);
  }

  return { success: true };
}

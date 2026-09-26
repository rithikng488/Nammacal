import { createClient } from "@/lib/supabase/server";
import { getFoodById } from "@/lib/nutrition/food-service";
import {
  calculateRecipeNutrition,
  type RecipeIngredientInput,
  type CalculatedRecipeSummary,
} from "@/lib/nutrition/recipe-engine";
import type {
  Recipe,
  RecipeIngredient,
  Food,
  DataProvenance,
} from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type RecipeWithIngredients = Recipe & {
  ingredients: RecipeIngredient[];
};

export type RecipeSummaryItem = Recipe & {
  ingredient_count: number;
};

export interface CreateRecipeIngredientItem {
  foodId?: string | null;
  food?: Food;
  quantity: number;
  unit: string;
  notes?: string | null;
  ingredientOrder?: number;
}

export interface CreateRecipeInput {
  name: string;
  description?: string | null;
  notes?: string | null;
  finalCookedWeightG?: number | null;
  servings?: number;
  ingredients: CreateRecipeIngredientItem[];
}

export type UpdateRecipeInput = CreateRecipeInput;

/**
 * Resolves a food item by ID either from the verified seed database or user custom foods.
 */
async function resolveFood(
  foodId: string | undefined | null,
  client: SupabaseClient<Database>
): Promise<Food | null> {
  if (!foodId) return null;
  const seed = getFoodById(foodId);
  if (seed) return seed;

  const { data } = await client
    .from("foods")
    .select("*")
    .eq("id", foodId)
    .maybeSingle();

  return data || null;
}

/**
 * Retrieves all private recipes created by a user, ordered by most recently updated.
 */
export async function getUserRecipes(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<RecipeSummaryItem[]> {
  const supabase = client || (await createClient());

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load recipes: ${error.message}`);
  }

  if (!recipes || recipes.length === 0) {
    return [];
  }

  // Fetch ingredient counts
  const recipeIds = recipes.map((r) => r.id);
  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id")
    .in("recipe_id", recipeIds);

  const countMap = new Map<string, number>();
  (ingredients || []).forEach((ing) => {
    countMap.set(ing.recipe_id, (countMap.get(ing.recipe_id) || 0) + 1);
  });

  return recipes.map((r) => ({
    ...r,
    ingredient_count: countMap.get(r.id) || 0,
  }));
}

/**
 * Retrieves a single recipe with all its ingredients, verifying user ownership.
 */
export async function getRecipeById(
  userId: string,
  recipeId: string,
  client?: SupabaseClient<Database>
): Promise<RecipeWithIngredients> {
  const supabase = client || (await createClient());

  const { data: recipe, error: recipeErr } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .single();

  if (recipeErr || !recipe) {
    throw new Error("Recipe not found or unauthorized.");
  }

  const { data: ingredients, error: ingErr } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("ingredient_order", { ascending: true });

  if (ingErr) {
    throw new Error(`Failed to load recipe ingredients: ${ingErr.message}`);
  }

  return {
    ...recipe,
    ingredients: ingredients || [],
  };
}

/**
 * Creates a new recipe with authoritative server-calculated nutrition and ingredient snapshots.
 */
export async function createRecipe(
  userId: string,
  input: CreateRecipeInput,
  client?: SupabaseClient<Database>
): Promise<RecipeWithIngredients> {
  const supabase = client || (await createClient());

  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Recipe name is required.");
  }

  if (!input.ingredients || input.ingredients.length === 0) {
    throw new Error("A recipe must have at least one ingredient.");
  }

  // 1. Resolve all ingredients and their Food objects
  const resolvedIngredients: RecipeIngredientInput[] = [];
  for (const item of input.ingredients) {
    let food = item.food;
    if (!food && item.foodId) {
      food = (await resolveFood(item.foodId, supabase)) || undefined;
    }

    if (!food) {
      throw new Error(`Food with ID "${item.foodId}" could not be resolved.`);
    }

    resolvedIngredients.push({
      food,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes,
      ingredientOrder: item.ingredientOrder,
    });
  }

  // 2. Perform authoritative server-side nutrition calculation
  const summary: CalculatedRecipeSummary = calculateRecipeNutrition({
    ingredients: resolvedIngredients,
    finalCookedWeightG: input.finalCookedWeightG,
    servings: input.servings || 1,
  });

  // 3. Insert recipe record
  const recipePayload = {
    user_id: userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
    final_cooked_weight_g: summary.finalCookedWeightG,
    total_weight_g: summary.finalCookedWeightG, // backward compatibility
    total_raw_weight_g: summary.totalRawWeightG,
    servings: summary.servings,
    total_calories: summary.totalCalories,
    total_protein: summary.totalProtein,
    total_carbs: summary.totalCarbs,
    total_fat: summary.totalFat,
    total_fiber: summary.totalFiber,
    total_sugar: summary.totalSugar,
    total_sodium_mg: summary.totalSodiumMg,
    calories_per_100g: summary.per100g?.calories ?? null,
    protein_per_100g: summary.per100g?.protein ?? null,
    carbs_per_100g: summary.per100g?.carbs ?? null,
    fat_per_100g: summary.per100g?.fat ?? null,
    fiber_per_100g: summary.per100g?.fiber ?? null,
    sugar_per_100g: summary.per100g?.sugar ?? null,
    sodium_mg_per_100g: summary.per100g?.sodiumMg ?? null,
    is_estimated_portion: summary.isEstimatedPortion,
    data_provenance: summary.dataProvenance as DataProvenance,
    is_public: false,
  };

  const { data: recipe, error: insertRecipeErr } = await supabase
    .from("recipes")
    .insert(recipePayload)
    .select()
    .single();

  if (insertRecipeErr || !recipe) {
    throw new Error(`Failed to create recipe: ${insertRecipeErr?.message}`);
  }

  // 4. Insert ingredient snapshots
  const ingredientsPayload = summary.ingredients.map((ing) => ({
    recipe_id: recipe.id,
    food_id: ing.foodId,
    food_name: ing.foodName,
    food_state: ing.foodState,
    quantity: ing.quantity,
    unit: ing.unit,
    gram_weight: ing.gramWeight,
    ingredient_order: ing.ingredientOrder,
    calories: ing.calories,
    protein: ing.protein,
    carbs: ing.carbs,
    fat: ing.fat,
    fiber: ing.fiber,
    sugar: ing.sugar,
    sodium_mg: ing.sodiumMg,
    is_estimated_portion: ing.isEstimatedPortion,
    portion_assumption: ing.portionAssumption,
    data_provenance: ing.dataProvenance,
    source_reference: ing.sourceReference,
    notes: ing.notes,
  }));

  const { data: insertedIngredients, error: insertIngErr } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientsPayload)
    .select();

  if (insertIngErr) {
    // Attempt rollback of created recipe if ingredient insert fails
    await supabase.from("recipes").delete().eq("id", recipe.id);
    throw new Error(`Failed to save recipe ingredients: ${insertIngErr.message}`);
  }

  return {
    ...recipe,
    ingredients: insertedIngredients || [],
  };
}

/**
 * Updates an existing recipe, recalculating all nutrition totals and updating ingredient snapshots.
 */
export async function updateRecipe(
  userId: string,
  recipeId: string,
  input: UpdateRecipeInput,
  client?: SupabaseClient<Database>
): Promise<RecipeWithIngredients> {
  const supabase = client || (await createClient());

  // 1. Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("recipes")
    .select("id, user_id")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Recipe not found or unauthorized.");
  }

  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Recipe name is required.");
  }

  if (!input.ingredients || input.ingredients.length === 0) {
    throw new Error("A recipe must have at least one ingredient.");
  }

  // 2. Resolve ingredients
  const resolvedIngredients: RecipeIngredientInput[] = [];
  for (const item of input.ingredients) {
    let food = item.food;
    if (!food && item.foodId) {
      food = (await resolveFood(item.foodId, supabase)) || undefined;
    }

    if (!food) {
      throw new Error(`Food with ID "${item.foodId}" could not be resolved.`);
    }

    resolvedIngredients.push({
      food,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes,
      ingredientOrder: item.ingredientOrder,
    });
  }

  // 3. Recalculate nutrition
  const summary = calculateRecipeNutrition({
    ingredients: resolvedIngredients,
    finalCookedWeightG: input.finalCookedWeightG,
    servings: input.servings || 1,
  });

  // 4. Update recipe row
  const updatePayload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
    final_cooked_weight_g: summary.finalCookedWeightG,
    total_weight_g: summary.finalCookedWeightG,
    total_raw_weight_g: summary.totalRawWeightG,
    servings: summary.servings,
    total_calories: summary.totalCalories,
    total_protein: summary.totalProtein,
    total_carbs: summary.totalCarbs,
    total_fat: summary.totalFat,
    total_fiber: summary.totalFiber,
    total_sugar: summary.totalSugar,
    total_sodium_mg: summary.totalSodiumMg,
    calories_per_100g: summary.per100g?.calories ?? null,
    protein_per_100g: summary.per100g?.protein ?? null,
    carbs_per_100g: summary.per100g?.carbs ?? null,
    fat_per_100g: summary.per100g?.fat ?? null,
    fiber_per_100g: summary.per100g?.fiber ?? null,
    sugar_per_100g: summary.per100g?.sugar ?? null,
    sodium_mg_per_100g: summary.per100g?.sodiumMg ?? null,
    is_estimated_portion: summary.isEstimatedPortion,
    data_provenance: summary.dataProvenance as DataProvenance,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedRecipe, error: updateErr } = await supabase
    .from("recipes")
    .update(updatePayload)
    .eq("id", recipeId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateErr || !updatedRecipe) {
    throw new Error(`Failed to update recipe: ${updateErr?.message}`);
  }

  // 5. Replace ingredients (delete old, insert new snapshots)
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

  const ingredientsPayload = summary.ingredients.map((ing) => ({
    recipe_id: recipeId,
    food_id: ing.foodId,
    food_name: ing.foodName,
    food_state: ing.foodState,
    quantity: ing.quantity,
    unit: ing.unit,
    gram_weight: ing.gramWeight,
    ingredient_order: ing.ingredientOrder,
    calories: ing.calories,
    protein: ing.protein,
    carbs: ing.carbs,
    fat: ing.fat,
    fiber: ing.fiber,
    sugar: ing.sugar,
    sodium_mg: ing.sodiumMg,
    is_estimated_portion: ing.isEstimatedPortion,
    portion_assumption: ing.portionAssumption,
    data_provenance: ing.dataProvenance,
    source_reference: ing.sourceReference,
    notes: ing.notes,
  }));

  const { data: insertedIngredients, error: insertIngErr } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientsPayload)
    .select();

  if (insertIngErr) {
    throw new Error(`Failed to update recipe ingredients: ${insertIngErr.message}`);
  }

  return {
    ...updatedRecipe,
    ingredients: insertedIngredients || [],
  };
}

/**
 * Deletes a recipe owned by the user.
 * Database foreign keys cascade deletion to recipe_ingredients,
 * but SET NULL on meal_items, so historical meal logs stay completely intact!
 */
export async function deleteRecipe(
  userId: string,
  recipeId: string,
  client?: SupabaseClient<Database>
): Promise<{ success: boolean }> {
  const supabase = client || (await createClient());

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete recipe: ${error.message}`);
  }

  return { success: true };
}

/**
 * Duplicates an existing recipe as "[Name] (Copy)" for rapid recipe variations.
 */
export async function duplicateRecipe(
  userId: string,
  recipeId: string,
  client?: SupabaseClient<Database>
): Promise<RecipeWithIngredients> {
  const existing = await getRecipeById(userId, recipeId, client);

  return createRecipe(
    userId,
    {
      name: `${existing.name} (Copy)`,
      description: existing.description,
      notes: existing.notes,
      finalCookedWeightG: existing.final_cooked_weight_g,
      servings: existing.servings,
      ingredients: existing.ingredients.map((ing) => ({
        foodId: ing.food_id,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        ingredientOrder: ing.ingredient_order,
      })),
    },
    client
  );
}

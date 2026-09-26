"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { searchFoods } from "@/lib/nutrition/food-service";
import {
  calculateNutrition,
  type CalculatedNutrition,
} from "@/lib/nutrition/calc-engine";
import {
  calculateRecipeNutrition,
  type CalculatedRecipeSummary,
} from "@/lib/nutrition/recipe-engine";
import type { Food, FoodCategory, FoodState, RecipeIngredient } from "@/lib/supabase/types";
import type { RecipeWithIngredients } from "@/lib/recipes/recipe-service";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Flame,
  Scale,
  Search,
  BookOpen,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface RecipeBuilderProps {
  initialRecipe?: RecipeWithIngredients | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

interface DraftIngredient {
  food: Food;
  quantity: number;
  unit: string;
  notes?: string | null;
}

const CATEGORIES: { label: string; value: FoodCategory | "all" }[] = [
  { label: "All Items", value: "all" },
  { label: "Rice & Grains", value: "rice_grains" },
  { label: "Millets", value: "millets" },
  { label: "Wheat & Roti", value: "wheat_flours" },
  { label: "Dals & Pulses", value: "dals_pulses" },
  { label: "Dairy & Curd", value: "dairy" },
  { label: "Poultry & Eggs", value: "poultry_eggs" },
  { label: "Meat & Seafood", value: "meat_seafood" },
  { label: "South Breakfast", value: "breakfast_south" },
  { label: "South Gravies", value: "lunch_dinner_south" },
  { label: "Gym & Fitness", value: "gym_diet" },
  { label: "Oils & Ghee", value: "oils_fats" },
  { label: "Vegetables & Fruits", value: "vegetables" },
];

export function RecipeBuilder({
  initialRecipe,
  onSaveSuccess,
  onCancel,
}: RecipeBuilderProps) {
  const isEditing = Boolean(initialRecipe);

  const [name, setName] = useState(initialRecipe?.name || "");
  const [description, setDescription] = useState(initialRecipe?.description || "");
  const [notes, setNotes] = useState(initialRecipe?.notes || "");
  const [finalCookedWeightG, setFinalCookedWeightG] = useState<string>(
    initialRecipe?.final_cooked_weight_g?.toString() || ""
  );
  const [servings, setServings] = useState<number>(initialRecipe?.servings || 1);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);

  // Search Modal state for adding ingredient
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all">("all");
  const [selectedState, setSelectedState] = useState<FoodState | "all">("all");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  // Portion configuration inside food search modal
  const [addQty, setAddQty] = useState<number>(100);
  const [addUnit, setAddUnit] = useState<string>("g");
  const [previewCalc, setPreviewCalc] = useState<CalculatedNutrition | null>(null);

  // Form saving states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize draft ingredients if editing
  useEffect(() => {
    if (initialRecipe && initialRecipe.ingredients.length > 0) {
      const drafts: DraftIngredient[] = [];
      initialRecipe.ingredients.forEach((ing: RecipeIngredient) => {
        // Construct minimum Food object to allow recalculation
        const fallbackFood: Food = {
          id: ing.food_id || `temp-${ing.id}`,
          name_en: ing.food_name,
          name_ta: null,
          name_tanglish: null,
          category: "other",
          state: ing.food_state,
          calories_per_100g: ing.gram_weight > 0 ? (ing.calories * 100) / ing.gram_weight : 0,
          protein_per_100g: ing.gram_weight > 0 ? (ing.protein * 100) / ing.gram_weight : 0,
          carbs_per_100g: ing.gram_weight > 0 ? (ing.carbs * 100) / ing.gram_weight : 0,
          fat_per_100g: ing.gram_weight > 0 ? (ing.fat * 100) / ing.gram_weight : 0,
          fiber_per_100g: ing.gram_weight > 0 ? (ing.fiber * 100) / ing.gram_weight : 0,
          sugar_per_100g: ing.sugar !== null && ing.gram_weight > 0 ? (ing.sugar * 100) / ing.gram_weight : null,
          sodium_mg_per_100g: ing.sodium_mg !== null && ing.gram_weight > 0 ? (ing.sodium_mg * 100) / ing.gram_weight : null,
          serving_unit_default: ing.unit,
          serving_size_default: ing.quantity,
          standard_portions: [],
          data_provenance: ing.data_provenance,
          source_reference: ing.source_reference || "Recipe Snapshot",
          is_verified: ing.data_provenance === "verified_database",
          created_by: null,
          created_at: ing.created_at,
          updated_at: ing.created_at,
        };

        drafts.push({
          food: fallbackFood,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        });
      });
      setIngredients(drafts);
    }
  }, [initialRecipe]);

  // Food search effect
  useEffect(() => {
    if (!isSearchingFood) return;
    const results = searchFoods({
      query: searchTerm,
      category: selectedCategory,
      state: selectedState,
      limit: 25,
    });
    setSearchResults(results.map((r) => r.food));
  }, [isSearchingFood, searchTerm, selectedCategory, selectedState]);

  // Update ingredient preview calculation when portion input changes
  useEffect(() => {
    if (!selectedFood || addQty <= 0) {
      setPreviewCalc(null);
      return;
    }
    try {
      const calc = calculateNutrition({
        food: selectedFood,
        quantity: addQty,
        unit: addUnit,
      });
      setPreviewCalc(calc);
    } catch {
      setPreviewCalc(null);
    }
  }, [selectedFood, addQty, addUnit]);

  // Open food select modal
  const handleSelectFoodForAdd = (food: Food) => {
    setSelectedFood(food);
    const portions = food.standard_portions || [];
    if (portions.length > 0) {
      setAddUnit(portions[0].unit);
      setAddQty(1);
    } else {
      setAddUnit(food.serving_unit_default || "g");
      setAddQty(food.serving_size_default || 100);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedFood || addQty <= 0) return;
    setIngredients((prev) => [
      ...prev,
      {
        food: selectedFood,
        quantity: addQty,
        unit: addUnit,
      },
    ]);
    setSelectedFood(null);
    setIsSearchingFood(false);
    setSearchTerm("");
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Live Recipe Nutrition Calculations
  let summary: CalculatedRecipeSummary | null = null;
  const parsedCookedWeight = parseFloat(finalCookedWeightG);
  if (ingredients.length > 0) {
    try {
      summary = calculateRecipeNutrition({
        ingredients,
        finalCookedWeightG: parsedCookedWeight > 0 ? parsedCookedWeight : null,
        servings: servings > 0 ? servings : 1,
      });
    } catch {
      summary = null;
    }
  }

  // Save recipe handler
  const handleSaveRecipe = async () => {
    if (!name.trim()) {
      setErrorMessage("Please enter a recipe name.");
      return;
    }
    if (ingredients.length === 0) {
      setErrorMessage("Please add at least one ingredient.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        finalCookedWeightG: parsedCookedWeight > 0 ? parsedCookedWeight : null,
        servings: servings > 0 ? servings : 1,
        ingredients: ingredients.map((ing, idx) => ({
          foodId: ing.food.id?.startsWith("temp-") ? null : ing.food.id,
          food: ing.food,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || null,
          ingredientOrder: idx,
        })),
      };

      const url = isEditing ? `/api/recipes/${initialRecipe?.id}` : "/api/recipes";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save recipe.");
      }

      onSaveSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving recipe";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEditing ? "Edit Recipe" : "Create New Recipe"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic nutrition density based on final cooked batch yield.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Basic Info Card */}
      <Card className="p-4 space-y-3">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Recipe Details
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Recipe Name *
          </label>
          <Input
            placeholder="e.g. South Indian Chicken Curry, Sambar, Ragi Kali..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description (Optional)
          </label>
          <Input
            placeholder="e.g. Traditional Chettinad style with fresh coconut and spices"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs"
          />
        </div>
      </Card>

      {/* Ingredients Section */}
      <Card className="p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Ingredients ({ingredients.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Raw vs. cooked state preserved for exact nutrient calculation.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedFood(null);
              setIsSearchingFood(true);
            }}
            className="text-xs gap-1.5 py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ingredient</span>
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No ingredients added yet
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Add raw meats, vegetables, dals, grains, and oils from the verified Indian database.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsSearchingFood(true)}
              className="text-xs gap-1 py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Ingredient</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {ingredients.map((ing, idx) => {
              let ingCalc: CalculatedNutrition | null = null;
              try {
                ingCalc = calculateNutrition({
                  food: ing.food,
                  quantity: ing.quantity,
                  unit: ing.unit,
                });
              } catch {
                // Ignore calculation errors
              }

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {ing.food.name_en}
                      </span>
                      <Badge
                        variant={ing.food.state === "raw" ? "amber" : "blue"}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {ing.food.state.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {ing.quantity} {ing.unit}
                      </span>{" "}
                      ({ingCalc?.effectiveWeightGrams || ing.quantity}g) •{" "}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {ingCalc?.calories || 0} kcal
                      </span>{" "}
                      •{" "}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {ingCalc?.protein || 0}g P
                      </span>{" "}
                      • {ingCalc?.carbs || 0}g C • {ingCalc?.fat || 0}g F
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove ingredient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Final Cooked Weight & Servings Card */}
      <Card className="p-4 space-y-3.5 border-emerald-500/20 shadow-sm">
        <div>
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Cooked Yield & Servings
          </h2>
          <p className="text-[11px] text-slate-400">
            Water evaporates or absorbs during cooking. Weigh your final cooked dish to calculate nutrition per 100 g.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Final Cooked Weight (g)
            </label>
            <Input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 720"
              value={finalCookedWeightG}
              onChange={(e) => setFinalCookedWeightG(e.target.value)}
              className="text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Servings
            </label>
            <Input
              type="number"
              min="0.25"
              step="any"
              placeholder="e.g. 4"
              value={servings}
              onChange={(e) => setServings(parseFloat(e.target.value) || 1)}
              className="text-sm font-bold"
            />
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/60 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            Final cooked weight is used to calculate nutrition per 100 g. Cooking changes water weight, so raw ingredient weights alone cannot determine the final serving density.
          </div>
        </div>
      </Card>

      {/* Live Nutritional Summary Card */}
      {summary && (
        <Card className="p-4 space-y-3.5 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-lg border-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Calculated Recipe Nutrition
              </span>
              <h3 className="text-base font-bold text-white">
                {name || "Untitled Recipe"}
              </h3>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[10px]">Raw Weight</span>
              <span className="font-bold text-white flex items-center justify-end gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                {summary.totalRawWeightG} g
              </span>
            </div>
          </div>

          {/* Section 1: Prominent Per 100g Density */}
          {summary.per100g ? (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs uppercase tracking-wide">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Nutrition Density per 100 g</span>
                </div>
                <span className="text-base font-black text-white">
                  {summary.per100g.calories} <span className="text-xs font-normal text-emerald-200">kcal</span>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="bg-emerald-900/40 rounded-xl p-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Protein</span>
                  <span className="font-bold text-white text-xs">{summary.per100g.protein}g</span>
                </div>
                <div className="bg-emerald-900/40 rounded-xl p-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Carbs</span>
                  <span className="font-bold text-white text-xs">{summary.per100g.carbs}g</span>
                </div>
                <div className="bg-emerald-900/40 rounded-xl p-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Fat</span>
                  <span className="font-bold text-white text-xs">{summary.per100g.fat}g</span>
                </div>
                <div className="bg-emerald-900/40 rounded-xl p-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Fiber</span>
                  <span className="font-bold text-white text-xs">{summary.per100g.fiber}g</span>
                </div>
              </div>

              {summary.cookingYieldFactor && (
                <div className="text-[10px] text-emerald-300 text-right pt-0.5">
                  Cooking Yield: {Math.round(summary.cookingYieldFactor * 100)}% of raw weight
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Enter final cooked weight above to calculate nutrition per 100 g.</span>
            </div>
          )}

          {/* Section 2: Entire Recipe Totals */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">Total Batch Nutrition</span>
              <span className="font-bold text-white">{summary.totalCalories} kcal</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] text-slate-300">
              <span className="bg-slate-800/80 p-1.5 rounded-lg">{summary.totalProtein}g Protein</span>
              <span className="bg-slate-800/80 p-1.5 rounded-lg">{summary.totalCarbs}g Carbs</span>
              <span className="bg-slate-800/80 p-1.5 rounded-lg">{summary.totalFat}g Fat</span>
              <span className="bg-slate-800/80 p-1.5 rounded-lg">{summary.totalFiber}g Fiber</span>
            </div>
          </div>

          {/* Section 3: Per Serving Metrics */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Per Serving ({summary.perServing.servingWeightG}g):</span>
            <span className="font-bold text-white">
              {summary.perServing.calories} kcal • {summary.perServing.protein}g P
            </span>
          </div>
        </Card>
      )}

      {/* Save Button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={handleSaveRecipe}
          disabled={isSaving || !name.trim() || ingredients.length === 0}
          className="w-full py-3.5 text-sm font-bold gap-2 shadow-md"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving Recipe...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>{isEditing ? "Update Recipe" : "Save Recipe"}</span>
            </>
          )}
        </Button>
      </div>

      {/* Search & Add Ingredient Modal */}
      {isSearchingFood && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {selectedFood && (
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    {selectedFood ? "Configure Ingredient Portion" : "Add Recipe Ingredient"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Search English, Tamil, or Tanglish food items
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFood(null);
                  setIsSearchingFood(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {selectedFood ? (
                /* Selected Food Portion Configuration */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={selectedFood.state === "raw" ? "amber" : "blue"}>
                        {selectedFood.state.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">{selectedFood.category.replace(/_/g, " ")}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedFood.name_en}
                    </h4>
                    {selectedFood.name_ta && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {selectedFood.name_ta} {selectedFood.name_tanglish && `(${selectedFood.name_tanglish})`}
                      </p>
                    )}
                  </div>

                  {/* Quantity & Unit Selection */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Portion Unit
                      </label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                        value={addUnit}
                        onChange={(e) => setAddUnit(e.target.value)}
                      >
                        <option value="g">grams (g)</option>
                        <option value="kg">kilograms (kg)</option>
                        <option value="tbsp">tablespoon (tbsp)</option>
                        <option value="tsp">teaspoon (tsp)</option>
                        {(selectedFood.standard_portions || []).map((p) => (
                          <option key={p.unit} value={p.unit}>
                            {p.label_en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Input
                        label="Quantity"
                        type="number"
                        min="0.1"
                        step="any"
                        value={addQty}
                        onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Calculated Ingredient Preview */}
                  {previewCalc && (
                    <Card className="p-3 bg-slate-50 dark:bg-slate-850/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          Weight: {previewCalc.effectiveWeightGrams} g
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {previewCalc.calories} kcal
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="font-semibold text-emerald-600">{previewCalc.protein}g Protein</span>
                        <span>{previewCalc.carbs}g Carbs</span>
                        <span>{previewCalc.fat}g Fat</span>
                      </div>
                    </Card>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddIngredient}
                    disabled={!previewCalc || addQty <= 0}
                    className="w-full py-3"
                  >
                    Add to Recipe ({previewCalc?.calories || 0} kcal)
                  </Button>
                </div>
              ) : (
                /* Search List View */
                <>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search chicken, onion, tomato, rice, oil..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2.5 text-xs rounded-xl"
                      autoFocus
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>

                  {/* State Filters */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">State:</span>
                    <div className="flex gap-1">
                      {(["all", "raw", "cooked"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedState(st)}
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                            selectedState === st
                              ? st === "raw"
                                ? "bg-amber-600 text-white"
                                : "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {st === "all" ? "All" : st === "raw" ? "Raw" : "Cooked"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${
                          selectedCategory === cat.value
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Results */}
                  <div className="space-y-1.5 pt-1">
                    {searchResults.map((food) => (
                      <div
                        key={food.id}
                        onClick={() => handleSelectFoodForAdd(food)}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/70 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={food.state === "raw" ? "amber" : "blue"} className="text-[9px] px-1.5 py-0">
                              {food.state.toUpperCase()}
                            </Badge>
                            <span className="text-[10px] text-slate-400">{food.category.replace(/_/g, " ")}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {food.name_en}
                          </h4>
                          {food.name_ta && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                              {food.name_ta} {food.name_tanglish && `• ${food.name_tanglish}`}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-end gap-0.5">
                            <Flame className="w-3 h-3 text-amber-500" />
                            {food.calories_per_100g}
                          </div>
                          <span className="text-[9px] text-slate-400 block">kcal/100g</span>
                          <span className="text-[9px] font-bold text-emerald-600 block">{food.protein_per_100g}g P</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

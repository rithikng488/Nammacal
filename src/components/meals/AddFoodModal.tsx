"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FoodDetailCard } from "@/components/nutrition/FoodDetailCard";
import { searchFoods } from "@/lib/nutrition/food-service";
import { calculateRecipeServingNutrition } from "@/lib/nutrition/recipe-engine";
import type { Food, FoodCategory, FoodState, MealType } from "@/lib/supabase/types";
import type { CalculatedNutrition } from "@/lib/nutrition/calc-engine";
import type { RecipeSummaryItem } from "@/lib/recipes/recipe-service";
import {
  Search,
  X,
  Flame,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Sparkles,
  ChefHat,
  Scale,
  Plus,
} from "lucide-react";

interface AddFoodModalProps {
  isOpen: boolean;
  date: string;
  mealType: MealType;
  onClose: () => void;
  onFoodLogged: () => void;
  defaultTab?: "foods" | "recipes";
  preSelectedRecipeId?: string | null;
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

export function AddFoodModal({
  isOpen,
  date,
  mealType,
  onClose,
  onFoodLogged,
  defaultTab = "foods",
  preSelectedRecipeId = null,
}: AddFoodModalProps) {
  const [activeTab, setActiveTab] = useState<"foods" | "recipes">(defaultTab);

  // Foods tab state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all">("all");
  const [selectedState, setSelectedState] = useState<FoodState | "all">("all");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  // Recipes tab state
  const [recipes, setRecipes] = useState<RecipeSummaryItem[]>([]);
  const [recipeFilter, setRecipeFilter] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummaryItem | null>(null);
  const [recipeServingGrams, setRecipeServingGrams] = useState<number>(200);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Fetch foods on search term change
  useEffect(() => {
    if (!isOpen) {
      setSelectedFood(null);
      setSelectedRecipe(null);
      setSearchTerm("");
      setRecipeFilter("");
      setLogError(null);
      return;
    }

    const results = searchFoods({
      query: searchTerm,
      category: selectedCategory,
      state: selectedState,
      limit: 25,
    });
    setSearchResults(results.map((r) => r.food));
  }, [isOpen, searchTerm, selectedCategory, selectedState]);

  // Fetch user recipes when modal is open
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => {
        if (data.recipes) {
          setRecipes(data.recipes);
          if (preSelectedRecipeId) {
            const found = data.recipes.find((r: RecipeSummaryItem) => r.id === preSelectedRecipeId);
            if (found) {
              setSelectedRecipe(found);
              setActiveTab("recipes");
            }
          }
        }
      })
      .catch((err) => console.error("Error loading recipes in meal logger:", err));
  }, [isOpen, preSelectedRecipeId]);

  if (!isOpen) return null;

  const mealTitle = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  // Handle logging verified food item
  const handleAddCalculatedFood = async (calculation: CalculatedNutrition) => {
    try {
      setIsSubmitting(true);
      setLogError(null);

      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType,
          foodId: calculation.foodId,
          quantity: calculation.inputQuantity,
          unit: calculation.inputUnit,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to log meal item");
      }

      onFoodLogged();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log food";
      setLogError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logging recipe portion
  const handleLogRecipePortion = async () => {
    if (!selectedRecipe || recipeServingGrams <= 0) return;

    try {
      setIsSubmitting(true);
      setLogError(null);

      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType,
          recipeId: selectedRecipe.id,
          quantity: recipeServingGrams,
          unit: "g",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to log recipe serving");
      }

      onFoodLogged();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log recipe";
      setLogError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live recipe portion calculation
  let recipePortionCalc: ReturnType<typeof calculateRecipeServingNutrition> | null = null;
  if (selectedRecipe && recipeServingGrams > 0) {
    try {
      recipePortionCalc = calculateRecipeServingNutrition(selectedRecipe, recipeServingGrams);
    } catch {
      recipePortionCalc = null;
    }
  }

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(recipeFilter.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {(selectedFood || selectedRecipe) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFood(null);
                  setSelectedRecipe(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Add to {mealTitle}
              </h2>
              <p className="text-[11px] text-slate-400">
                {date} • Verified Foods & Custom Recipes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Verified Foods vs My Recipes */}
        {!selectedFood && !selectedRecipe && (
          <div className="flex border-b border-slate-200/80 dark:border-slate-800 px-4 pt-2 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={() => setActiveTab("foods")}
              className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "foods"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>Verified Indian Foods</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("recipes")}
              className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "recipes"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>My Recipes ({recipes.length})</span>
            </button>
          </div>
        )}

        {logError && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {logError}
          </div>
        )}

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* TAB 1: FOODS */}
          {activeTab === "foods" && (
            selectedFood ? (
              /* Selected Food Detail Card with Portion Selection */
              <div className="animate-in fade-in duration-150">
                <FoodDetailCard
                  food={selectedFood}
                  targetMealLabel={mealTitle}
                  isSubmitting={isSubmitting}
                  onAddToMeal={handleAddCalculatedFood}
                  onClose={() => setSelectedFood(null)}
                />
              </div>
            ) : (
              /* Search & Food Browsing View */
              <>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search rice, satham, dosa, idli, thayir, sambar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2.5 text-xs rounded-xl"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>

                {/* State Filter Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    State:
                  </span>
                  <div className="flex gap-1">
                    {(["all", "cooked", "raw"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedState(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          selectedState === st
                            ? st === "raw"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-emerald-600 text-white shadow-xs"
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
                      className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                        selectedCategory === cat.value
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Results */}
                <div className="space-y-1.5 pt-1">
                  {searchResults.length === 0 ? (
                    <Card className="text-center py-8 space-y-2 border-dashed">
                      <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No matching foods found
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Try searching with Tanglish terms (e.g. &apos;soru&apos;, &apos;paruppu&apos;, &apos;thayir&apos;).
                      </p>
                    </Card>
                  ) : (
                    searchResults.map((food) => {
                      const isRaw = food.state === "raw";
                      return (
                        <div
                          key={food.id}
                          onClick={() => setSelectedFood(food)}
                          className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/70 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={isRaw ? "amber" : "blue"} className="text-[9px] px-1.5 py-0">
                                {food.state.toUpperCase()}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                {food.category.replace(/_/g, " ")}
                              </span>
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

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-end gap-0.5">
                                <Flame className="w-3 h-3 text-amber-500" />
                                {food.calories_per_100g}
                              </div>
                              <span className="text-[9px] text-slate-400 block">
                                kcal/100g
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 block">
                                {food.protein_per_100g}g P
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )
          )}

          {/* TAB 2: MY RECIPES */}
          {activeTab === "recipes" && (
            selectedRecipe ? (
              /* Selected Recipe Portion Logger */
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="emerald" className="text-[9px] px-1.5 py-0">
                      CUSTOM RECIPE
                    </Badge>
                    {selectedRecipe.final_cooked_weight_g && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Batch Yield: {selectedRecipe.final_cooked_weight_g}g
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedRecipe.name}
                  </h3>
                  {selectedRecipe.description && (
                    <p className="text-xs text-slate-500">{selectedRecipe.description}</p>
                  )}
                </div>

                {/* Serving Grams Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cooked Portion (grams)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 200"
                      value={recipeServingGrams}
                      onChange={(e) => setRecipeServingGrams(parseFloat(e.target.value) || 0)}
                      className="text-sm font-bold flex-1"
                    />
                    <span className="text-xs font-semibold text-slate-500">grams</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Weigh your bowl on a kitchen scale to log the exact cooked portion.
                  </p>
                </div>

                {/* Calculated Nutrition Preview */}
                {recipePortionCalc && (
                  <Card className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white space-y-2 shadow-sm border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-300" />
                        <span className="text-xs font-semibold text-emerald-100 uppercase">
                          Portion Energy ({recipeServingGrams}g)
                        </span>
                      </div>
                      <span className="text-xl font-black text-white">
                        {recipePortionCalc.calories} kcal
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1 border-t border-emerald-500/40">
                      <div>
                        <span className="text-[9px] text-emerald-200 block">Protein</span>
                        <span className="font-bold text-white">{recipePortionCalc.protein}g</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-200 block">Carbs</span>
                        <span className="font-bold text-white">{recipePortionCalc.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-200 block">Fat</span>
                        <span className="font-bold text-white">{recipePortionCalc.fat}g</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-200 block">Fiber</span>
                        <span className="font-bold text-white">{recipePortionCalc.fiber}g</span>
                      </div>
                    </div>
                  </Card>
                )}

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleLogRecipePortion}
                  disabled={isSubmitting || recipeServingGrams <= 0 || !recipePortionCalc}
                  className="w-full py-3 text-sm font-bold gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Logging to {mealTitle}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        Log {recipeServingGrams}g to {mealTitle} ({recipePortionCalc?.calories || 0} kcal)
                      </span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Recipe List View */
              <>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search your recipes..."
                    value={recipeFilter}
                    onChange={(e) => setRecipeFilter(e.target.value)}
                    className="pl-9 pr-4 py-2.5 text-xs rounded-xl"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>

                {recipes.length === 0 ? (
                  <Card className="text-center py-8 space-y-2 border-dashed">
                    <ChefHat className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No custom recipes created yet
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Build recipes in the Recipe Calculator with batch cooked yields to log custom portions.
                    </p>
                    <Link
                      href="/recipes"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Go to Recipe Calculator</span>
                    </Link>
                  </Card>
                ) : filteredRecipes.length === 0 ? (
                  <Card className="text-center py-6 border-dashed text-xs text-slate-400">
                    No recipes matching &quot;{recipeFilter}&quot;
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        onClick={() => setSelectedRecipe(recipe)}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/70 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {recipe.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span>{recipe.ingredient_count} ingredients</span>
                            {recipe.final_cooked_weight_g && (
                              <span>• Yield: {recipe.final_cooked_weight_g}g</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            {recipe.calories_per_100g !== null ? (
                              <>
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-end gap-0.5">
                                  <Flame className="w-3 h-3 text-amber-500" />
                                  {recipe.calories_per_100g}
                                </div>
                                <span className="text-[9px] text-slate-400 block">kcal/100g</span>
                                <span className="text-[9px] font-bold text-emerald-600 block">
                                  {recipe.protein_per_100g}g P
                                </span>
                              </>
                            ) : (
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {recipe.total_calories} kcal
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

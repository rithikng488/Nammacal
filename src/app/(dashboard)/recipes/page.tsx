"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { RecipeBuilder } from "@/components/recipes/RecipeBuilder";
import type { RecipeSummaryItem, RecipeWithIngredients } from "@/lib/recipes/recipe-service";
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Search,
  Flame,
  Scale,
  Edit2,
  Copy,
  Trash2,
  Sparkles,
  Info,
  ChefHat,
  RefreshCw,
} from "lucide-react";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Builder Modal / Page Mode
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/recipes");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to load recipes");
      }
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading recipes";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleOpenEdit = async (recipeId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) {
        throw new Error("Failed to load recipe details");
      }
      const data = await res.json();
      setEditingRecipe(data.recipe);
      setIsBuilding(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error opening recipe";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (recipeId: string) => {
    try {
      // Fetch full recipe and duplicate
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error("Failed to duplicate recipe");
      const data = await res.json();
      const existing: RecipeWithIngredients = data.recipe;

      const duplicatePayload = {
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
      };

      const createRes = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatePayload),
      });

      if (!createRes.ok) throw new Error("Failed to duplicate recipe");
      await fetchRecipes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Duplicate failed";
      alert(msg);
    }
  };

  const handleDelete = async (recipeId: string, recipeName: string) => {
    if (!confirm(`Are you sure you want to delete "${recipeName}"?\nHistorical meal logs using this recipe will preserve their nutrition snapshot.`)) {
      return;
    }

    try {
      setIsDeletingId(recipeId);
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete recipe");
      }

      await fetchRecipes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting recipe";
      alert(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

  // If currently in RecipeBuilder mode:
  if (isBuilding) {
    return (
      <RecipeBuilder
        initialRecipe={editingRecipe}
        onSaveSuccess={() => {
          setIsBuilding(false);
          setEditingRecipe(null);
          fetchRecipes();
        }}
        onCancel={() => {
          setIsBuilding(false);
          setEditingRecipe(null);
        }}
      />
    );
  }

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <ChefHat className="w-5 h-5 text-emerald-600" />
              Recipe Calculator
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Batch cooking yields, nutrition per 100 g, and serving density
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditingRecipe(null);
            setIsBuilding(true);
          }}
          className="text-xs gap-1.5 py-2 px-3 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Recipe</span>
        </Button>
      </div>

      {/* Educational Notice on Batch Cooking */}
      <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <b>How NammaCal Recipe Calculator works:</b> Enter your raw ingredients (e.g. 500g chicken, 100g onion, 10g oil). Then enter your <b>final cooked pot weight</b> (e.g. 720g). We calculate your exact <b>nutrition per 100 g</b> so you can log any cooked portion with zero guesswork.
        </div>
      </div>

      {/* Filter / Search Bar */}
      {recipes.length > 0 && (
        <div className="relative">
          <Input
            type="text"
            placeholder="Search your recipes..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 text-xs rounded-xl"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchRecipes}
            className="p-1 rounded hover:bg-rose-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recipe List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-850"
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <Card className="text-center py-12 space-y-3 border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              No Recipes Created Yet
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Create multi-ingredient South Indian recipes like Sambar, Chicken Gravy, Biryani, or Poriyal with automatic batch yield calculations.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setEditingRecipe(null);
              setIsBuilding(true);
            }}
            className="text-xs gap-1.5 py-2 px-4 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Your First Recipe</span>
          </Button>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card className="text-center py-8 space-y-2 border-dashed">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No recipes matching &quot;{searchFilter}&quot;
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSearchFilter("")}
            className="text-xs py-1 px-3"
          >
            Clear Filter
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {filteredRecipes.map((recipe) => {
            const isDeleting = isDeletingId === recipe.id;
            const hasCookedWeight = recipe.final_cooked_weight_g && recipe.final_cooked_weight_g > 0;

            return (
              <Card
                key={recipe.id}
                className={`p-4 space-y-3 border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${
                  isDeleting ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {recipe.name}
                      </h3>
                      {recipe.data_provenance === "verified_database" ? (
                        <Badge variant="emerald" className="text-[9px] px-1.5 py-0">
                          Verified Ingredients
                        </Badge>
                      ) : (
                        <Badge variant="slate" className="text-[9px] px-1.5 py-0">
                          Custom
                        </Badge>
                      )}
                    </div>
                    {recipe.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {recipe.description}
                      </p>
                    )}
                  </div>

                  {/* Top Action Icons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(recipe.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="Edit recipe"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(recipe.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Duplicate recipe"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(recipe.id, recipe.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete recipe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges Row */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                    {recipe.ingredient_count} {recipe.ingredient_count === 1 ? "ingredient" : "ingredients"}
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                    {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
                  </span>
                  {hasCookedWeight ? (
                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      Cooked Yield: {recipe.final_cooked_weight_g}g
                    </span>
                  ) : (
                    <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium">
                      Cooked weight pending
                    </span>
                  )}
                </div>

                {/* Nutrition Density Box */}
                {hasCookedWeight && recipe.calories_per_100g !== null ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Density per 100 g
                      </span>
                      <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        {recipe.calories_per_100g} kcal
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-600 dark:text-slate-300 space-x-2">
                      <span className="font-bold text-emerald-600">{recipe.protein_per_100g}g P</span>
                      <span>{recipe.carbs_per_100g}g C</span>
                      <span>{recipe.fat_per_100g}g F</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 text-xs flex items-center justify-between">
                    <span className="text-slate-500">Total batch energy:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {recipe.total_calories} kcal • {recipe.total_protein}g P
                    </span>
                  </div>
                )}

                {/* Log to Meal Quick Link */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Ready to log in Daily Timeline
                  </span>
                  <Link
                    href={`/meals?recipeId=${recipe.id}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                  >
                    <span>Log Portion</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

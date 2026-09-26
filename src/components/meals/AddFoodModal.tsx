"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FoodDetailCard } from "@/components/nutrition/FoodDetailCard";
import { searchFoods } from "@/lib/nutrition/food-service";
import type { Food, FoodCategory, FoodState, MealType } from "@/lib/supabase/types";
import type { CalculatedNutrition } from "@/lib/nutrition/calc-engine";
import {
  Search,
  X,
  Flame,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface AddFoodModalProps {
  isOpen: boolean;
  date: string;
  mealType: MealType;
  onClose: () => void;
  onFoodLogged: () => void;
}

const CATEGORIES: { label: string; value: FoodCategory | "all" }[] = [
  { label: "All Items", value: "all" },
  { label: "Rice & Grains", value: "rice_grains" },
  { label: "Millets", value: "millets" },
  { label: "Wheat & Roti", value: "wheat_flours" },
  { label: "Dals & Pulses", value: "dals_pulses" },
  { label: "Dairy & Curd", value: "dairy" },
  { label: "Poultry & Eggs", value: "poultry_eggs" },
  { label: "South Breakfast", value: "breakfast_south" },
  { label: "South Gravies", value: "lunch_dinner_south" },
  { label: "Gym & Fitness", value: "gym_diet" },
  { label: "Oils & Ghee", value: "oils_fats" },
  { label: "Snacks & Sweets", value: "snacks_tamil" },
  { label: "Vegetables & Fruits", value: "vegetables" },
];

export function AddFoodModal({
  isOpen,
  date,
  mealType,
  onClose,
  onFoodLogged,
}: AddFoodModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all">("all");
  const [selectedState, setSelectedState] = useState<FoodState | "all">("all");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFood(null);
      setSearchTerm("");
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

  if (!isOpen) return null;

  const mealTitle =
    mealType.charAt(0).toUpperCase() + mealType.slice(1);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {selectedFood && (
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
                title="Back to search"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Add Food to {mealTitle}
              </h2>
              <p className="text-[11px] text-slate-400">
                {date} • Verified South Indian Database
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

        {logError && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {logError}
          </div>
        )}

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {selectedFood ? (
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
              {/* Search Bar */}
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
          )}
        </div>
      </div>
    </div>
  );
}

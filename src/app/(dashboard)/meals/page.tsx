"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FoodDetailCard } from "@/components/nutrition/FoodDetailCard";
import { searchFoods } from "@/lib/nutrition/food-service";
import type { Food, FoodCategory, FoodState } from "@/lib/supabase/types";
import type { CalculatedNutrition } from "@/lib/nutrition/calc-engine";
import {
  Search,
  ArrowLeft,
  Flame,
  CheckCircle2,
  ChevronRight,
  BookOpen,
} from "lucide-react";

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

export default function MealsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | "all">("all");
  const [selectedState, setSelectedState] = useState<FoodState | "all">("all");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [stagedMeals, setStagedMeals] = useState<CalculatedNutrition[]>([]);

  useEffect(() => {
    const results = searchFoods({
      query: searchTerm,
      category: selectedCategory,
      state: selectedState,
      limit: 25,
    });
    setSearchResults(results.map((r) => r.food));
  }, [searchTerm, selectedCategory, selectedState]);

  const handleAddToMeal = (item: CalculatedNutrition) => {
    setStagedMeals((prev) => [item, ...prev]);
  };

  const totalStagedCalories = stagedMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalStagedProtein = stagedMeals.reduce((acc, m) => acc + m.protein, 0);

  return (
    <div className="space-y-4">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Food Nutrition Search
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified Indian & Tamil Food Database (IFCT 2017)
            </p>
          </div>
        </div>
      </div>

      {/* Selected Food Detail Card Modal / Panel */}
      {selectedFood && (
        <div className="animate-in fade-in zoom-in-95 duration-150">
          <FoodDetailCard
            food={selectedFood}
            onClose={() => setSelectedFood(null)}
            onAddToMeal={handleAddToMeal}
          />
        </div>
      )}

      {/* Staged Meals Banner if items were added */}
      {stagedMeals.length > 0 && (
        <Card className="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Staged Meal Items ({stagedMeals.length})
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {Math.round(totalStagedCalories)} kcal • {Math.round(totalStagedProtein * 10) / 10}g P
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {stagedMeals.map((item, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300"
              >
                {item.foodName} ({item.inputQuantity} {item.inputUnit})
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Search Input Box */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search rice, satham, dosa, idli, thayir, paneer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-4 py-3 text-sm rounded-2xl shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
      </div>

      {/* State Filter Pills (Raw vs Cooked vs All) */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
          State:
        </span>
        <div className="flex gap-1.5">
          {(["all", "cooked", "raw"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedState(st)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedState === st
                  ? st === "raw"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {st === "all" ? "All States" : st === "raw" ? "Raw Only" : "Cooked Only"}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Category Scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              selectedCategory === cat.value
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                : "bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Results List */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Found {searchResults.length} food items</span>
          <span>Click to calculate nutrition</span>
        </div>

        {searchResults.length === 0 ? (
          <Card className="text-center py-10 space-y-2 border-dashed">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No matching Indian foods found
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Try searching by Tanglish (e.g. &apos;soru&apos;, &apos;arisi&apos;, &apos;thayir&apos;) or Tamil script.
            </p>
          </Card>
        ) : (
          searchResults.map((food) => {
            const isRaw = food.state === "raw";
            const isSelected = selectedFood?.id === food.id;

            return (
              <div
                key={food.id}
                onClick={() => setSelectedFood(food)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-emerald-400/60"
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={isRaw ? "amber" : "blue"}>
                      {food.state.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      {food.category.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {food.name_en}
                  </h3>

                  {food.name_ta && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                      {food.name_ta} {food.name_tanglish && `• ${food.name_tanglish}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-end gap-0.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      {food.calories_per_100g}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      kcal / 100g
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block">
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
    </div>
  );
}

"use client";

import React, { useState } from "react";
import type { FoodInputDraft } from "@/lib/ai/draft-model";
import { calculateNutrition } from "@/lib/nutrition/calc-engine";
import { AlertCircle, CheckCircle2, ChevronDown, Trash2, Search, Sparkles } from "lucide-react";
import { SEED_FOODS } from "@/lib/nutrition/food-dataset";

interface DraftReviewCardProps {
  draft: FoodInputDraft;
  onUpdate: (updated: FoodInputDraft) => void;
  onRemove: (id: string) => void;
}

export function DraftReviewCard({ draft, onUpdate, onRemove }: DraftReviewCardProps) {
  const [isEditingFood, setIsEditingFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleQuantityChange = (newQty: number) => {
    if (newQty <= 0 || isNaN(newQty)) return;
    let preview = draft.nutritionPreview;

    if (draft.matchedFood) {
      try {
        preview = calculateNutrition({
          food: draft.matchedFood,
          quantity: newQty,
          unit: draft.unit,
        });
      } catch {
        // keep old preview
      }
    }

    onUpdate({
      ...draft,
      quantity: newQty,
      nutritionPreview: preview,
    });
  };

  const handleUnitChange = (newUnit: string) => {
    let preview = draft.nutritionPreview;
    if (draft.matchedFood) {
      try {
        preview = calculateNutrition({
          food: draft.matchedFood,
          quantity: draft.quantity,
          unit: newUnit,
        });
      } catch {
        // keep old preview
      }
    }

    onUpdate({
      ...draft,
      unit: newUnit,
      nutritionPreview: preview,
    });
  };

  const handleSelectAlternative = (altId: string) => {
    const food = SEED_FOODS.find((f) => f.id === altId);
    if (food) {
      let preview = null;
      try {
        preview = calculateNutrition({
          food,
          quantity: draft.quantity,
          unit: draft.unit,
        });
      } catch {
        try {
          preview = calculateNutrition({
            food,
            quantity: draft.quantity,
            unit: "g",
          });
        } catch {
          // ignore
        }
      }

      onUpdate({
        ...draft,
        matchedFoodId: food.id,
        matchedFood: food,
        matchedRecipeId: null,
        matchedRecipe: null,
        cookingState: food.state,
        isAmbiguous: false,
        ambiguityReason: undefined,
        nutritionPreview: preview,
      });
      setIsEditingFood(false);
    }
  };

  const availableUnits = [
    "g",
    "katori",
    "cup",
    "piece",
    "plate",
    "ladle",
    "tbsp",
    "tumbler",
  ];

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-sm space-y-3">
      {/* Top Header: Candidate Name, Confidence & Remove */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-base">
              {draft.matchedFood ? draft.matchedFood.name_en : draft.candidateName}
            </h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                draft.confidence === "high"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : draft.confidence === "medium"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              AI Confidence: {draft.confidence.charAt(0).toUpperCase() + draft.confidence.slice(1)}
            </span>
          </div>

          {draft.matchedFood?.name_ta && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {draft.matchedFood.name_ta} • {draft.matchedFood.state}
            </p>
          )}
        </div>

        <button
          onClick={() => onRemove(draft.id)}
          className="text-stone-400 hover:text-rose-600 transition-colors p-1"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Ambiguity or Warning Alert */}
      {draft.isAmbiguous && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium">Please review this food</p>
            <p className="mt-0.5 opacity-90">{draft.ambiguityReason || "Food not confidently identified."}</p>
          </div>
        </div>
      )}

      {/* Suggested Alternative Foods or Recipes */}
      {draft.suggestedAlternatives.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Suggested Matches:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {draft.suggestedAlternatives.slice(0, 3).map((alt) => (
              <button
                key={alt.id}
                onClick={() => handleSelectAlternative(alt.id)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  draft.matchedFoodId === alt.id
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-medium"
                    : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100"
                }`}
              >
                {alt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity & Unit Controls */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <label className="text-xs text-stone-500 dark:text-stone-400 font-medium block mb-1">
            Portion Quantity
          </label>
          <input
            type="number"
            min="0.1"
            step="any"
            value={draft.quantity}
            onChange={(e) => handleQuantityChange(parseFloat(e.target.value))}
            className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="text-xs text-stone-500 dark:text-stone-400 font-medium block mb-1">
            Unit
          </label>
          <select
            value={draft.unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculated Nutrition Preview */}
      {draft.nutritionPreview ? (
        <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
              {Math.round(draft.nutritionPreview.calories)} kcal
            </span>
            <span className="text-stone-500 dark:text-stone-400 ml-1.5">
              ({Math.round(draft.nutritionPreview.effectiveWeightGrams)}g)
            </span>
          </div>
          <div className="flex items-center gap-3 text-stone-600 dark:text-stone-300 font-medium">
            <span>P: {draft.nutritionPreview.protein}g</span>
            <span>C: {draft.nutritionPreview.carbs}g</span>
            <span>F: {draft.nutritionPreview.fat}g</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-amber-600 dark:text-amber-400 italic">
          Select or confirm food above to preview nutrition.
        </div>
      )}

      {/* Visual Assumptions & Disclaimers */}
      {draft.assumptions.length > 0 && (
        <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">
          Assumption: {draft.assumptions.join(". ")}
        </p>
      )}
    </div>
  );
}

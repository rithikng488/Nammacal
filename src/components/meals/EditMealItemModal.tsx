"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getFoodById } from "@/lib/nutrition/food-service";
import { calculateNutrition, type CalculatedNutrition } from "@/lib/nutrition/calc-engine";
import type { MealItem } from "@/lib/supabase/types";
import {
  X,
  Flame,
  Trash2,
  Check,
  Scale,
  AlertTriangle,
} from "lucide-react";

interface EditMealItemModalProps {
  item: MealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  onItemDeleted: () => void;
}

export function EditMealItemModal({
  item,
  isOpen,
  onClose,
  onItemUpdated,
  onItemDeleted,
}: EditMealItemModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("g");
  const [calculation, setCalculation] = useState<CalculatedNutrition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setUnit(item.unit);
      setError(null);
    }
  }, [item]);

  // Recalculate preview
  useEffect(() => {
    if (!item) return;

    if (quantity <= 0) {
      setCalculation(null);
      return;
    }

    if (item.food_id) {
      const food = getFoodById(item.food_id);
      if (food) {
        try {
          const calc = calculateNutrition({ food, quantity, unit });
          setCalculation(calc);
          return;
        } catch {
          // Fall back to proportional calculation
        }
      }
    }

    // Proportional preview fallback
    const ratio = quantity / (item.quantity || 1);
    setCalculation({
      foodId: item.food_id || "",
      foodName: item.food_name,
      state: item.food_state,
      inputQuantity: quantity,
      inputUnit: unit,
      effectiveWeightGrams: Math.round(item.gram_weight * ratio),
      calories: Math.round(item.calories * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs: Math.round(item.carbs * ratio * 10) / 10,
      fat: Math.round(item.fat * ratio * 10) / 10,
      fiber: Math.round(item.fiber * ratio * 10) / 10,
      sugar: item.sugar !== null ? Math.round(item.sugar * ratio * 10) / 10 : null,
      sodiumMg: item.sodium_mg !== null ? Math.round(item.sodium_mg * ratio * 10) / 10 : null,
      isEstimatedPortion: item.is_estimated_portion,
      portionAssumption: item.portion_assumption || undefined,
      dataProvenance: item.data_provenance,
      sourceReference: item.source_reference || "",
    });
  }, [item, quantity, unit]);

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    if (quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(`/api/meals/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, unit }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update item");
      }

      onItemUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const res = await fetch(`/api/meals/items/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete item");
      }

      onItemDeleted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const food = item.food_id ? getFoodById(item.food_id) : null;
  const portions = food?.standard_portions || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Badge variant={item.food_state === "raw" ? "amber" : "blue"}>
                {item.food_state.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-400">Edit Meal Entry</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {item.food_name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Portion & Quantity Inputs */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Portion Unit
            </label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="g">grams (g)</option>
              <option value="kg">kilograms (kg)</option>
              <option value="tbsp">tablespoon (tbsp)</option>
              <option value="tsp">teaspoon (tsp)</option>
              {portions.map((p) => (
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
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Real-time Recalculated Preview */}
        {calculation && (
          <Card className="p-3.5 bg-slate-50 dark:bg-slate-850/80 border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-500" />
                Updated Energy
              </span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                {calculation.calories} <span className="text-xs font-normal">kcal</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>
                <Scale className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                {calculation.effectiveWeightGrams} g
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {calculation.protein}g Protein
              </span>
              <span>{calculation.carbs}g Carbs</span>
              <span>{calculation.fat}g Fat</span>
            </div>

            {calculation.isEstimatedPortion && (
              <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {calculation.portionAssumption || "Standard household estimate"}
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="px-3"
            title="Delete this entry"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isDeleting || quantity <= 0}
            className="flex-1 gap-1.5"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

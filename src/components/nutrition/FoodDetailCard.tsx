"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { calculateNutrition, type CalculatedNutrition } from "@/lib/nutrition/calc-engine";
import {
  Flame,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Sparkles,
} from "lucide-react";
import type { Food } from "@/lib/supabase/types";

interface FoodDetailCardProps {
  food: Food;
  onClose?: () => void;
  onAddToMeal?: (item: CalculatedNutrition) => void;
}

export function FoodDetailCard({ food, onClose, onAddToMeal }: FoodDetailCardProps) {
  // Available unit options: standard metric + food-specific portions
  const portions = food.standard_portions || [];
  const defaultUnit = portions.length > 0 ? portions[0].unit : food.serving_unit_default || "g";
  const defaultQty = portions.length > 0 ? 1 : food.serving_size_default || 100;

  const [quantity, setQuantity] = useState<number>(defaultQty);
  const [unit, setUnit] = useState<string>(defaultUnit);
  const [calculation, setCalculation] = useState<CalculatedNutrition | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    try {
      setCalcError(null);
      if (quantity > 0) {
        const result = calculateNutrition({ food, quantity, unit });
        setCalculation(result);
      } else {
        setCalculation(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCalcError(err.message);
      }
      setCalculation(null);
    }
  }, [food, quantity, unit]);

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    // If switching to grams/ml, default to 100, if switching to piece/katori, default to 1
    if (newUnit === "g" || newUnit === "ml") {
      setQuantity(100);
    } else {
      setQuantity(1);
    }
  };

  const handleAdd = () => {
    if (calculation) {
      setIsAdded(true);
      if (onAddToMeal) onAddToMeal(calculation);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const isRaw = food.state === "raw";

  return (
    <Card className="space-y-4 border-2 border-emerald-500/20 shadow-lg relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header & Identification */}
      <div className="space-y-1 pr-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={isRaw ? "amber" : "blue"}>
            {food.state.toUpperCase()}
          </Badge>
          <Badge variant="slate">
            {food.category.replace(/_/g, " ")}
          </Badge>
          {food.is_verified && (
            <Badge variant="emerald">
              <ShieldCheck className="w-3 h-3 inline mr-0.5" />
              Verified
            </Badge>
          )}
        </div>

        <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
          {food.name_en}
        </h2>

        {food.name_ta && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 font-sans">
            {food.name_ta} {food.name_tanglish && `(${food.name_tanglish})`}
          </p>
        )}
      </div>

      {/* Raw vs Cooked Critical Notice */}
      <div
        className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
          isRaw
            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
            : "bg-blue-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60 text-sky-800 dark:text-sky-300"
        }`}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-tight">
          {isRaw ? (
            <span>
              <b>Raw Ingredient:</b> Values reflect uncooked weight before cooking water absorption. Do not use for cooked portions.
            </span>
          ) : (
            <span>
              <b>Cooked Dish:</b> Values reflect ready-to-eat cooked weight including absorbed water and standard preparation oil.
            </span>
          )}
        </div>
      </div>

      {/* Portion & Quantity Controls */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Portion / Unit
          </label>
          <select
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
          >
            <option value="g">grams (g)</option>
            <option value="kg">kilograms (kg)</option>
            {food.serving_unit_default === "ml" && <option value="ml">millilitres (ml)</option>}
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

      {/* Estimation Disclaimer if Portion is an Indian household measure */}
      {calculation?.isEstimatedPortion && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {calculation.portionAssumption || "Portion weight is a standard household estimate."}
          </span>
        </div>
      )}

      {calcError && (
        <p className="text-xs text-rose-500 font-medium">{calcError}</p>
      )}

      {/* Real-Time Nutrition Result Preview */}
      {calculation && (
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Main Calorie Badge */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wide">
                  Calculated Energy
                </span>
                <div className="text-2xl font-black tracking-tight leading-none mt-0.5">
                  {calculation.calories}{" "}
                  <span className="text-xs font-normal text-emerald-200">kcal</span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-emerald-200 block text-[11px]">Weight</span>
              <span className="font-bold text-white flex items-center justify-end gap-1">
                <Scale className="w-3.5 h-3.5" />
                {calculation.effectiveWeightGrams} g
              </span>
            </div>
          </div>

          {/* Macro Breakdown Pills */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Protein</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {calculation.protein}g
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Carbs</span>
              <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                {calculation.carbs}g
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Fat</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {calculation.fat}g
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Fiber</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {calculation.fiber}g
              </span>
            </div>
          </div>

          {/* Micronutrient Footnotes */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Sugar: {calculation.sugar !== null ? `${calculation.sugar}g` : "N/A"}</span>
            <span>Sodium: {calculation.sodiumMg !== null ? `${calculation.sodiumMg}mg` : "N/A"}</span>
          </div>

          {/* Reputable Source Footnote */}
          <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span className="truncate">Source: {food.source_reference}</span>
            <span className="font-semibold text-emerald-600 shrink-0 ml-2">Verified IFCT</span>
          </div>

          {/* Add to Meal Action Button */}
          <Button
            onClick={handleAdd}
            className="w-full gap-2 py-3"
            variant="primary"
          >
            {isAdded ? (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Added to Meal!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Select & Add to Meal ({calculation.calories} kcal)</span>
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

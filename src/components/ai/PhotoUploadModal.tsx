"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, AlertCircle, Sparkles, Check } from "lucide-react";
import type { FoodInputDraft } from "@/lib/ai/draft-model";
import type { MealType } from "@/lib/supabase/types";
import { DraftReviewCard } from "./DraftReviewCard";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMealType?: MealType;
  selectedDate?: string;
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMealType = "lunch",
  selectedDate,
}: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FoodInputDraft[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5 MB.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setDrafts([]);
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", selectedFile);
    formData.append("mealType", mealType);

    try {
      const response = await fetch("/api/ai/analyze-food-photo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze meal photo.");
      }

      setDrafts(data.drafts || []);
      setDisclaimer(
        data.disclaimer ||
          "Portions estimated from photo. Oil and hidden ingredients cannot be reliably measured from an image. Review before saving."
      );
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateDraft = (updated: FoodInputDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleRemoveDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleConfirmAndSave = async () => {
    if (drafts.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        date: selectedDate || new Date().toISOString().split("T")[0],
        mealType,
        items: drafts.map((d) => ({
          foodId: d.matchedFoodId || undefined,
          recipeId: d.matchedRecipeId || undefined,
          customFoodName: !d.matchedFoodId && !d.matchedRecipeId ? d.candidateName : undefined,
          quantity: d.quantity,
          unit: d.unit,
          provenance: d.provenance,
          portionAssumption: d.assumptions.join(". ") || undefined,
          isEstimatedPortion: true,
        })),
      };

      const response = await fetch("/api/meals/confirm-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save confirmed items.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCalories = Math.round(
    drafts.reduce((acc, d) => acc + (d.nutritionPreview?.calories || 0), 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                AI Food Photo Analysis
              </h3>
              <p className="text-xs text-stone-500">Estimates dishes & portions for your review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <p>{error}</p>
            </div>
          )}

          {/* Upload or Take Photo Step */}
          {drafts.length === 0 && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 aspect-video flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Meal preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-stone-900/70 text-white rounded-full p-1.5 hover:bg-stone-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-all space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-stone-800 dark:text-stone-200 text-sm">
                    Tap to Choose or Take a Photo
                  </p>
                  <p className="text-xs text-stone-500">Supports JPEG, PNG, WebP up to 5 MB</p>
                </div>
              )}

              {selectedFile && (
                <button
                  onClick={handleAnalyzePhoto}
                  disabled={isAnalyzing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Meal with South Indian Food AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze Meal Photo
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Review Step: Drafts List */}
          {drafts.length > 0 && (
            <div className="space-y-4">
              {/* Mandatory Disclaimer */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Review AI Estimates Before Saving</p>
                  <p className="mt-0.5 opacity-90">{disclaimer}</p>
                </div>
              </div>

              {/* Target Meal Selector */}
              <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Target Meal Slot:
                </span>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg px-2.5 py-1 text-stone-800 dark:text-stone-100"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <DraftReviewCard
                    key={draft.id}
                    draft={draft}
                    onUpdate={handleUpdateDraft}
                    onRemove={handleRemoveDraft}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {drafts.length > 0 && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-stone-500 block">Total Nutrition Preview</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                {totalCalories} kcal
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDrafts([]);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800"
              >
                Retake
              </button>
              <button
                onClick={handleConfirmAndSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add All to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

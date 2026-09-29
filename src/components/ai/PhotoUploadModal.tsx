"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Check,
  RotateCcw,
  SwitchCamera,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";
import type { FoodInputDraft } from "@/lib/ai/draft-model";
import type { MealType } from "@/lib/supabase/types";
import { DraftReviewCard } from "./DraftReviewCard";
import { useToast } from "@/lib/ui/toast-context";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMealType?: MealType;
  selectedDate?: string;
}

type PhotoInputMode = "select" | "camera" | "preview" | "review";

export function PhotoUploadModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMealType = "lunch",
  selectedDate,
}: PhotoUploadModalProps) {
  const { error: toastError, success: toastSuccess } = useToast();

  const [mode, setMode] = useState<PhotoInputMode>("select");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FoodInputDraft[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  // Cleanup on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setMode("select");
      setSelectedFile(null);
      setPreviewUrl(null);
      setDrafts([]);
      setError(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, stopCameraStream]);

  // Start camera viewfinder when entering "camera" mode
  useEffect(() => {
    let isCancelled = false;

    async function startCamera() {
      if (mode !== "camera") return;
      stopCameraStream();
      setError(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported on this device/browser. Please choose a photo from your gallery.");
        setMode("select");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: unknown) {
        const isDenied = (err as Error).name === "NotAllowedError" || (err as Error).name === "PermissionDeniedError";
        setError(
          isDenied
            ? "Camera permission was denied. Please enable camera access in your browser or pick a photo from your files."
            : "Could not start camera. Please pick a photo from your files."
        );
        setMode("select");
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
    };
  }, [mode, facingMode, stopCameraStream]);

  if (!isOpen) return null;

  // Capture frame from live camera video stream
  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `meal-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCameraStream();
        setMode("preview");
        setError(null);
      },
      "image/jpeg",
      0.9
    );
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

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
      setMode("preview");
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
      setMode("review");
      if (!data.drafts || data.drafts.length === 0) {
        setError("No clear food items detected. You can adjust items or try another photo.");
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to analyze photo.";
      setError(msg);
      toastError(msg);
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

      toastSuccess(`Added ${drafts.length} ${drafts.length === 1 ? "dish" : "dishes"} to ${mealType}!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to save confirmed items.";
      setError(msg);
      toastError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCalories = Math.round(
    drafts.reduce((acc, d) => acc + (d.nutritionPreview?.calories || 0), 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {mode === "camera" || mode === "preview" ? (
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setMode("select");
                }}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors mr-1"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Camera className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                AI Food Photo Analysis
              </h3>
              <p className="text-[11px] text-stone-500">Estimates dishes & portions for your review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-2 rounded-xl transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <p className="font-semibold">Photo Logging Notice</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Hidden File Input for Device Photo Library */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* STEP 1: SELECT MODE (Take Photo vs Choose Library Photo) */}
          {mode === "select" && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Take Photo (Live Camera) */}
                <button
                  type="button"
                  onClick={() => setMode("camera")}
                  className="p-6 rounded-3xl border-2 border-stone-200/80 dark:border-stone-800 hover:border-amber-500 bg-stone-50/60 dark:bg-stone-850/40 hover:bg-amber-50/20 transition-all flex flex-col items-center justify-center text-center space-y-2.5 group active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Take Photo
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Open live camera viewfinder
                    </p>
                  </div>
                </button>

                {/* Option B: Choose from Library */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-3xl border-2 border-stone-200/80 dark:border-stone-800 hover:border-emerald-500 bg-stone-50/60 dark:bg-stone-850/40 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center text-center space-y-2.5 group active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Choose Photo
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Upload from phone or gallery
                    </p>
                  </div>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-[11px] text-stone-500 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <b>Tip:</b> Take a top-down picture of your plate in good lighting for best recognition of South Indian curries, rice, idlis, and dosas.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: LIVE CAMERA VIEWFINDER */}
          {mode === "camera" && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-square sm:aspect-video flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Framing Overlay */}
                <div className="absolute inset-6 border-2 border-white/50 border-dashed rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                    Align meal plate inside frame
                  </span>
                </div>

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                  title="Switch camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </div>

              {/* Shutter Capture Button */}
              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setMode("select");
                  }}
                  className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCaptureFromCamera}
                  className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center ring-4 ring-amber-200 dark:ring-amber-900/60 shadow-lg active:scale-95 transition-all"
                  title="Capture photo"
                >
                  <Camera className="w-8 h-8" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900"
                >
                  Gallery
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & ANALYZE */}
          {mode === "preview" && previewUrl && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-850 aspect-video flex items-center justify-center shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Meal preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Target Meal Slot:
                </span>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="text-xs font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl px-3 py-1.5 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setMode("select");
                  }}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Choose Another</span>
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzePhoto}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Food AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Meal Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW DRAFTS */}
          {mode === "review" && (
            <div className="space-y-4">
              {/* Mandatory AI Estimation Disclaimer */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <p className="font-bold">Review AI Estimates Before Saving</p>
                  <p className="text-[11px] opacity-90">{disclaimer}</p>
                </div>
              </div>

              {/* Target Meal Selector */}
              <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Target Meal Slot:
                </span>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="text-xs font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl px-3 py-1.5 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
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

        {/* Footer Actions in Review Mode */}
        {mode === "review" && drafts.length > 0 && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[11px] text-stone-500 block">Total Nutrition Preview</span>
              <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {totalCalories} kcal
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrafts([]);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setMode("select");
                }}
                className="px-3 py-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 rounded-xl transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</span>
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

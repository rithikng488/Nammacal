"use client";

import React, { useState, useRef } from "react";
import { Mic, MicOff, X, Loader2, AlertCircle, Sparkles, Check, Play, Square } from "lucide-react";
import type { FoodInputDraft } from "@/lib/ai/draft-model";
import type { MealType } from "@/lib/supabase/types";
import { DraftReviewCard } from "./DraftReviewCard";

interface VoiceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMealType?: MealType;
  selectedDate?: string;
}

export function VoiceLogModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMealType = "lunch",
  selectedDate,
}: VoiceLogModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [typedInput, setTypedInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FoodInputDraft[]>([]);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  if (!isOpen) return null;

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlobResult = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlobResult);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied or not supported. You can type what you ate below.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscribeAndParse = async (blobToUpload?: Blob | null, textQuery?: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      let response: Response;

      if (blobToUpload) {
        const formData = new FormData();
        formData.append("audio", blobToUpload, "recording.webm");
        formData.append("mealType", mealType);

        response = await fetch("/api/ai/transcribe-voice", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/ai/transcribe-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textQuery || typedInput, mealType }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process voice input.");
      }

      setTranscript(data.transcript || textQuery || typedInput);
      setDrafts(data.drafts || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
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
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Voice Food Logging
              </h3>
              <p className="text-xs text-stone-500">English, Tamil, and Tanglish spoken food logging</p>
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

          {drafts.length === 0 ? (
            <div className="space-y-5">
              {/* Record Button UI */}
              <div className="text-center py-6 space-y-3">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all shadow-lg ${
                    isRecording
                      ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>

                <div>
                  <p className="font-semibold text-stone-800 dark:text-stone-200 text-sm">
                    {isRecording ? `Recording... (${recordingSeconds}s)` : "Tap to Speak"}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Try: &quot;200 gram soru and oru katori sambar for lunch&quot; or &quot;2 idli and one egg&quot;
                  </p>
                </div>

                {audioBlob && !isRecording && (
                  <button
                    onClick={() => handleTranscribeAndParse(audioBlob)}
                    disabled={isProcessing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow mt-3 disabled:opacity-50 text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transcribing & Matching Food...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Transcribe Audio
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Text Input Fallback */}
              <div className="relative border-t border-stone-200 dark:border-stone-800 pt-4">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1.5">
                  Or Type in Tanglish / English:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. rendu idli, oru cup sambar, 1 egg"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && typedInput.trim()) {
                        handleTranscribeAndParse(null, typedInput);
                      }
                    }}
                    className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleTranscribeAndParse(null, typedInput)}
                    disabled={isProcessing || !typedInput.trim()}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold px-4 py-2 rounded-xl text-xs hover:opacity-90 disabled:opacity-50"
                  >
                    Parse
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Transcript Display */}
              <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Transcript:
                </span>
                <p className="text-sm text-stone-800 dark:text-stone-200 font-medium italic mt-0.5">
                  &quot;{transcript}&quot;
                </p>
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
                    onUpdate={(updated) =>
                      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
                    }
                    onRemove={(id) => setDrafts((prev) => prev.filter((d) => d.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
                  setAudioBlob(null);
                  setTranscript("");
                }}
                className="px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800"
              >
                Re-record
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

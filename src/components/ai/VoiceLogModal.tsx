"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Check,
  RotateCcw,
  Square,
  Volume2,
  ArrowRight,
} from "lucide-react";
import type { FoodInputDraft } from "@/lib/ai/draft-model";
import type { MealType } from "@/lib/supabase/types";
import { DraftReviewCard } from "./DraftReviewCard";
import { useToast } from "@/lib/ui/toast-context";

interface VoiceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMealType?: MealType;
  selectedDate?: string;
}

/**
 * Detects the best supported audio MIME type for the user's browser/platform.
 */
export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "audio/webm";
  }

  const candidateTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

/**
 * Formats elapsed seconds into MM:SS format.
 */
function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export function VoiceLogModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMealType = "lunch",
  selectedDate,
}: VoiceLogModalProps) {
  const { error: toastError, success: toastSuccess } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [typedInput, setTypedInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FoodInputDraft[]>([]);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop any active stream/timer when modal unmounts or closes
  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanupStream();
      setIsRecording(false);
      setRecordingSeconds(0);
      setAudioBlob(null);
      setTranscript("");
      setDrafts([]);
      setError(null);
      setTypedInput("");
    }
    return () => {
      cleanupStream();
    };
  }, [isOpen, cleanupStream]);

  if (!isOpen) return null;

  const handleTranscribeAndParse = async (blobToUpload?: Blob | null, textQuery?: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      let response: Response;

      if (blobToUpload) {
        const detectedMime = getSupportedAudioMimeType() || "audio/webm";
        const ext = detectedMime.includes("mp4") || detectedMime.includes("aac") ? "mp4" : "webm";
        const formData = new FormData();
        formData.append("audio", blobToUpload, `voice-log.${ext}`);
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
      if (!data.drafts || data.drafts.length === 0) {
        setError("No recognized foods found. Try speaking dish names and portions clearly.");
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to process voice input.";
      setError(msg);
      toastError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser. You can type what you ate below.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setHasMicPermission(true);

      const mimeType = getSupportedAudioMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: finalMime });
        setAudioBlob(recordedBlob);
        // Release hardware mic tracks immediately
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        // Auto-transcribe upon recording completion
        if (audioChunksRef.current.length > 0) {
          handleTranscribeAndParse(recordedBlob);
        }
      };

      // Use 250ms timeslice to ensure continuous chunk delivery across mobile browsers
      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      setHasMicPermission(false);
      const isDenied = (err as Error).name === "NotAllowedError" || (err as Error).name === "PermissionDeniedError";
      setError(
        isDenied
          ? "Microphone permission was denied. Please allow microphone access in your browser settings or type what you ate below."
          : "Could not access microphone. You can type what you ate below."
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false);
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const cancelRecording = () => {
    cleanupStream();
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioBlob(null);
    audioChunksRef.current = [];
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

  const sampleTanglishPrompts = [
    "2 idli and 1 cup sambar",
    "200g soru with rasam and 1 boiled egg",
    "1 dosa and 2 spoon coconut chutney",
    "oru cup curd rice and pickle",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Voice Food Logging
              </h3>
              <p className="text-[11px] text-stone-500">English, Tamil, and Tanglish spoken food logging</p>
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
                <p className="font-semibold">Voice Logging Notice</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}

          {drafts.length === 0 ? (
            <div className="space-y-5">
              {/* Record State Card */}
              <div className="p-6 rounded-3xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 text-center space-y-4">
                {isProcessing ? (
                  <div className="py-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto animate-spin">
                      <Loader2 className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                      Transcribing Spoken Food...
                    </p>
                    <p className="text-xs text-stone-500">
                      Detecting Tamil, Tanglish and English dish names & portions
                    </p>
                  </div>
                ) : isRecording ? (
                  <div className="py-4 space-y-4">
                    {/* Active Recording UI */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping" />
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="relative w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-900/20 transition-transform active:scale-95 group"
                      >
                        <Square className="w-8 h-8 fill-current" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                        <span>Recording: {formatSeconds(recordingSeconds)}</span>
                      </div>
                      <p className="text-xs text-stone-500">
                        Tap square to stop & auto-transcribe
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel recording
                    </button>
                  </div>
                ) : (
                  <div className="py-3 space-y-3">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <Mic className="w-9 h-9" />
                    </button>

                    <div className="space-y-1">
                      <p className="font-bold text-stone-900 dark:text-stone-100 text-base">
                        Tap to Speak Meal
                      </p>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        Speak naturally in Tanglish, Tamil, or English.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Prompts */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Try saying or typing:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {sampleTanglishPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setTypedInput(prompt);
                        handleTranscribeAndParse(null, prompt);
                      }}
                      className="text-left p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:border-indigo-500/60 transition-all text-xs text-stone-700 dark:text-stone-300 flex items-center justify-between group active:scale-[0.99]"
                    >
                      <span className="truncate">&quot;{prompt}&quot;</span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-600 shrink-0 ml-1 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input Fallback */}
              <div className="border-t border-stone-200/80 dark:border-stone-800 pt-4 space-y-2">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Or Type in Tanglish / English:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. rendu idli, oru katori sambar, 1 egg"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && typedInput.trim()) {
                        handleTranscribeAndParse(null, typedInput);
                      }
                    }}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTranscribeAndParse(null, typedInput)}
                    disabled={isProcessing || !typedInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs disabled:opacity-50 transition-all shrink-0"
                  >
                    Parse
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Transcript Display */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  Recognized Spoken Food:
                </span>
                <p className="text-xs text-stone-800 dark:text-stone-200 font-semibold italic">
                  &quot;{transcript}&quot;
                </p>
              </div>

              {/* Target Meal Selector */}
              <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Target Meal Slot:
                </span>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="text-xs font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl px-3 py-1.5 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500"
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
                  setAudioBlob(null);
                  setTranscript("");
                }}
                className="px-3 py-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record</span>
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

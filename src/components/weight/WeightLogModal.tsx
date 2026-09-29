"use client";

import React, { useState, useEffect } from "react";
import { X, Scale, Trash2, Calendar, Loader2, Check } from "lucide-react";
import type { WeightLog } from "@/lib/supabase/types";

interface WeightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWeight?: number;
}

export function WeightLogModal({
  isOpen,
  onClose,
  onSuccess,
  initialWeight,
}: WeightLogModalProps) {
  const [weightKg, setWeightKg] = useState<string>(initialWeight ? String(initialWeight) : "70.0");
  const [loggedAt, setLoggedAt] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      if (initialWeight) {
        setWeightKg(String(initialWeight));
      }
    }
  }, [isOpen, initialWeight]);

  if (!isOpen) return null;

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/weight?limit=5");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch {
      // non-critical
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = parseFloat(weightKg);

    if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 400) {
      setError("Please enter a valid weight between 20.0 kg and 400.0 kg.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: parsedWeight,
          loggedAt,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log weight");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this weight entry?")) return;

    try {
      const res = await fetch(`/api/weight/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        onSuccess();
      }
    } catch {
      alert("Failed to delete weight log.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Record Body Weight
              </h3>
              <p className="text-[11px] text-stone-500">Track changes in kilograms</p>
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
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Weight Input with Stepper */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                Weight (kg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 70.4"
                  required
                  className="flex-1 text-2xl font-bold px-4 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-stone-500 pr-2">kg</span>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Date Logged</span>
              </label>
              <input
                type="date"
                value={loggedAt}
                onChange={(e) => setLoggedAt(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Optional Note */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Morning, before breakfast"
                maxLength={200}
                className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Weight Entry
                </>
              )}
            </button>
          </form>

          {/* Recent History List */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
              Recent Weight Logs
            </span>

            {isLoadingHistory ? (
              <div className="text-center py-4 text-xs text-stone-400">Loading history...</div>
            ) : history.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No previous logs found.</p>
            ) : (
              <div className="space-y-1.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {item.weight_kg.toFixed(1)} kg
                      </span>
                      <span className="text-stone-400 ml-2">({item.logged_at})</span>
                      {item.note && (
                        <p className="text-[11px] text-stone-500 italic mt-0.5">{item.note}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

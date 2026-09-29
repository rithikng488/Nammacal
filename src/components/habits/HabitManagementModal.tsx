"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, AlertCircle, Sparkles } from "lucide-react";
import type { HabitWithTodayStatus } from "@/lib/habits/habit-service";
import { PRESET_HABIT_TEMPLATES } from "@/lib/habits/habit-templates";

interface HabitManagementModalProps {
  isOpen: boolean;
  habits: HabitWithTodayStatus[];
  onClose: () => void;
  onSuccess: () => void;
}

export function HabitManagementModal({
  isOpen,
  habits,
  onClose,
  onSuccess,
}: HabitManagementModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create habit.");

      setName("");
      setDescription("");
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPreset = async (preset: { name: string; description: string }) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add habit.");

      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
      if (res.ok) {
        onSuccess();
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto -mt-2 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Manage Habits
            </h2>
            <p className="text-xs text-stone-500">Configure daily routines and habits</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Habits List */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Your Active Habits ({habits.length})
          </label>
          {habits.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No habits added yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block truncate">
                      {h.name}
                    </span>
                    {h.description && (
                      <span className="text-[10px] text-stone-400 block truncate">
                        {h.description}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id)}
                    className="p-1 text-stone-400 hover:text-rose-600 transition-colors shrink-0"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preset Suggestions */}
        <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            Suggested Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_HABIT_TEMPLATES.map((preset) => {
              const alreadyExists = habits.some((h) => h.name.toLowerCase() === preset.name.toLowerCase());
              if (alreadyExists) return null;

              return (
                <button
                  key={preset.name}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAddPreset(preset)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold py-1 px-2.5 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Create Custom Habit */}
        <form onSubmit={handleCreateCustom} className="space-y-3 pt-1 border-t border-stone-100 dark:border-stone-800">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Create Custom Habit
          </label>

          <input
            type="text"
            placeholder="e.g. Read 15 mins before bed"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />

          <input
            type="text"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Habit"}
          </button>
        </form>
      </div>
    </div>
  );
}

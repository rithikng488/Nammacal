import React from "react";
import { cn } from "@/lib/utils";

interface MacroCardProps {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color?: "emerald" | "amber" | "blue" | "rose" | "indigo";
}

export function MacroCard({
  label,
  consumed,
  target,
  unit = "g",
  color = "emerald",
}: MacroCardProps) {
  const percentage = Math.min(100, Math.round((consumed / (target || 1)) * 100));

  const colorStyles = {
    emerald: {
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    amber: {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    blue: {
      bar: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/40",
    },
    rose: {
      bar: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
    indigo: {
      bar: "bg-indigo-500",
      text: "text-indigo-700 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
  };

  const scheme = colorStyles[color];

  return (
    <div className={cn("p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm")}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className={cn("text-[11px] font-bold", scheme.text)}>
          {percentage}%
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {consumed}
        </span>
        <span className="text-xs text-slate-400">
          / {target} {unit}
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", scheme.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

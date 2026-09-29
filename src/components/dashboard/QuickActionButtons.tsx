import React from "react";
import Link from "next/link";
import { PlusCircle, Mic, Camera, BookOpen } from "lucide-react";

export function QuickActionButtons() {
  const actions = [
    {
      title: "Log Food",
      href: "/meals",
      icon: PlusCircle,
      color: "bg-emerald-600 text-white",
      hint: "Search & Portion",
    },
    {
      title: "Recipes",
      href: "/recipes",
      icon: BookOpen,
      color: "bg-blue-600 text-white",
      hint: "Batch Calculations",
    },
    {
      title: "Voice Entry",
      href: "/meals?mode=voice",
      icon: Mic,
      color: "bg-indigo-600 text-white",
      hint: "Speak Tanglish / Tamil",
    },
    {
      title: "Photo AI",
      href: "/meals?mode=scanner",
      icon: Camera,
      color: "bg-amber-600 text-white",
      hint: "Camera Recognition",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Link
            key={act.title}
            href={act.href}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${act.color} shadow-xs group-hover:scale-105 transition-transform`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  {act.title}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium truncate block">
                {act.hint}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

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
      badge: "Phase 3",
    },
    {
      title: "Recipes",
      href: "/recipes",
      icon: BookOpen,
      color: "bg-blue-600 text-white",
      badge: "Phase 4",
    },
    {
      title: "Voice Entry",
      href: "/meals?mode=voice",
      icon: Mic,
      color: "bg-indigo-600 text-white",
      badge: "Phase 5",
    },
    {
      title: "AI Photo",
      href: "/meals?mode=scanner",
      icon: Camera,
      color: "bg-amber-600 text-white",
      badge: "Phase 6",
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
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.color} shadow-sm group-hover:scale-105 transition-transform`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {act.title}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {act.badge}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

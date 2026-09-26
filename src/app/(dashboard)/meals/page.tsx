import React from "react";
import { Card } from "@/components/ui/Card";
import { Utensils, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MealsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Food Logging
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log meals, search Indian foods, and track daily macros.
          </p>
        </div>
      </div>

      <Card className="text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Utensils className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Phase 3: Food Logging Engine
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Phase 1 established project architecture, private invite-only authentication, and database foundation.
            <br /><br />
            Food logging with the South Indian / Tamil nutrition database (IFCT 2017) and deterministic calculation engine will be unlocked in <b>Phase 2 & 3</b>.
          </p>
        </div>
      </Card>
    </div>
  );
}

import React from "react";
import { Card } from "@/components/ui/Card";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RecipesPage() {
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
            Recipe Calculator
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Build custom recipes and calculate exact nutrition per serving.
          </p>
        </div>
      </div>

      <Card className="text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Phase 4: Recipe Calculator
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Multi-ingredient recipe composition, batch cooking yields, and per-serving nutrition scaling will be unlocked in <b>Phase 4</b>.
          </p>
        </div>
      </Card>
    </div>
  );
}

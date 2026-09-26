import React from "react";
import { UtensilsCrossed, Lock } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 mb-2">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Namma<span className="text-emerald-600">Cal</span>
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
              <Lock className="w-2.5 h-2.5" /> Invite Only
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Private nutrition, macro, and activity tracker focused on Indian & Tamil cuisine.
          </p>
        </div>

        {children}

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Strict Zero-Public-Access Policy • Unauthorized attempts logged
        </p>
      </div>
    </div>
  );
}

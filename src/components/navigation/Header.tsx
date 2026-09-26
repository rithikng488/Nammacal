"use client";

import React from "react";
import Link from "next/link";
import { UtensilsCrossed, ShieldCheck, User } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { UserRole } from "@/lib/supabase/types";

interface HeaderProps {
  userEmail?: string;
  role?: UserRole;
}

export function Header({ userEmail, role }: HeaderProps) {
  const getBadgeVariant = (userRole?: UserRole) => {
    switch (userRole) {
      case "owner":
        return "amber";
      case "admin":
        return "blue";
      default:
        return "emerald";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-900/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Namma<span className="text-emerald-600">Cal</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold tracking-wide uppercase">
                Private
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {role && (
            <Badge variant={getBadgeVariant(role)}>
              {role === "owner" && <ShieldCheck className="w-3 h-3 inline mr-0.5 text-amber-500" />}
              {role.toUpperCase()}
            </Badge>
          )}
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={userEmail || "Profile"}
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

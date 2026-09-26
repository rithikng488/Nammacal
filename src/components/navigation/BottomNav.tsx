"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Utensils, BookOpen, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";

interface BottomNavProps {
  role?: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const isAdmin = role === "owner" || role === "admin";

  const navItems = [
    { label: "Dashboard", href: "/", icon: Home },
    { label: "Meals", href: "/meals", icon: Utensils },
    { label: "Recipes", href: "/recipes", icon: BookOpen },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: Shield }] : []),
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 min-w-[56px]",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive && "bg-emerald-50 dark:bg-emerald-950/60"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.2]" : "stroke-[1.8]")} />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

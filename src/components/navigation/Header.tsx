"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  ShieldCheck,
  User,
  Home,
  Utensils,
  BookOpen,
  Shield,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import type { UserRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userEmail?: string;
  role?: UserRole;
}

export function Header({ userEmail, role }: HeaderProps) {
  const pathname = usePathname();
  const isAdmin = role === "owner" || role === "admin";

  const navLinks = [
    { label: "Dashboard", href: "/", icon: Home },
    { label: "Meals", href: "/meals", icon: Utensils },
    { label: "Recipes", href: "/recipes", icon: BookOpen },
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: Shield }] : []),
  ];

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
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
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

        {/* Desktop Navigation Links (Visible on md+ screens) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  isActive
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "stroke-[2.2]" : "stroke-[1.8]")} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Profile Link */}
        <div className="flex items-center gap-2 shrink-0">
          {role && (
            <Badge variant={getBadgeVariant(role)}>
              {role === "owner" && <ShieldCheck className="w-3 h-3 inline mr-0.5 text-amber-500" />}
              {role.toUpperCase()}
            </Badge>
          )}
          <Link
            href="/profile"
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors",
              pathname === "/profile"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
            title={userEmail || "Profile"}
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

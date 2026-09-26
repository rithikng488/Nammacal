"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ShieldAlert, KeyRound, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    errorParam === "account_disabled"
      ? "Your account has been deactivated by the administrator."
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // Check if user is active in profiles
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", data.user.id)
          .single();

        if (profile && profile.status === "disabled") {
          await supabase.auth.signOut();
          setErrorMessage("This account has been deactivated by the administrator.");
          setIsLoading(false);
          return;
        }
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please check your network.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Sign In
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your authorized credentials to access your tracker.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign In
        </Button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Invite-Only Access</p>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-0.5">
              Public self-registration is permanently disabled. Only invited members can register.
            </p>
          </div>
        </div>

        <Link
          href="/register"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Have an invitation code? Register here
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="p-6 text-center text-xs text-slate-400">Loading sign-in form...</Card>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Key, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [invitationCode, setInvitationCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register-with-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitation_code: invitationCode.trim(),
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Registration failed. Please verify your invite code.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Your account has been successfully created and approved! Redirecting to sign in...");
      setIsLoading(false);

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setErrorMessage("Network error occurred while submitting registration. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mb-1">
          <Key className="w-3.5 h-3.5" />
          <span>Invite Activation</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Join NammaCal
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your unique invitation code and setup your credentials.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Invitation Code"
          type="text"
          required
          placeholder="e.g. NC-8K4M-9P2X"
          value={invitationCode}
          onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
          helperText="Single-use code provided by the administrator"
        />

        <Input
          label="Your Email Address"
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="Must match the email address the invitation was issued to"
        />

        <Input
          label="Full Name (Optional)"
          type="text"
          placeholder="e.g. Rithish Kumar"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          label="Choose Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="At least 8 chars, 1 uppercase letter, 1 number"
        />

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!!successMessage}
          className="w-full mt-2"
        >
          Activate & Create Account
        </Button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Already have an account? Sign in
        </Link>
      </div>
    </Card>
  );
}

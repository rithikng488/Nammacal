"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, LogOut, Target, Shield, Mail } from "lucide-react";
import { HealthConnectCard } from "@/components/integrations/HealthConnectCard";
import type { Profile } from "@/lib/supabase/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (data) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      alert("Sign out failed. Please try again.");
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-xs text-slate-400">
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profile & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Your personal nutrition goals and account identity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left Column: Identity & Security */}
        <div className="space-y-4">
          {/* Account Info Card */}
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {profile?.full_name || "NammaCal Member"}
                  </h2>
                  {profile?.role && (
                    <Badge variant={profile.role === "owner" ? "amber" : "emerald"}>
                      {profile.role.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{profile?.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Account Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                  {profile?.status || "Active"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Preferred Language</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  {profile?.preferred_language || "EN"}
                </span>
              </div>
            </div>
          </Card>

          {/* Security Info Card */}
          <Card className="flex items-start gap-3 bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Private Isolation Active</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Your records are secured via PostgreSQL Row Level Security. Only you (and the system owner for administrative audits) have visibility into your data.
              </p>
            </div>
          </Card>

          {/* Sign Out Button */}
          <Button
            variant="outline"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-950 dark:hover:bg-rose-950/40 gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of NammaCal</span>
          </Button>
        </div>

        {/* Right Column: Targets & Integrations */}
        <div className="space-y-4">
          {/* Daily Nutritional Targets */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Daily Nutrition Targets</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Phase 1 Defaults</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Calorie Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_calorie_target || 2000} kcal
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Protein Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_protein_target || 100} g
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Carbohydrates Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_carb_target || 250} g
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Fat Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_fat_target || 65} g
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Fiber Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_fiber_target || 30} g
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Water Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_water_ml_target || 3000} ml
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Daily Step Target</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {profile?.daily_step_target || 8000} steps
                </span>
              </div>
            </div>
          </Card>

          {/* Android Health Connect Integration Card */}
          <HealthConnectCard />
        </div>
      </div>
    </div>
  );
}

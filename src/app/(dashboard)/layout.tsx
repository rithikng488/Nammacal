import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/navigation/Header";
import { BottomNav } from "@/components/navigation/BottomNav";
import type { UserRole } from "@/lib/supabase/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined;
  let role: UserRole = "member";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        role = profile.role;
      }
    }
  } catch (e) {
    console.error("Dashboard layout auth error:", e);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header userEmail={userEmail} role={role} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12">
        {children}
      </main>
      <BottomNav role={role} />
    </div>
  );
}

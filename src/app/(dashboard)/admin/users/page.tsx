"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Power,
  PowerOff,
  UserCheck,
  Calendar,
} from "lucide-react";
import type { Profile, UserStatus, UserRole } from "@/lib/supabase/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setErrorMessage("Forbidden: You do not possess administrator rights.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load users.");
      }

      setUsers(data.users || []);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    const nextStatus: "active" | "disabled" = currentStatus === "active" ? "disabled" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update user status.");
        return;
      }

      fetchUsers();
    } catch {
      alert("Network error updating user status.");
    }
  };

  const handleToggleRole = async (userId: string, currentRole: UserRole) => {
    if (currentRole === "owner") {
      alert("Owner role cannot be modified.");
      return;
    }
    const nextRole: "admin" | "member" = currentRole === "admin" ? "member" : "admin";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update user role.");
        return;
      }

      fetchUsers();
    } catch {
      alert("Network error updating user role.");
    }
  };

  if (errorMessage && errorMessage.includes("Forbidden")) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-3xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-600 dark:text-rose-400" />
        <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
          Access Restricted
        </h2>
        <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-stone-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>User Directory</span>
              <span className="text-xs font-normal text-stone-400">({users.length} members)</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage permissions, roles, and drill into individual user activity timelines.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          isLoading={isLoading}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Users List */}
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
          {users.map((u) => {
            const isOwnerUser = u.role === "owner";
            const isActive = u.status === "active";

            return (
              <div
                key={u.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 dark:text-white truncate">
                      {u.full_name || "NammaCal Member"}
                    </span>
                    <Badge variant={isOwnerUser ? "amber" : u.role === "admin" ? "emerald" : "slate"}>
                      {u.role.toUpperCase()}
                    </Badge>
                    <Badge variant={isActive ? "emerald" : "rose"}>
                      {u.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-x-3">
                    <span>{u.email}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition-colors text-xs"
                  >
                    <span>Audit Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {!isOwnerUser && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRole(u.id, u.role)}
                        className="text-[11px] px-2 py-1 h-8"
                      >
                        {u.role === "admin" ? "Make Member" : "Make Admin"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        className={`text-[11px] px-2 py-1 h-8 ${
                          isActive
                            ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                            : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <PowerOff className="w-3 h-3 mr-1" />
                            <span>Disable</span>
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3 mr-1" />
                            <span>Activate</span>
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

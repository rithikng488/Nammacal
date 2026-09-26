"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
  Users,
  Activity,
  Camera,
  Mic,
  Utensils,
  Smartphone,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  Search,
} from "lucide-react";
import type { Invitation, Profile, UserStatus } from "@/lib/supabase/types";
import type { AuditDashboardStats, AuditEventWithUser } from "@/lib/audit/audit-service";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "users" | "invites">("overview");
  const [stats, setStats] = useState<AuditDashboardStats | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invite generation state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [statsRes, usersRes, invitesRes] = await Promise.all([
        fetch("/api/admin/audit-stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/invitations"),
      ]);

      if (statsRes.status === 403 || usersRes.status === 403 || invitesRes.status === 403) {
        setErrorMessage("Forbidden: Administrator or Owner privileges required.");
        setIsLoading(false);
        return;
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const invitesData = await invitesRes.json();

      if (statsData.stats) setStats(statsData.stats);
      if (usersData.users) setUsers(usersData.users);
      if (invitesData.invitations) setInvitations(invitesData.invitations);
    } catch {
      setErrorMessage("Failed to load administrative audit data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          expires_in_days: expiresInDays,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Failed to generate invite.");
        setIsGenerating(false);
        return;
      }

      setGeneratedInvite(data.invitation);
      setEmail("");
      setIsGenerating(false);
      fetchAdminData();
    } catch {
      setErrorMessage("Network error generating invitation.");
      setIsGenerating(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    const nextStatus: "active" | "disabled" = currentStatus === "active" ? "disabled" : "active";
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to update user status.");
        return;
      }

      fetchAdminData();
    } catch {
      setErrorMessage("Network error updating user status.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return <Badge variant="rose">ERROR</Badge>;
      case "security":
        return <Badge variant="amber">SECURITY</Badge>;
      case "warning":
        return <Badge variant="amber">WARNING</Badge>;
      default:
        return <Badge variant="slate">INFO</Badge>;
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
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin & Audit Center
            </h1>
            <Badge variant="amber">ADMIN ONLY</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time application audit trail, security monitoring, and user management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdminData}
            isLoading={isLoading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs"
              : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          }`}
        >
          Overview
        </button>
        <Link
          href="/admin/activity"
          className="px-3 py-1.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors whitespace-nowrap"
        >
          Activity Feed →
        </Link>
        <Link
          href="/admin/media"
          className="px-3 py-1.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors whitespace-nowrap"
        >
          Food Photos →
        </Link>
        <Link
          href="/admin/users"
          className="px-3 py-1.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors whitespace-nowrap"
        >
          Users ({users.length}) →
        </Link>
        <button
          type="button"
          onClick={() => setActiveTab("invites")}
          className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
            activeTab === "invites"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs"
              : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          }`}
        >
          Invitations ({invitations.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Active Users */}
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                Active Today
              </div>
              <div className="text-xl font-black text-stone-900 dark:text-white">
                {stats?.activeUsersToday ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">Total users: {users.length}</span>
            </div>

            {/* Food Photos */}
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                Food Uploads
              </div>
              <div className="text-xl font-black text-stone-900 dark:text-white">
                {stats?.foodUploadsToday ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">AI analyses today</span>
            </div>

            {/* Voice Logs */}
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Mic className="w-3.5 h-3.5 text-purple-500" />
                Voice Logs
              </div>
              <div className="text-xl font-black text-stone-900 dark:text-white">
                {stats?.voiceLogsToday ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">Transcriptions today</span>
            </div>

            {/* Meals Logged */}
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Utensils className="w-3.5 h-3.5 text-orange-500" />
                Meals Logged
              </div>
              <div className="text-xl font-black text-stone-900 dark:text-white">
                {stats?.mealsLoggedToday ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">Items recorded</span>
            </div>

            {/* Health Connect */}
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Smartphone className="w-3.5 h-3.5 text-teal-500" />
                Health Connect
              </div>
              <div className="text-xl font-black text-stone-900 dark:text-white">
                {stats?.healthConnectSyncsToday ?? 0}
              </div>
              <span className="text-[10px] text-stone-400">Syncs today</span>
            </div>

            {/* Errors / Security */}
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Errors & Sec
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                {(stats?.errorsToday ?? 0) + (stats?.securityEventsToday ?? 0)}
              </div>
              <span className="text-[10px] text-stone-400">
                {stats?.securityEventsToday ?? 0} security events
              </span>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href="/admin/activity"
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Live Activity Audit Feed
                  </h4>
                  <p className="text-[10px] text-stone-400">Search & filter all events</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/media"
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Food Photo Viewer
                  </h4>
                  <p className="text-[10px] text-stone-400">Inspect AI food detections</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/users"
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    User Accounts & Roles
                  </h4>
                  <p className="text-[10px] text-stone-400">Inspect user activity timelines</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Recent Activity Feed Preview */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Recent Audit Events Preview
                </h3>
              </div>
              <Link
                href="/admin/activity"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                View all →
              </Link>
            </div>

            {stats?.recentActivityPreview && stats.recentActivityPreview.length > 0 ? (
              <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                {stats.recentActivityPreview.map((evt) => (
                  <div key={evt.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2.5">
                      {formatSeverityBadge(evt.severity)}
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {evt.event_type.replace(/_/g, " ").toUpperCase()}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {evt.user_name || evt.user_email || "System/Anonymous"} •{" "}
                          {evt.entity_type} {evt.entity_id ? `(${evt.entity_id.slice(0, 8)}...)` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">
                      {new Date(evt.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-400">
                No recent audit events recorded today.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === "invites" && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Issue Private Invitation</span>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Recipient Email
                </label>
                <Input
                  type="email"
                  placeholder="member@nammacal.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Assigned Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "member" | "admin")}
                    className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Expiry (Days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" isLoading={isGenerating} className="w-full">
                Generate Single-Use Code
              </Button>
            </form>

            {generatedInvite && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <span>Invitation Created</span>
                  <Badge variant="emerald">{generatedInvite.role.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-950">
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {generatedInvite.invitation_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedInvite.invitation_code)}
                    className="text-xs text-slate-500 hover:text-emerald-600 p-1"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Active & Historical Invitations */}
          <Card className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Issued Invitations ({invitations.length})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {invitations.map((inv) => {
                const isUsed = !!inv.used_at;
                const isExpired = new Date(inv.expires_at) < new Date() && !isUsed;

                return (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {inv.email}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.invitation_code} • {inv.role}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isUsed ? (
                        <Badge variant="slate">USED</Badge>
                      ) : isExpired ? (
                        <Badge variant="rose">EXPIRED</Badge>
                      ) : (
                        <Badge variant="emerald">ACTIVE</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  Calendar,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Code,
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Smartphone,
  Camera,
  Mic,
} from "lucide-react";
import type { Profile, UserRole, UserStatus } from "@/lib/supabase/types";
import type { AuditEventWithUser } from "@/lib/audit/audit-service";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<AuditEventWithUser[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metadata Modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEventWithUser | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}?page=${page}&pageSize=25`);
      if (res.status === 403) {
        setErrorMessage("Forbidden: You do not possess administrator rights.");
        setIsLoading(false);
        return;
      }
      if (res.status === 404) {
        setErrorMessage("User not found.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load user profile and audit events.");
      }

      setUserProfile(data.user);
      if (data.timeline) {
        setEvents(data.timeline.events || []);
        setTotalEvents(data.timeline.total || 0);
        setTotalPages(data.timeline.totalPages || 1);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const formatSeverityBadge = (sev: string) => {
    switch (sev) {
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

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("photo")) return <Camera className="w-4 h-4 text-sky-500" />;
    if (eventType.includes("voice")) return <Mic className="w-4 h-4 text-purple-500" />;
    if (eventType.includes("health_connect")) return <Smartphone className="w-4 h-4 text-emerald-500" />;
    if (eventType.includes("activity") || eventType.includes("habit")) return <Flame className="w-4 h-4 text-orange-500" />;
    if (eventType.includes("error") || eventType.includes("fail")) return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    return <Activity className="w-4 h-4 text-indigo-500" />;
  };

  if (errorMessage && errorMessage.includes("Forbidden")) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-3xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-600 dark:text-rose-400" />
        <h2 className="text-xl font-bold text-rose-900 dark:text-rose-200">Access Denied</h2>
        <p className="text-sm text-rose-700 dark:text-rose-300">
          This user audit timeline requires active Owner or Administrator privileges.
        </p>
        <Link href="/">
          <Button variant="outline">Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              User Audit Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              User identity details and chronological activity stream
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchUserData}
          disabled={isLoading}
          className="flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Timeline
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* User Info Card */}
      {userProfile && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1 md:col-span-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {userProfile.full_name || "Anonymous Member"}
                </h2>
                <Badge variant={userProfile.role === "owner" ? "blue" : userProfile.role === "admin" ? "amber" : "slate"}>
                  {userProfile.role.toUpperCase()}
                </Badge>
                <Badge variant={userProfile.status === "active" ? "emerald" : "rose"}>
                  {userProfile.status.toUpperCase()}
                </Badge>
              </div>

              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                UID: {userProfile.id}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {userProfile.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined: {new Date(userProfile.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {userProfile.goal && (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 capitalize">
                    Goal: {userProfile.goal.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl flex flex-col justify-center space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Audit Events Recorded</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{totalEvents}</span>
              <span className="text-[11px] text-slate-400">Chronological immutable audit log</span>
            </div>
          </div>
        </Card>
      )}

      {/* Audit Timeline Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Activity Timeline ({totalEvents})
          </h3>
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm">Loading activity audit timeline...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 dark:text-slate-500">
            No audit events recorded for this user yet.
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => (
              <Card
                key={evt.id}
                className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg mt-0.5">
                      {getEventIcon(evt.event_type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {evt.event_type.replace(/_/g, " ")}
                        </span>
                        {formatSeverityBadge(evt.severity)}
                        {evt.entity_type && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                            {evt.entity_type} {evt.entity_id ? `(#${evt.entity_id.slice(0, 8)})` : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(evt.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {evt.ip_hash && (
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                            IP:{evt.ip_hash.slice(0, 10)}
                          </span>
                        )}
                        {evt.user_agent_summary && (
                          <span className="truncate max-w-[200px] text-[11px] text-slate-400">
                            {evt.user_agent_summary}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEvent(evt)}
                        className="text-xs flex items-center gap-1 h-8"
                      >
                        <Code className="w-3 h-3" />
                        Payload
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="flex items-center gap-1 text-xs"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Sanitized JSON Payload Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <Code className="w-4 h-4 text-emerald-500" />
                  Sanitized Audit Event Details
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedEvent.event_type} (ID: {selectedEvent.id})</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">Timestamp</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {new Date(selectedEvent.created_at).toISOString()}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">Severity</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase">
                    {selectedEvent.severity}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Metadata (Safe & Redacted)
                </span>
                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-72 border border-slate-800">
                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

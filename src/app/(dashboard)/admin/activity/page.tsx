"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Code,
  X,
} from "lucide-react";
import type { AuditEventWithUser } from "@/lib/audit/audit-service";
import type { AuditEventSeverity } from "@/lib/supabase/types";

export default function AdminActivityPage() {
  const [events, setEvents] = useState<AuditEventWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [severity, setSeverity] = useState<string>("all");
  const [eventType, setEventType] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Metadata Modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEventWithUser | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "25");

      if (severity !== "all") params.set("severity", severity);
      if (eventType !== "all") params.set("eventType", eventType);
      if (search.trim()) params.set("search", search.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/audit-events?${params.toString()}`);

      if (res.status === 403) {
        setErrorMessage("Forbidden: You do not possess administrator rights.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load events.");
      }

      setEvents(data.events || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, severity, eventType, search, startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
              <span>Activity Audit Feed</span>
              <span className="text-xs font-normal text-stone-400">({total} total events)</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete chronological audit trail with server-side filtering.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          isLoading={isLoading}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Severity Filter */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 block mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="security">Security</option>
            </select>
          </div>

          {/* Event Category Filter */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 block mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:outline-none"
            >
              <option value="all">All Event Types</option>
              <option value="food_photo_uploaded">Food Photo Uploaded</option>
              <option value="food_photo_analyzed">Food Photo Analyzed</option>
              <option value="food_photo_confirmed">Food Photo Confirmed</option>
              <option value="voice_log_transcribed">Voice Log Transcribed</option>
              <option value="meal_created">Meal Created</option>
              <option value="health_connect_sync_completed">Health Connect Sync Succeeded</option>
              <option value="health_connect_sync_failed">Health Connect Sync Failed</option>
              <option value="activity_created">Activity Logged</option>
              <option value="weight_logged">Weight Logged</option>
              <option value="water_logged">Water Logged</option>
              <option value="habit_completed">Habit Completed</option>
              <option value="unauthorized_admin_access_attempt">Unauthorized Admin Access</option>
              <option value="screenshot_detected">Screenshot Detected</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 block mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 block mb-1">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Audit Feed Table / Cards */}
      <Card className="p-0 overflow-hidden">
        {events.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {isLoading ? "Loading audit events..." : "No events matched the selected filters."}
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5">{formatSeverityBadge(evt.severity)}</div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {evt.event_type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                        {evt.entity_type}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-x-2">
                      <span>User: {evt.user_name || evt.user_email || evt.user_id || "Anonymous"}</span>
                      {evt.ip_hash && <span>• IP: {evt.ip_hash}</span>}
                      {evt.user_agent_summary && <span>• Client: {evt.user_agent_summary}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="text-[10px] text-stone-400">
                    {new Date(evt.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedEvent(evt)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 transition-colors"
                    title="View Metadata"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-500">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs px-2.5 py-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-xs px-2.5 py-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Metadata JSON Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                  Event Metadata: {selectedEvent.event_type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-3 rounded-2xl bg-stone-950 text-stone-100 font-mono text-[11px] overflow-auto max-h-80">
              {JSON.stringify(
                {
                  id: selectedEvent.id,
                  event_type: selectedEvent.event_type,
                  entity_type: selectedEvent.entity_type,
                  entity_id: selectedEvent.entity_id,
                  severity: selectedEvent.severity,
                  user_id: selectedEvent.user_id,
                  user_email: selectedEvent.user_email,
                  created_at: selectedEvent.created_at,
                  metadata: selectedEvent.metadata,
                },
                null,
                2
              )}
            </pre>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEvent(null)}
              className="w-full text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

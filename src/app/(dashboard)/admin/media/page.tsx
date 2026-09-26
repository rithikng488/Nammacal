"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Camera,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Code,
  X,
  Clock,
  Sparkles,
  Utensils,
  Image as ImageIcon,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { AuditEventWithUser } from "@/lib/audit/audit-service";

interface MediaAuditEvent extends AuditEventWithUser {
  signedUrl?: string | null;
}

export default function AdminMediaEventsPage() {
  const [events, setEvents] = useState<MediaAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Metadata Modal
  const [selectedEvent, setSelectedEvent] = useState<MediaAuditEvent | null>(null);

  const fetchMediaEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "12");

      if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/media-events?${params.toString()}`);

      if (res.status === 403) {
        setErrorMessage("Forbidden: You do not possess administrator rights.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load food photo events.");
      }

      setEvents(data.events || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, userIdFilter, startDate, endDate]);

  useEffect(() => {
    fetchMediaEvents();
  }, [fetchMediaEvents]);

  if (errorMessage && errorMessage.includes("Forbidden")) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-3xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-600 dark:text-rose-400" />
        <h2 className="text-xl font-bold text-rose-900 dark:text-rose-200">Access Denied</h2>
        <p className="text-sm text-rose-700 dark:text-rose-300">
          Viewing food photo analysis events requires active Owner or Administrator privileges.
        </p>
        <Link href="/">
          <Button variant="outline">Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-sky-500" />
              Food Photo Analysis Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Audit AI food detection events, confidence scores, and portion estimates
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMediaEvents}
          disabled={isLoading}
          className="flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Filters Card */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          Filter Photo Events
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Filter by User ID</label>
            <Input
              type="text"
              placeholder="User UID..."
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9"
            />
          </div>
        </div>
      </Card>

      {/* Media Events Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Found {total} photo analysis events</span>
          <span>Page {page} of {totalPages}</span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-sm">Loading food photo analysis events...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="p-12 text-center text-slate-400 dark:text-slate-500">
            No food photo events found matching your criteria.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((evt) => {
              const meta = evt.metadata || {};
              const detectedItems = (meta.detected_items as any[]) || [];
              const calculatedNutrition = (meta.total_nutrition as any) || (meta.nutrition as any);

              return (
                <Card
                  key={evt.id}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="p-4 space-y-3">
                    {/* Header: User & Event Type */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <Link
                          href={`/admin/users/${evt.user_id || ""}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-sky-500 transition-colors block truncate max-w-[180px]"
                        >
                          {evt.user_name || "Anonymous Member"}
                        </Link>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                          {evt.user_email || (evt.user_id ? evt.user_id.slice(0, 10) : "unknown")}
                        </span>
                      </div>

                      <Badge variant={evt.event_type.includes("confirmed") ? "emerald" : "blue"}>
                        {evt.event_type.replace(/food_photo_/g, "").replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>

                    {/* Image Preview or Privacy Placeholder */}
                    <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800/80 rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-slate-200 dark:border-slate-800">
                      {evt.signedUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={evt.signedUrl}
                          alt="Food analysis preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3 space-y-1">
                          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="text-[11px] text-slate-500 font-medium">Ephemeral Processing</p>
                          <p className="text-[10px] text-slate-400 max-w-[200px]">
                            {meta.storage_path
                              ? "Signed URL expired or retention policy elapsed."
                              : "Photo processed ephemerally in-memory (Zero retention)."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* AI Detection Breakdown */}
                    {detectedItems.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Detected Foods ({detectedItems.length})
                        </span>
                        <div className="space-y-1">
                          {detectedItems.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg flex items-center justify-between"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                {item.food_name || item.name || "Item"}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>
                                  {item.estimated_quantity || item.quantity || 1}{" "}
                                  {item.serving_unit || item.unit || "portion"}
                                </span>
                                {item.confidence && (
                                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                                    {Math.round(item.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {detectedItems.length > 3 && (
                            <p className="text-[10px] text-slate-400 text-center">
                              +{detectedItems.length - 3} more items detected
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Calculated Nutrition */}
                    {calculatedNutrition && (
                      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Calories</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {Math.round(calculatedNutrition.calories || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Protein</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {Math.round(calculatedNutrition.protein || 0)}g
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Carbs</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {Math.round(calculatedNutrition.carbs || 0)}g
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Fat</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {Math.round(calculatedNutrition.fat || 0)}g
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Info & Actions */}
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEvent(evt)}
                      className="text-xs flex items-center gap-1 h-7 px-2"
                    >
                      <Code className="w-3 h-3" />
                      Details
                    </Button>
                  </div>
                </Card>
              );
            })}
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

      {/* JSON Payload Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <Camera className="w-4 h-4 text-sky-500" />
                  Food Photo Event Analysis
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
                  <span className="text-slate-400 block mb-0.5">User</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {selectedEvent.user_name || selectedEvent.user_email || selectedEvent.user_id || "Anonymous"}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">Timestamp</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {new Date(selectedEvent.created_at).toISOString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Full Event Metadata
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

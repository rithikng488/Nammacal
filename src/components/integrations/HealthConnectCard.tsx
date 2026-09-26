"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Footprints,
  Activity,
} from "lucide-react";
import {
  isHealthConnectSupported,
  checkHealthConnectAvailability,
  checkHealthConnectPermissions,
  requestHealthConnectPermissions,
  fetchHealthConnectSteps,
  fetchHealthConnectExerciseSessions,
  openHealthConnectSettings,
  type HealthConnectAvailability,
} from "@/lib/integrations/health-connect/health-connect-bridge";

interface HealthIntegrationInfo {
  provider: string;
  enabled: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  last_error: string | null;
}

interface HealthConnectCardProps {
  onSyncComplete?: () => void;
}

export function HealthConnectCard({ onSyncComplete }: HealthConnectCardProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<HealthConnectAvailability>("unsupported");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [integration, setIntegration] = useState<HealthIntegrationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch server-side integration record
      const res = await fetch("/api/integrations/health-connect");
      if (res.ok) {
        const data = await res.json();
        if (data.integration) {
          setIntegration(data.integration);
        }
      }

      // 2. Check client-side platform & Health Connect availability
      const supported = isHealthConnectSupported();
      setIsSupported(supported);

      if (supported) {
        const avail = await checkHealthConnectAvailability();
        setAvailabilityStatus(avail.status);

        if (avail.isAvailable) {
          const perm = await checkHealthConnectPermissions();
          setHasPermissions(perm.hasAllPermissions);
        }
      }
    } catch (err: unknown) {
      console.warn("Failed to load Health Connect status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRequestPermissions = async () => {
    setMessage(null);
    try {
      const result = await requestHealthConnectPermissions();
      setHasPermissions(result.hasAllPermissions);
      if (result.hasAllPermissions) {
        setMessage({ type: "success", text: "Health Connect permissions granted successfully." });
        await handleSyncNow();
      } else {
        setMessage({
          type: "info",
          text: "Permissions were not fully granted. Please allow read access in Health Connect.",
        });
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message || "Permission request failed." });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      // Fetch past 7 days of data
      const steps = await fetchHealthConnectSteps();
      const sessions = await fetchHealthConnectExerciseSessions();

      const syncRes = await fetch("/api/integrations/health-connect/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: steps, sessions }),
      });

      if (!syncRes.ok) {
        const data = await syncRes.json();
        throw new Error(data.error || "Sync failed.");
      }

      const syncData = await syncRes.json();
      setMessage({
        type: "success",
        text: `Sync completed: ${syncData.result?.syncedDaysCount ?? 0} days and ${
          syncData.result?.syncedSessionsCount ?? 0
        } new workouts imported.`,
      });

      await loadStatus();
      if (onSyncComplete) onSyncComplete();
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message || "Sync failed." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleIntegration = async () => {
    if (!integration) return;
    try {
      const res = await fetch("/api/integrations/health-connect", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !integration.enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntegration(data.integration);
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 animate-pulse">
        <div className="h-5 w-40 bg-stone-200 dark:bg-stone-800 rounded mb-2" />
        <div className="h-3 w-64 bg-stone-100 dark:bg-stone-800/60 rounded" />
      </div>
    );
  }

  // WEB / DESKTOP / PWA VIEW (Safe graceful degradation)
  if (!isSupported) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  Android Health Connect
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500">
                  Mobile App
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Direct step count and exercise session synchronization
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800/60 space-y-2">
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Health Connect sync is active when using the <span className="font-semibold text-teal-600 dark:text-teal-400">NammaCal Android app</span>. Steps and workouts recorded on your watch or phone (Pixel Watch, Samsung Health, Garmin, Google Fit) sync securely and deterministically.
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1">
              <Footprints className="w-3.5 h-3.5 text-teal-500" />
              Verified daily steps
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-teal-500" />
              Device-reported workouts
            </span>
          </div>
        </div>
      </div>
    );
  }

  // NATIVE ANDROID VIEW
  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                Android Health Connect
              </h3>
              {hasPermissions && integration?.enabled && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400">
              Read-only step and workout synchronization
            </p>
          </div>
        </div>

        {hasPermissions && (
          <button
            type="button"
            onClick={handleToggleIntegration}
            className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition-colors ${
              integration?.enabled
                ? "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {integration?.enabled ? "Disable" : "Enable"}
          </button>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-2.5 rounded-2xl text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
              : message.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Action Sections */}
      {availabilityStatus === "needs_update" && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900 text-xs space-y-2">
          <p className="text-amber-800 dark:text-amber-300 font-medium">
            Health Connect needs an update on your Android device.
          </p>
          <button
            type="button"
            onClick={() => openHealthConnectSettings()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Update Health Connect
          </button>
        </div>
      )}

      {availabilityStatus === "available" && !hasPermissions && (
        <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 text-xs space-y-2.5">
          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
            Connect NammaCal to read your daily steps and completed workouts. NammaCal requests read-only permissions and never alters your external health data.
          </p>
          <button
            type="button"
            onClick={handleRequestPermissions}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            Connect Health Connect
          </button>
        </div>
      )}

      {availabilityStatus === "available" && hasPermissions && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/60">
              <span className="text-[10px] text-stone-400 block mb-0.5">Permissions</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Read Granted
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/60">
              <span className="text-[10px] text-stone-400 block mb-0.5">Last Synchronized</span>
              <span className="font-semibold text-stone-700 dark:text-stone-300 truncate block">
                {integration?.last_successful_sync_at
                  ? new Date(integration.last_successful_sync_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Synchronizing..." : "Sync Health Connect Now"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

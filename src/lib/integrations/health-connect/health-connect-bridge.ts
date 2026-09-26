import { Capacitor, registerPlugin } from "@capacitor/core";

export type HealthConnectAvailability =
  | "available"
  | "needs_update"
  | "unavailable"
  | "unsupported";

export interface HealthConnectAvailabilityResult {
  isAvailable: boolean;
  status: HealthConnectAvailability;
  message?: string;
}

export interface HealthConnectPermissionResult {
  hasAllPermissions: boolean;
  grantedPermissions: string[];
}

export interface DailyStepRecord {
  date: string; // YYYY-MM-DD
  steps: number;
  sourceOrigins: string[];
}

export interface ExerciseSessionRecord {
  externalRecordId: string;
  activityType: string;
  durationMinutes: number;
  distanceKm?: number | null;
  steps?: number | null;
  caloriesBurned?: number | null;
  calorieProvenance?: string | null;
  startTime: string;
  endTime: string;
  loggedAt: string;
  title?: string | null;
  notes?: string | null;
  sourceOrigin: string;
}

export interface NammaCalHealthConnectPluginInterface {
  checkAvailability(): Promise<{ status: HealthConnectAvailability; isAvailable: boolean }>;
  checkPermissions(): Promise<{ hasAllPermissions: boolean; grantedPermissions: string[] }>;
  requestPermissions(): Promise<{ granted: boolean; grantedPermissions: string[] }>;
  getDailySteps(options?: { startDate?: string; endDate?: string }): Promise<{ days: DailyStepRecord[] }>;
  getExerciseSessions(options?: { startDate?: string; endDate?: string }): Promise<{ sessions: ExerciseSessionRecord[] }>;
  openHealthConnectSettings(): Promise<{ opened: boolean }>;
}

let nativePlugin: NammaCalHealthConnectPluginInterface | null = null;

function getNativePlugin(): NammaCalHealthConnectPluginInterface | null {
  if (typeof window === "undefined") return null;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return null;
  }
  if (!nativePlugin) {
    nativePlugin = registerPlugin<NammaCalHealthConnectPluginInterface>("NammaCalHealthConnect");
  }
  return nativePlugin;
}

/**
 * Checks if Health Connect is supported in the current runtime environment.
 * Strictly returns false in Web, iOS, or SSR contexts.
 */
export function isHealthConnectSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/**
 * Checks Health Connect availability status on the device.
 * Safely degrades on web/desktop with status 'unsupported'.
 */
export async function checkHealthConnectAvailability(): Promise<HealthConnectAvailabilityResult> {
  const plugin = getNativePlugin();
  if (!plugin) {
    return {
      isAvailable: false,
      status: "unsupported",
      message: "Health Connect is supported exclusively on the NammaCal Android app.",
    };
  }

  try {
    const res = await plugin.checkAvailability();
    let message: string | undefined;
    if (res.status === "needs_update") {
      message = "Health Connect requires an update from the Google Play Store.";
    } else if (res.status === "unavailable") {
      message = "Health Connect is not installed or unavailable on this device.";
    }
    return {
      isAvailable: res.isAvailable,
      status: res.status,
      message,
    };
  } catch (err: unknown) {
    return {
      isAvailable: false,
      status: "unavailable",
      message: (err as Error).message || "Failed to check Health Connect availability.",
    };
  }
}

/**
 * Checks granted Health Connect read permissions.
 */
export async function checkHealthConnectPermissions(): Promise<HealthConnectPermissionResult> {
  const plugin = getNativePlugin();
  if (!plugin) {
    return {
      hasAllPermissions: false,
      grantedPermissions: [],
    };
  }

  try {
    const res = await plugin.checkPermissions();
    return {
      hasAllPermissions: res.hasAllPermissions,
      grantedPermissions: res.grantedPermissions || [],
    };
  } catch {
    return {
      hasAllPermissions: false,
      grantedPermissions: [],
    };
  }
}

/**
 * Triggers the Health Connect native permission flow.
 */
export async function requestHealthConnectPermissions(): Promise<HealthConnectPermissionResult> {
  const plugin = getNativePlugin();
  if (!plugin) {
    return {
      hasAllPermissions: false,
      grantedPermissions: [],
    };
  }

  try {
    const res = await plugin.requestPermissions();
    return {
      hasAllPermissions: res.granted,
      grantedPermissions: res.grantedPermissions || [],
    };
  } catch {
    return {
      hasAllPermissions: false,
      grantedPermissions: [],
    };
  }
}

/**
 * Reads aggregated daily steps from Health Connect.
 * Returns empty array on web/desktop.
 */
export async function fetchHealthConnectSteps(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<DailyStepRecord[]> {
  const plugin = getNativePlugin();
  if (!plugin) return [];

  try {
    const res = await plugin.getDailySteps(options);
    return res.days || [];
  } catch (err) {
    console.warn("Failed to fetch Health Connect steps:", err);
    return [];
  }
}

/**
 * Reads exercise sessions from Health Connect.
 * Returns empty array on web/desktop.
 */
export async function fetchHealthConnectExerciseSessions(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<ExerciseSessionRecord[]> {
  const plugin = getNativePlugin();
  if (!plugin) return [];

  try {
    const res = await plugin.getExerciseSessions(options);
    return res.sessions || [];
  } catch (err) {
    console.warn("Failed to fetch Health Connect exercise sessions:", err);
    return [];
  }
}

/**
 * Launches Android Health Connect settings or Google Play Store if needs update.
 */
export async function openHealthConnectSettings(): Promise<{ opened: boolean }> {
  const plugin = getNativePlugin();
  if (!plugin) return { opened: false };

  try {
    const res = await plugin.openHealthConnectSettings();
    return { opened: res.opened };
  } catch {
    return { opened: false };
  }
}

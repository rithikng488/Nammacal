import { describe, it, expect } from "vitest";
import {
  isHealthConnectSupported,
  checkHealthConnectAvailability,
  checkHealthConnectPermissions,
  requestHealthConnectPermissions,
  fetchHealthConnectSteps,
  fetchHealthConnectExerciseSessions,
  openHealthConnectSettings,
} from "@/lib/integrations/health-connect/health-connect-bridge";

describe("Health Connect Bridge — Web Fallback & Degradation", () => {
  it("reports unsupported in Web/SSR/Node environment", () => {
    const supported = isHealthConnectSupported();
    expect(supported).toBe(false);
  });

  it("returns unavailable/unsupported status when checking availability on web", async () => {
    const status = await checkHealthConnectAvailability();
    expect(status.isAvailable).toBe(false);
    expect(status.status).toBe("unsupported");
    expect(status.message).toContain("Health Connect is supported exclusively on the NammaCal Android app");
  });

  it("returns false and empty permissions when checking permissions on web", async () => {
    const perm = await checkHealthConnectPermissions();
    expect(perm.hasAllPermissions).toBe(false);
    expect(perm.grantedPermissions).toEqual([]);
  });

  it("safely handles permission requests without crashing on web", async () => {
    const perm = await requestHealthConnectPermissions();
    expect(perm.hasAllPermissions).toBe(false);
    expect(perm.grantedPermissions).toEqual([]);
  });

  it("returns empty step list without throwing errors on web", async () => {
    const steps = await fetchHealthConnectSteps({
      startDate: "2026-10-01",
      endDate: "2026-10-08",
    });
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBe(0);
  });

  it("returns empty exercise session list without throwing errors on web", async () => {
    const sessions = await fetchHealthConnectExerciseSessions();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBe(0);
  });

  it("handles openHealthConnectSettings safely on web", async () => {
    const res = await openHealthConnectSettings();
    expect(res.opened).toBe(false);
  });
});

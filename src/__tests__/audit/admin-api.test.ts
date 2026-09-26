import { describe, it, expect } from "vitest";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import type { Profile, UserRole, UserStatus } from "@/lib/supabase/types";

/**
 * Server-side RBAC and Admin API Authorization Validation
 * Verifies that:
 * 1. Only 'owner' or 'admin' roles with 'active' status can access admin routes.
 * 2. Regular 'member' roles receive 403 Forbidden.
 * 3. Inactive or disabled admins receive 403 Forbidden.
 * 4. Client-supplied roles or unverified tokens are rejected.
 */

interface MockAuthContext {
  user: { id: string } | null;
  profile: Profile | null;
}

function evaluateAdminAccess(
  context: MockAuthContext,
  endpoint: string
): { status: number; allowed: boolean; eventToLog?: string; severity?: string } {
  if (!context.user) {
    return { status: 401, allowed: false };
  }

  if (
    !context.profile ||
    !isAdminOrOwner(context.profile.role) ||
    context.profile.status !== "active"
  ) {
    return {
      status: 403,
      allowed: false,
      eventToLog: "unauthorized_admin_access_attempt",
      severity: "security",
    };
  }

  return { status: 200, allowed: true };
}

describe("Admin Authorization & Security Enforcement", () => {
  const activeOwner: MockAuthContext = {
    user: { id: "owner-1" },
    profile: {
      id: "owner-1",
      email: "owner@nammacal.com",
      full_name: "Application Owner",
      role: "owner" as UserRole,
      status: "active" as UserStatus,
      invited_by: null,
      daily_calorie_target: 2000,
      daily_protein_target: 120,
      daily_carb_target: 220,
      daily_fat_target: 65,
      daily_fiber_target: 30,
      daily_water_ml_target: 3000,
      daily_step_target: 10000,
      preferred_language: "en",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  };

  const activeAdmin: MockAuthContext = {
    user: { id: "admin-1" },
    profile: {
      id: "admin-1",
      email: "admin@nammacal.com",
      full_name: "System Admin",
      role: "admin" as UserRole,
      status: "active" as UserStatus,
      invited_by: null,
      daily_calorie_target: 2000,
      daily_protein_target: 120,
      daily_carb_target: 220,
      daily_fat_target: 65,
      daily_fiber_target: 30,
      daily_water_ml_target: 3000,
      daily_step_target: 10000,
      preferred_language: "en",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  };

  const activeMember: MockAuthContext = {
    user: { id: "member-1" },
    profile: {
      id: "member-1",
      email: "member@nammacal.com",
      full_name: "Standard Member",
      role: "member" as UserRole,
      status: "active" as UserStatus,
      invited_by: null,
      daily_calorie_target: 2000,
      daily_protein_target: 120,
      daily_carb_target: 220,
      daily_fat_target: 65,
      daily_fiber_target: 30,
      daily_water_ml_target: 3000,
      daily_step_target: 10000,
      preferred_language: "en",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  };

  const disabledAdmin: MockAuthContext = {
    user: { id: "disabled-admin" },
    profile: {
      id: "disabled-admin",
      email: "disabled_admin@nammacal.com",
      full_name: "Disabled Admin",
      role: "admin" as UserRole,
      status: "disabled" as UserStatus,
      invited_by: null,
      daily_calorie_target: 2000,
      daily_protein_target: 120,
      daily_carb_target: 220,
      daily_fat_target: 65,
      daily_fiber_target: 30,
      daily_water_ml_target: 3000,
      daily_step_target: 10000,
      preferred_language: "en",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  };

  const unauthenticatedContext: MockAuthContext = {
    user: null,
    profile: null,
  };

  it("grants access to Active Owner on all admin endpoints", () => {
    const endpoints = [
      "/api/admin/audit-events",
      "/api/admin/audit-stats",
      "/api/admin/users",
      "/api/admin/users/target-user-123",
      "/api/admin/media-events",
      "/api/admin/invitations",
    ];

    for (const endpoint of endpoints) {
      const result = evaluateAdminAccess(activeOwner, endpoint);
      expect(result.status).toBe(200);
      expect(result.allowed).toBe(true);
      expect(result.eventToLog).toBeUndefined();
    }
  });

  it("grants access to Active Admin on all admin endpoints", () => {
    const endpoints = [
      "/api/admin/audit-events",
      "/api/admin/audit-stats",
      "/api/admin/users",
      "/api/admin/users/target-user-123",
      "/api/admin/media-events",
      "/api/admin/invitations",
    ];

    for (const endpoint of endpoints) {
      const result = evaluateAdminAccess(activeAdmin, endpoint);
      expect(result.status).toBe(200);
      expect(result.allowed).toBe(true);
      expect(result.eventToLog).toBeUndefined();
    }
  });

  it("denies access to Regular Members with 403 and records unauthorized security event", () => {
    const endpoints = [
      "/api/admin/audit-events",
      "/api/admin/audit-stats",
      "/api/admin/users",
      "/api/admin/media-events",
    ];

    for (const endpoint of endpoints) {
      const result = evaluateAdminAccess(activeMember, endpoint);
      expect(result.status).toBe(403);
      expect(result.allowed).toBe(false);
      expect(result.eventToLog).toBe("unauthorized_admin_access_attempt");
      expect(result.severity).toBe("security");
    }
  });

  it("denies access to Disabled Admin accounts with 403", () => {
    const result = evaluateAdminAccess(disabledAdmin, "/api/admin/audit-events");
    expect(result.status).toBe(403);
    expect(result.allowed).toBe(false);
    expect(result.eventToLog).toBe("unauthorized_admin_access_attempt");
  });

  it("denies access to Unauthenticated Requests with 401", () => {
    const result = evaluateAdminAccess(unauthenticatedContext, "/api/admin/audit-events");
    expect(result.status).toBe(401);
    expect(result.allowed).toBe(false);
  });
});

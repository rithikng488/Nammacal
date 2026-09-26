import type { UserRole, UserStatus } from "../supabase/types";

/**
 * Checks if a user has administrative privileges (Owner or Admin).
 */
export function isAdminOrOwner(role: UserRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Checks if a user is the primary Owner.
 */
export function isOwner(role: UserRole): boolean {
  return role === "owner";
}

/**
 * Checks if a user account is active and permitted to use the app.
 */
export function isUserActive(status: UserStatus): boolean {
  return status === "active";
}

/**
 * Checks if a role is permitted to create new user invitations.
 */
export function canInviteUsers(role: UserRole): boolean {
  return isAdminOrOwner(role);
}

/**
 * Checks if a role is permitted to change user status or roles.
 */
export function canManageUsers(role: UserRole): boolean {
  return isOwner(role);
}

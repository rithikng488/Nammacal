import { z } from "zod";
import crypto from "crypto";

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const RegisterWithInviteSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  invitation_code: z
    .string()
    .trim()
    .min(6, "Invitation code must be at least 6 characters."),
  full_name: z.string().trim().max(100).optional(),
});

export type RegisterWithInviteInput = z.infer<typeof RegisterWithInviteSchema>;

export const CreateInviteSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  role: z.enum(["admin", "member"]).default("member"),
  expires_in_days: z.number().int().min(1).max(30).default(7),
});

export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;

// ==========================================
// CORE BUSINESS LOGIC (Pure & Deterministic)
// ==========================================

/**
 * Generates a clean, human-friendly invitation code.
 * Example format: NC-8K4M-9P2X
 */
export function generateInvitationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous 0, O, 1, I
  const randomBytes = crypto.randomBytes(8);
  let code = "NC-";
  for (let i = 0; i < 4; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  code += "-";
  for (let i = 4; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

export interface InvitationRecord {
  id: string;
  email: string;
  invitation_code: string;
  role: "admin" | "member";
  expires_at: string;
  used_at: string | null;
}

export interface InvitationValidationResult {
  isValid: boolean;
  errorCode?: "NOT_FOUND" | "ALREADY_USED" | "EXPIRED" | "EMAIL_MISMATCH";
  message?: string;
}

/**
 * Pure evaluation of an invitation record against current time and email.
 * Guarantees single-use and expiration enforcement.
 */
export function validateInvitationRecord(
  invitation: InvitationRecord | null,
  targetEmail: string,
  currentTime: Date = new Date()
): InvitationValidationResult {
  if (!invitation) {
    return {
      isValid: false,
      errorCode: "NOT_FOUND",
      message: "The invitation code provided does not exist.",
    };
  }

  if (invitation.used_at !== null) {
    return {
      isValid: false,
      errorCode: "ALREADY_USED",
      message: "This invitation code has already been used.",
    };
  }

  const expirationDate = new Date(invitation.expires_at);
  if (currentTime.getTime() > expirationDate.getTime()) {
    return {
      isValid: false,
      errorCode: "EXPIRED",
      message: "This invitation code has expired. Please contact the administrator.",
    };
  }

  // Strict email match (case-insensitive)
  if (invitation.email.toLowerCase() !== targetEmail.toLowerCase()) {
    return {
      isValid: false,
      errorCode: "EMAIL_MISMATCH",
      message: "This invitation code was issued for a different email address.",
    };
  }

  return {
    isValid: true,
  };
}

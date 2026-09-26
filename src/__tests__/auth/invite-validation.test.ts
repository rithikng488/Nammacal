import { describe, it, expect } from "vitest";
import {
  generateInvitationCode,
  validateInvitationRecord,
  RegisterWithInviteSchema,
  CreateInviteSchema,
  type InvitationRecord,
} from "@/lib/auth/invite-service";
import { isAdminOrOwner, isOwner, isUserActive, canInviteUsers, canManageUsers } from "@/lib/auth/rbac";

describe("Invitation System Security & Validation", () => {
  const baseInvitation: InvitationRecord = {
    id: "inv-12345",
    email: "subbaiah@example.com",
    invitation_code: "NC-7K9M-4M2P",
    role: "member",
    expires_at: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
    used_at: null,
  };

  it("should validate a fresh, unexpired invitation for matching email", () => {
    const result = validateInvitationRecord(baseInvitation, "subbaiah@example.com");
    expect(result.isValid).toBe(true);
    expect(result.errorCode).toBeUndefined();
  });

  it("should validate case-insensitively for email matching", () => {
    const result = validateInvitationRecord(baseInvitation, "SUBBAIAH@EXAMPLE.COM");
    expect(result.isValid).toBe(true);
  });

  it("should REJECT an invitation if it does not exist (NOT_FOUND)", () => {
    const result = validateInvitationRecord(null, "subbaiah@example.com");
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("NOT_FOUND");
  });

  it("should REJECT an invitation that has already been used (ALREADY_USED)", () => {
    const usedInvitation: InvitationRecord = {
      ...baseInvitation,
      used_at: new Date().toISOString(),
    };
    const result = validateInvitationRecord(usedInvitation, "subbaiah@example.com");
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("ALREADY_USED");
  });

  it("should REJECT an invitation that has expired (EXPIRED)", () => {
    const expiredInvitation: InvitationRecord = {
      ...baseInvitation,
      expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second in the past
    };
    const result = validateInvitationRecord(expiredInvitation, "subbaiah@example.com");
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("EXPIRED");
  });

  it("should REJECT an invitation when claimed by a different email (EMAIL_MISMATCH)", () => {
    const result = validateInvitationRecord(baseInvitation, "attacker@example.com");
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("EMAIL_MISMATCH");
  });

  it("should generate cryptographically sound invite codes with NC- prefix", () => {
    const code1 = generateInvitationCode();
    const code2 = generateInvitationCode();
    expect(code1).toMatch(/^NC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(code2).toMatch(/^NC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(code1).not.toBe(code2);
  });
});

describe("Registration Input Validation (Zod Guardrails)", () => {
  it("should accept valid registration payload", () => {
    const validData = {
      email: "karthik@example.com",
      password: "StrongPassword123",
      invitation_code: "NC-8X2M-5K9P",
      full_name: "Karthik R",
    };
    const parsed = RegisterWithInviteSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("should reject invalid email formats", () => {
    const invalidEmail = {
      email: "not-an-email",
      password: "StrongPassword123",
      invitation_code: "NC-8X2M-5K9P",
    };
    const parsed = RegisterWithInviteSchema.safeParse(invalidEmail);
    expect(parsed.success).toBe(false);
  });

  it("should reject weak passwords (less than 8 chars or missing numbers/uppercase)", () => {
    const shortPassword = {
      email: "karthik@example.com",
      password: "short",
      invitation_code: "NC-8X2M-5K9P",
    };
    expect(RegisterWithInviteSchema.safeParse(shortPassword).success).toBe(false);

    const noUpper = {
      email: "karthik@example.com",
      password: "password12345",
      invitation_code: "NC-8X2M-5K9P",
    };
    expect(RegisterWithInviteSchema.safeParse(noUpper).success).toBe(false);

    const noNumber = {
      email: "karthik@example.com",
      password: "PasswordWithoutNumber",
      invitation_code: "NC-8X2M-5K9P",
    };
    expect(RegisterWithInviteSchema.safeParse(noNumber).success).toBe(false);
  });
});

describe("Role-Based Access Control (RBAC) Policies", () => {
  it("should enforce admin/owner privilege checks correctly", () => {
    expect(isAdminOrOwner("owner")).toBe(true);
    expect(isAdminOrOwner("admin")).toBe(true);
    expect(isAdminOrOwner("member")).toBe(false);

    expect(isOwner("owner")).toBe(true);
    expect(isOwner("admin")).toBe(false);
    expect(isOwner("member")).toBe(false);
  });

  it("should check user active status correctly", () => {
    expect(isUserActive("active")).toBe(true);
    expect(isUserActive("disabled")).toBe(false);
    expect(isUserActive("pending")).toBe(false);
  });

  it("should enforce permission boundaries for inviting and user management", () => {
    expect(canInviteUsers("owner")).toBe(true);
    expect(canInviteUsers("admin")).toBe(true);
    expect(canInviteUsers("member")).toBe(false);

    expect(canManageUsers("owner")).toBe(true);
    expect(canManageUsers("admin")).toBe(false);
    expect(canManageUsers("member")).toBe(false);
  });
});

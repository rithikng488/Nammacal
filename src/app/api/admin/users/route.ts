import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminOrOwner, isOwner } from "@/lib/auth/rbac";
import type { UserRole, UserStatus } from "@/lib/supabase/types";
import { z } from "zod";

const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "disabled"]).optional(),
  role: z.enum(["admin", "member"]).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || !isAdminOrOwner(profile.role) || profile.status !== "active") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET admin users error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    // Only owner can mutate user status or promote/demote
    if (!profile || !isOwner(profile.role) || profile.status !== "active") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only the system owner can modify user roles or statuses." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateUserSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, status, role } = parseResult.data;

    // Safety: Owner cannot disable themselves
    if (userId === user.id && status === "disabled") {
      return NextResponse.json(
        { error: "CANNOT_DISABLE_SELF", message: "The owner cannot disable their own account." },
        { status: 400 }
      );
    }

    const updatePayload: {
      status?: UserStatus;
      role?: UserRole;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (status) updatePayload.status = status;
    if (role) updatePayload.role = role;

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("PATCH admin user error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

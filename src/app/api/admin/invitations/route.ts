import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateInviteSchema, generateInvitationCode } from "@/lib/auth/invite-service";
import { isAdminOrOwner } from "@/lib/auth/rbac";

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

    // Verify caller role in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || !isAdminOrOwner(profile.role) || profile.status !== "active") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only administrators can view invitations." },
        { status: 403 }
      );
    }

    const { data: invitations, error } = await supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("GET invitations error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Verify caller role in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, status")
      .eq("id", user.id)
      .single();

    if (!profile || !isAdminOrOwner(profile.role) || profile.status !== "active") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only administrators can issue invitations." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = CreateInviteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role, expires_in_days } = parseResult.data;
    const invitation_code = generateInvitationCode();
    const expires_at = new Date(Date.now() + expires_in_days * 86400000).toISOString();

    const { data: newInvite, error: insertError } = await supabase
      .from("invitations")
      .insert({
        email: email.toLowerCase(),
        invitation_code,
        role,
        invited_by: profile.id,
        expires_at,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        invitation: newInvite,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST invitation error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

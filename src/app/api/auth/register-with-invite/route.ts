import { NextRequest, NextResponse } from "next/server";
import { RegisterWithInviteSchema, validateInvitationRecord } from "@/lib/auth/invite-service";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = RegisterWithInviteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, invitation_code, full_name } = parseResult.data;
    const adminClient = getAdminClient();

    // 1. Fetch Invitation
    const { data: invitation, error: inviteQueryError } = await adminClient
      .from("invitations")
      .select("*")
      .eq("invitation_code", invitation_code)
      .single();

    if (inviteQueryError || !invitation) {
      return NextResponse.json(
        {
          error: "INVALID_INVITATION",
          message: "The invitation code provided is invalid or does not exist.",
        },
        { status: 403 }
      );
    }

    // 2. Validate Invitation Constraints (Expiration, Single-Use, Email Match)
    const validation = validateInvitationRecord(invitation, email);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.errorCode,
          message: validation.message,
        },
        { status: 403 }
      );
    }

    // 3. Create User in Supabase Auth (Admin API ensures no public registration bypass)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Pre-confirm since the invite is already validated by admin
      user_metadata: {
        full_name: full_name || null,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: "USER_CREATION_FAILED",
          message: authError?.message || "Failed to create user account.",
        },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    // 4. Create Profile with Role & Active Status
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: newUserId,
      email,
      full_name: full_name || null,
      role: invitation.role,
      status: "active",
      invited_by: invitation.invited_by,
      daily_calorie_target: 2000,
      daily_protein_target: 100,
      daily_carb_target: 250,
      daily_fat_target: 65,
      daily_fiber_target: 30,
      daily_water_ml_target: 3000,
      daily_step_target: 8000,
      preferred_language: "en",
    });

    if (profileError) {
      // Rollback Auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        {
          error: "PROFILE_CREATION_FAILED",
          message: "Failed to initialize profile. Rolled back.",
        },
        { status: 500 }
      );
    }

    // 5. Mark Invitation as Used (Prevent Replay Attack)
    const { error: markUsedError } = await adminClient
      .from("invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (markUsedError) {
      console.error("Warning: Failed to mark invitation as used:", markUsedError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account successfully created. Please sign in.",
        userId: newUserId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during registration.",
      },
      { status: 500 }
    );
  }
}

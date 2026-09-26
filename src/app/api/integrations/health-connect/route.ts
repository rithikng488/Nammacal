import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getHealthIntegration,
  setHealthIntegrationStatus,
} from "@/lib/integrations/health-connect/health-connect-sync-service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await getHealthIntegration(user.id, supabase);

    return NextResponse.json({
      success: true,
      integration: integration || {
        provider: "health_connect",
        enabled: false,
        connected_at: null,
        last_sync_at: null,
        last_successful_sync_at: null,
        last_error: null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to get Health Connect integration status." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Field 'enabled' (boolean) is required." },
        { status: 400 }
      );
    }

    const updated = await setHealthIntegrationStatus(user.id, body.enabled, supabase);

    return NextResponse.json({
      success: true,
      integration: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update Health Connect status." },
      { status: 500 }
    );
  }
}

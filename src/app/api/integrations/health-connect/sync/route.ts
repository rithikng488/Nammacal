import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncHealthConnectData,
  type HealthConnectSyncPayload,
} from "@/lib/integrations/health-connect/health-connect-sync-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: HealthConnectSyncPayload = await request.json();

    const result = await syncHealthConnectData(user.id, body, supabase);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to sync Health Connect data." },
      { status: 500 }
    );
  }
}

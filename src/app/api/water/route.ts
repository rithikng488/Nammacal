import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  logWater,
  getDailyWaterSummary,
  getWaterHistory,
  type LogWaterInput,
} from "@/lib/water/water-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const daysParam = searchParams.get("days");

    if (daysParam) {
      const days = parseInt(daysParam, 10) || 7;
      const history = await getWaterHistory(user.id, days, supabase);
      return NextResponse.json({
        success: true,
        ...history,
      });
    }

    const summary = await getDailyWaterSummary(user.id, date, supabase);
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load water data." },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const input: LogWaterInput = {
      amountMl: Number(body.amountMl),
      loggedAt: body.loggedAt,
    };

    const log = await logWater(user.id, input, supabase);
    const summary = await getDailyWaterSummary(user.id, input.loggedAt, supabase);

    // Audit: Log water intake event
    await recordAuditEvent(
      {
        eventType: "water_logged",
        userId: user.id,
        entityType: "water_log",
        entityId: log.id,
        severity: "info",
        metadata: {
          amount_ml: log.amount_ml,
          logged_at: log.logged_at,
        },
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    return NextResponse.json({
      success: true,
      log,
      summary,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to log water intake." },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/audit-service";
import { z } from "zod";

const ClientAuditEventSchema = z.object({
  eventType: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().max(200).optional().nullable(),
  severity: z.enum(["info", "warning", "error", "security"]).default("info"),
  metadata: z.record(z.any()).optional().default({}),
});

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
    const parsed = ClientAuditEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit event payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { eventType, entityType, entityId, severity, metadata } = parsed.data;

    await recordAuditEvent(
      {
        eventType,
        userId: user.id,
        actorUserId: user.id,
        entityType,
        entityId: entityId || null,
        severity,
        metadata,
        userAgent: request.headers.get("user-agent"),
      },
      supabase
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to record audit event." },
      { status: 500 }
    );
  }
}

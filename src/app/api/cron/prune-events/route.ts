/**
 * Weekly cron — deletes system_events older than 12 months so the
 * table stays fast at scale. Scheduled in vercel.json.
 */

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { logEvent } from "@/lib/system-events";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await db.execute({
    sql: `DELETE FROM system_events WHERE created_at < now() - interval '12 months' RETURNING id`,
    args: [],
  });
  const deleted = result.rows.length;

  await logEvent({
    event_type: "cron.prune_events.ran",
    severity: "info",
    message: `Pruned ${deleted} events older than 12 months`,
    payload: { deleted },
  });

  return NextResponse.json({ deleted, ran_at: new Date().toISOString() });
}

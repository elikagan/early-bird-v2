/**
 * Ops-check cron — the watchdog that fires the admin's phone when
 * something is broken or degrading. Runs every 5 min (see vercel.json).
 *
 * Checks, in order:
 *   1. Missed drop            — market past drop_at, drop_notified_at still null
 *   2. Cron heartbeat stopped — no CRON_DROP_MARKETS_RAN events in last 15 min
 *   3. SMS failure rate       — > 20% failures over the last 30 min
 *   4. Inquiry-without-SMS    — > 10% inquiries in last hour w/o an SMS log
 *
 * Each fired alert is de-duplicated: the same alert won't re-fire
 * within 60 min even if still true. (Re-fire window = 60 min keeps
 * the phone from buzzing 12 times during a sustained outage.)
 *
 * Also does self-healing for missed drops — fires the drop cron itself
 * so users aren't waiting for the admin to respond.
 */

import { NextResponse, after } from "next/server";
import db from "@/lib/db";
import { sendSMSWithLog } from "@/lib/sms";
import { logEvent, EVT } from "@/lib/system-events";
import { getBaseUrl } from "@/lib/url";

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    console.error("ops-check error:", err);
    return NextResponse.json(
      { error: "ops_check_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function handle(request: Request) {
  // Auth
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const alerts: string[] = [];

  // ── CHECK 1: Missed drop ──────────────────────────────────────
  const missed = await db.execute({
    sql: `SELECT id, name, drop_at FROM markets
          WHERE drop_at < now() - interval '5 minutes'
            AND drop_notified_at IS NULL
            AND status = 'upcoming'`,
    args: [],
  });
  if (missed.rows.length > 0) {
    for (const row of missed.rows) {
      const marketName = (row as Record<string, unknown>).name as string;
      const marketId = (row as Record<string, unknown>).id as string;
      alerts.push(
        `MISSED DROP: "${marketName}" was due ${(row as Record<string, unknown>).drop_at}. Auto-firing now.`
      );
      await logEvent({
        event_type: EVT.DROP_MISSED,
        severity: "error",
        entity_type: "market",
        entity_id: marketId,
        message: `Drop missed for ${marketName} — auto-firing`,
      });
      // Self-heal — trigger the drop cron to pick up this market.
      after(async () => {
        try {
          await fetch(`${getBaseUrl(request)}/api/cron/drop-markets`, {
            headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
          });
        } catch {}
      });
    }
  }

  // ── CHECK 2: Cron heartbeat stopped ───────────────────────────
  const lastCron = await db.execute({
    sql: `SELECT created_at FROM system_events
          WHERE event_type = ?
          ORDER BY created_at DESC LIMIT 1`,
    args: [EVT.CRON_DROP_MARKETS_RAN],
  });
  if (lastCron.rows.length > 0) {
    const lastAt = new Date(
      (lastCron.rows[0] as Record<string, unknown>).created_at as string
    );
    const staleMs = Date.now() - lastAt.getTime();
    // Drop cron runs every minute. 15 min of silence = broken.
    if (staleMs > 15 * 60 * 1000) {
      alerts.push(
        `CRON STOPPED: drop-markets hasn't run in ${Math.round(staleMs / 60000)} min.`
      );
    }
  }

  // ── CHECK 3: SMS failure rate (last 30 min) ──────────────────
  const smsStats = await db.execute({
    sql: `SELECT
            COUNT(*) FILTER (WHERE event_type = 'sms.sent')::int as sent,
            COUNT(*) FILTER (WHERE event_type = 'sms.failed')::int as failed
          FROM system_events
          WHERE event_type IN ('sms.sent', 'sms.failed')
            AND created_at > now() - interval '30 minutes'`,
    args: [],
  });
  const stats = smsStats.rows[0] as Record<string, unknown>;
  const sent = Number(stats?.sent ?? 0);
  const failed = Number(stats?.failed ?? 0);
  const total = sent + failed;
  // Need enough volume to matter — 5+ total in 30 min — before flagging a rate.
  if (total >= 5 && failed / total > 0.2) {
    alerts.push(
      `SMS FAILURE RATE: ${failed}/${total} = ${Math.round((failed / total) * 100)}% in last 30 min.`
    );
  }

  // ── CHECK 4: Inquiry-without-SMS (last 60 min) ───────────────
  // Every inquiry should have a matching sms.inquiry.new sent event
  // within seconds. Count inquiries where this didn't happen.
  const inqGap = await db.execute({
    sql: `SELECT COUNT(*)::int AS n FROM inquiries i
          WHERE i.created_at > now() - interval '1 hour'
            AND NOT EXISTS (
              SELECT 1 FROM system_events e
              WHERE e.event_type = 'sms.sent'
                AND e.entity_type = 'inquiry'
                AND e.entity_id = i.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM system_events e
              WHERE e.event_type = 'inquiry.created'
                AND e.entity_id = i.id
                AND e.message LIKE '%opted out%'
            )`,
    args: [],
  });
  const inquiryCount = await db.execute({
    sql: `SELECT COUNT(*)::int AS n FROM inquiries WHERE created_at > now() - interval '1 hour'`,
    args: [],
  });
  const inqGapN = Number((inqGap.rows[0] as Record<string, unknown>)?.n ?? 0);
  const inqTotal = Number((inquiryCount.rows[0] as Record<string, unknown>)?.n ?? 0);
  if (inqTotal >= 3 && inqGapN / inqTotal > 0.1) {
    alerts.push(
      `INQUIRY → SMS GAP: ${inqGapN}/${inqTotal} recent inquiries didn't fire a dealer SMS.`
    );
  }

  // Record heartbeat regardless (so absence of this event means the
  // ops-check itself has stopped running).
  await logEvent({
    event_type: EVT.CRON_OPS_CHECK_RAN,
    severity: alerts.length > 0 ? "warn" : "info",
    message:
      alerts.length > 0
        ? `${alerts.length} alert(s) triggered`
        : "All checks OK",
    payload: { alerts },
  });

  // ── Fire SMS alerts, deduplicated by 60-min window ───────────
  if (alerts.length > 0) {
    // Have we already alerted in the last 60 min?
    const recentAlert = await db.execute({
      sql: `SELECT id FROM system_events
            WHERE event_type = ?
              AND created_at > now() - interval '1 hour'
            LIMIT 1`,
      args: [EVT.OPS_ALERT_FIRED],
    });

    if (recentAlert.rows.length === 0) {
      const adminPhones = (process.env.ADMIN_PHONES || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const body = `Early Bird ALERT:\n${alerts.join("\n")}`;
      await logEvent({
        event_type: EVT.OPS_ALERT_FIRED,
        severity: "error",
        message: `Fired ${alerts.length} alert(s) to ${adminPhones.length} admin(s)`,
        payload: { alerts, admin_count: adminPhones.length },
      });

      await Promise.allSettled(
        adminPhones.map((p) =>
          sendSMSWithLog(p, body, {
            event_type: "sms.ops_alert",
            entity_type: "ops_alert",
          })
        )
      );
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    alerts,
    checks: {
      sms: { sent, failed, total, rate: total > 0 ? failed / total : 0 },
      inquiries: { gap: inqGapN, total: inqTotal },
      missed_drops: missed.rows.length,
    },
  });
}

/**
 * Feeds the /admin Health dashboard with live state + last-24h metrics.
 * Admin-only.
 */

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  // ── Status probes ──
  const dbProbeStart = Date.now();
  let dbOk = false;
  try {
    await db.execute({ sql: "SELECT 1 AS ok", args: [] });
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const dbMs = Date.now() - dbProbeStart;

  // Last cron run (ops-check only — drop-markets is retired)
  const lastOpsCron = await db.execute({
    sql: `SELECT created_at, message FROM system_events
          WHERE event_type = 'cron.ops_check.ran'
          ORDER BY created_at DESC LIMIT 1`,
    args: [],
  });

  // 24h counts
  const counts = await db.execute({
    sql: `SELECT
            COUNT(*) FILTER (WHERE event_type = 'sms.sent')::int AS sms_sent,
            COUNT(*) FILTER (WHERE event_type = 'sms.failed')::int AS sms_failed,
            COUNT(*) FILTER (WHERE event_type = 'sms.retried')::int AS sms_retried,
            COUNT(*) FILTER (WHERE event_type = 'ops.alert_fired')::int AS ops_alerts,
            COUNT(*) FILTER (WHERE severity = 'error')::int AS errors
          FROM system_events
          WHERE created_at > now() - interval '24 hours'`,
    args: [],
  });

  // Today's business metrics
  const biz = await db.execute({
    sql: `SELECT
            (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '24 hours') AS new_users_24h,
            (SELECT COUNT(*)::int FROM inquiries WHERE created_at > now() - interval '24 hours') AS inquiries_24h,
            (SELECT COUNT(*)::int FROM items WHERE created_at > now() - interval '24 hours') AS items_24h,
            (SELECT COUNT(*)::int FROM users) AS total_users,
            (SELECT COUNT(*)::int FROM users WHERE is_dealer = 1) AS total_dealers,
            (SELECT COUNT(*)::int FROM items WHERE status != 'deleted') AS live_items,
            (SELECT COUNT(*)::int FROM markets WHERE status = 'upcoming') AS upcoming_markets,
            (SELECT COUNT(*)::int FROM markets WHERE status = 'live') AS live_markets`,
    args: [],
  });

  // Recent events for the event log table (last 100)
  const recent = await db.execute({
    sql: `SELECT id, event_type, severity, entity_type, entity_id, message, created_at
          FROM system_events
          ORDER BY created_at DESC LIMIT 100`,
    args: [],
  });

  // Upcoming markets whose start date has passed and that haven't
  // been archived yet. Flagged so an admin knows to archive them —
  // not an automated failure anymore.
  const stuckMarkets = await db.execute({
    sql: `SELECT id, name, starts_at FROM markets
          WHERE starts_at < now()
            AND (archived IS NULL OR archived = 0)
            AND status = 'upcoming'`,
    args: [],
  });

  return json({
    now: new Date().toISOString(),
    status: {
      db: { ok: dbOk, latency_ms: dbMs },
      ops_cron: lastOpsCron.rows[0] || null,
      stuck_markets: stuckMarkets.rows,
    },
    counts_24h: counts.rows[0] || {},
    business: biz.rows[0] || {},
    recent_events: recent.rows,
  });
}

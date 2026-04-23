import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

/**
 * Site-activity rollup for the admin Activity tab. Returns a per-day
 * breakdown for the last 7 days plus today/yesterday totals broken out.
 * All reads hit Postgres; no external analytics dependency.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const [signups, inquiries, items, views] = await Promise.all([
    db.execute(`
      SELECT date_trunc('day', created_at AT TIME ZONE 'America/Los_Angeles')::date as day,
             is_dealer,
             COUNT(*)::int as count
      FROM users
      WHERE created_at >= now() - interval '7 days'
      GROUP BY day, is_dealer
      ORDER BY day DESC
    `),
    db.execute(`
      SELECT date_trunc('day', created_at AT TIME ZONE 'America/Los_Angeles')::date as day,
             COUNT(*)::int as count
      FROM inquiries
      WHERE created_at >= now() - interval '7 days'
      GROUP BY day
      ORDER BY day DESC
    `),
    db.execute(`
      SELECT date_trunc('day', created_at AT TIME ZONE 'America/Los_Angeles')::date as day,
             COUNT(*)::int as count
      FROM items
      WHERE created_at >= now() - interval '7 days' AND status != 'deleted'
      GROUP BY day
      ORDER BY day DESC
    `),
    db.execute(`
      SELECT date_trunc('day', created_at AT TIME ZONE 'America/Los_Angeles')::date as day,
             COUNT(*)::int as total,
             COUNT(DISTINCT entity_id)::int as signed_in
      FROM system_events
      WHERE event_type = 'page.view'
        AND created_at >= now() - interval '7 days'
      GROUP BY day
      ORDER BY day DESC
    `),
  ]);

  return json({
    signups: signups.rows,
    inquiries: inquiries.rows,
    items: items.rows,
    views: views.rows,
  });
}

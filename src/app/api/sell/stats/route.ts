import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

/**
 * Trailing-7-day stats for the dealer's /sell page. Four counters,
 * all scoped to the authenticated dealer's items:
 *
 *   listed    — items the dealer posted in the last 7 days
 *   views     — page.view events on /item/<id> for this dealer's items
 *   watchers  — favorites added to this dealer's items
 *   inquiries — inquiries opened on this dealer's items
 *
 * The window is hardcoded at 7 days. If we ever add a 30-day toggle we
 * can take a ?days= param and parameterize the interval.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const [listed, views, watchers, inquiries] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*)::int AS n FROM items
            WHERE dealer_id = ?
              AND status != 'deleted'
              AND created_at > now() - interval '7 days'`,
      args: [user.dealer_id],
    }),
    db.execute({
      sql: `SELECT COUNT(*)::int AS n
            FROM system_events e
            JOIN items i ON ('/item/' || i.id) = (e.payload->>'path')
            WHERE e.event_type = 'page.view'
              AND e.created_at > now() - interval '7 days'
              AND i.dealer_id = ?`,
      args: [user.dealer_id],
    }),
    db.execute({
      sql: `SELECT COUNT(*)::int AS n
            FROM favorites f
            JOIN items i ON i.id = f.item_id
            WHERE i.dealer_id = ?
              AND f.created_at > now() - interval '7 days'`,
      args: [user.dealer_id],
    }),
    db.execute({
      sql: `SELECT COUNT(*)::int AS n
            FROM inquiries q
            JOIN items i ON i.id = q.item_id
            WHERE i.dealer_id = ?
              AND q.created_at > now() - interval '7 days'`,
      args: [user.dealer_id],
    }),
  ]);

  return json({
    range_days: 7,
    listed: Number(listed.rows[0]?.n ?? 0),
    views: Number(views.rows[0]?.n ?? 0),
    watchers: Number(watchers.rows[0]?.n ?? 0),
    inquiries: Number(inquiries.rows[0]?.n ?? 0),
  });
}

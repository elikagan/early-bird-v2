import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;

  // Stats and items are scoped to attending dealers (booth_settings
  // declined=false) under the persistent-booth model. The legacy
  // `items.market_id` column is NULL on every item now, so the old
  // queries here returned all zeros / empty lists.
  const attendingSubquery = `
    SELECT bs.dealer_id FROM booth_settings bs
    WHERE bs.market_id = ? AND bs.declined = false
  `;

  const [market, stats, items, blasts, actions] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM markets WHERE id = ?`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM items
                 WHERE status != 'deleted'
                   AND dealer_id IN (${attendingSubquery})) as total_items,
              (SELECT COUNT(*) FROM items
                 WHERE status = 'live'
                   AND dealer_id IN (${attendingSubquery})) as live_items,
              (SELECT COUNT(*) FROM items
                 WHERE status = 'sold'
                   AND dealer_id IN (${attendingSubquery})) as sold_items,
              (SELECT COUNT(*) FROM items
                 WHERE status = 'hold'
                   AND dealer_id IN (${attendingSubquery})) as hold_items,
              (SELECT COUNT(*) FROM booth_settings
                 WHERE market_id = ? AND declined = false) as dealer_count`,
      args: [id, id, id, id, id],
    }),
    db.execute({
      sql: `SELECT i.id, i.title, i.price, i.status, i.created_at,
              d.business_name as dealer_name,
              (SELECT url FROM item_photos WHERE item_id = i.id ORDER BY position LIMIT 1) as photo_url
            FROM items i
            JOIN dealers d ON d.id = i.dealer_id
            WHERE i.status != 'deleted'
              AND i.dealer_id IN (${attendingSubquery})
            ORDER BY i.created_at DESC
            LIMIT 50`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT * FROM sms_blasts
            WHERE market_id = ?
            ORDER BY created_at DESC`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT * FROM admin_actions
            WHERE entity_type = 'market' AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT 20`,
      args: [id],
    }),
  ]);

  if (market.rows.length === 0) return error("Market not found", 404);

  return json({
    ...market.rows[0],
    stats: stats.rows[0],
    items: items.rows,
    blasts: blasts.rows,
    actions: actions.rows,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;
  const body = await request.json();

  const allowed = ["name", "location", "starts_at", "drop_at", "status", "is_test", "archived"];
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`);
      args.push(body[key]);
    }
  }

  if (sets.length === 0) return error("No fields to update");
  args.push(id);

  await db.execute({
    sql: `UPDATE markets SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });

  const action = body.archived === 1
    ? "archive_market"
    : body.archived === 0
      ? "unarchive_market"
      : "edit_market";

  await logAdminAction(user.phone, action, "market", id, body);

  const result = await db.execute({
    sql: `SELECT * FROM markets WHERE id = ?`,
    args: [id],
  });

  return json(result.rows[0]);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;

  // Block delete when dealers have committed to this market via the
  // weekly /sell prompt. Items don't carry market_id under the
  // persistent-booth model, so the old `items.market_id` check was a
  // no-op safety net. Booth_settings is the real binding now.
  const attendees = await db.execute({
    sql: `SELECT COUNT(*) as count FROM booth_settings
          WHERE market_id = ? AND declined = false`,
    args: [id],
  });

  if (Number(attendees.rows[0]?.count) > 0) {
    return error(
      "Cannot delete market with attending dealers. Archive it instead.",
      409
    );
  }

  await db.execute({
    sql: `DELETE FROM markets WHERE id = ?`,
    args: [id],
  });

  await logAdminAction(user.phone, "delete_market", "market", id, {});

  return json({ ok: true });
}

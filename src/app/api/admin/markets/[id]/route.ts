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

  const [market, stats, items, blasts, actions] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM markets WHERE id = ?`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM items WHERE market_id = ? AND status != 'deleted') as total_items,
              (SELECT COUNT(*) FROM items WHERE market_id = ? AND status = 'live') as live_items,
              (SELECT COUNT(*) FROM items WHERE market_id = ? AND status = 'sold') as sold_items,
              (SELECT COUNT(*) FROM items WHERE market_id = ? AND status = 'hold') as hold_items,
              (SELECT COUNT(*) FROM booth_settings WHERE market_id = ?) as dealer_count`,
      args: [id, id, id, id, id],
    }),
    db.execute({
      sql: `SELECT i.id, i.title, i.price, i.status, i.created_at,
              d.business_name as dealer_name,
              (SELECT url FROM item_photos WHERE item_id = i.id ORDER BY position LIMIT 1) as photo_url
            FROM items i
            JOIN dealers d ON d.id = i.dealer_id
            WHERE i.market_id = ? AND i.status != 'deleted'
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

  const allowed = ["name", "location", "starts_at", "drop_at", "status", "is_test", "archived", "dealer_preshop_enabled", "drop_notified_at"];
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

  // Check for items
  const items = await db.execute({
    sql: `SELECT COUNT(*) as count FROM items WHERE market_id = ?`,
    args: [id],
  });

  if (Number(items.rows[0]?.count) > 0) {
    return error("Cannot delete market with items. Archive it instead.", 409);
  }

  await db.execute({
    sql: `DELETE FROM markets WHERE id = ?`,
    args: [id],
  });

  await logAdminAction(user.phone, "delete_market", "market", id, {});

  return json({ ok: true });
}

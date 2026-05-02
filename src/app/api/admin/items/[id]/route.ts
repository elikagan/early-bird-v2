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

  const [item, photos, inquiries, actions] = await Promise.all([
    db.execute({
      sql: `SELECT i.*,
              d.business_name as dealer_name, d.id as dealer_id,
              u.display_name as dealer_display_name, u.id as dealer_user_id, u.phone as dealer_phone,
              m.name as market_name,
              (SELECT COUNT(*) FROM favorites WHERE item_id = i.id) as fav_count
            FROM items i
            JOIN dealers d ON d.id = i.dealer_id
            JOIN users u ON u.id = d.user_id
            LEFT JOIN markets m ON m.id = i.market_id
            WHERE i.id = ?`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT * FROM item_photos WHERE item_id = ? ORDER BY position`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT inq.*, u.display_name as buyer_name, u.phone as buyer_phone
            FROM inquiries inq
            JOIN users u ON u.id = inq.buyer_id
            WHERE inq.item_id = ?
            ORDER BY inq.created_at DESC`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT * FROM admin_actions
            WHERE entity_type = 'item' AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT 20`,
      args: [id],
    }),
  ]);

  if (item.rows.length === 0) return error("Item not found", 404);

  return json({
    ...item.rows[0],
    photos: photos.rows,
    inquiries: inquiries.rows,
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

  const allowed = ["status", "price", "title", "description", "price_firm"];
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
    sql: `UPDATE items SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });

  await logAdminAction(user.phone, "edit_item", "item", id, body);

  return json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;

  await db.execute({
    sql: `UPDATE items SET status = 'deleted' WHERE id = ?`,
    args: [id],
  });

  await logAdminAction(user.phone, "delete_item", "item", id, {});

  return json({ ok: true });
}

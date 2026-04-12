import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  // Verify this dealer owns the item
  const item = await db.execute({
    sql: `SELECT id FROM items WHERE id = ? AND dealer_id = ?`,
    args: [id, user.dealer_id],
  });
  if (item.rows.length === 0) return error("Item not found or not yours", 404);

  const result = await db.execute({
    sql: `
      SELECT
        q.id, q.message, q.status, q.created_at,
        u.id as buyer_id,
        u.first_name as buyer_first_name,
        u.last_name as buyer_last_name,
        u.display_name as buyer_display_name,
        u.phone as buyer_phone,
        u.avatar_url as buyer_avatar
      FROM inquiries q
      JOIN users u ON u.id = q.buyer_id
      WHERE q.item_id = ?
      ORDER BY q.created_at DESC
    `,
    args: [id],
  });

  return json(result.rows);
}

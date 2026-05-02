import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const url = new URL(request.url);

  // Items no longer carry a market_id, so the old "?market_id=" filter
  // and the markets join are gone. The Watching tab now lists every
  // favorited item regardless of which market the dealer is at.
  const sql = `
    SELECT
      f.id as favorite_id, f.created_at as favorited_at,
      i.*,
      d.business_name as dealer_name,
      d.instagram_handle as dealer_instagram,
      u.display_name as dealer_display_name,
      (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
      (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url,
      (SELECT message FROM inquiries q WHERE q.item_id = i.id AND q.buyer_id = ? ORDER BY q.created_at DESC LIMIT 1) as my_inquiry_message,
      (SELECT status FROM inquiries q WHERE q.item_id = i.id AND q.buyer_id = ? ORDER BY q.created_at DESC LIMIT 1) as my_inquiry_status
    FROM favorites f
    JOIN items i ON i.id = f.item_id
    JOIN dealers d ON d.id = i.dealer_id
    JOIN users u ON u.id = d.user_id
    WHERE f.buyer_id = ?
    ORDER BY f.created_at DESC
    LIMIT ${Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 200), 500)}
    OFFSET ${Math.max(0, Number(url.searchParams.get("offset")) || 0)}
  `;
  const args: (string | null)[] = [user.id, user.id, user.id];

  const result = await db.execute({ sql, args });
  return json(result.rows);
}

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();
  const { item_id } = body;
  if (!item_id) return error("item_id is required");

  // Verify item exists
  const item = await db.execute({ sql: `SELECT id FROM items WHERE id = ?`, args: [item_id] });
  if (item.rows.length === 0) return error("Item not found", 404);

  const favId = newId();
  await db.execute({
    sql: `INSERT INTO favorites (id, buyer_id, item_id) VALUES (?, ?, ?) ON CONFLICT(buyer_id, item_id) DO NOTHING`,
    args: [favId, user.id, item_id],
  });

  // Return the row (whether newly inserted or pre-existing)
  const row = await db.execute({
    sql: `SELECT id FROM favorites WHERE buyer_id = ? AND item_id = ?`,
    args: [user.id, item_id],
  });
  return json(row.rows[0], 201);
}

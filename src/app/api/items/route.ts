import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const marketId = url.searchParams.get("market_id");
  const dealerId = url.searchParams.get("dealer_id");

  if (!marketId) return error("market_id is required");

  let sql = `
    SELECT
      i.*,
      d.business_name as dealer_name,
      d.instagram_handle as dealer_instagram,
      d.id as dealer_ref,
      u.display_name as dealer_display_name,
      u.avatar_url as dealer_avatar,
      (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
      (SELECT COUNT(*) FROM favorites f WHERE f.item_id = i.id) as watcher_count,
      (SELECT COUNT(*) FROM inquiries q WHERE q.item_id = i.id) as inquiry_count
    FROM items i
    JOIN dealers d ON d.id = i.dealer_id
    JOIN users u ON u.id = d.user_id
    WHERE i.market_id = ?
  `;
  const args: (string | null)[] = [marketId];

  if (dealerId) {
    sql += ` AND i.dealer_id = ?`;
    args.push(dealerId);
  } else {
    // Buyers don't see deleted items
    sql += ` AND i.status != 'deleted'`;
  }

  sql += ` ORDER BY i.created_at DESC`;

  const result = await db.execute({ sql, args });
  return json(result.rows);
}

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const body = await request.json();
  const { market_id, title, description, price, price_firm, photo_urls } = body;

  if (!market_id || !title || price == null) {
    return error("market_id, title, and price are required");
  }

  const itemId = newId();
  await db.execute({
    sql: `INSERT INTO items (id, dealer_id, market_id, title, description, price, price_firm)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [itemId, user.dealer_id, market_id, title, description || null, price, price_firm ? 1 : 0],
  });

  if (Array.isArray(photo_urls)) {
    for (let i = 0; i < photo_urls.length; i++) {
      await db.execute({
        sql: `INSERT INTO item_photos (id, item_id, url, position) VALUES (?, ?, ?, ?)`,
        args: [newId(), itemId, photo_urls[i], i],
      });
    }
  }

  const item = await db.execute({ sql: `SELECT * FROM items WHERE id = ?`, args: [itemId] });
  return json(item.rows[0], 201);
}

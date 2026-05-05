import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { getFeaturedMarket } from "@/lib/markets";
import { marketAbbr } from "@/lib/format";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const url = new URL(request.url);

  // Featured market lookup so each favorited item carries the
  // attendance pill data ("RB · 503") if the dealer's at the next
  // show. Same shape as /api/items.
  const featured = await getFeaturedMarket();
  const args: (string | null)[] = [user.id, user.id];

  let atMarketSelect = `0 as at_market, NULL::text as at_market_booth`;
  let featuredJoin = "";
  if (featured) {
    atMarketSelect = `
      (CASE WHEN bs_feat.dealer_id IS NOT NULL THEN 1 ELSE 0 END) as at_market,
      bs_feat.booth_number as at_market_booth
    `;
    featuredJoin = `
      LEFT JOIN booth_settings bs_feat
        ON bs_feat.dealer_id = d.id
       AND bs_feat.market_id = ?
       AND bs_feat.declined = false
    `;
    args.push(featured.id);
  }
  args.push(user.id); // for the WHERE buyer_id = ?

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
      (SELECT status FROM inquiries q WHERE q.item_id = i.id AND q.buyer_id = ? ORDER BY q.created_at DESC LIMIT 1) as my_inquiry_status,
      ${atMarketSelect}
    FROM favorites f
    JOIN items i ON i.id = f.item_id
    JOIN dealers d ON d.id = i.dealer_id
    JOIN users u ON u.id = d.user_id
    ${featuredJoin}
    WHERE f.buyer_id = ?
    ORDER BY f.created_at DESC
    LIMIT ${Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 200), 500)}
    OFFSET ${Math.max(0, Number(url.searchParams.get("offset")) || 0)}
  `;

  const result = await db.execute({ sql, args });

  // Bake the badge label onto every at_market=1 row, same shape as
  // /api/items + the home page server.
  const featuredAbbr = featured ? marketAbbr(featured.name) : null;
  const rows = result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...row,
      at_market_label:
        Number(row.at_market) === 1 ? featuredAbbr : null,
    };
  });

  return json(rows);
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

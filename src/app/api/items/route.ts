import db from "@/lib/db";
import { json, error, cachedJson } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const marketId = url.searchParams.get("market_id");
  const dealerId = url.searchParams.get("dealer_id");

  if (!marketId) return error("market_id is required");

  // Dealer pre-shop gate: if this market hasn't dropped yet, only
  // dealers may see the item list (and only when dealer_preshop_enabled
  // is on for the market). Non-dealers get 403 → UI shows countdown.
  const marketCheck = await db.execute({
    sql: `SELECT status, dealer_preshop_enabled FROM markets WHERE id = ?`,
    args: [marketId],
  });
  if (marketCheck.rows.length === 0) return error("Market not found", 404);
  const mkt = marketCheck.rows[0] as Record<string, unknown>;
  if (mkt.status === "upcoming") {
    const user = await getSession(request);
    const isDealer = !!user?.dealer_id;
    const preshopOn = Number(mkt.dealer_preshop_enabled ?? 1) === 1;
    if (!isDealer || !preshopOn) {
      return error("Market is pre-drop", 403);
    }
  }

  let sql = `
    SELECT
      i.*,
      d.business_name as dealer_name,
      d.instagram_handle as dealer_instagram,
      d.id as dealer_ref,
      u.display_name as dealer_display_name,
      u.avatar_url as dealer_avatar,
      (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
      (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url,
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

  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 50), 200);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  sql += ` ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.execute({ sql, args });

  // When a dealer is viewing their own inventory (/sell passes
  // dealer_id), bypass the CDN cache so a newly-posted item shows up
  // on the next page load instead of being shadowed by a stale cached
  // response for up to 60s.
  if (dealerId) {
    return json(result.rows);
  }
  return cachedJson(result.rows);
}

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const body = await request.json();
  const { market_id, title, description, price, price_firm, photo_urls, photos } = body;

  if (!market_id || !title || price == null) {
    return error("market_id, title, and price are required");
  }

  const itemId = newId();
  await db.execute({
    sql: `INSERT INTO items (id, dealer_id, market_id, title, description, price, price_firm)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [itemId, user.dealer_id, market_id, title, description || null, price, price_firm ? 1 : 0],
  });

  // Accept new format { url, thumb_url }[] or legacy string[]
  const photoList: { url: string; thumb_url: string | null }[] = Array.isArray(photos)
    ? photos
    : Array.isArray(photo_urls)
      ? photo_urls.map((u: string) => ({ url: u, thumb_url: null }))
      : [];

  for (let i = 0; i < photoList.length; i++) {
    await db.execute({
      sql: `INSERT INTO item_photos (id, item_id, url, thumb_url, position) VALUES (?, ?, ?, ?, ?)`,
      args: [newId(), itemId, photoList[i].url, photoList[i].thumb_url, i],
    });
  }

  const item = await db.execute({ sql: `SELECT * FROM items WHERE id = ?`, args: [itemId] });
  return json(item.rows[0], 201);
}

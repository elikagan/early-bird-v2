import db from "@/lib/db";
import { json, error, cachedJson } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

/**
 * Catalog read endpoint. Under the persistent-booth model items belong
 * to dealers, not markets — but a buyer can still narrow the catalog
 * to "items by dealers attending market X" by passing ?market_id=X.
 *
 * Query parameters:
 *   ?market_id=X — narrows to dealers attending that market (declined=false)
 *   ?dealer_id=X — narrows to one dealer's items
 *   ?limit / ?offset — pagination, default 200, cap 200
 *
 * No params → all live items, every dealer. The default the home page
 * uses now.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const marketId = url.searchParams.get("market_id");
  const dealerId = url.searchParams.get("dealer_id");

  // If a market filter is requested, validate the market exists + isn't
  // archived. Saves us serving an empty list while looking like we
  // searched something legit.
  if (marketId) {
    const marketCheck = await db.execute({
      sql: `SELECT id, archived FROM markets WHERE id = ?`,
      args: [marketId],
    });
    if (marketCheck.rows.length === 0) return error("Market not found", 404);
    const mkt = marketCheck.rows[0] as Record<string, unknown>;
    if (Number(mkt.archived ?? 0) === 1) {
      return error("Market not available", 404);
    }
  }

  // ?market_id=X is a sort hint, not a strict filter. We return every
  // live item, but flag rows where the dealer said yes to that market
  // and surface those first. Non-attending items render below as "ads"
  // (FB-Marketplace style local search + sponsored). The buy view uses
  // the at_market flag to render a divider between the two groups.
  const args: (string | null)[] = [];
  let atMarketSelect = `0 as at_market`;
  if (marketId) {
    atMarketSelect = `CASE WHEN EXISTS (
      SELECT 1 FROM booth_settings bs
      WHERE bs.dealer_id = i.dealer_id
        AND bs.market_id = ?
        AND bs.declined = false
    ) THEN 1 ELSE 0 END as at_market`;
    args.push(marketId);
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
      (SELECT COUNT(*) FROM inquiries q WHERE q.item_id = i.id) as inquiry_count,
      ${atMarketSelect}
    FROM items i
    JOIN dealers d ON d.id = i.dealer_id
    JOIN users u ON u.id = d.user_id
    WHERE 1=1
  `;

  if (dealerId) {
    sql += ` AND i.dealer_id = ?`;
    args.push(dealerId);
  } else {
    // Public catalog: only live + held items. Sold items disappear
    // from buyer-facing browse — they take up grid space and aren't
    // actionable. Sold items are still reachable on individual item
    // pages (so buyer receipts and old links still resolve) and on
    // the dealer's own /sell page archive (which uses ?dealer_id=).
    sql += ` AND i.status IN ('live', 'hold')`;
  }

  const limit = Math.min(
    Math.max(1, Number(url.searchParams.get("limit")) || 200),
    200
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  // When a market hint is set, attending-dealer items come first.
  // Otherwise pure chronological.
  sql += marketId
    ? ` ORDER BY at_market DESC, i.created_at DESC LIMIT ${limit} OFFSET ${offset}`
    : ` ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.execute({ sql, args });

  // Dealer-self-view: skip CDN cache so a newly-posted item shows on
  // the next page load instead of being shadowed by a 60s cached
  // response.
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
  const { title, description, price, price_firm, photo_urls, photos } = body;

  if (!title || price == null) {
    return error("title and price are required");
  }

  // (Persistent-booth model: items no longer carry a market_id at
  //  creation. They join the dealer's catalog. The dealer's market
  //  attendance is recorded separately in booth_settings.)
  const itemId = newId();
  await db.execute({
    sql: `INSERT INTO items (id, dealer_id, title, description, price, price_firm)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      itemId,
      user.dealer_id,
      title,
      description || null,
      price,
      price_firm ? 1 : 0,
    ],
  });

  // Accept new format { url, thumb_url }[] or legacy string[]
  const photoList: { url: string; thumb_url: string | null }[] = Array.isArray(
    photos
  )
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

  const item = await db.execute({
    sql: `SELECT * FROM items WHERE id = ?`,
    args: [itemId],
  });
  return json(item.rows[0], 201);
}

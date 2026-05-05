import db from "@/lib/db";
import { json, error, cachedJson } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { getFeaturedMarket } from "@/lib/markets";
import { marketAbbr } from "@/lib/format";

/**
 * Catalog read endpoint. Under the persistent-booth model items belong
 * to dealers, not markets. The market is editorial atmosphere, never a
 * filter or gate. Every live item is returned; an `at_market` boolean
 * + `booth_number` column per row tell the UI when to decorate the
 * card with the "RB · 503" attendance pill.
 *
 * Query parameters:
 *   ?dealer_id=X — narrows to one dealer's catalog (used by /sell)
 *   ?limit / ?offset — pagination, default 200, cap 200
 *
 * The legacy ?market_id= param is ignored. The catalog is never
 * filtered or sorted by attendance.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dealerId = url.searchParams.get("dealer_id");

  // Featured-market lookup once per call. Per-row at_market + booth
  // are computed against this market.
  const featured = await getFeaturedMarket();
  const args: (string | null)[] = [];

  let atMarketSelect = `0 as at_market, NULL::text as at_market_booth`;
  if (featured) {
    atMarketSelect = `
      (CASE WHEN bs_feat.dealer_id IS NOT NULL THEN 1 ELSE 0 END) as at_market,
      bs_feat.booth_number as at_market_booth
    `;
  }

  const featuredJoin = featured
    ? `LEFT JOIN booth_settings bs_feat
         ON bs_feat.dealer_id = d.id
        AND bs_feat.market_id = ?
        AND bs_feat.declined = false`
    : "";
  if (featured) args.push(featured.id);

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
    ${featuredJoin}
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

  // Always pure chronological. Attendance is a tag on the card, not
  // a sort key.
  sql += ` ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.execute({ sql, args });

  // Bake the badge label onto every at_market=1 row so callers don't
  // have to know which market is featured. /api/favorites + the home
  // page server do the same — single source of truth for the pill
  // text.
  const featuredAbbr = featured ? marketAbbr(featured.name) : null;
  const rows = result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...row,
      at_market_label:
        Number(row.at_market) === 1 ? featuredAbbr : null,
    };
  });

  // Dealer-self-view: skip CDN cache so a newly-posted item shows on
  // the next page load instead of being shadowed by a 60s cached
  // response.
  if (dealerId) {
    return json(rows);
  }
  return cachedJson(rows);
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

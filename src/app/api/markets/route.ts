import db from "@/lib/db";
import { cachedJson } from "@/lib/api";

/**
 * Public market list. Used by the buy-filter chip rail and any other
 * surface that needs "all markets" without joining items in.
 *
 * Item counts under the persistent-booth model = live items by dealers
 * who said yes to this market. The legacy `items.market_id` column is
 * NULL on every item now, so the old "items by market_id" count was
 * always 0 — misleading. Dealer count uses the same attendance signal
 * (declined=false).
 *
 * Ordered by show date (starts_at), not the now-defunct drop_at.
 */
export async function GET() {
  const result = await db.execute(`
    SELECT
      m.*,
      (SELECT COUNT(*) FROM booth_settings bs
         WHERE bs.market_id = m.id AND bs.declined = false) as dealer_count,
      (SELECT COUNT(*) FROM items i
         WHERE i.status = 'live'
           AND i.dealer_id IN (
             SELECT bs.dealer_id FROM booth_settings bs
             WHERE bs.market_id = m.id AND bs.declined = false
           )) as item_count
    FROM markets m
    ORDER BY m.starts_at ASC
  `);

  return cachedJson(result.rows);
}

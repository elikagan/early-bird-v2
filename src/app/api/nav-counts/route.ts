import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

/**
 * Lightweight counts for the bottom nav badges.
 * Single endpoint so every page renders consistent "Watching (N)" and
 * "Sell (N)" regardless of which tab the user is viewing.
 *
 * - watching: total favorites across all markets
 * - sell:     items in the current sell-focus market (live if present,
 *             otherwise the next upcoming market) — matches what the
 *             sell page itself shows. Null for non-dealers.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  // Watching count — all of this user's favorites.
  const favResult = await db.execute({
    sql: `SELECT COUNT(*)::int AS n FROM favorites WHERE buyer_id = ?`,
    args: [user.id],
  });
  const watching = Number(favResult.rows[0]?.n ?? 0);

  // Sell count — only for dealers.
  let sell: number | null = null;
  if (user.dealer_id) {
    // Pick the same market the sell page picks: live if present, else
    // the earliest by drop_at.
    const marketResult = await db.execute(`
      SELECT id FROM markets
      ORDER BY CASE status WHEN 'live' THEN 0 ELSE 1 END, drop_at ASC
      LIMIT 1
    `);
    const marketId = marketResult.rows[0]?.id as string | undefined;
    if (marketId) {
      const itemResult = await db.execute({
        sql: `SELECT COUNT(*)::int AS n FROM items
              WHERE dealer_id = ? AND market_id = ? AND status != 'deleted'`,
        args: [user.dealer_id, marketId],
      });
      sell = Number(itemResult.rows[0]?.n ?? 0);
    } else {
      sell = 0;
    }
  }

  return json({ watching, sell });
}

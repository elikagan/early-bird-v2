import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

/**
 * Lightweight counts for the bottom nav badges.
 *
 * - watching: total favorites across all markets
 * - sell:     dealer's full live catalog count (no market filter under
 *             the persistent-booth model — items don't carry market_id).
 *             Null for non-dealers.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const favResult = await db.execute({
    sql: `SELECT COUNT(*)::int AS n FROM favorites WHERE buyer_id = ?`,
    args: [user.id],
  });
  const watching = Number(favResult.rows[0]?.n ?? 0);

  let sell: number | null = null;
  if (user.dealer_id) {
    const itemResult = await db.execute({
      sql: `SELECT COUNT(*)::int AS n FROM items
            WHERE dealer_id = ? AND status != 'deleted'`,
      args: [user.dealer_id],
    });
    sell = Number(itemResult.rows[0]?.n ?? 0);
  }

  return json({ watching, sell });
}

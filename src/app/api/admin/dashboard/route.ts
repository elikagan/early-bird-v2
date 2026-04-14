import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const [dealers, buyers, itemsWeek, soldWeek, nextMarket, actions] =
    await Promise.all([
      db.execute(
        `SELECT COUNT(*) as count FROM dealers`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM users WHERE is_dealer = 0`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM items
         WHERE created_at >= now() - interval '7 days'
           AND status != 'deleted'`
      ),
      db.execute(
        `SELECT COUNT(*) as count FROM items
         WHERE status = 'sold'
           AND created_at >= now() - interval '7 days'`
      ),
      db.execute(
        `SELECT m.*,
           (SELECT COUNT(*) FROM booth_settings bs WHERE bs.market_id = m.id) as dealer_count,
           (SELECT COUNT(*) FROM items i WHERE i.market_id = m.id AND i.status != 'deleted') as item_count
         FROM markets m
         WHERE m.starts_at >= now() AND m.archived = 0
         ORDER BY m.starts_at ASC
         LIMIT 1`
      ),
      db.execute(
        `SELECT * FROM admin_actions
         ORDER BY created_at DESC
         LIMIT 20`
      ),
    ]);

  return json({
    dealer_count: Number(dealers.rows[0]?.count ?? 0),
    buyer_count: Number(buyers.rows[0]?.count ?? 0),
    items_this_week: Number(itemsWeek.rows[0]?.count ?? 0),
    sold_this_week: Number(soldWeek.rows[0]?.count ?? 0),
    next_market: nextMarket.rows[0] || null,
    recent_actions: actions.rows,
  });
}

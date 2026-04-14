import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("market_id");
  const status = searchParams.get("status");
  const dealerId = searchParams.get("dealer_id");

  const conditions: string[] = [];
  const args: unknown[] = [];

  if (marketId) {
    conditions.push("i.market_id = ?");
    args.push(marketId);
  }

  if (status) {
    conditions.push("i.status = ?");
    args.push(status);
  } else {
    conditions.push("i.status != 'deleted'");
  }

  if (dealerId) {
    conditions.push("d.id = ?");
    args.push(dealerId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute({
    sql: `SELECT i.id, i.title, i.price, i.status, i.created_at, i.market_id,
            d.business_name as dealer_name, d.id as dealer_id,
            u.display_name as dealer_display_name, u.id as user_id,
            m.name as market_name,
            (SELECT url FROM item_photos WHERE item_id = i.id ORDER BY position LIMIT 1) as photo_url,
            (SELECT COUNT(*) FROM favorites WHERE item_id = i.id) as fav_count,
            (SELECT COUNT(*) FROM inquiries WHERE item_id = i.id) as inquiry_count
          FROM items i
          JOIN dealers d ON d.id = i.dealer_id
          JOIN users u ON u.id = d.user_id
          JOIN markets m ON m.id = i.market_id
          ${where}
          ORDER BY i.created_at DESC
          LIMIT 100`,
    args,
  });

  return json(result.rows);
}

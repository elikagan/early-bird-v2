import db from "@/lib/db";
import { json } from "@/lib/api";

export async function GET() {
  const result = await db.execute(`
    SELECT
      m.*,
      (SELECT COUNT(*) FROM booth_settings bs WHERE bs.market_id = m.id) as dealer_count,
      (SELECT COUNT(*) FROM items i WHERE i.market_id = m.id) as item_count
    FROM markets m
    ORDER BY m.drop_at ASC
  `);

  return json(result.rows);
}

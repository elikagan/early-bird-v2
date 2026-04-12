import db from "@/lib/db";
import { json, error } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await db.execute({
    sql: `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM booth_settings bs WHERE bs.market_id = m.id) as dealer_count,
        (SELECT COUNT(*) FROM items i WHERE i.market_id = m.id) as item_count
      FROM markets m
      WHERE m.id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) return error("Market not found", 404);
  return json(result.rows[0]);
}

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ market_id: string }> }
) {
  const { market_id } = await params;
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const existing = await db.execute({
    sql: `SELECT id FROM booth_settings WHERE dealer_id = ? AND market_id = ?`,
    args: [user.dealer_id, market_id],
  });
  if (existing.rows.length === 0) return error("Booth not set up for this market", 404);

  const body = await request.json();
  if (body.booth_number !== undefined) {
    await db.execute({
      sql: `UPDATE booth_settings SET booth_number = ? WHERE dealer_id = ? AND market_id = ?`,
      args: [body.booth_number, user.dealer_id, market_id],
    });
  }

  const result = await db.execute({
    sql: `SELECT * FROM booth_settings WHERE dealer_id = ? AND market_id = ?`,
    args: [user.dealer_id, market_id],
  });
  return json(result.rows[0]);
}

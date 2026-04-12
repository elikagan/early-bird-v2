import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const body = await request.json();
  const { market_id, booth_number } = body;

  if (!market_id) return error("market_id is required");

  // Verify market exists
  const market = await db.execute({
    sql: `SELECT id FROM markets WHERE id = ?`,
    args: [market_id],
  });
  if (market.rows.length === 0) return error("Market not found", 404);

  // Upsert booth settings
  const boothId = newId();
  await db.execute({
    sql: `INSERT INTO booth_settings (id, dealer_id, market_id, booth_number)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(dealer_id, market_id) DO UPDATE SET booth_number = excluded.booth_number`,
    args: [boothId, user.dealer_id, market_id, booth_number || null],
  });

  const result = await db.execute({
    sql: `SELECT * FROM booth_settings WHERE dealer_id = ? AND market_id = ?`,
    args: [user.dealer_id, market_id],
  });
  return json(result.rows[0], 201);
}

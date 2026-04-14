import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") || "all";
  const marketId = searchParams.get("market_id");

  let result;

  if (audience === "dealers") {
    if (marketId) {
      // Dealers with booths in this market
      result = await db.execute({
        sql: `SELECT COUNT(DISTINCT u.id) as count
              FROM users u
              JOIN dealers d ON d.user_id = u.id
              JOIN booth_settings bs ON bs.dealer_id = d.id AND bs.market_id = ?
              WHERE u.is_dealer = 1`,
        args: [marketId],
      });
    } else {
      result = await db.execute(
        `SELECT COUNT(*) as count FROM users WHERE is_dealer = 1`
      );
    }
  } else if (audience === "buyers") {
    result = await db.execute(
      `SELECT COUNT(*) as count FROM users WHERE is_dealer = 0`
    );
  } else {
    // all
    result = await db.execute(
      `SELECT COUNT(*) as count FROM users`
    );
  }

  return json({ count: Number(result.rows[0]?.count ?? 0) });
}

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin, blastExcludedPhones } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") || "all";
  const marketId = searchParams.get("market_id");

  // Mirror the send path's exclusions so the preview count matches
  // what would actually go out.
  const excluded = blastExcludedPhones();
  const placeholders = excluded.length
    ? excluded.map(() => "?").join(",")
    : null;
  const excludeClause = placeholders
    ? ` AND u.phone NOT IN (${placeholders})`
    : "";
  const excludeArgs: string[] = excluded;

  let result;

  if (audience === "dealers") {
    if (marketId) {
      result = await db.execute({
        sql: `SELECT COUNT(DISTINCT u.id) as count
              FROM users u
              JOIN dealers d ON d.user_id = u.id
              JOIN booth_settings bs ON bs.dealer_id = d.id AND bs.market_id = ?
              WHERE u.is_dealer = 1${excludeClause}`,
        args: [marketId, ...excludeArgs],
      });
    } else {
      result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM users u WHERE u.is_dealer = 1${excludeClause}`,
        args: excludeArgs,
      });
    }
  } else if (audience === "buyers") {
    result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM users u WHERE u.is_dealer = 0${excludeClause}`,
      args: excludeArgs,
    });
  } else {
    result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM users u WHERE 1=1${excludeClause}`,
      args: excludeArgs,
    });
  }

  return json({ count: Number(result.rows[0]?.count ?? 0) });
}

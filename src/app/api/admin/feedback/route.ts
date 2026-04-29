import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

/**
 * Admin view of post-market feedback. Filters: ?market=<id> (defaults
 * to the most recently archived market) and ?audience=buyer|dealer
 * (default: all). Returns one row per submission joined with the
 * user's display info so the admin doesn't have to do a second lookup.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const url = new URL(request.url);
  const audience = url.searchParams.get("audience"); // 'buyer' | 'dealer' | null
  let marketId = url.searchParams.get("market");

  if (!marketId) {
    // Default: the most recently-completed market — i.e., the show
    // that just wrapped. We don't trust 'archived = 1' alone because
    // a market could be archived for other reasons (cancelled,
    // duplicate) and still be in the future.
    const r = await db.execute(`
      SELECT id FROM markets
      WHERE starts_at < now()
      ORDER BY starts_at DESC
      LIMIT 1
    `);
    marketId = (r.rows[0]?.id as string | undefined) ?? null;
  }

  if (!marketId) {
    return json({ market_id: null, market_name: null, responses: [] });
  }

  const market = await db.execute({
    sql: `SELECT id, name, starts_at FROM markets WHERE id = ?`,
    args: [marketId],
  });

  let sql = `
    SELECT
      f.id, f.user_id, f.market_id, f.audience, f.responses,
      f.created_at, f.updated_at,
      u.display_name, u.phone, u.is_dealer,
      d.business_name
    FROM feedback_responses f
    JOIN users u ON u.id = f.user_id
    LEFT JOIN dealers d ON d.user_id = u.id
    WHERE f.market_id = ?
  `;
  const args: unknown[] = [marketId];
  if (audience === "buyer" || audience === "dealer") {
    sql += ` AND f.audience = ?`;
    args.push(audience);
  }
  sql += ` ORDER BY f.created_at DESC`;

  const r = await db.execute({ sql, args });

  return json({
    market_id: marketId,
    market_name: (market.rows[0] as Record<string, unknown> | undefined)
      ?.name ?? null,
    market_starts_at:
      (market.rows[0] as Record<string, unknown> | undefined)?.starts_at ??
      null,
    responses: r.rows,
  });
}

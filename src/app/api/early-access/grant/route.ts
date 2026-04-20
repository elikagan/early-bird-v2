import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

/**
 * Grants early access for the currently-authenticated user to a given
 * market. Used when an already-signed-in user taps a share link like
 * /early/[market-id] — we skip the SMS round-trip and just add the row.
 */
export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();
  const { market_id, source } = body;
  if (!market_id) return error("market_id is required");

  const marketCheck = await db.execute({
    sql: `SELECT id, archived FROM markets WHERE id = ?`,
    args: [market_id],
  });
  if (marketCheck.rows.length === 0) return error("Market not found", 404);
  const m = marketCheck.rows[0] as Record<string, unknown>;
  if (Number(m.archived ?? 0) === 1) return error("Market not available", 404);

  // Upsert grant (unique constraint on user_id+market_id handles dupes).
  await db.execute({
    sql: `INSERT INTO buyer_market_early_access (id, user_id, market_id, source)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, market_id) DO NOTHING`,
    args: [newId(), user.id, market_id, source ?? "share"],
  });

  return json({ ok: true, market_id });
}

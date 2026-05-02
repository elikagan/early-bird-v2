import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import {
  getFeaturedMarket,
  getCurrentBoothAnswer,
  getPriorBoothAnswer,
} from "@/lib/markets";

/**
 * Backs the weekly /sell attendance prompt. Resolves the featured
 * market, the dealer's current answer for it (if any), and a pre-fill
 * hint from the dealer's last instance of the same recurring show.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const market = await getFeaturedMarket();
  if (!market) {
    return json({ market: null, current: null, prefill: null });
  }

  const [current, prior] = await Promise.all([
    getCurrentBoothAnswer(user.dealer_id, market.id),
    getPriorBoothAnswer(user.dealer_id, market.name),
  ]);

  return json({
    market: {
      id: market.id,
      name: market.name,
      starts_at: market.starts_at,
    },
    current: current.answered
      ? {
          declined: current.declined,
          booth_number: current.declined ? null : current.boothNumber,
        }
      : null,
    prefill: prior
      ? {
          wasYes: prior.wasYes,
          boothNumber: prior.wasYes ? prior.boothNumber : null,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const body = await request.json();
  const marketId = String(body.market_id || "");
  const declined = body.declined === true;
  const boothNumber = declined
    ? null
    : (() => {
        const raw = String(body.booth_number || "").trim();
        if (!raw) return null;
        // Same allowed shape as the old booth editor
        return raw.replace(/[^a-zA-Z0-9\-/]/g, "").slice(0, 10) || null;
      })();

  if (!marketId) return error("market_id is required");

  // Verify market exists + isn't archived. Don't let dealers commit to
  // archived shows (rare but possible if a stale tab posts).
  const mkt = await db.execute({
    sql: `SELECT id, archived FROM markets WHERE id = ?`,
    args: [marketId],
  });
  if (mkt.rows.length === 0) return error("Market not found", 404);
  const archived = Number(
    (mkt.rows[0] as Record<string, unknown>).archived ?? 0
  );
  if (archived === 1) return error("Market not available", 410);

  // Upsert by (dealer_id, market_id). booth_settings has a unique
  // index on that pair (the migration ensures it).
  await db.execute({
    sql: `
      INSERT INTO booth_settings (id, dealer_id, market_id, booth_number, declined)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (dealer_id, market_id) DO UPDATE
        SET booth_number = excluded.booth_number,
            declined     = excluded.declined
    `,
    args: [newId(), user.dealer_id, marketId, boothNumber, declined],
  });

  return json({ ok: true });
}

import db from "./db";

export interface FeaturedMarket {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  drop_at: string | null;
  status: string;
  archived: number;
  is_test: number;
  created_at: string;
}

/**
 * Returns the next upcoming non-archived market — the "featured"
 * market for editorial framing on the home page, the item-page
 * "where to find this dealer" line, and the dealer's weekly
 * /sell prompt.
 *
 * "Upcoming" cuts off at the most recent Monday 00:01 PT. So a
 * Sunday market is featured all the way through Sunday night, and
 * at Monday 00:01 PT the next market in line takes over — even if
 * it's weeks out.
 *
 * Returns null only when there are zero future non-archived markets
 * in the database.
 */
export async function getFeaturedMarket(): Promise<FeaturedMarket | null> {
  // Postgres handles the LA-time week boundary inline. date_trunc('week')
  // returns Monday 00:00 of the current week (Postgres weeks are
  // Monday-anchored). We compute the cutoff in LA time and convert
  // back to UTC for comparison with starts_at.
  const res = await db.execute(`
    SELECT m.*
    FROM markets m
    WHERE COALESCE(m.archived, 0) = 0
      AND m.starts_at >= (
        date_trunc('week', (now() AT TIME ZONE 'America/Los_Angeles'))
          AT TIME ZONE 'America/Los_Angeles'
      )
    ORDER BY m.starts_at ASC
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as FeaturedMarket;
}

/**
 * Looks up a dealer's prior answer for a recurring show, by show
 * name, so the weekly /sell prompt can pre-fill the toggle from
 * past behavior. Returns:
 *   { wasYes: true, boothNumber }     — last time they said yes
 *   { wasYes: false }                  — last time they said no
 *   null                              — no prior history
 *
 * "Last time" = most recent past `booth_settings` row whose market
 * shares the same `name` as the featured market (e.g. "Rose Bowl
 * Flea Market" matches every Rose Bowl, regardless of date).
 */
export async function getPriorBoothAnswer(
  dealerId: string,
  featuredMarketName: string
): Promise<
  | { wasYes: true; boothNumber: string | null }
  | { wasYes: false }
  | null
> {
  const res = await db.execute({
    sql: `
      SELECT bs.booth_number, bs.declined, m.starts_at
      FROM booth_settings bs
      JOIN markets m ON m.id = bs.market_id
      WHERE bs.dealer_id = ? AND m.name = ?
      ORDER BY m.starts_at DESC
      LIMIT 1
    `,
    args: [dealerId, featuredMarketName],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  if (row.declined) return { wasYes: false };
  return {
    wasYes: true,
    boothNumber: (row.booth_number as string | null) ?? null,
  };
}

/**
 * Reads the dealer's current answer (if any) for a specific market.
 * Used by the prompt to know whether to render the prompt at all
 * (no answer yet) or the collapsed confirmation badge (answered).
 */
export async function getCurrentBoothAnswer(
  dealerId: string,
  marketId: string
): Promise<
  | { answered: true; declined: true }
  | { answered: true; declined: false; boothNumber: string | null }
  | { answered: false }
> {
  const res = await db.execute({
    sql: `SELECT booth_number, declined FROM booth_settings WHERE dealer_id = ? AND market_id = ?`,
    args: [dealerId, marketId],
  });
  if (res.rows.length === 0) return { answered: false };
  const row = res.rows[0] as Record<string, unknown>;
  if (row.declined) return { answered: true, declined: true };
  return {
    answered: true,
    declined: false,
    boothNumber: (row.booth_number as string | null) ?? null,
  };
}

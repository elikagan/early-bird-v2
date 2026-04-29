import db from "@/lib/db";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import FeedbackView, { type Audience, type Market, type ExistingResponse } from "./feedback-view";

/**
 * Post-market feedback page. Linked to from the post-market SMS blast.
 * Picks a market via ?market= (set by the blast) and falls back to the
 * most recently archived market.
 *
 * Audience is determined by the signed-in user's is_dealer flag at
 * submission time — buyers and dealers see different forms.
 */
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: queryMarket } = await searchParams;
  const me = await getInitialUser();
  const h = await headers();
  logPageView({
    path: "/feedback",
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  // Resolve which market we're soliciting feedback about.
  let market: Market | null = null;
  if (queryMarket) {
    const r = await db.execute({
      sql: `SELECT id, name, location, starts_at FROM markets WHERE id = ?`,
      args: [queryMarket],
    });
    market = (r.rows[0] as unknown as Market) ?? null;
  }
  if (!market) {
    // Fall back to the most recently-completed market — the show that
    // just wrapped. 'archived = 1' alone isn't enough; markets can be
    // archived for other reasons (cancelled, duplicate) and still be
    // in the future.
    const r = await db.execute({
      sql: `SELECT id, name, location, starts_at
            FROM markets
            WHERE starts_at < now()
            ORDER BY starts_at DESC
            LIMIT 1`,
    });
    market = (r.rows[0] as unknown as Market) ?? null;
  }

  // If signed in, see whether this user already submitted feedback for
  // this market — we render the form pre-filled so they can update.
  let existing: ExistingResponse | null = null;
  if (me && market) {
    const r = await db.execute({
      sql: `SELECT responses FROM feedback_responses
            WHERE user_id = ? AND market_id = ?`,
      args: [me.id, market.id],
    });
    if (r.rows.length > 0) {
      existing = {
        responses:
          (r.rows[0] as Record<string, unknown>).responses as Record<
            string,
            unknown
          >,
      };
    }
  }

  const audience: Audience | null = me ? (me.is_dealer ? "dealer" : "buyer") : null;

  return (
    <FeedbackView
      market={market}
      audience={audience}
      signedInDisplayName={me?.display_name ?? null}
      existing={existing}
    />
  );
}

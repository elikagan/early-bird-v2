import db from "@/lib/db";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import { getFeaturedMarket } from "@/lib/markets";
import { marketAbbr } from "@/lib/format";
import HomeView, {
  type Market,
  type StreamItem,
} from "./home-view";

const STREAM_PAGE_SIZE = 30;

/**
 * Single home for everyone (anon + signed-in). The page is a feed of
 * every dealer's live items. The featured market is editorial
 * atmosphere at the top — name, date, platform-wide stats — and the
 * Coming Up rail teases the markets that follow it. No filtering,
 * no "items at this market" gating: every item shows up regardless
 * of which show its dealer attends.
 *
 * Items are decorated with two pills in the feed:
 *   - "NEW" if posted in the last 7 days
 *   - "RB · 503" if the dealer's at the next show (with booth #)
 *
 * /home is kept around as a 308 redirect to / for legacy bookmarks.
 */
export default async function HomePage() {
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: "/",
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  const [featured, marketsRes, pendingApp, statsRes] = await Promise.all([
    getFeaturedMarket(),
    db.execute(`
      SELECT
        m.id, m.name, m.location, m.starts_at, m.status, m.archived
      FROM markets m
      WHERE COALESCE(m.archived, 0) = 0
      ORDER BY m.starts_at ASC
    `),
    // Pending-app banner: only for signed-in non-dealers. Skip the
    // query otherwise so we don't burn a round-trip for anon visitors.
    me && me.is_dealer !== 1
      ? db.execute({
          sql: `SELECT 1 FROM dealer_applications
                WHERE user_id = ? AND status = 'pending' LIMIT 1`,
          args: [me.id],
        })
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    // Platform-wide totals: shown under the featured-market banner so
    // the marketplace feels alive even on a slow attendance week.
    db.execute(`
      SELECT
        (SELECT COUNT(*) FROM dealers) AS dealer_count,
        (SELECT COUNT(*) FROM items WHERE status = 'live') AS live_item_count
    `),
  ]);

  const markets = marketsRes.rows as unknown as Market[];
  const platformStats = statsRes.rows[0] as unknown as {
    dealer_count: number;
    live_item_count: number;
  };

  // Feed: every dealer's live items. at_market + booth come from a
  // LEFT JOIN against booth_settings for the next upcoming market —
  // attendance is a tag, never a filter.
  const featuredId = featured?.id ?? null;
  const streamSql = featuredId
    ? `
      SELECT
        i.id, i.title, i.price, i.status, i.created_at,
        d.business_name as dealer_name,
        d.id as dealer_ref,
        (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
        (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url,
        (CASE WHEN bs_feat.dealer_id IS NOT NULL THEN 1 ELSE 0 END) as at_market,
        bs_feat.booth_number as at_market_booth
      FROM items i
      JOIN dealers d ON d.id = i.dealer_id
      LEFT JOIN booth_settings bs_feat
        ON bs_feat.dealer_id = d.id
       AND bs_feat.market_id = ?
       AND bs_feat.declined = false
      WHERE i.status = 'live'
      ORDER BY i.created_at DESC
      LIMIT ${STREAM_PAGE_SIZE}
    `
    : `
      SELECT
        i.id, i.title, i.price, i.status, i.created_at,
        d.business_name as dealer_name,
        d.id as dealer_ref,
        (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
        (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url,
        0 as at_market,
        NULL::text as at_market_booth
      FROM items i
      JOIN dealers d ON d.id = i.dealer_id
      WHERE i.status = 'live'
      ORDER BY i.created_at DESC
      LIMIT ${STREAM_PAGE_SIZE}
    `;

  const streamRes = featuredId
    ? await db.execute({ sql: streamSql, args: [featuredId] })
    : await db.execute(streamSql);

  // Bake the market abbreviation onto every "at_market" row so the
  // client doesn't have to derive it. /api/items + /api/favorites do
  // the same — single source of truth for the badge label.
  const featuredAbbr = featured ? marketAbbr(featured.name) : null;
  const streamItems = streamRes.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...row,
      at_market_label:
        Number(row.at_market) === 1 ? featuredAbbr : null,
    };
  }) as unknown as StreamItem[];

  return (
    <HomeView
      signedIn={!!me}
      pendingApp={pendingApp.rows.length > 0}
      featured={featured as unknown as Market | null}
      initialMarkets={markets}
      initialStreamItems={streamItems}
      dealerCount={Number(platformStats?.dealer_count ?? 0)}
      liveItemCount={Number(platformStats?.live_item_count ?? 0)}
    />
  );
}

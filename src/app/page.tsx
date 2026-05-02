import db from "@/lib/db";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import { getFeaturedMarket } from "@/lib/markets";
import HomeView, { type Market, type PreviewItem } from "./home-view";

const MAX_PROMO_ITEMS = 8;

/**
 * Single home page for everyone. Anon visitors see a landing-flavored
 * page (Dealer→ link in masthead, About + FAQ + footer + sign-in
 * drawer). Signed-in users see the same featured-market + catalog +
 * Coming Up content but with the BottomNav and an optional
 * pending-application banner instead.
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

  const [featured, marketsRes, pendingApp] = await Promise.all([
    getFeaturedMarket(),
    db.execute(`
      SELECT
        m.id, m.name, m.location, m.starts_at, m.status, m.archived,
        (SELECT COUNT(DISTINCT bs.dealer_id) FROM booth_settings bs
          WHERE bs.market_id = m.id AND bs.declined = false) as dealer_count
      FROM markets m
      WHERE COALESCE(m.archived, 0) = 0
      ORDER BY m.starts_at ASC
    `),
    // Pending-app banner: only for signed-in non-dealers. Skip the
    // query otherwise so we don't burn a round-trip for anon visitors
    // (the most common case for /).
    me && me.is_dealer !== 1
      ? db.execute({
          sql: `SELECT 1 FROM dealer_applications
                WHERE user_id = ? AND status = 'pending' LIMIT 1`,
          args: [me.id],
        })
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);

  const markets = marketsRes.rows as unknown as Market[];

  let featuredItems: PreviewItem[] = [];
  if (featured) {
    // Strict: only items from dealers attending the featured market.
    // Non-attending dealers' items stay in the catalog at /buy without
    // a market filter, but the home page promo grid is reserved for
    // "this is what's at the upcoming show."
    const itemsRes = await db.execute({
      sql: `
        SELECT
          i.id, i.title, i.price, i.status,
          d.business_name as dealer_name,
          (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
          (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url
        FROM items i
        JOIN dealers d ON d.id = i.dealer_id
        JOIN booth_settings bs
          ON bs.dealer_id = d.id AND bs.market_id = ? AND bs.declined = false
        WHERE i.status = 'live'
        ORDER BY i.created_at DESC
        LIMIT ${MAX_PROMO_ITEMS}
      `,
      args: [featured.id],
    });
    featuredItems = itemsRes.rows as unknown as PreviewItem[];
  }

  return (
    <HomeView
      signedIn={!!me}
      pendingApp={pendingApp.rows.length > 0}
      featured={featured as unknown as Market | null}
      initialMarkets={markets}
      initialFeaturedItems={featuredItems}
    />
  );
}

import db from "@/lib/db";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import { getFeaturedMarket } from "@/lib/markets";
import HomeView, { type Market, type PreviewItem } from "./home-view";

const MAX_PROMO_ITEMS = 8;

/**
 * Signed-in home. Same content shape as the public landing now: the
 * featured market as editorial lead, a catalog of every live item
 * with attending-dealer items prioritized, and a Coming Up rail of
 * other future markets.
 */
export default async function HomePage() {
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: "/home",
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  const [featured, marketsRes] = await Promise.all([
    getFeaturedMarket(),
    db.execute(`
      SELECT
        m.id, m.name, m.location, m.starts_at, m.drop_at, m.status, m.archived,
        (SELECT COUNT(DISTINCT bs.dealer_id) FROM booth_settings bs
          WHERE bs.market_id = m.id AND bs.declined = false) as dealer_count
      FROM markets m
      WHERE COALESCE(m.archived, 0) = 0
      ORDER BY m.starts_at ASC
    `),
  ]);

  const markets = marketsRes.rows as unknown as Market[];

  let featuredItems: PreviewItem[] = [];
  if (featured) {
    const itemsRes = await db.execute({
      sql: `
        SELECT
          i.id, i.title, i.price, i.status,
          d.business_name as dealer_name,
          (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
          (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url,
          CASE WHEN bs.dealer_id IS NOT NULL THEN 1 ELSE 0 END as at_featured
        FROM items i
        JOIN dealers d ON d.id = i.dealer_id
        LEFT JOIN booth_settings bs
          ON bs.dealer_id = d.id AND bs.market_id = ? AND bs.declined = false
        WHERE i.status = 'live'
        ORDER BY at_featured DESC, i.created_at DESC
        LIMIT ${MAX_PROMO_ITEMS}
      `,
      args: [featured.id],
    });
    featuredItems = itemsRes.rows as unknown as PreviewItem[];
  }

  return (
    <HomeView
      featured={featured as unknown as Market | null}
      initialMarkets={markets}
      initialFeaturedItems={featuredItems}
    />
  );
}

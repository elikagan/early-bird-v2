import db from "@/lib/db";
import HomeView, { type Market, type PreviewItem } from "./home-view";

const MAX_PROMO_ITEMS = 8;

/**
 * Server Component shell. Fetches the upcoming-markets list plus the
 * first page of items for the featured market — the two reads the
 * client used to waterfall after hydration. Auth-gated redirect for
 * signed-out users still happens client-side in HomeView since we
 * don't yet read cookies server-side here.
 */
export default async function HomePage() {
  const marketsRes = await db.execute({
    sql: `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM booth_settings bs WHERE bs.market_id = m.id) as dealer_count,
        (SELECT COUNT(*) FROM items i WHERE i.market_id = m.id) as item_count
      FROM markets m
      WHERE COALESCE(m.archived, 0) = 0
      ORDER BY m.drop_at ASC
    `,
  });

  const markets = marketsRes.rows as unknown as Market[];
  const featured = markets[0];

  let featuredItems: PreviewItem[] = [];
  if (featured) {
    const itemsRes = await db.execute({
      sql: `
        SELECT
          i.id, i.title, i.price, i.status,
          d.business_name as dealer_name,
          (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
          (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url
        FROM items i
        JOIN dealers d ON d.id = i.dealer_id
        WHERE i.market_id = ? AND i.status != 'deleted'
        ORDER BY i.created_at DESC
        LIMIT ${MAX_PROMO_ITEMS}
      `,
      args: [featured.id],
    });
    featuredItems = itemsRes.rows as unknown as PreviewItem[];
  }

  return (
    <HomeView
      initialMarkets={markets}
      initialFeaturedItems={featuredItems}
    />
  );
}

import db from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import { getFeaturedMarket } from "@/lib/markets";
import DealerView, {
  type DealerProfile,
  type Market,
  type Item,
} from "./dealer-view";

/**
 * Dealer profile. Under the persistent-booth model the page shows the
 * dealer's full live catalog — no market filter. The "where to find
 * them in person" line ("At Rose Bowl, Sun 5.10 · Booth 503") shows
 * only when the dealer is attending the featured upcoming market.
 *
 * The legacy ?market=X query param is ignored.
 */
export default async function DealerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: dealerId } = await params;
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: `/d/${dealerId}`,
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  const featured = await getFeaturedMarket();

  const dealerQ = db.execute({
    sql: `
      SELECT d.id, d.business_name, d.instagram_handle,
             u.display_name, u.avatar_url, u.first_name
      FROM dealers d JOIN users u ON u.id = d.user_id
      WHERE d.id = ?
    `,
    args: [dealerId],
  });

  const featuredBoothQ = featured
    ? db.execute({
        sql: `SELECT booth_number FROM booth_settings
              WHERE dealer_id = ? AND market_id = ? AND declined = false`,
        args: [dealerId, featured.id],
      })
    : Promise.resolve({ rows: [] as Record<string, unknown>[] });

  const itemsBaseSql = `
    SELECT
      i.id, i.title, i.price, i.status,
      d.business_name as dealer_name,
      d.id as dealer_ref,
      (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
      (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url
    FROM items i
    JOIN dealers d ON d.id = i.dealer_id
  `;

  // Dealer's full live catalog. Sold/held items show alongside, just
  // visually de-emphasized — same way the dealer's own /sell page
  // treats them.
  const ownItemsQ = db.execute({
    sql: `${itemsBaseSql} WHERE i.dealer_id = ? AND i.status != 'deleted' ORDER BY i.created_at DESC`,
    args: [dealerId],
  });

  const [dealerRes, featuredBoothRes, ownRes] = await Promise.all([
    dealerQ,
    featuredBoothQ,
    ownItemsQ,
  ]);

  if (dealerRes.rows.length === 0) notFound();

  const featuredBoothNumber =
    (featuredBoothRes.rows[0] as Record<string, unknown> | undefined)
      ?.booth_number as string | null | undefined;

  const dealer = {
    ...(dealerRes.rows[0] as Record<string, unknown>),
    booth_number: featuredBoothNumber ?? null,
    item_count: ownRes.rows.length,
  } as unknown as DealerProfile;

  // The dealer-view component still expects a `market` prop. Pass
  // featured if the dealer is attending it; otherwise null.
  const market: Market | null =
    featured && featuredBoothRes.rows.length > 0
      ? {
          id: featured.id,
          name: featured.name,
          starts_at: featured.starts_at,
          status: featured.status,
        }
      : null;

  const ownItems = ownRes.rows as unknown as Item[];

  return (
    <DealerView
      dealer={dealer}
      market={market}
      initialOwnItems={ownItems}
      initialOtherItems={[]}
      dealerId={dealerId}
    />
  );
}

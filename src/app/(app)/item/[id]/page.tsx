import db from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import { getFeaturedMarket } from "@/lib/markets";
import ItemView, {
  type ItemDetail,
  type FeaturedBooth,
} from "./item-view";

/**
 * Server Component shell. Fetches the item + dealer payload, plus the
 * dealer's "where to find them this week" booth (if any) — a single
 * line shown on the dealer card when the dealer is at the featured
 * upcoming market.
 *
 * Items no longer carry market_id under the persistent-booth model;
 * the dealer-card market line comes from booth_settings + the
 * featured-market helper, not from the item itself.
 */
export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: `/item/${id}`,
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  const result = await db.execute({
    sql: `
      SELECT
        i.*,
        d.id as dealer_ref,
        d.business_name as dealer_name,
        d.instagram_handle as dealer_instagram,
        d.verified as dealer_verified,
        u.display_name as dealer_display_name,
        u.avatar_url as dealer_avatar,
        u.id as dealer_user_id,
        (SELECT COUNT(*) FROM favorites f WHERE f.item_id = i.id) as watcher_count,
        (SELECT COUNT(*) FROM inquiries q WHERE q.item_id = i.id) as inquiry_count,
        buyer.display_name as sold_to_name,
        buyer.avatar_url as sold_to_avatar
      FROM items i
      JOIN dealers d ON d.id = i.dealer_id
      JOIN users u ON u.id = d.user_id
      LEFT JOIN users buyer ON buyer.id = i.sold_to
      WHERE i.id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) notFound();

  const item = result.rows[0] as Record<string, unknown>;

  const [photosRes, methodsRes, featured] = await Promise.all([
    db.execute({
      sql: `SELECT id, url, thumb_url, position FROM item_photos WHERE item_id = ? ORDER BY position`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
      args: [item.dealer_ref as string],
    }),
    getFeaturedMarket(),
  ]);

  // Dealer's featured-market booth — the "At Rose Bowl 5.10 · Booth 503"
  // line shown on the item page. Only set if the dealer said yes to
  // the featured market.
  let featuredBooth: FeaturedBooth | null = null;
  if (featured) {
    const boothRes = await db.execute({
      sql: `SELECT booth_number FROM booth_settings
            WHERE dealer_id = ? AND market_id = ? AND declined = false`,
      args: [item.dealer_ref as string, featured.id],
    });
    if (boothRes.rows.length > 0) {
      featuredBooth = {
        market_id: featured.id,
        market_name: featured.name,
        starts_at: featured.starts_at,
        booth_number:
          (boothRes.rows[0] as Record<string, unknown>).booth_number as
            | string
            | null,
      };
    }
  }

  item.photos = photosRes.rows;
  item.dealer_payment_methods = methodsRes.rows;
  // (item.market intentionally not set — items have no market.)

  // Fire-and-forget view-count increment.
  db.execute({
    sql: `UPDATE items SET view_count = view_count + 1 WHERE id = ?`,
    args: [id],
  }).catch(() => {});
  item.view_count = ((item.view_count as number) || 0) + 1;

  return (
    <ItemView
      initialItem={item as unknown as ItemDetail}
      featuredBooth={featuredBooth}
    />
  );
}

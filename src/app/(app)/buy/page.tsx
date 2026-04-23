import db from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import BuyView, { type Market, type Item } from "./buy-view";

const PAGE_SIZE = 30;

/**
 * Server Component shell. Fetches the market row and the first page
 * of items server-side so they ship in the initial HTML (no post-
 * hydrate round-trip). Favorites + infinite scroll stay client-side.
 */
export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketId } = await searchParams;
  if (!marketId) redirect("/home");

  const [marketRes, itemsRes] = await Promise.all([
    db.execute({
      sql: `
        SELECT
          m.*,
          (SELECT COUNT(*) FROM booth_settings bs WHERE bs.market_id = m.id) as dealer_count,
          (SELECT COUNT(*) FROM items i WHERE i.market_id = m.id) as item_count
        FROM markets m
        WHERE m.id = ?
      `,
      args: [marketId],
    }),
    db.execute({
      sql: `
        SELECT
          i.*,
          d.business_name as dealer_name,
          d.instagram_handle as dealer_instagram,
          d.id as dealer_ref,
          u.display_name as dealer_display_name,
          u.avatar_url as dealer_avatar,
          (SELECT url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as photo_url,
          (SELECT thumb_url FROM item_photos p WHERE p.item_id = i.id ORDER BY p.position LIMIT 1) as thumb_url
        FROM items i
        JOIN dealers d ON d.id = i.dealer_id
        JOIN users u ON u.id = d.user_id
        WHERE i.market_id = ? AND i.status != 'deleted'
        ORDER BY i.created_at DESC
        LIMIT ${PAGE_SIZE}
      `,
      args: [marketId],
    }),
  ]);

  if (marketRes.rows.length === 0) notFound();
  const market = marketRes.rows[0] as Record<string, unknown>;
  if (Number(market.archived ?? 0) === 1) notFound();

  return (
    <BuyView
      initialMarket={market as unknown as Market}
      initialItems={itemsRes.rows as unknown as Item[]}
    />
  );
}

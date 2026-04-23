import db from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import EarlyView, { type Market, type Item } from "./early-view";

const PAGE_SIZE = 30;

/**
 * Server Component shell for the /early/[marketId] share link. Same
 * pattern as /buy: fetch market + first page of items server-side.
 * Pre-deletion filter runs in SQL; the visual shuffle happens
 * client-side on subsequent pages (the first page ships in DB order
 * so SSR hydration matches).
 */
export default async function EarlyPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: `/early/${marketId}`,
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

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
    <EarlyView
      initialMarket={market as unknown as Market}
      initialItems={itemsRes.rows as unknown as Item[]}
    />
  );
}

import db from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import BuyView, { type Market, type Item } from "./buy-view";

const PAGE_SIZE = 30;

/**
 * Catalog browser. Two modes:
 *
 *   /buy                — full FB-Marketplace-style stream of every
 *                          live item from every dealer. Infinite scroll.
 *   /buy?market=X       — narrows the same stream to "items by dealers
 *                          attending market X" (booth_settings,
 *                          declined=false). Editorial filter view.
 *
 * Items don't disappear from /buy when no one's confirmed attendance —
 * the unfiltered stream always shows everything live. Attendance is a
 * filter, not a gate.
 */
export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketId } = await searchParams;
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: marketId ? `/buy?market=${marketId}` : "/buy",
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  // ── Filtered mode: ?market=X ──
  if (marketId) {
    const [marketRes, itemsRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT
            m.id, m.name, m.location, m.starts_at, m.status, m.archived,
            (SELECT COUNT(DISTINCT bs.dealer_id) FROM booth_settings bs
              WHERE bs.market_id = m.id AND bs.declined = false) as dealer_count
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
          WHERE i.dealer_id IN (
            SELECT bs.dealer_id FROM booth_settings bs
            WHERE bs.market_id = ? AND bs.declined = false
          )
          AND i.status != 'deleted'
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

  // ── Unfiltered mode: full catalog stream ──
  const itemsRes = await db.execute({
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
      WHERE i.status != 'deleted'
      ORDER BY i.created_at DESC
      LIMIT ${PAGE_SIZE}
    `,
  });

  return (
    <BuyView
      initialMarket={null}
      initialItems={itemsRes.rows as unknown as Item[]}
    />
  );
}

import db from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import DealerView, {
  type DealerProfile,
  type Market,
  type Item,
} from "./dealer-view";

/**
 * Server Component shell for the dealer profile page. Picks a market
 * (explicit ?market wins, else the earliest upcoming non-archived
 * market), then fetches dealer row + market row + dealer's items +
 * all items at that market, all in parallel. Favorites remain a
 * client-side fetch since they're per-user.
 */
export default async function DealerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ market?: string }>;
}) {
  const { id: dealerId } = await params;
  const { market: queryMarket } = await searchParams;
  const [me, h] = await Promise.all([getInitialUser(), headers()]);
  logPageView({
    path: `/d/${dealerId}`,
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    userId: me?.id ?? null,
  });

  // Resolve marketId: explicit query wins, otherwise the earliest upcoming
  // non-archived market (matches the prior client-side behavior).
  let marketId = queryMarket ?? null;
  if (!marketId) {
    const mRes = await db.execute({
      sql: `SELECT id, status FROM markets
            WHERE COALESCE(archived, 0) = 0
            ORDER BY drop_at ASC
            LIMIT 1`,
    });
    marketId = (mRes.rows[0]?.id as string | undefined) ?? null;
  }

  const dealerQ = db.execute({
    sql: `
      SELECT d.id, d.business_name, d.instagram_handle,
             u.display_name, u.avatar_url, u.first_name
      FROM dealers d JOIN users u ON u.id = d.user_id
      WHERE d.id = ?
    `,
    args: [dealerId],
  });

  const boothQ = marketId
    ? db.execute({
        sql: `SELECT booth_number FROM booth_settings WHERE dealer_id = ? AND market_id = ?`,
        args: [dealerId, marketId],
      })
    : Promise.resolve({ rows: [] as Record<string, unknown>[] });

  const countQ = marketId
    ? db.execute({
        sql: `SELECT COUNT(*) as count FROM items WHERE dealer_id = ? AND market_id = ? AND status != 'deleted'`,
        args: [dealerId, marketId],
      })
    : Promise.resolve({ rows: [{ count: 0 }] });

  const marketQ = marketId
    ? db.execute({
        sql: `SELECT id, name, starts_at, status FROM markets WHERE id = ?`,
        args: [marketId],
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

  const ownItemsQ = marketId
    ? db.execute({
        sql: `${itemsBaseSql} WHERE i.market_id = ? AND i.dealer_id = ? AND i.status != 'deleted' ORDER BY i.created_at DESC`,
        args: [marketId, dealerId],
      })
    : Promise.resolve({ rows: [] as Record<string, unknown>[] });

  const allItemsQ = marketId
    ? db.execute({
        sql: `${itemsBaseSql} WHERE i.market_id = ? AND i.status != 'deleted' ORDER BY i.created_at DESC`,
        args: [marketId],
      })
    : Promise.resolve({ rows: [] as Record<string, unknown>[] });

  const [dealerRes, boothRes, countRes, marketRes, ownRes, allRes] =
    await Promise.all([dealerQ, boothQ, countQ, marketQ, ownItemsQ, allItemsQ]);

  if (dealerRes.rows.length === 0) notFound();

  const dealer = {
    ...(dealerRes.rows[0] as Record<string, unknown>),
    booth_number:
      (boothRes.rows[0] as Record<string, unknown> | undefined)?.booth_number ??
      null,
    item_count: Number(
      (countRes.rows[0] as Record<string, unknown>)?.count ?? 0
    ),
  } as unknown as DealerProfile;

  const market = (marketRes.rows[0] as unknown as Market | undefined) ?? null;

  const ownItems = ownRes.rows as unknown as Item[];
  const ownIds = new Set(ownItems.map((i) => i.id));
  const otherItems = (allRes.rows as unknown as Item[]).filter(
    (i) => !ownIds.has(i.id)
  );

  return (
    <DealerView
      dealer={dealer}
      market={market}
      initialOwnItems={ownItems}
      initialOtherItems={otherItems}
      dealerId={dealerId}
    />
  );
}

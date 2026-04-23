import db from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getInitialUser } from "@/lib/auth";
import { logPageView } from "@/lib/track";
import ItemView, { type ItemDetail } from "./item-view";

/**
 * Server Component shell. Fetches the public item payload on the
 * server so the initial HTML ships with item data already in it —
 * kills the client-side render waterfall. Per-user bits (favorited,
 * my inquiry status) still fetch from /api/items/[id]/me after
 * mount inside the client <ItemView>.
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
        bs.booth_number,
        buyer.display_name as sold_to_name,
        buyer.avatar_url as sold_to_avatar
      FROM items i
      JOIN dealers d ON d.id = i.dealer_id
      JOIN users u ON u.id = d.user_id
      LEFT JOIN booth_settings bs ON bs.dealer_id = d.id AND bs.market_id = i.market_id
      LEFT JOIN users buyer ON buyer.id = i.sold_to
      WHERE i.id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) notFound();

  const item = result.rows[0] as Record<string, unknown>;

  const [photosRes, marketRes, methodsRes] = await Promise.all([
    db.execute({
      sql: `SELECT id, url, thumb_url, position FROM item_photos WHERE item_id = ? ORDER BY position`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT id, name, location, drop_at, starts_at, status FROM markets WHERE id = ?`,
      args: [item.market_id as string],
    }),
    db.execute({
      sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
      args: [item.dealer_ref as string],
    }),
  ]);

  item.photos = photosRes.rows;
  item.market = marketRes.rows[0] || null;
  item.dealer_payment_methods = methodsRes.rows;

  // Fire-and-forget view-count increment. Same semantics as
  // /api/items/[id] GET: always increments, including dealer
  // self-views. Acceptable rounding error; see route.ts for details.
  db.execute({
    sql: `UPDATE items SET view_count = view_count + 1 WHERE id = ?`,
    args: [id],
  }).catch(() => {});
  item.view_count = ((item.view_count as number) || 0) + 1;

  return <ItemView initialItem={item as unknown as ItemDetail} />;
}

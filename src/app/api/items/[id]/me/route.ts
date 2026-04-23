import db from "@/lib/db";
import { json } from "@/lib/api";
import { getSession } from "@/lib/auth";

/**
 * Per-user slice of the item detail payload. Split out from
 * /api/items/[id] so that endpoint stays edge-cacheable. Anon callers
 * get an empty object — the item page skips the /me fetch when there's
 * no user, so this route is only reached by authed users in practice.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);
  if (!user) return json({});

  const [favRes, myInqRes] = await Promise.all([
    db.execute({
      sql: `SELECT id FROM favorites WHERE buyer_id = ? AND item_id = ?`,
      args: [user.id, id],
    }),
    db.execute({
      sql: `SELECT status FROM inquiries WHERE buyer_id = ? AND item_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [user.id, id],
    }),
  ]);

  return json({
    is_favorited: favRes.rows.length > 0,
    favorite_id: (favRes.rows[0] as Record<string, unknown> | undefined)?.id ?? null,
    my_inquiry_status:
      (myInqRes.rows[0] as Record<string, unknown> | undefined)?.status ?? null,
  });
}

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  // Counts under the persistent-booth model. Dealer count = dealers
  // who said yes for this market (declined=false). Item count = live
  // items by those dealers — items don't carry market_id anymore, so
  // the legacy `WHERE items.market_id = m.id` returned 0 universally.
  const result = await db.execute(
    `SELECT m.*,
       (SELECT COUNT(*) FROM booth_settings bs
          WHERE bs.market_id = m.id AND bs.declined = false) as dealer_count,
       (SELECT COUNT(*) FROM items i
          WHERE i.status = 'live'
            AND i.dealer_id IN (
              SELECT bs.dealer_id FROM booth_settings bs
              WHERE bs.market_id = m.id AND bs.declined = false
            )) as item_count
     FROM markets m
     ORDER BY m.starts_at DESC`
  );

  return json(result.rows);
}

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const body = await request.json();
  const { name, location, starts_at, status, is_test } = body;

  if (!name || !starts_at) {
    return error("Name and date are required");
  }

  // drop_at is a defunct column kept around for legacy rows; default
  // it to starts_at so the NOT NULL constraint stays satisfied.
  const dropAt = body.drop_at || starts_at;

  const id = newId();
  await db.execute({
    sql: `INSERT INTO markets (id, name, location, starts_at, drop_at, status, is_test, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, now())`,
    args: [id, name, location || null, starts_at, dropAt, status || "upcoming", is_test ? 1 : 0],
  });

  await logAdminAction(user.phone, "create_market", "market", id, { name });

  const result = await db.execute({
    sql: `SELECT * FROM markets WHERE id = ?`,
    args: [id],
  });

  return json(result.rows[0], 201);
}

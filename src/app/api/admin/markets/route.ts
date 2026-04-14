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

  const result = await db.execute(
    `SELECT m.*,
       (SELECT COUNT(*) FROM booth_settings bs WHERE bs.market_id = m.id) as dealer_count,
       (SELECT COUNT(*) FROM items i WHERE i.market_id = m.id AND i.status != 'deleted') as item_count
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
  const { name, location, starts_at, drop_at, status, is_test } = body;

  if (!name || !starts_at || !drop_at) {
    return error("Name, date, and drop time are required");
  }

  const id = newId();
  await db.execute({
    sql: `INSERT INTO markets (id, name, location, starts_at, drop_at, status, is_test, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, now())`,
    args: [id, name, location || null, starts_at, drop_at, status || "upcoming", is_test ? 1 : 0],
  });

  await logAdminAction(user.phone, "create_market", "market", id, { name });

  const result = await db.execute({
    sql: `SELECT * FROM markets WHERE id = ?`,
    args: [id],
  });

  return json(result.rows[0], 201);
}

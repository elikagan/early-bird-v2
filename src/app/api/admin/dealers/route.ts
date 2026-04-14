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

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  let result;
  if (search) {
    const like = `%${search}%`;
    result = await db.execute({
      sql: `SELECT u.id, u.phone, u.display_name, u.avatar_url, u.is_dealer, u.created_at,
              d.id as dealer_id, d.business_name, d.instagram_handle,
              (SELECT COUNT(*) FROM items i WHERE i.dealer_id = d.id AND i.status != 'deleted') as item_count
            FROM users u
            LEFT JOIN dealers d ON d.user_id = u.id
            WHERE u.display_name ILIKE ? OR u.phone ILIKE ? OR d.business_name ILIKE ?
            ORDER BY u.created_at DESC
            LIMIT 100`,
      args: [like, like, like],
    });
  } else {
    result = await db.execute(
      `SELECT u.id, u.phone, u.display_name, u.avatar_url, u.is_dealer, u.created_at,
         d.id as dealer_id, d.business_name, d.instagram_handle,
         (SELECT COUNT(*) FROM items i WHERE i.dealer_id = d.id AND i.status != 'deleted') as item_count
       FROM users u
       LEFT JOIN dealers d ON d.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT 100`
    );
  }

  return json(result.rows);
}

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const body = await request.json();
  const { phone, display_name, role, business_name } = body;

  if (!phone) return error("Phone is required");

  // Normalize phone
  const digits = phone.replace(/\D/g, "");
  const normalized =
    digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits[0] === "1"
        ? `+${digits}`
        : `+${digits}`;

  // Check if user already exists
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE phone = ?`,
    args: [normalized],
  });

  if (existing.rows.length > 0) {
    return error("User with this phone already exists", 409);
  }

  const userId = newId();
  const isDealer = role === "dealer" ? 1 : 0;

  await db.execute({
    sql: `INSERT INTO users (id, phone, display_name, is_dealer, created_at)
          VALUES (?, ?, ?, ?, now())`,
    args: [userId, normalized, display_name || null, isDealer],
  });

  let dealerId = null;
  if (isDealer) {
    dealerId = newId();
    await db.execute({
      sql: `INSERT INTO dealers (id, user_id, business_name, created_at)
            VALUES (?, ?, ?, now())`,
      args: [dealerId, userId, business_name || display_name || ""],
    });
  }

  await logAdminAction(user.phone, "create_user", "user", userId, {
    phone: normalized,
    name: display_name,
    role,
  });

  return json({ id: userId, dealer_id: dealerId, phone: normalized }, 201);
}

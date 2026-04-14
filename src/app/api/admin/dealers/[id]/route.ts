import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;

  const [userRow, items, actions] = await Promise.all([
    db.execute({
      sql: `SELECT u.id, u.phone, u.display_name, u.avatar_url, u.is_dealer, u.created_at,
              d.id as dealer_id, d.business_name, d.instagram_handle, d.verified
            FROM users u
            LEFT JOIN dealers d ON d.user_id = u.id
            WHERE u.id = ?`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT i.id, i.title, i.price, i.status, i.created_at,
              m.name as market_name,
              (SELECT url FROM item_photos WHERE item_id = i.id ORDER BY position LIMIT 1) as photo_url
            FROM items i
            JOIN dealers d ON d.id = i.dealer_id
            JOIN markets m ON m.id = i.market_id
            WHERE d.user_id = ? AND i.status != 'deleted'
            ORDER BY i.created_at DESC
            LIMIT 50`,
      args: [id],
    }),
    db.execute({
      sql: `SELECT * FROM admin_actions
            WHERE entity_type = 'user' AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT 20`,
      args: [id],
    }),
  ]);

  if (userRow.rows.length === 0) return error("User not found", 404);

  return json({
    ...userRow.rows[0],
    items: items.rows,
    actions: actions.rows,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;
  const body = await request.json();

  // Handle role change
  if ("is_dealer" in body) {
    const newRole = Number(body.is_dealer);
    await db.execute({
      sql: `UPDATE users SET is_dealer = ? WHERE id = ?`,
      args: [newRole, id],
    });

    if (newRole === 1) {
      // Check if dealer record exists
      const existing = await db.execute({
        sql: `SELECT id FROM dealers WHERE user_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) {
        const dealerId = newId();
        await db.execute({
          sql: `INSERT INTO dealers (id, user_id, business_name, created_at)
                VALUES (?, ?, ?, now())`,
          args: [dealerId, id, body.business_name || ""],
        });
      }
    }

    await logAdminAction(user.phone, "change_role", "user", id, {
      is_dealer: newRole,
    });
  }

  // Handle name/business updates
  if ("display_name" in body) {
    await db.execute({
      sql: `UPDATE users SET display_name = ? WHERE id = ?`,
      args: [body.display_name, id],
    });
  }

  if ("business_name" in body) {
    await db.execute({
      sql: `UPDATE dealers SET business_name = ? WHERE user_id = ?`,
      args: [body.business_name, id],
    });
  }

  if ("instagram_handle" in body) {
    await db.execute({
      sql: `UPDATE dealers SET instagram_handle = ? WHERE user_id = ?`,
      args: [body.instagram_handle, id],
    });
  }

  if ("display_name" in body || "business_name" in body || "instagram_handle" in body) {
    await logAdminAction(user.phone, "edit_user", "user", id, body);
  }

  // Fetch updated user
  const result = await db.execute({
    sql: `SELECT u.id, u.phone, u.display_name, u.avatar_url, u.is_dealer, u.created_at,
            d.id as dealer_id, d.business_name, d.instagram_handle
          FROM users u
          LEFT JOIN dealers d ON d.user_id = u.id
          WHERE u.id = ?`,
    args: [id],
  });

  return json(result.rows[0]);
}

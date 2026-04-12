import type { InValue } from "@libsql/client";
import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const result: Record<string, unknown> = { ...user };

  // Market follows
  const follows = await db.execute({
    sql: `
      SELECT bmf.market_id, bmf.drop_alerts_enabled, m.name as market_name
      FROM buyer_market_follows bmf
      JOIN markets m ON m.id = bmf.market_id
      WHERE bmf.buyer_id = ?
    `,
    args: [user.id],
  });
  result.market_follows = follows.rows;

  // Notification preferences
  const prefs = await db.execute({
    sql: `SELECT key, enabled FROM notification_preferences WHERE user_id = ?`,
    args: [user.id],
  });
  result.notification_preferences = prefs.rows;

  // If dealer, include payment methods
  if (user.dealer_id) {
    const methods = await db.execute({
      sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
      args: [user.dealer_id],
    });
    result.payment_methods = methods.rows;
  }

  return json(result);
}

export async function PATCH(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();
  const updates: string[] = [];
  const args: InValue[] = [];

  if (body.first_name !== undefined) {
    updates.push("first_name = ?");
    args.push(body.first_name);
  }
  if (body.last_name !== undefined) {
    updates.push("last_name = ?");
    args.push(body.last_name);
  }
  if (body.display_name !== undefined) {
    updates.push("display_name = ?");
    args.push(body.display_name);
  }
  if (body.avatar_url !== undefined) {
    updates.push("avatar_url = ?");
    args.push(body.avatar_url);
  }

  if (updates.length > 0) {
    args.push(user.id);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });
  }

  // Notification preferences (array of {key, enabled})
  if (Array.isArray(body.notification_preferences)) {
    for (const pref of body.notification_preferences) {
      await db.execute({
        sql: `INSERT INTO notification_preferences (id, user_id, key, enabled)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, key) DO UPDATE SET enabled = excluded.enabled`,
        args: [
          (await import("@/lib/id")).newId(),
          user.id,
          pref.key,
          pref.enabled ? 1 : 0,
        ],
      });
    }
  }

  // Market follows (array of {market_id, drop_alerts_enabled})
  if (Array.isArray(body.market_follows)) {
    // Remove unfollowed markets
    const followedIds = body.market_follows.map((f: { market_id: string }) => f.market_id);
    if (followedIds.length > 0) {
      const placeholders = followedIds.map(() => "?").join(",");
      await db.execute({
        sql: `DELETE FROM buyer_market_follows WHERE buyer_id = ? AND market_id NOT IN (${placeholders})`,
        args: [user.id, ...followedIds],
      });
    }
    for (const follow of body.market_follows) {
      await db.execute({
        sql: `INSERT INTO buyer_market_follows (id, buyer_id, market_id, drop_alerts_enabled)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(buyer_id, market_id) DO UPDATE SET drop_alerts_enabled = excluded.drop_alerts_enabled`,
        args: [
          (await import("@/lib/id")).newId(),
          user.id,
          follow.market_id,
          follow.drop_alerts_enabled ? 1 : 0,
        ],
      });
    }
  }

  // Return updated user
  const updated = await db.execute({
    sql: `SELECT id, phone, first_name, last_name, display_name, avatar_url, is_dealer FROM users WHERE id = ?`,
    args: [user.id],
  });
  return json(updated.rows[0]);
}

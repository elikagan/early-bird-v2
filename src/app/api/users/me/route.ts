import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const result: Record<string, unknown> = { ...user };

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

  // Buyer stats
  const watchingRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM favorites WHERE buyer_id = ?`,
    args: [user.id],
  });
  result.watching_count = Number(watchingRes.rows[0]?.count ?? 0);

  const inquiriesRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM inquiries WHERE buyer_id = ?`,
    args: [user.id],
  });
  result.inquiries_count = Number(inquiriesRes.rows[0]?.count ?? 0);

  const boughtRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM items WHERE sold_to = ?`,
    args: [user.id],
  });
  result.bought_count = Number(boughtRes.rows[0]?.count ?? 0);

  return json(result);
}

export async function PATCH(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();

  // ── User fields ──
  const userUpdates: string[] = [];
  const userArgs: unknown[] = [];

  if (body.display_name !== undefined) {
    const name = String(body.display_name).trim();
    if (!name || name.length > 30) {
      return error("Display name must be 1-30 characters");
    }
    userUpdates.push("display_name = ?");
    userArgs.push(name);
  }
  if (body.first_name !== undefined) {
    userUpdates.push("first_name = ?");
    userArgs.push(body.first_name);
  }
  if (body.last_name !== undefined) {
    userUpdates.push("last_name = ?");
    userArgs.push(body.last_name);
  }
  if (body.avatar_url !== undefined) {
    userUpdates.push("avatar_url = ?");
    userArgs.push(body.avatar_url);
  }

  if (userUpdates.length > 0) {
    userArgs.push(user.id);
    await db.execute({
      sql: `UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`,
      args: userArgs,
    });
  }

  // ── Dealer fields ──
  if (user.dealer_id) {
    const dealerUpdates: string[] = [];
    const dealerArgs: unknown[] = [];

    if (body.business_name !== undefined) {
      const biz = String(body.business_name).trim();
      if (!biz || biz.length > 50) {
        return error("Business name must be 1-50 characters");
      }
      dealerUpdates.push("business_name = ?");
      dealerArgs.push(biz);
    }
    if (body.instagram_handle !== undefined) {
      let handle = String(body.instagram_handle || "").trim();
      if (handle.startsWith("@")) handle = handle.slice(1);
      if (handle && !/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
        return error("Invalid Instagram handle");
      }
      dealerUpdates.push("instagram_handle = ?");
      dealerArgs.push(handle || null);
    }

    if (dealerUpdates.length > 0) {
      dealerArgs.push(user.dealer_id);
      await db.execute({
        sql: `UPDATE dealers SET ${dealerUpdates.join(", ")} WHERE id = ?`,
        args: dealerArgs,
      });
    }

    // Payment methods (array of {method, enabled})
    if (Array.isArray(body.payment_methods)) {
      for (const pm of body.payment_methods) {
        await db.execute({
          sql: `INSERT INTO dealer_payment_methods (id, dealer_id, method, enabled)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(dealer_id, method) DO UPDATE SET enabled = excluded.enabled`,
          args: [newId(), user.dealer_id, pm.method, pm.enabled ? 1 : 0],
        });
      }
    }
  }

  // ── Notification preferences ──
  if (Array.isArray(body.notification_preferences)) {
    for (const pref of body.notification_preferences) {
      await db.execute({
        sql: `INSERT INTO notification_preferences (id, user_id, key, enabled)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, key) DO UPDATE SET enabled = excluded.enabled`,
        args: [newId(), user.id, pref.key, pref.enabled ? 1 : 0],
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

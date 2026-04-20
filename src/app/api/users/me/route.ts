import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { isValidShow } from "@/lib/shows";

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

  // If dealer, include payment methods + market subscriptions
  if (user.dealer_id) {
    const methods = await db.execute({
      sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
      args: [user.dealer_id],
    });
    result.payment_methods = methods.rows;

    const subs = await db.execute({
      sql: `SELECT show_name FROM dealer_market_subscriptions WHERE dealer_id = ? ORDER BY show_name`,
      args: [user.dealer_id],
    });
    result.market_subscriptions = subs.rows.map((r) => r.show_name as string);
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

  // Early-access grants — let the client bypass the pre-drop countdown
  // for markets this buyer has already unlocked.
  const grants = await db.execute({
    sql: `SELECT market_id FROM buyer_market_early_access WHERE user_id = ?`,
    args: [user.id],
  });
  result.early_access_market_ids = grants.rows.map((r) => r.market_id as string);

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

    // Market subscriptions — full replace. Pass an array of show names
    // (strings from the SHOWS constant); we wipe existing rows and
    // insert the new set. Must leave at least one — enforced here.
    if (Array.isArray(body.market_subscriptions)) {
      const shows = Array.from(
        new Set(body.market_subscriptions.filter(isValidShow))
      );
      if (shows.length === 0) {
        return error("Pick at least one show you sell at");
      }
      await db.execute({
        sql: `DELETE FROM dealer_market_subscriptions WHERE dealer_id = ?`,
        args: [user.dealer_id],
      });
      for (const show of shows) {
        await db.execute({
          sql: `INSERT INTO dealer_market_subscriptions (id, dealer_id, show_name) VALUES (?, ?, ?)`,
          args: [newId(), user.dealer_id, show],
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

  // ── Market follows ──
  if (Array.isArray(body.market_follows)) {
    const followedIds = body.market_follows.map(
      (f: { market_id: string }) => f.market_id
    );
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
        args: [newId(), user.id, follow.market_id, follow.drop_alerts_enabled ? 1 : 0],
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

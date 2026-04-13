import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";
import { composeHoldReceipt, composeSoldReceipt, composeLostReceipt } from "@/lib/sms-templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);

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
        bs.booth_number
      FROM items i
      JOIN dealers d ON d.id = i.dealer_id
      JOIN users u ON u.id = d.user_id
      LEFT JOIN booth_settings bs ON bs.dealer_id = d.id AND bs.market_id = i.market_id
      WHERE i.id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) return error("Item not found", 404);

  const item = result.rows[0] as Record<string, unknown>;

  // Photos
  const photos = await db.execute({
    sql: `SELECT id, url, position FROM item_photos WHERE item_id = ? ORDER BY position`,
    args: [id],
  });
  (item as Record<string, unknown>).photos = photos.rows;

  // Market context
  const market = await db.execute({
    sql: `SELECT id, name, location, drop_at, starts_at, status FROM markets WHERE id = ?`,
    args: [item.market_id as string],
  });
  (item as Record<string, unknown>).market = market.rows[0] || null;

  // Favorite status for current user
  if (user) {
    const fav = await db.execute({
      sql: `SELECT id FROM favorites WHERE buyer_id = ? AND item_id = ?`,
      args: [user.id, id],
    });
    (item as Record<string, unknown>).is_favorited = fav.rows.length > 0;
    if (fav.rows.length > 0) {
      (item as Record<string, unknown>).favorite_id = (fav.rows[0] as Record<string, unknown>).id;
    }
  }

  // Payment methods for the dealer
  const methods = await db.execute({
    sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
    args: [item.dealer_ref as string],
  });
  (item as Record<string, unknown>).dealer_payment_methods = methods.rows;

  return json(item);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  // Verify ownership
  const existing = await db.execute({
    sql: `SELECT * FROM items WHERE id = ? AND dealer_id = ?`,
    args: [id, user.dealer_id],
  });
  if (existing.rows.length === 0) return error("Item not found or not yours", 404);

  const body = await request.json();
  const item = existing.rows[0] as Record<string, unknown>;

  // Concurrent edit safety: reject edits to sold items (status changes still allowed)
  const isStatusOnly = Object.keys(body).every((k) =>
    ["status", "held_for", "sold_to"].includes(k)
  );
  if (!isStatusOnly && item.status === "sold") {
    return error("Cannot edit a sold item", 409);
  }

  const updates: string[] = [];
  const args: unknown[] = [];

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > 60) return error("Title must be 1-60 characters");
    updates.push("title = ?");
    args.push(title);
  }
  if (body.description !== undefined) {
    const desc = String(body.description || "").trim();
    if (desc.length > 500) return error("Description max 500 characters");
    updates.push("description = ?");
    args.push(desc || null);
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 100) return error("Price must be at least $1");
    // Track price drops: if new price < current price, record original
    if (price < (item.price as number) && !item.original_price) {
      updates.push("original_price = ?");
      args.push(item.price as unknown);
    }
    updates.push("price = ?");
    args.push(price);
  }
  if (body.price_firm !== undefined) {
    updates.push("price_firm = ?");
    args.push(body.price_firm ? 1 : 0);
  }
  if (body.status !== undefined) {
    updates.push("status = ?");
    args.push(body.status);
  }
  if (body.held_for !== undefined) {
    updates.push("held_for = ?");
    args.push(body.held_for);
  }
  if (body.sold_to !== undefined) {
    updates.push("sold_to = ?");
    args.push(body.sold_to);
  }

  const hasFieldUpdates = updates.length > 0;

  // Photo management
  if (Array.isArray(body.add_photo_urls) && body.add_photo_urls.length > 0) {
    // Get current max position
    const posRes = await db.execute({
      sql: `SELECT COALESCE(MAX(position), -1) as max_pos FROM item_photos WHERE item_id = ?`,
      args: [id],
    });
    let pos = Number((posRes.rows[0] as Record<string, unknown>).max_pos) + 1;
    for (const url of body.add_photo_urls) {
      await db.execute({
        sql: `INSERT INTO item_photos (id, item_id, url, position) VALUES (?, ?, ?, ?)`,
        args: [(await import("@/lib/id")).newId(), id, url, pos++],
      });
    }
  }

  if (Array.isArray(body.remove_photo_ids) && body.remove_photo_ids.length > 0) {
    // Check that at least 1 photo will remain
    const totalRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM item_photos WHERE item_id = ?`,
      args: [id],
    });
    const total = Number((totalRes.rows[0] as Record<string, unknown>).count);
    const addCount = Array.isArray(body.add_photo_urls) ? body.add_photo_urls.length : 0;
    const remaining = total - body.remove_photo_ids.length + addCount;
    if (remaining < 1) return error("Item must have at least 1 photo");

    const placeholders = body.remove_photo_ids.map(() => "?").join(",");
    await db.execute({
      sql: `DELETE FROM item_photos WHERE item_id = ? AND id IN (${placeholders})`,
      args: [id, ...body.remove_photo_ids],
    });
  }

  if (!hasFieldUpdates && !body.add_photo_urls?.length && !body.remove_photo_ids?.length) {
    return error("No fields to update");
  }

  if (hasFieldUpdates) {
    args.push(id);
    await db.execute({
      sql: `UPDATE items SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });
  }

  // Helper to look up context for SMS
  async function getReceiptContext() {
    const ctx = await db.execute({
      sql: `
        SELECT d.business_name, bs.booth_number, m.name as market_name,
               m.starts_at
        FROM items i
        JOIN dealers d ON d.id = i.dealer_id
        LEFT JOIN booth_settings bs ON bs.dealer_id = d.id AND bs.market_id = i.market_id
        JOIN markets m ON m.id = i.market_id
        WHERE i.id = ?
      `,
      args: [id],
    });
    const row = ctx.rows[0] as Record<string, unknown>;
    const startDate = new Date(row.starts_at as string);
    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    return {
      dealerName: row.business_name as string,
      boothNumber: row.booth_number as string | null,
      marketName: row.market_name as string,
      marketDate: dateStr,
    };
  }

  // If status changed to hold/sold via per-inquiry action, update inquiry statuses + send SMS
  if (body.status === "hold" && body.held_for) {
    await db.execute({
      sql: `UPDATE inquiries SET status = 'held' WHERE item_id = ? AND buyer_id = ?`,
      args: [id, body.held_for],
    });
    // SMS: hold receipt to buyer
    const buyer = await db.execute({
      sql: `SELECT phone FROM users WHERE id = ?`,
      args: [body.held_for],
    });
    if (buyer.rows.length > 0) {
      const ctx = await getReceiptContext();
      await sendSMS(
        (buyer.rows[0] as Record<string, unknown>).phone as string,
        composeHoldReceipt(ctx.dealerName, item.title as string, ctx.boothNumber, ctx.marketName, ctx.marketDate)
      );
    }
  }
  if (body.status === "sold" && body.sold_to) {
    await db.execute({
      sql: `UPDATE inquiries SET status = 'sold' WHERE item_id = ? AND buyer_id = ?`,
      args: [id, body.sold_to],
    });
    // All other inquirers lose
    await db.execute({
      sql: `UPDATE inquiries SET status = 'lost' WHERE item_id = ? AND buyer_id != ? AND status IN ('open', 'held')`,
      args: [id, body.sold_to],
    });
    // SMS: sold receipt to winner
    const ctx = await getReceiptContext();
    const winner = await db.execute({
      sql: `SELECT phone FROM users WHERE id = ?`,
      args: [body.sold_to],
    });
    if (winner.rows.length > 0) {
      await sendSMS(
        (winner.rows[0] as Record<string, unknown>).phone as string,
        composeSoldReceipt(ctx.dealerName, item.title as string, ctx.boothNumber, ctx.marketName, ctx.marketDate)
      );
    }
    // SMS: lost receipt to all other inquirers
    const losers = await db.execute({
      sql: `SELECT u.phone FROM inquiries q JOIN users u ON u.id = q.buyer_id WHERE q.item_id = ? AND q.buyer_id != ?`,
      args: [id, body.sold_to],
    });
    for (const loser of losers.rows) {
      await sendSMS(
        (loser as Record<string, unknown>).phone as string,
        composeLostReceipt(item.title as string, ctx.dealerName)
      );
    }
  }
  if (body.status === "sold" && !body.sold_to) {
    // Walk-up sale: all inquirers lose
    await db.execute({
      sql: `UPDATE inquiries SET status = 'lost' WHERE item_id = ? AND status IN ('open', 'held')`,
      args: [id],
    });
    // SMS: lost receipt to all inquirers
    const ctx = await getReceiptContext();
    const allInquirers = await db.execute({
      sql: `SELECT u.phone FROM inquiries q JOIN users u ON u.id = q.buyer_id WHERE q.item_id = ?`,
      args: [id],
    });
    for (const inq of allInquirers.rows) {
      await sendSMS(
        (inq as Record<string, unknown>).phone as string,
        composeLostReceipt(item.title as string, ctx.dealerName)
      );
    }
  }

  const updated = await db.execute({ sql: `SELECT * FROM items WHERE id = ?`, args: [id] });
  return json(updated.rows[0]);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const existing = await db.execute({
    sql: `SELECT id FROM items WHERE id = ? AND dealer_id = ?`,
    args: [id, user.dealer_id],
  });
  if (existing.rows.length === 0) return error("Item not found or not yours", 404);

  await db.execute({ sql: `DELETE FROM item_photos WHERE item_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM inquiries WHERE item_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM favorites WHERE item_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM items WHERE id = ?`, args: [id] });

  return json({ deleted: true });
}

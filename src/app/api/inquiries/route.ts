import db from "@/lib/db";
import { after } from "next/server";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { composeInquiryNotification } from "@/lib/sms-templates";
import { shouldNotify } from "@/lib/notifications";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();
  const { item_id, message } = body;

  if (!item_id) return error("item_id is required");

  // Message is required — empty inquiries produced garbage SMS like
  // `... says: "" about ...` before this guard existed.
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return error("message is required", 400);
  }

  // Verify item exists
  const item = await db.execute({
    sql: `SELECT i.*, d.user_id as dealer_user_id FROM items i JOIN dealers d ON d.id = i.dealer_id WHERE i.id = ?`,
    args: [item_id],
  });
  if (item.rows.length === 0) return error("Item not found", 404);

  // Don't let a dealer inquire on their own item
  const itemRow = item.rows[0] as Record<string, unknown>;
  if (itemRow.dealer_user_id === user.id) {
    return error("Cannot inquire on your own item", 400);
  }

  // One inquiry per buyer per item. If there's already an active inquiry
  // (anything except 'lost' which means the item sold to someone else),
  // refuse — don't spam the dealer with repeat SMS.
  const existing = await db.execute({
    sql: `SELECT id FROM inquiries WHERE buyer_id = ? AND item_id = ? AND status != 'lost' LIMIT 1`,
    args: [user.id, item_id],
  });
  if (existing.rows.length > 0) {
    return error("You've already inquired on this item", 409);
  }

  const inquiryId = newId();
  await db.execute({
    sql: `INSERT INTO inquiries (id, item_id, buyer_id, message) VALUES (?, ?, ?, ?)`,
    args: [inquiryId, item_id, user.id, message || null],
  });

  // Auto-favorite the item (watching tab shows inquired items)
  await db.execute({
    sql: `INSERT INTO favorites (id, buyer_id, item_id) VALUES (?, ?, ?) ON CONFLICT (buyer_id, item_id) DO NOTHING`,
    args: [newId(), user.id, item_id],
  });

  const inquiry = await db.execute({
    sql: `SELECT * FROM inquiries WHERE id = ?`,
    args: [inquiryId],
  });
  // Deferred: notify dealer via SMS after response is sent
  after(async () => {
    try {
      const dealerUser = await db.execute({
        sql: `SELECT u.id, u.phone FROM users u JOIN dealers d ON d.user_id = u.id WHERE d.id = ?`,
        args: [itemRow.dealer_id as string],
      });
      if (dealerUser.rows.length > 0) {
        const dealer = dealerUser.rows[0] as Record<string, unknown>;
        const canNotify = await shouldNotify(dealer.id as string, "new_inquiries");
        if (canNotify) {
          const buyerName = user.display_name || user.first_name || "A buyer";
          await sendSMS(
            dealer.phone as string,
            composeInquiryNotification(buyerName, user.phone, itemRow.title as string, message || "")
          );
        }
      }
    } catch (err) {
      console.error("Deferred inquiry SMS error:", err);
    }
  });

  return json(inquiry.rows[0], 201);
}

import db from "@/lib/db";
import { after } from "next/server";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";
import { sendSMSWithLog } from "@/lib/sms";
import { logEvent, EVT } from "@/lib/system-events";
import {
  composeInquiryNotification,
  composeInquiryBuyerConfirmation,
} from "@/lib/sms-templates";
import { shouldNotify } from "@/lib/notifications";
import { normalizeUSPhone } from "@/lib/phone";
import { getBaseUrl } from "@/lib/url";

/**
 * Create an inquiry. Two entry paths:
 *
 *  - Authenticated: buyer has a session, body = { item_id, message }.
 *    Inquiry is created + dealer SMS fires immediately. Same as before.
 *
 *  - Anonymous: no session, body = { item_id, name, phone, message }.
 *    We upsert a user for that phone and stash { item_id, message } on
 *    an auth_tokens row (token_type='inquiry_confirm'), then text the
 *    buyer a verification link. NOTHING goes to the dealer yet. When
 *    the buyer taps the link /api/auth/verify finalizes the inquiry
 *    and triggers the dealer SMS.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { item_id, message } = body;

  if (!item_id) return error("item_id is required");
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return error("message is required", 400);
  }
  // Cap so the dealer SMS template renders cleanly. 500 chars leaves
  // room for the "Early Bird: {name} at {phone} says: "{message}"…"
  // framing without SMS carriers fragmenting or Pingram rejecting.
  if (message.length > 500) {
    return error("Message is too long — keep it under 500 characters", 400);
  }

  const user = await getSession(request);

  // Resolve item + dealer context (needed for both paths)
  const item = await db.execute({
    sql: `SELECT i.*, d.user_id as dealer_user_id, d.business_name as dealer_name
          FROM items i JOIN dealers d ON d.id = i.dealer_id
          WHERE i.id = ?`,
    args: [item_id],
  });
  if (item.rows.length === 0) return error("Item not found", 404);
  const itemRow = item.rows[0] as Record<string, unknown>;

  // ── Authenticated path: unchanged behavior ──
  if (user) {
    if (itemRow.dealer_user_id === user.id) {
      return error("Cannot inquire on your own item", 400);
    }

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
      args: [inquiryId, item_id, user.id, message.trim()],
    });

    await db.execute({
      sql: `INSERT INTO favorites (id, buyer_id, item_id) VALUES (?, ?, ?) ON CONFLICT (buyer_id, item_id) DO NOTHING`,
      args: [newId(), user.id, item_id],
    });

    const buyerName = user.display_name || user.first_name || "A buyer";
    const buyerPhone = user.phone;

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
            await sendSMSWithLog(
              dealer.phone as string,
              composeInquiryNotification(
                buyerName,
                buyerPhone,
                itemRow.title as string,
                message.trim()
              ),
              {
                event_type: "sms.inquiry.new",
                entity_type: "inquiry",
                entity_id: inquiryId,
                meta: { dealer_id: itemRow.dealer_id as string, item_id },
              }
            );
          } else {
            await logEvent({
              event_type: EVT.INQUIRY_CREATED,
              severity: "info",
              entity_type: "inquiry",
              entity_id: inquiryId,
              message:
                "Inquiry created but dealer has opted out of new_inquiries SMS",
            });
          }
        }
      } catch (err) {
        console.error("Deferred inquiry SMS error:", err);
      }
    });

    const inquiry = await db.execute({
      sql: `SELECT * FROM inquiries WHERE id = ?`,
      args: [inquiryId],
    });
    return json(inquiry.rows[0], 201);
  }

  // ── Anonymous path: verify first, then finalize ──
  const rawName = body.name;
  if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
    return error("name is required", 400);
  }
  const trimmedName = rawName.trim().slice(0, 60);

  const phoneResult = normalizeUSPhone(body.phone);
  if (!phoneResult.ok) return error(phoneResult.reason, 400);
  const buyerPhone = phoneResult.phone;

  // Upsert the user. First-time inquirers get a fresh row; repeat
  // inquirers keep theirs (don't clobber a chosen display_name).
  const existingUser = await db.execute({
    sql: `SELECT id, display_name FROM users WHERE phone = ?`,
    args: [buyerPhone],
  });
  let buyerId: string;
  if (existingUser.rows.length === 0) {
    buyerId = newId();
    await db.execute({
      sql: `INSERT INTO users (id, phone, display_name) VALUES (?, ?, ?)`,
      args: [buyerId, buyerPhone, trimmedName],
    });
  } else {
    const row = existingUser.rows[0] as Record<string, unknown>;
    buyerId = row.id as string;
    if (!row.display_name) {
      await db.execute({
        sql: `UPDATE users SET display_name = ? WHERE id = ?`,
        args: [trimmedName, buyerId],
      });
    }
  }

  // Dedup: if this buyer already has an open inquiry on this item, don't
  // mint another confirmation token + burn another SMS. Return the same
  // "check your texts" shape so the client flow is unchanged, but skip
  // the send.
  const existingInquiry = await db.execute({
    sql: `SELECT id FROM inquiries
          WHERE buyer_id = ? AND item_id = ? AND status != 'lost'
          LIMIT 1`,
    args: [buyerId, item_id],
  });
  if (existingInquiry.rows.length > 0) {
    return json(
      { ok: true, phone: buyerPhone, magic_link_sent: false, already_inquired: true },
      200
    );
  }

  // Mint a token that carries the inquiry payload. The dealer SMS
  // fires + inquiry row is created only when this token is redeemed
  // (i.e. the buyer tapped the verification link — proving phone
  // ownership).
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.execute({
    sql: `INSERT INTO auth_tokens
            (id, phone, token, expires_at, token_type, user_id,
             inquiry_item_id, inquiry_message)
          VALUES (?, ?, ?, ?, 'inquiry_confirm', ?, ?, ?)`,
    args: [
      newId(),
      buyerPhone,
      token,
      expiresAt,
      buyerId,
      item_id,
      message.trim(),
    ],
  });

  const baseUrl = getBaseUrl(request);
  const verifyUrl = `${baseUrl}/v/${token}`;

  after(async () => {
    try {
      await sendSMSWithLog(
        buyerPhone,
        composeInquiryBuyerConfirmation(
          itemRow.dealer_name as string,
          itemRow.title as string,
          verifyUrl
        ),
        {
          event_type: "sms.inquiry.buyer_confirmation",
          entity_type: "user",
          entity_id: buyerId,
          meta: { item_id },
        }
      );
    } catch (err) {
      console.error("Buyer confirmation SMS error:", err);
    }
  });

  return json({ ok: true, phone: buyerPhone, magic_link_sent: true }, 201);
}

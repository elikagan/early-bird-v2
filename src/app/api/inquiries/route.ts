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
 *    Same behavior as before the anon path existed.
 *
 *  - Anonymous: no session, body = { item_id, name, phone, message }.
 *    We upsert a user for that phone, mint a magic-link token so a
 *    confirmation SMS can ship with a "sign back in on this item"
 *    link, then create the inquiry exactly the same way.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { item_id, message } = body;

  if (!item_id) return error("item_id is required");
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return error("message is required", 400);
  }

  const user = await getSession(request);

  // Resolve the buyer — either the current session's user, or the
  // upserted user from the anon phone+name pair.
  let buyerId: string;
  let buyerPhone: string;
  let buyerName: string;
  let anonToken: string | null = null;

  if (user) {
    buyerId = user.id;
    buyerPhone = user.phone;
    buyerName = user.display_name || user.first_name || "A buyer";
  } else {
    const rawName = body.name;
    if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
      return error("name is required", 400);
    }
    const trimmedName = rawName.trim().slice(0, 60);

    const phoneResult = normalizeUSPhone(body.phone);
    if (!phoneResult.ok) return error(phoneResult.reason, 400);
    buyerPhone = phoneResult.phone;

    // Upsert the user. First-time inquirers get a fresh row; repeat
    // inquirers get their existing row (we don't overwrite display_name
    // if they've already set one).
    const existing = await db.execute({
      sql: `SELECT id, display_name FROM users WHERE phone = ?`,
      args: [buyerPhone],
    });
    if (existing.rows.length === 0) {
      buyerId = newId();
      await db.execute({
        sql: `INSERT INTO users (id, phone, display_name) VALUES (?, ?, ?)`,
        args: [buyerId, buyerPhone, trimmedName],
      });
    } else {
      const row = existing.rows[0] as Record<string, unknown>;
      buyerId = row.id as string;
      if (!row.display_name) {
        await db.execute({
          sql: `UPDATE users SET display_name = ? WHERE id = ?`,
          args: [trimmedName, buyerId],
        });
      }
    }
    buyerName = trimmedName;

    // Mint a magic-link token — the confirmation SMS will include it
    // so the buyer can get back into the app signed in.
    anonToken = nanoid(16);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO auth_tokens (id, phone, token, expires_at, token_type, user_id)
            VALUES (?, ?, ?, ?, 'login', ?)`,
      args: [newId(), buyerPhone, anonToken, expiresAt, buyerId],
    });
  }

  // Resolve item + dealer context
  const item = await db.execute({
    sql: `SELECT i.*, d.user_id as dealer_user_id, d.business_name as dealer_name
          FROM items i JOIN dealers d ON d.id = i.dealer_id
          WHERE i.id = ?`,
    args: [item_id],
  });
  if (item.rows.length === 0) return error("Item not found", 404);

  const itemRow = item.rows[0] as Record<string, unknown>;

  // Don't let a dealer inquire on their own item. (Only catchable when
  // the inquirer is authed — an anon submitting their own phone would
  // self-match but that's a bizarre edge case we'll allow through.)
  if (user && itemRow.dealer_user_id === user.id) {
    return error("Cannot inquire on your own item", 400);
  }

  // One active inquiry per buyer per item. Anything except 'lost'
  // (the item sold to someone else) blocks a duplicate.
  const existing = await db.execute({
    sql: `SELECT id FROM inquiries WHERE buyer_id = ? AND item_id = ? AND status != 'lost' LIMIT 1`,
    args: [buyerId, item_id],
  });
  if (existing.rows.length > 0) {
    return error("You've already inquired on this item", 409);
  }

  const inquiryId = newId();
  await db.execute({
    sql: `INSERT INTO inquiries (id, item_id, buyer_id, message) VALUES (?, ?, ?, ?)`,
    args: [inquiryId, item_id, buyerId, message.trim()],
  });

  // Auto-favorite — watching tab also surfaces items the buyer inquired on.
  await db.execute({
    sql: `INSERT INTO favorites (id, buyer_id, item_id) VALUES (?, ?, ?) ON CONFLICT (buyer_id, item_id) DO NOTHING`,
    args: [newId(), buyerId, item_id],
  });

  const inquiry = await db.execute({
    sql: `SELECT * FROM inquiries WHERE id = ?`,
    args: [inquiryId],
  });

  // Deferred: dealer notification (always) + buyer confirmation (anon only).
  const baseUrl = getBaseUrl(request);
  after(async () => {
    try {
      // Dealer SMS — same as the authenticated path
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
            message: "Inquiry created but dealer has opted out of new_inquiries SMS",
          });
        }
      }

      // Anon-only: confirmation SMS to the buyer with the magic link.
      // Signed-in buyers already have a session; no point texting them.
      if (anonToken) {
        const verifyUrl = `${baseUrl}/v/${anonToken}?to=${encodeURIComponent(
          `/item/${item_id}`
        )}`;
        await sendSMSWithLog(
          buyerPhone,
          composeInquiryBuyerConfirmation(
            itemRow.dealer_name as string,
            itemRow.title as string,
            verifyUrl
          ),
          {
            event_type: "sms.inquiry.buyer_confirmation",
            entity_type: "inquiry",
            entity_id: inquiryId,
            meta: { item_id },
          }
        );
      }
    } catch (err) {
      console.error("Deferred inquiry SMS error:", err);
    }
  });

  return json(inquiry.rows[0], 201);
}

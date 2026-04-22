import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { sendSMSWithLog } from "@/lib/sms";
import { composePhoneChangeVerification } from "@/lib/sms-templates";
import { normalizeUSPhone } from "@/lib/phone";
import { getBaseUrl } from "@/lib/url";
import { nanoid } from "nanoid";

/**
 * POST /api/auth/change-phone
 * Starts the phone-change verification flow.
 * Sends a magic link to the NEW phone number. When tapped,
 * /api/auth/verify handles swapping the phone on the user record.
 */
export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();
  const { phone } = body;

  const normalizedResult = normalizeUSPhone(phone);
  if (!normalizedResult.ok) return error(normalizedResult.reason);
  const normalized = normalizedResult.phone;

  // Can't change to your current number
  if (normalized === user.phone) {
    return error("That's already your phone number");
  }

  // Check if another user already has this number
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE phone = ? AND id != ?`,
    args: [normalized, user.id],
  });
  if (existing.rows.length > 0) {
    return error("This phone number is already in use");
  }

  // Create a phone-change token (type column differentiates from login tokens)
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, expires_at, token_type, user_id)
          VALUES (?, ?, ?, ?, 'phone_change', ?)`,
    args: [newId(), normalized, token, expiresAt, user.id],
  });

  const url = `${getBaseUrl(request)}/v/${token}`;
  await sendSMSWithLog(normalized, composePhoneChangeVerification(url), {
    event_type: "sms.auth.phone_change",
    entity_type: "user",
    entity_id: user.id,
  });

  return json({ ok: true });
}

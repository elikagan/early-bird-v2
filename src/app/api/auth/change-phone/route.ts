import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
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

  if (!phone) return error("phone is required");

  // Normalize to digits only
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return error("Enter a valid US phone number");
  }
  const normalized = digits.length === 11 && digits[0] === "1"
    ? `+${digits}`
    : `+1${digits}`;

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

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/v/${token}`;
  await sendSMS(normalized, `Early Bird: Tap to confirm your new number.\n\n${url}`);

  return json({ ok: true });
}

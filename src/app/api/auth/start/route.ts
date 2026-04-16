import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { composeMagicLink } from "@/lib/sms-templates";
import { getBaseUrl } from "@/lib/url";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const body = await request.json();
  const { phone, dealer, sms_consent } = body;

  if (!phone) return error("phone is required");

  // Create or find user
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE phone = ?`,
    args: [phone],
  });

  let userId: string;
  if (existing.rows.length === 0) {
    userId = newId();
    await db.execute({
      sql: `INSERT INTO users (id, phone) VALUES (?, ?)`,
      args: [userId, phone],
    });
  } else {
    userId = (existing.rows[0] as Record<string, unknown>).id as string;
  }

  // Record SMS marketing consent as notification preference
  if (typeof sms_consent === "boolean") {
    await db.execute({
      sql: `INSERT INTO notification_preferences (id, user_id, key, enabled)
            VALUES (?, ?, 'drop_alerts', ?)
            ON CONFLICT(user_id, key) DO UPDATE SET enabled = excluded.enabled`,
      args: [newId(), userId, sms_consent ? 1 : 0],
    });
  }

  // Generate magic link token (URL-safe, 16 chars — short so SMS link fits on one line)
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), phone, token, expiresAt],
  });

  // Short path so the full URL stays on one tappable line in SMS
  const url = dealer
    ? `${getBaseUrl(request)}/v/${token}?dealer=1`
    : `${getBaseUrl(request)}/v/${token}`;
  await sendSMS(phone, composeMagicLink(url));

  return json({ ok: true });
}

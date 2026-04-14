import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { getBaseUrl } from "@/lib/url";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, phone, name, business_name, instagram_handle } = body;

  // ── Validate inputs ──
  if (!code) return error("Invalid invite link");
  if (!phone) return error("Phone number is required");
  if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 60) {
    return error("Name is required (max 60 characters)");
  }
  if (
    !business_name ||
    typeof business_name !== "string" ||
    business_name.trim().length < 1 ||
    business_name.trim().length > 60
  ) {
    return error("Business name is required (max 60 characters)");
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return error("Enter a valid US phone number");
  }
  const normalized =
    digits.length === 11 && digits[0] === "1"
      ? `+${digits}`
      : `+1${digits}`;

  let igClean: string | null = null;
  if (instagram_handle) {
    igClean = String(instagram_handle).trim().replace(/^@/, "");
    if (igClean && !/^[a-zA-Z0-9._]{1,30}$/.test(igClean)) {
      return error("Invalid Instagram handle");
    }
    if (!igClean) igClean = null;
  }

  // ── Validate invite code ──
  const invite = await db.execute({
    sql: `SELECT id FROM dealer_invites WHERE code = ? AND used_at IS NULL`,
    args: [code],
  });
  if (invite.rows.length === 0) {
    return error("This invite link has expired or already been used", 410);
  }
  const inviteId = invite.rows[0].id as string;

  // ── Find or create user ──
  const userResult = await db.execute({
    sql: `SELECT u.id, d.id as dealer_id FROM users u LEFT JOIN dealers d ON d.user_id = u.id WHERE u.phone = ?`,
    args: [normalized],
  });

  let userId: string;

  if (userResult.rows.length === 0) {
    userId = newId();
    await db.execute({
      sql: `INSERT INTO users (id, phone, display_name, is_dealer) VALUES (?, ?, ?, 1)`,
      args: [userId, normalized, name.trim()],
    });
  } else {
    const row = userResult.rows[0] as Record<string, unknown>;
    if (row.dealer_id) {
      return error("You're already a dealer! Just sign in normally.");
    }
    userId = row.id as string;
    await db.execute({
      sql: `UPDATE users SET is_dealer = 1, display_name = COALESCE(NULLIF(display_name, ''), ?) WHERE id = ?`,
      args: [name.trim(), userId],
    });
  }

  // ── Create dealer record ──
  const dealerId = newId();
  await db.execute({
    sql: `INSERT INTO dealers (id, user_id, business_name, instagram_handle) VALUES (?, ?, ?, ?)`,
    args: [dealerId, userId, business_name.trim(), igClean],
  });

  // ── Mark invite as used ──
  await db.execute({
    sql: `UPDATE dealer_invites SET used_at = now(), used_by = ? WHERE id = ?`,
    args: [userId, inviteId],
  });

  // ── Send magic link ──
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), normalized, token, expiresAt],
  });

  const url = `${getBaseUrl(request)}/v/${token}`;
  await sendSMS(
    normalized,
    `Early Bird: Tap to log in to your new dealer account.\n\n${url}`
  );

  return json({ ok: true });
}

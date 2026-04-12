import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { composeMagicLink } from "@/lib/sms-templates";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const body = await request.json();
  const { phone } = body;

  if (!phone) return error("phone is required");

  // Create or find user
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE phone = ?`,
    args: [phone],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO users (id, phone) VALUES (?, ?)`,
      args: [newId(), phone],
    });
  }

  // Generate magic link token (URL-safe, 32 chars)
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), phone, token, expiresAt],
  });

  // "Send" the magic link via SMS (console stub)
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify?token=${token}`;
  await sendSMS(phone, composeMagicLink(url));

  return json({ ok: true });
}

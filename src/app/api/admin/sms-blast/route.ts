import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin, blastExcludedPhones } from "@/lib/admin";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const body = await request.json();
  const { audience, message, market_id } = body;

  if (!audience || !message) {
    return error("Audience and message are required");
  }

  // Fetch recipients
  let recipients;

  if (audience === "dealers") {
    if (market_id) {
      recipients = await db.execute({
        sql: `SELECT DISTINCT u.phone
              FROM users u
              JOIN dealers d ON d.user_id = u.id
              JOIN booth_settings bs ON bs.dealer_id = d.id AND bs.market_id = ?
              WHERE u.is_dealer = 1`,
        args: [market_id],
      });
    } else {
      recipients = await db.execute(
        `SELECT phone FROM users WHERE is_dealer = 1`
      );
    }
  } else if (audience === "buyers") {
    recipients = await db.execute(
      `SELECT phone FROM users WHERE is_dealer = 0`
    );
  } else {
    recipients = await db.execute(
      `SELECT phone FROM users`
    );
  }

  // Strip admins (they wrote the message) + test/dev phones (sends fail).
  const excluded = new Set(blastExcludedPhones());
  const phones = recipients.rows
    .map((r) => r.phone as string)
    .filter((p) => p && !excluded.has(p));
  const total = phones.length;

  if (total === 0) {
    return error("No recipients match the selected audience");
  }

  // Send in batches of 5
  let sent = 0;
  let failed = 0;
  const errors: { phone: string; error: string }[] = [];

  for (let i = 0; i < phones.length; i += 5) {
    const batch = phones.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((phone) => sendSMS(phone, message))
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        errors.push({ phone: batch[idx], error: result.reason?.message || "Unknown error" });
      }
    });
  }

  // Log the blast
  const blastId = newId();
  await db.execute({
    sql: `INSERT INTO sms_blasts (id, market_id, audience, message, sent_count, fail_count, total_count, errors, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, now())`,
    args: [
      blastId,
      market_id || null,
      audience,
      message,
      sent,
      failed,
      total,
      errors.length > 0 ? JSON.stringify(errors) : null,
    ],
  });

  await logAdminAction(user.phone, "send_blast", "sms_blast", blastId, {
    audience,
    sent,
    total,
    fail_count: failed,
  });

  return json({ sent, failed, total });
}

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { getBaseUrl } from "@/lib/url";
import { nanoid } from "nanoid";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  // Get application
  const appResult = await db.execute({
    sql: `SELECT * FROM dealer_applications WHERE id = ? AND status = 'pending'`,
    args: [id],
  });
  if (appResult.rows.length === 0) {
    return error("Application not found or already reviewed", 404);
  }

  const app = appResult.rows[0] as Record<string, unknown>;
  const userId = app.user_id as string;
  const phone = app.phone as string;

  // Create dealer record
  const dealerId = newId();
  let igHandle = app.instagram_handle as string | null;
  if (igHandle) igHandle = igHandle.replace(/^@/, "");

  await db.execute({
    sql: `INSERT INTO dealers (id, user_id, business_name, instagram_handle)
          VALUES (?, ?, ?, ?)`,
    args: [dealerId, userId, app.business_name, igHandle],
  });

  // Update user: flip is_dealer, set display_name if they provided a name
  await db.execute({
    sql: `UPDATE users SET is_dealer = 1, display_name = COALESCE(display_name, ?) WHERE id = ?`,
    args: [app.name, userId],
  });

  // Mark application approved
  await db.execute({
    sql: `UPDATE dealer_applications SET status = 'approved', reviewed_at = now() WHERE id = ?`,
    args: [id],
  });

  // Send magic link SMS so they can log in fresh with dealer access
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h for this one
  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), phone, token, expiresAt],
  });

  const url = `${getBaseUrl(request)}/v/${token}`;
  await sendSMS(
    phone,
    `Early Bird: You're approved as a dealer! Tap to get started.\n\n${url}`
  );

  return json({ approved: true, dealer_id: dealerId });
}

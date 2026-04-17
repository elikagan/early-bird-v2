import { after } from "next/server";
import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";
import { sendSMS } from "@/lib/sms";
import { getBaseUrl } from "@/lib/url";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  // Already a dealer
  if (user.dealer_id) return error("You're already a dealer", 400);

  const body = await request.json();
  const { name, business_name, instagram_handle } = body;

  if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 60) {
    return error("Name is required (max 60 characters)");
  }
  if (!business_name || typeof business_name !== "string" || business_name.trim().length < 1 || business_name.trim().length > 60) {
    return error("Business name is required (max 60 characters)");
  }

  if (!instagram_handle || typeof instagram_handle !== "string" || !instagram_handle.trim()) {
    return error("Instagram handle is required for dealer applications");
  }
  const igClean: string = String(instagram_handle).trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(igClean)) {
    return error("Invalid Instagram handle");
  }

  // Check for existing pending application
  const existing = await db.execute({
    sql: `SELECT id FROM dealer_applications WHERE user_id = ? AND status = 'pending'`,
    args: [user.id],
  });
  if (existing.rows.length > 0) {
    return error("You already have a pending application", 409);
  }

  const id = newId();
  await db.execute({
    sql: `INSERT INTO dealer_applications (id, user_id, name, business_name, instagram_handle, phone)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, user.id, name.trim(), business_name.trim(), igClean, user.phone],
  });

  // Deferred: notify admins by SMS so they can review the application.
  after(async () => {
    try {
      const raw = process.env.ADMIN_PHONES || "";
      const adminPhones = raw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (adminPhones.length === 0) return;

      const url = `${getBaseUrl(request)}/admin`;
      const body = `Early Bird: New dealer application from ${name.trim()} (${business_name.trim()}). Review: ${url}`;
      await Promise.allSettled(adminPhones.map((p) => sendSMS(p, body)));
    } catch (err) {
      console.error("Admin notification SMS failed:", err);
    }
  });

  return json({ id, status: "pending" }, 201);
}

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  // Return current user's application status
  const result = await db.execute({
    sql: `SELECT id, status, created_at FROM dealer_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    args: [user.id],
  });

  if (result.rows.length === 0) {
    return json({ application: null });
  }

  return json({ application: result.rows[0] });
}

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  // Already a dealer
  if (user.dealer_id) return error("Already a dealer", 400);

  const body = await request.json();
  const { name, business_name, instagram_handle } = body;

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

  let igClean: string | null = null;
  if (instagram_handle) {
    igClean = String(instagram_handle).trim().replace(/^@/, "");
    if (igClean && !/^[a-zA-Z0-9._]{1,30}$/.test(igClean)) {
      return error("Invalid Instagram handle");
    }
    if (!igClean) igClean = null;
  }

  // Create dealer record
  const dealerId = newId();
  await db.execute({
    sql: `INSERT INTO dealers (id, user_id, business_name, instagram_handle) VALUES (?, ?, ?, ?)`,
    args: [dealerId, user.id, business_name.trim(), igClean],
  });

  // Update user
  await db.execute({
    sql: `UPDATE users SET is_dealer = 1, display_name = COALESCE(NULLIF(display_name, ''), ?) WHERE id = ?`,
    args: [name.trim(), user.id],
  });

  return json({ dealer_id: dealerId });
}

import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

/**
 * Inbound SMS list for the admin Responses tab. Joins each row with
 * the matched user (if any) so the UI can show name + business +
 * audience type without a second round-trip.
 */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";

  let where = "";
  if (filter === "buyer") where = "WHERE u.is_dealer = 0";
  else if (filter === "dealer") where = "WHERE u.is_dealer = 1";
  else if (filter === "unknown") where = "WHERE i.matched_user_id IS NULL";

  const result = await db.execute(`
    SELECT
      i.id, i.from_phone, i.to_phone, i.body, i.received_at,
      i.matched_user_id, i.is_reply,
      u.display_name,
      u.first_name,
      u.last_name,
      u.is_dealer,
      d.business_name,
      d.instagram_handle
    FROM inbound_sms i
    LEFT JOIN users u ON u.id = i.matched_user_id
    LEFT JOIN dealers d ON d.user_id = u.id
    ${where}
    ORDER BY i.received_at DESC
    LIMIT 200
  `);

  return json(result.rows);
}

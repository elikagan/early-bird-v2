import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const result = await db.execute(
    `SELECT sb.*, m.name as market_name
     FROM sms_blasts sb
     LEFT JOIN markets m ON m.id = sb.market_id
     ORDER BY sb.created_at DESC
     LIMIT 50`
  );

  return json(result.rows);
}

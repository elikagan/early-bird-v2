import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const result = await db.execute({
    sql: `SELECT da.*, u.display_name as user_display_name, u.avatar_url as user_avatar
          FROM dealer_applications da
          JOIN users u ON u.id = da.user_id
          WHERE da.status = ?
          ORDER BY da.created_at DESC`,
    args: [status],
  });

  return json(result.rows);
}

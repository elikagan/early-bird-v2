import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const existing = await db.execute({
    sql: `SELECT id FROM favorites WHERE id = ? AND buyer_id = ?`,
    args: [id, user.id],
  });
  if (existing.rows.length === 0) return error("Favorite not found", 404);

  await db.execute({ sql: `DELETE FROM favorites WHERE id = ?`, args: [id] });
  return json({ deleted: true });
}

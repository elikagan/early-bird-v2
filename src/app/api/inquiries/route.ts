import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);

  const body = await request.json();
  const { item_id, message } = body;

  if (!item_id) return error("item_id is required");

  // Verify item exists
  const item = await db.execute({
    sql: `SELECT i.*, d.user_id as dealer_user_id FROM items i JOIN dealers d ON d.id = i.dealer_id WHERE i.id = ?`,
    args: [item_id],
  });
  if (item.rows.length === 0) return error("Item not found", 404);

  // Don't let a dealer inquire on their own item
  const itemRow = item.rows[0] as Record<string, unknown>;
  if (itemRow.dealer_user_id === user.id) {
    return error("Cannot inquire on your own item", 400);
  }

  const inquiryId = newId();
  await db.execute({
    sql: `INSERT INTO inquiries (id, item_id, buyer_id, message) VALUES (?, ?, ?, ?)`,
    args: [inquiryId, item_id, user.id, message || null],
  });

  // Auto-favorite the item (watching tab shows inquired items)
  await db.execute({
    sql: `INSERT OR IGNORE INTO favorites (id, buyer_id, item_id) VALUES (?, ?, ?)`,
    args: [newId(), user.id, item_id],
  });

  // SMS to dealer would fire here (Session 2C)

  const inquiry = await db.execute({
    sql: `SELECT * FROM inquiries WHERE id = ?`,
    args: [inquiryId],
  });
  return json(inquiry.rows[0], 201);
}

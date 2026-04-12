import type { InValue } from "@libsql/client";
import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function PATCH(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const body = await request.json();
  const updates: string[] = [];
  const args: InValue[] = [];

  if (body.business_name !== undefined) {
    updates.push("business_name = ?");
    args.push(body.business_name);
  }
  if (body.instagram_handle !== undefined) {
    updates.push("instagram_handle = ?");
    args.push(body.instagram_handle);
  }

  if (updates.length > 0) {
    args.push(user.dealer_id);
    await db.execute({
      sql: `UPDATE dealers SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });
  }

  // Payment methods (array of {method, enabled})
  if (Array.isArray(body.payment_methods)) {
    for (const pm of body.payment_methods) {
      await db.execute({
        sql: `INSERT INTO dealer_payment_methods (id, dealer_id, method, enabled)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(dealer_id, method) DO UPDATE SET enabled = excluded.enabled`,
        args: [newId(), user.dealer_id, pm.method, pm.enabled ? 1 : 0],
      });
    }
  }

  const updated = await db.execute({
    sql: `SELECT * FROM dealers WHERE id = ?`,
    args: [user.dealer_id],
  });

  const result = updated.rows[0] as Record<string, unknown>;

  const methods = await db.execute({
    sql: `SELECT method, enabled FROM dealer_payment_methods WHERE dealer_id = ?`,
    args: [user.dealer_id],
  });
  result.payment_methods = methods.rows;

  return json(result);
}

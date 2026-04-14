import db from "./db";
import { newId } from "./id";

export async function logAdminAction(
  adminPhone: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO admin_actions (id, admin_phone, action, entity_type, entity_id, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?::jsonb, now())`,
    args: [newId(), adminPhone, action, entityType, entityId, details ? JSON.stringify(details) : null],
  });
}

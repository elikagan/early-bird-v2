import db from "@/lib/db";

/**
 * Check if a user has a notification preference enabled.
 * Returns true if:
 *  - No preference row exists (default on)
 *  - Preference row exists with enabled = 1
 * Returns false only if preference row exists with enabled = 0.
 */
export async function shouldNotify(
  userId: string,
  prefKey: string
): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT enabled FROM notification_preferences WHERE user_id = ? AND key = ?`,
    args: [userId, prefKey],
  });

  if (result.rows.length === 0) return true; // default: on
  return (result.rows[0] as Record<string, unknown>).enabled === 1;
}

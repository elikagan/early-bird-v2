import db from "@/lib/db";
import { json, error } from "@/lib/api";

/**
 * GET /api/invite/check?code=XYZ
 * Lightweight check: is this invite code valid (exists and unused)?
 * Used by the invite page to show an error on load instead of
 * waiting for form submission.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) return error("Missing code", 400);

  // Multi-use invites stay valid forever (used_at is never set on
  // them); single-use invites stay valid only until used_at is set.
  const result = await db.execute({
    sql: `SELECT id, phone, multi_use FROM dealer_invites
          WHERE code = ?
            AND (multi_use = true OR used_at IS NULL)`,
    args: [code],
  });

  if (result.rows.length === 0) {
    return error("Invalid or expired invite", 404);
  }

  const row = result.rows[0] as Record<string, unknown>;
  // Phone is returned so the invite page can pre-fill it read-only
  // for admin-bound single-use invites. Multi-use invites are never
  // pre-bound to a phone (the same link is shared with many dealers),
  // so phone comes back null for those and the dealer enters it.
  return json({ valid: true, phone: (row.phone as string) || null });
}

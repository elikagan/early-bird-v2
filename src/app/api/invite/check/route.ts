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

  const result = await db.execute({
    sql: `SELECT id FROM dealer_invites WHERE code = ? AND used_at IS NULL`,
    args: [code],
  });

  if (result.rows.length === 0) {
    return error("Invalid or expired invite", 404);
  }

  return json({ valid: true });
}

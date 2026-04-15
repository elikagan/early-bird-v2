/**
 * Admin access check. Uses ADMIN_PHONES env var (comma-separated phone numbers).
 * Example: ADMIN_PHONES=+12135551234,+13105559876
 *
 * In non-production, the TEST_ADMIN_PHONE is also treated as admin so the QA
 * review tool's dev-login endpoint can mint an admin session. This is skipped
 * in production — see /api/auth/dev-login/route.ts, which is also prod-gated.
 */

export const TEST_ADMIN_PHONE = "+15550000003";

export function isAdmin(phone: string): boolean {
  const raw = process.env.ADMIN_PHONES || "";
  const phones = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (phones.includes(phone)) return true;

  // Dev-only test admin — mirrors the gate in /api/auth/dev-login
  if (process.env.NODE_ENV !== "production" && phone === TEST_ADMIN_PHONE) {
    return true;
  }

  return false;
}

/**
 * Admin access check. Uses ADMIN_PHONES env var (comma-separated phone numbers).
 * Example: ADMIN_PHONES=+12135551234,+13105559876
 *
 * In non-production, the TEST_ADMIN_PHONE is also treated as admin so the QA
 * review tool's dev-login endpoint can mint an admin session. This is skipped
 * in production — see /api/auth/dev-login/route.ts, which is also prod-gated.
 */

export const TEST_ADMIN_PHONE = "+15550000003";

// Test phone numbers used by /api/auth/dev-login. These have rows in
// the users table because dev-login created them, but they're not
// real phones — Pingram fails on them and they shouldn't ever appear
// as recipients of a blast.
export const TEST_PHONES: ReadonlyArray<string> = [
  "+15550000001",
  "+15550000002",
  TEST_ADMIN_PHONE,
];

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

/**
 * Phones that should never receive a blast: site admins (they wrote
 * the message) and the test users. Used by both the blast preview
 * count and the send path so the count matches what gets sent.
 */
export function blastExcludedPhones(): string[] {
  const adminRaw = process.env.ADMIN_PHONES || "";
  const admins = adminRaw.split(",").map((p) => p.trim()).filter(Boolean);
  return [...admins, ...TEST_PHONES];
}

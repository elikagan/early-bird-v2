/**
 * Admin access check. Uses ADMIN_PHONES env var (comma-separated phone numbers).
 * Example: ADMIN_PHONES=+12135551234,+13105559876
 */
export function isAdmin(phone: string): boolean {
  const raw = process.env.ADMIN_PHONES || "";
  const phones = raw.split(",").map((p) => p.trim()).filter(Boolean);
  return phones.includes(phone);
}

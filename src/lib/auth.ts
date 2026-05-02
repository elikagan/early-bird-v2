import db from "./db";
import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_dealer: number;
  dealer_id: string | null;
  business_name: string | null;
  instagram_handle: string | null;
}

export interface InitialUser extends SessionUser {}

/** Session cookie config — single source of truth */
export const SESSION_COOKIE_NAME = "eb_session";
export const SESSION_MAX_AGE = 10 * 365 * 24 * 60 * 60; // 10 years in seconds

/**
 * Cookie domain to use for the session cookie. We pin to ".earlybird.la"
 * in production so the cookie is shared between earlybird.la and
 * www.earlybird.la — without this, a session set on the apex isn't
 * sent to www (and vice versa), so users get silently logged out
 * whenever their browser autocompletes the "wrong" hostname.
 *
 * Returns undefined for localhost / Vercel preview deployments so
 * the cookie scopes to the exact host (which is what we want for
 * dev — localhost, *.vercel.app — since they don't share a parent).
 */
export function sessionCookieDomain(request: Request): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  const host = (request.headers.get("host") || "").toLowerCase();
  if (host === "earlybird.la" || host.endsWith(".earlybird.la")) {
    return ".earlybird.la";
  }
  return undefined;
}

/**
 * Read the session token from cookie first, then Authorization header.
 * Returns null if no valid session found.
 */
export async function getSession(
  request: Request
): Promise<SessionUser | null> {
  let token: string | null = null;

  // 1. Try cookie (primary — survives localStorage clears)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/eb_session=([^;]+)/);
    if (match) token = match[1];
  }

  // 2. Fall back to Authorization header (legacy / localStorage backup)
  if (!token) {
    const header = request.headers.get("Authorization");
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7);
    }
  }

  if (!token) return null;

  const result = await db.execute({
    sql: `
      SELECT
        u.id, u.phone, u.first_name, u.last_name,
        u.display_name, u.avatar_url, u.is_dealer,
        d.id as dealer_id, d.business_name, d.instagram_handle
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN dealers d ON d.user_id = u.id
      WHERE s.token = ? AND s.expires_at > now()
    `,
    args: [token],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as SessionUser;
}

/**
 * Resolve the initial user for the root layout (Server Component).
 * Reads the session cookie via next/headers and joins in early-access
 * grants so the AuthProvider can initialize with a real user and
 * skip the client-side /api/auth/me round-trip that was blocking
 * first paint across the whole app.
 */
export async function getInitialUser(): Promise<InitialUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionRes = await db.execute({
    sql: `
      SELECT
        u.id, u.phone, u.first_name, u.last_name,
        u.display_name, u.avatar_url, u.is_dealer,
        d.id as dealer_id, d.business_name, d.instagram_handle
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN dealers d ON d.user_id = u.id
      WHERE s.token = ? AND s.expires_at > now()
    `,
    args: [token],
  });
  if (sessionRes.rows.length === 0) return null;
  return sessionRes.rows[0] as unknown as InitialUser;
}

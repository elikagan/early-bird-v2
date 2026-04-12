import db from "./db";

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

/**
 * Read the session token from the Authorization header and return the user.
 * Returns null if no valid session found.
 */
export async function getSession(
  request: Request
): Promise<SessionUser | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
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

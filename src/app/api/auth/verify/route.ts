import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const body = await request.json();
  const { token } = body;

  if (!token) return error("token is required");

  // Look up token
  const result = await db.execute({
    sql: `SELECT * FROM auth_tokens WHERE token = ? AND used = 0 AND expires_at > now()`,
    args: [token],
  });

  if (result.rows.length === 0) {
    return error("Invalid or expired token", 401);
  }

  const authToken = result.rows[0] as Record<string, unknown>;
  const tokenType = (authToken.token_type as string) || "login";

  // Mark token as used
  await db.execute({
    sql: `UPDATE auth_tokens SET used = 1 WHERE id = ?`,
    args: [authToken.id as string],
  });

  // ── Phone change flow ──
  if (tokenType === "phone_change") {
    const userId = authToken.user_id as string;
    const newPhone = authToken.phone as string;

    if (!userId) return error("Invalid phone change token", 400);

    // Update the user's phone number
    await db.execute({
      sql: `UPDATE users SET phone = ? WHERE id = ?`,
      args: [newPhone, userId],
    });

    // Find the updated user for session creation
    const user = await db.execute({
      sql: `
        SELECT u.*, d.id as dealer_id, d.business_name
        FROM users u
        LEFT JOIN dealers d ON d.user_id = u.id
        WHERE u.id = ?
      `,
      args: [userId],
    });

    if (user.rows.length === 0) return error("User not found", 404);
    const userRow = user.rows[0] as Record<string, unknown>;

    // Create new session (old sessions still work, but this ensures the
    // redirect lands authenticated)
    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      args: [newId(), userId, sessionToken, expiresAt],
    });

    return json({
      session_token: sessionToken,
      phone_changed: true,
      user: {
        id: userRow.id,
        phone: newPhone,
        first_name: userRow.first_name,
        last_name: userRow.last_name,
        display_name: userRow.display_name,
        is_dealer: userRow.is_dealer,
        needs_onboarding: false,
      },
    });
  }

  // ── Normal login flow ──
  const user = await db.execute({
    sql: `
      SELECT u.*, d.id as dealer_id, d.business_name
      FROM users u
      LEFT JOIN dealers d ON d.user_id = u.id
      WHERE u.phone = ?
    `,
    args: [authToken.phone as string],
  });

  if (user.rows.length === 0) {
    return error("User not found", 404);
  }

  const userRow = user.rows[0] as Record<string, unknown>;

  // Create session (30-day expiry)
  const sessionToken = nanoid(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), userRow.id as string, sessionToken, expiresAt],
  });

  return json({
    session_token: sessionToken,
    user: {
      id: userRow.id,
      phone: userRow.phone,
      first_name: userRow.first_name,
      last_name: userRow.last_name,
      display_name: userRow.display_name,
      is_dealer: userRow.is_dealer,
      needs_onboarding: !userRow.display_name,
    },
  });
}

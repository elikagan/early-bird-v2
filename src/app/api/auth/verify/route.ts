import { NextResponse } from "next/server";
import db from "@/lib/db";
import { error } from "@/lib/api";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

/** Create a JSON response with the session cookie set */
function jsonWithCookie(data: Record<string, unknown>, sessionToken: string) {
  const res = NextResponse.json(data);
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

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

    // Create new session (10-year expiry — users stay logged in forever)
    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      args: [newId(), userId, sessionToken, expiresAt],
    });

    return jsonWithCookie({
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
    }, sessionToken);
  }

  // ── Early-access flow: buyer tapped a pre-shop share link and
  //    requested SMS verification. On redemption we grant them access
  //    to the specified market and return it so the client can route
  //    into /buy?market=[id]. ──
  if (tokenType === "early_access") {
    const userId = authToken.user_id as string;
    const marketId = authToken.market_id as string;
    if (!userId || !marketId) {
      return error("Invalid early-access token", 400);
    }

    // Idempotent grant
    await db.execute({
      sql: `INSERT INTO buyer_market_early_access (id, user_id, market_id, source)
            VALUES (?, ?, ?, 'share')
            ON CONFLICT(user_id, market_id) DO NOTHING`,
      args: [newId(), userId, marketId],
    });

    const user = await db.execute({
      sql: `
        SELECT u.*, d.id as dealer_id
        FROM users u
        LEFT JOIN dealers d ON d.user_id = u.id
        WHERE u.id = ?
      `,
      args: [userId],
    });
    if (user.rows.length === 0) return error("User not found", 404);
    const userRow = user.rows[0] as Record<string, unknown>;

    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      args: [newId(), userId, sessionToken, expiresAt],
    });

    return jsonWithCookie({
      session_token: sessionToken,
      early_access_market_id: marketId,
      user: {
        id: userRow.id,
        phone: userRow.phone,
        first_name: userRow.first_name,
        last_name: userRow.last_name,
        display_name: userRow.display_name,
        is_dealer: userRow.is_dealer,
        needs_onboarding: false,
      },
    }, sessionToken);
  }

  // ── Dealer invite flow ──
  if (tokenType === "dealer_invite") {
    const userId = authToken.user_id as string;
    if (!userId) return error("Invalid invite token", 400);

    const user = await db.execute({
      sql: `
        SELECT u.*, d.id as dealer_id
        FROM users u
        LEFT JOIN dealers d ON d.user_id = u.id
        WHERE u.id = ?
      `,
      args: [userId],
    });

    if (user.rows.length === 0) return error("User not found", 404);
    const userRow = user.rows[0] as Record<string, unknown>;

    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      args: [newId(), userRow.id as string, sessionToken, expiresAt],
    });

    return jsonWithCookie({
      session_token: sessionToken,
      dealer_invite: true,
      user: {
        id: userRow.id,
        phone: userRow.phone,
        first_name: userRow.first_name,
        last_name: userRow.last_name,
        display_name: userRow.display_name,
        is_dealer: userRow.is_dealer,
        needs_onboarding: false,
      },
    }, sessionToken);
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

  // Create session (10-year expiry — users stay logged in forever)
  const sessionToken = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), userRow.id as string, sessionToken, expiresAt],
  });

  // Pending-invite check: if an admin created a dealer invite bound to
  // this phone but the dealer hasn't redeemed yet, surface the code so
  // the client can route them to /invite/[code] to finish setup
  // instead of landing on /home as a plain buyer. Prevents the
  // "admin invited me but I somehow signed in the front door"
  // customer-service footgun.
  let pendingInviteCode: string | null = null;
  if (!userRow.dealer_id) {
    const pending = await db.execute({
      sql: `SELECT code FROM dealer_invites
            WHERE phone = ? AND used_at IS NULL
            ORDER BY created_at DESC LIMIT 1`,
      args: [authToken.phone as string],
    });
    if (pending.rows.length > 0) {
      pendingInviteCode = (pending.rows[0] as Record<string, unknown>)
        .code as string;
    }
  }

  return jsonWithCookie({
    session_token: sessionToken,
    pending_invite_code: pendingInviteCode,
    user: {
      id: userRow.id,
      phone: userRow.phone,
      first_name: userRow.first_name,
      last_name: userRow.last_name,
      display_name: userRow.display_name,
      is_dealer: userRow.is_dealer,
      needs_onboarding: !userRow.display_name,
    },
  }, sessionToken);
}

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { error } from "@/lib/api";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, sessionCookieDomain } from "@/lib/auth";
import { logEvent, EVT } from "@/lib/system-events";
import { normalizeUSPhone } from "@/lib/phone";
import { isValidShow } from "@/lib/shows";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, phone: bodyPhone, name, business_name, market_subscriptions } = body;

  // ── Validate code ──
  if (!code) return error("Invalid invite link");

  const invite = await db.execute({
    sql: `SELECT id, phone FROM dealer_invites WHERE code = ? AND used_at IS NULL`,
    args: [code],
  });
  if (invite.rows.length === 0) {
    return error("This invite link has expired or already been used", 410);
  }
  const inviteRow = invite.rows[0] as Record<string, unknown>;
  const inviteId = inviteRow.id as string;
  const invitePhone = (inviteRow.phone as string) || null;

  // ── Validate name + business_name ──
  if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 60) {
    return error("Name is required (max 60 characters)");
  }
  if (
    !business_name ||
    typeof business_name !== "string" ||
    business_name.trim().length < 1 ||
    business_name.trim().length > 60
  ) {
    return error("Business name is required (max 60 characters)");
  }

  // ── Validate market_subscriptions: required, min 1, all from the
  //    canonical show list. Dedupe to be safe. ──
  if (!Array.isArray(market_subscriptions) || market_subscriptions.length === 0) {
    return error("Pick at least one show you typically sell at");
  }
  const shows = Array.from(new Set(market_subscriptions.filter(isValidShow)));
  if (shows.length === 0) {
    return error("Pick at least one show you typically sell at");
  }

  // ── Resolve phone: admin-bound invite uses invite.phone (dealer
  // can't override); legacy invite without phone uses body.phone. ──
  let normalizedPhone: string;
  if (invitePhone) {
    normalizedPhone = invitePhone;
  } else {
    const result = normalizeUSPhone(bodyPhone);
    if (!result.ok) return error(result.reason);
    normalizedPhone = result.phone;
  }

  // ── Find or create user ──
  const userResult = await db.execute({
    sql: `SELECT u.id, d.id as dealer_id FROM users u LEFT JOIN dealers d ON d.user_id = u.id WHERE u.phone = ?`,
    args: [normalizedPhone],
  });

  let userId: string;

  if (userResult.rows.length === 0) {
    userId = newId();
    await db.execute({
      sql: `INSERT INTO users (id, phone, display_name, is_dealer) VALUES (?, ?, ?, 1)`,
      args: [userId, normalizedPhone, name.trim()],
    });
  } else {
    const row = userResult.rows[0] as Record<string, unknown>;
    if (row.dealer_id) {
      return error("You're already a dealer! Just sign in normally.");
    }
    userId = row.id as string;
    await db.execute({
      sql: `UPDATE users SET is_dealer = 1, display_name = COALESCE(NULLIF(display_name, ''), ?) WHERE id = ?`,
      args: [name.trim(), userId],
    });
  }

  // ── Create dealer record ──
  const dealerId = newId();
  await db.execute({
    sql: `INSERT INTO dealers (id, user_id, business_name, instagram_handle) VALUES (?, ?, ?, NULL)`,
    args: [dealerId, userId, business_name.trim()],
  });

  // ── Insert market subscriptions ──
  for (const show of shows) {
    await db.execute({
      sql: `INSERT INTO dealer_market_subscriptions (id, dealer_id, show_name) VALUES (?, ?, ?)`,
      args: [newId(), dealerId, show],
    });
  }

  // ── Mark invite as used ──
  await db.execute({
    sql: `UPDATE dealer_invites SET used_at = now(), used_by = ? WHERE id = ?`,
    args: [userId, inviteId],
  });

  // ── Create session directly — no magic-link SMS step. Invite code
  //    was the authorization artifact; phone was admin-verified; we
  //    trust this redemption and log the dealer in immediately. ──
  const sessionToken = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    args: [newId(), userId, sessionToken, expiresAt],
  });

  await logEvent({
    event_type: EVT.DEALER_APPLICATION_APPROVED,
    severity: "info",
    entity_type: "dealer",
    entity_id: dealerId,
    message: `Dealer redeemed invite and went live: ${business_name.trim()}`,
    payload: { user_id: userId, invite_id: inviteId, admin_bound: !!invitePhone, shows },
  });

  const res = NextResponse.json({
    ok: true,
    user_id: userId,
    dealer_id: dealerId,
  });
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    domain: sessionCookieDomain(request),
  });
  return res;
}

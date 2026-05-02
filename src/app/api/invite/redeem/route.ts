import { NextResponse } from "next/server";
import db from "@/lib/db";
import { error } from "@/lib/api";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, sessionCookieDomain } from "@/lib/auth";
import { logEvent, EVT } from "@/lib/system-events";
import { normalizeUSPhone } from "@/lib/phone";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, phone: bodyPhone, name, business_name } = body;

  // ── Validate code ──
  if (!code) return error("Invalid invite link");

  // Multi-use invites stay valid forever; single-use go 410 once
  // used_at is set. Either way, look up the row and read multi_use to
  // decide whether to mark it used at the end.
  const invite = await db.execute({
    sql: `SELECT id, phone, multi_use FROM dealer_invites
          WHERE code = ?
            AND (multi_use = true OR used_at IS NULL)`,
    args: [code],
  });
  if (invite.rows.length === 0) {
    return error("This invite link has expired or already been used", 410);
  }
  const inviteRow = invite.rows[0] as Record<string, unknown>;
  const inviteId = inviteRow.id as string;
  const invitePhone = (inviteRow.phone as string) || null;
  const isMultiUse = inviteRow.multi_use === true;

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

  // ── Resolve phone: admin-bound single-use invite uses invite.phone
  //    (dealer can't override); multi-use invites are never bound to a
  //    phone so the dealer enters their own. ──
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

  // ── Mark invite as used (single-use only) ──
  // Multi-use invites stay open. Per-redemption tracking happens via
  // the system_event we log below — that's the audit trail.
  if (!isMultiUse) {
    await db.execute({
      sql: `UPDATE dealer_invites SET used_at = now(), used_by = ? WHERE id = ?`,
      args: [userId, inviteId],
    });
  }

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
    payload: {
      user_id: userId,
      invite_id: inviteId,
      admin_bound: !!invitePhone,
      multi_use: isMultiUse,
    },
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

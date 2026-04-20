import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";
import { sendSMSWithLog } from "@/lib/sms";
import { composeEarlyAccess } from "@/lib/sms-templates";
import { getBaseUrl } from "@/lib/url";
import { normalizeUSPhone } from "@/lib/phone";
import { nanoid } from "nanoid";

// Same rate limit as the normal auth flow — 5 links per phone per hour.
// Generous enough for mistypes, tight enough to block harassment.
const MAX_LINKS_PER_HOUR = 5;

export async function POST(request: Request) {
  const body = await request.json();
  const { phone, name, market_id } = body;

  // ── Validate ──
  const phoneResult = normalizeUSPhone(phone);
  if (!phoneResult.ok) return error(phoneResult.reason);
  const normalizedPhone = phoneResult.phone;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return error("Name is required");
  }
  const trimmedName = name.trim().slice(0, 60);

  if (!market_id || typeof market_id !== "string") {
    return error("market_id is required");
  }

  // ── Confirm the market exists and isn't archived ──
  const marketCheck = await db.execute({
    sql: `SELECT id, name, archived FROM markets WHERE id = ?`,
    args: [market_id],
  });
  if (marketCheck.rows.length === 0) return error("Market not found", 404);
  const market = marketCheck.rows[0] as Record<string, unknown>;
  if (Number(market.archived ?? 0) === 1) return error("Market not available", 404);

  // ── Rate limit ──
  const recent = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM auth_tokens WHERE phone = ? AND created_at > now() - interval '1 hour'`,
    args: [normalizedPhone],
  });
  const recentCount = Number(
    (recent.rows[0] as Record<string, unknown>)?.n ?? 0
  );
  if (recentCount >= MAX_LINKS_PER_HOUR) {
    return error("Too many sign-in attempts. Try again in an hour.", 429);
  }

  // ── Upsert user. Set display_name only on first create so we don't
  //    overwrite a returning buyer's chosen name. ──
  const existing = await db.execute({
    sql: `SELECT id, display_name FROM users WHERE phone = ?`,
    args: [normalizedPhone],
  });

  let userId: string;
  if (existing.rows.length === 0) {
    userId = newId();
    await db.execute({
      sql: `INSERT INTO users (id, phone, display_name) VALUES (?, ?, ?)`,
      args: [userId, normalizedPhone, trimmedName],
    });
  } else {
    const row = existing.rows[0] as Record<string, unknown>;
    userId = row.id as string;
    if (!row.display_name) {
      await db.execute({
        sql: `UPDATE users SET display_name = ? WHERE id = ?`,
        args: [trimmedName, userId],
      });
    }
  }

  // ── Issue a magic-link token tagged with the market we're granting
  //    access to. /api/auth/verify picks up this token_type and
  //    inserts the grant row on redemption. ──
  const token = nanoid(16);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, expires_at, token_type, user_id, market_id)
          VALUES (?, ?, ?, ?, 'early_access', ?, ?)`,
    args: [newId(), normalizedPhone, token, expiresAt, userId, market_id],
  });

  const url = `${getBaseUrl(request)}/v/${token}`;
  await sendSMSWithLog(
    normalizedPhone,
    composeEarlyAccess(market.name as string, url),
    {
      event_type: "sms.early_access",
      entity_type: "user",
      entity_id: userId,
    }
  );

  return json({ ok: true });
}

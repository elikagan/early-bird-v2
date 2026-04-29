import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Sign in first", 401);

  const body = await request.json().catch(() => ({}));
  const marketId = String(body.market_id || "").trim();
  const responses = body.responses ?? {};

  if (!marketId) return error("market_id required");
  if (typeof responses !== "object" || Array.isArray(responses)) {
    return error("responses must be an object");
  }

  // Validate the market exists. We don't gate on archived/past — Eli
  // may want to collect feedback on an upcoming market for any reason.
  const m = await db.execute({
    sql: `SELECT id FROM markets WHERE id = ?`,
    args: [marketId],
  });
  if (m.rows.length === 0) return error("Market not found", 404);

  // Trim oversized text answers — defensive cap, the form already
  // enforces 2000 per textarea but a custom client could bypass.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(responses)) {
    if (typeof v === "string") {
      cleaned[k] = v.slice(0, 4000);
    } else if (typeof v === "number" || typeof v === "boolean") {
      cleaned[k] = v;
    }
  }

  const audience = user.is_dealer ? "dealer" : "buyer";

  // Upsert: one row per (user, market). Re-submission overwrites so a
  // user can edit their answers later via the same link.
  await db.execute({
    sql: `
      INSERT INTO feedback_responses (id, user_id, market_id, audience, responses, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?::jsonb, now(), now())
      ON CONFLICT (user_id, market_id) DO UPDATE
        SET responses = EXCLUDED.responses,
            audience = EXCLUDED.audience,
            updated_at = now()
    `,
    args: [newId(), user.id, marketId, audience, JSON.stringify(cleaned)],
  });

  // Audit trail in system_events so the admin Activity tab + recent-
  // events feed surface that feedback came in.
  await db.execute({
    sql: `INSERT INTO system_events (id, event_type, severity, entity_type, entity_id, message)
          VALUES (?, 'feedback.submitted', 'info', 'user', ?, ?)`,
    args: [
      newId(),
      user.id,
      `Feedback submitted (${audience}) for market ${marketId}`,
    ],
  }).catch(() => {});

  return json({ ok: true });
}

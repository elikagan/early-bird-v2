import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { sendSMSWithLog } from "@/lib/sms";
import { logEvent, EVT } from "@/lib/system-events";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";
import {
  resolveRecipients,
  type BlastKind,
} from "@/lib/scheduled-blasts";

const BLAST_TOKEN_EXPIRY_DAYS = 7;

/**
 * Fire the scheduled blast. Marks sent_at + counts so a second click
 * is a no-op.
 *
 * Per-recipient link:
 *   - dealer blasts  → /v/[fresh-token]?to=/sell      (signs into dealer view)
 *   - buyer blasts   → /v/[fresh-token]?to=/buy?market={id}  (signs into market feed)
 *
 * Tokens are 7-day login tokens so a busy dealer can tap the link
 * hours after delivery without hitting the 15-min default expiry.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;

  // Atomic "claim" — only one send ever succeeds.
  const claimed = await db.execute({
    sql: `UPDATE scheduled_blasts
          SET sent_at = now(), sent_by_admin = ?
          WHERE id = ? AND sent_at IS NULL
          RETURNING market_id, kind, proposed_copy`,
    args: [user.phone, id],
  });
  if (claimed.rows.length === 0) {
    return error("Blast not found or already sent", 409);
  }
  const claimedRow = claimed.rows[0] as Record<string, unknown>;
  const marketId = claimedRow.market_id as string;
  const kind = claimedRow.kind as BlastKind;
  const copy = claimedRow.proposed_copy as string;

  const marketRes = await db.execute({
    sql: `SELECT name FROM markets WHERE id = ?`,
    args: [marketId],
  });
  const marketName = (marketRes.rows[0] as Record<string, unknown>)
    ?.name as string;

  const host = request.headers.get("host") || "earlybird.la";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const originUrl = `${proto}://${host}`;

  const recipients = await resolveRecipients(kind, marketName);

  let sent = 0;
  let failed = 0;
  const errors: { phone: string; error: string }[] = [];

  const isDealerKind = kind !== "buyer_thursday";
  const toPath = isDealerKind ? "/sell" : `/buy?market=${marketId}`;

  for (let i = 0; i < recipients.length; i += 5) {
    const batch = recipients.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const token = nanoid(32);
        const expiresAt = new Date(
          Date.now() + BLAST_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();
        await db.execute({
          sql: `INSERT INTO auth_tokens (id, phone, token, token_type, expires_at)
                VALUES (?, ?, ?, 'login', ?)`,
          args: [newId(), r.phone, token, expiresAt],
        });
        const link = `${originUrl}/v/${token}?to=${encodeURIComponent(toPath)}`;
        const body = copy.replace(/\{link\}/g, link);
        return sendSMSWithLog(r.phone, body, {
          event_type: "sms.scheduled_blast",
          entity_type: "scheduled_blast",
          entity_id: id,
          meta: { kind, user_id: r.user_id },
        });
      })
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && (result.value as { ok: boolean }).ok) {
        sent++;
      } else {
        failed++;
        errors.push({
          phone: batch[idx].phone,
          error:
            result.status === "rejected"
              ? (result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason))
              : "send returned not-ok",
        });
      }
    });
  }

  await db.execute({
    sql: `UPDATE scheduled_blasts
          SET sent_count = ?, failed_count = ?
          WHERE id = ?`,
    args: [sent, failed, id],
  });

  await logEvent({
    event_type: EVT.SCHEDULED_BLAST_SENT,
    severity: failed === 0 ? "info" : "warn",
    entity_type: "scheduled_blast",
    entity_id: id,
    message: `${kind} for ${marketName}: ${sent} sent / ${failed} failed`,
    payload: {
      kind,
      market_id: marketId,
      sent,
      failed,
      errors: errors.slice(0, 20),
    },
  });

  return json({ sent, failed, total: recipients.length });
}

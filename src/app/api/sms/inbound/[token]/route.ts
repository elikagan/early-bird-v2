import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { newId } from "@/lib/id";

/**
 * Pingram SMS inbound webhook receiver. Pingram POSTs here whenever a
 * recipient replies to one of our outbound texts.
 *
 * Pingram doesn't sign webhooks. To stop randoms on the internet from
 * forging inbound SMS, the URL itself contains a secret token that
 * must match PINGRAM_WEBHOOK_TOKEN in env. Configure the URL once in
 * the Pingram dashboard; rotate the token by changing both env and
 * dashboard at the same time.
 *
 * Subscribed events: SMS_INBOUND (replies), and we'll also accept
 * SMS_DELIVERED + SMS_FAILED so we can answer "did the dealer
 * actually get my text" later. Other event types are ack'd-and-dropped.
 */

interface InboundPayload {
  eventType: string;
  from?: string;
  to?: string;
  text?: string;
  receivedAt?: string;
  isReply?: boolean;
  userId?: string;
  lastTrackingId?: string;
  trackingId?: string;
  notificationId?: string;
  failureCode?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const expected = process.env.PINGRAM_WEBHOOK_TOKEN;

  // Defense in depth: refuse if env var is unset, refuse if mismatch.
  // Without this check anyone who guessed the URL could pollute the
  // inbound_sms table.
  if (!expected || token !== expected) {
    return error("Forbidden", 403);
  }

  let body: InboundPayload;
  try {
    body = (await request.json()) as InboundPayload;
  } catch {
    return error("Invalid JSON", 400);
  }

  // Always log the event for ops visibility, regardless of type.
  await db
    .execute({
      sql: `INSERT INTO system_events (id, event_type, severity, message, payload)
            VALUES (?, ?, 'info', ?, ?::jsonb)`,
      args: [
        newId(),
        `pingram.${(body.eventType || "unknown").toLowerCase()}`,
        body.eventType || "unknown",
        JSON.stringify(body),
      ],
    })
    .catch(() => {});

  if (body.eventType !== "SMS_INBOUND") {
    // Delivery + failure events are useful to log but don't go in the
    // inbound_sms table — only actual replies do. 200 ack so Pingram
    // doesn't retry.
    return json({ ok: true, ignored: body.eventType });
  }

  if (!body.from || !body.to || typeof body.text !== "string") {
    return error("Missing required SMS_INBOUND fields", 400);
  }

  const fromPhone = body.from;
  const toPhone = body.to;
  const text = body.text;
  const receivedAt = body.receivedAt
    ? new Date(body.receivedAt).toISOString()
    : new Date().toISOString();

  // Match the sender to a registered user by phone (best-effort).
  const matchRes = await db.execute({
    sql: `SELECT id FROM users WHERE phone = ? LIMIT 1`,
    args: [fromPhone],
  });
  const matchedUserId =
    (matchRes.rows[0] as Record<string, unknown> | undefined)?.id ?? null;

  // Insert. ON CONFLICT DO NOTHING swallows duplicate retries from
  // Pingram (same number, same body, same exact timestamp).
  const id = newId();
  await db.execute({
    sql: `
      INSERT INTO inbound_sms (
        id, from_phone, to_phone, body, received_at,
        matched_user_id, pingram_user_id, pingram_tracking_id,
        is_reply, raw_payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
      ON CONFLICT (from_phone, received_at, body) DO NOTHING
    `,
    args: [
      id,
      fromPhone,
      toPhone,
      text,
      receivedAt,
      matchedUserId,
      body.userId ?? null,
      body.lastTrackingId ?? null,
      body.isReply === true,
      JSON.stringify(body),
    ],
  });

  return json({ ok: true });
}

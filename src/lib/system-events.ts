/**
 * Canonical logger for operationally-significant events.
 * Writes to the system_events table which the /admin Health tab and
 * the ops-check cron read from.
 *
 * Usage:
 *   await logEvent({
 *     event_type: "sms.inquiry",
 *     severity: "info",
 *     entity_type: "inquiry",
 *     entity_id: inquiryId,
 *     message: `Sent to dealer ${dealerPhone}`,
 *     payload: { dealerId, buyerId },
 *   });
 *
 * Never throws — logging failures should never break the caller's flow.
 */

import db from "@/lib/db";
import { newId } from "@/lib/id";

export type Severity = "info" | "warn" | "error";

export interface EventInput {
  event_type: string;
  severity: Severity;
  entity_type?: string | null;
  entity_id?: string | null;
  message?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function logEvent(evt: EventInput): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO system_events
              (id, event_type, severity, entity_type, entity_id, message, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId(),
        evt.event_type,
        evt.severity,
        evt.entity_type ?? null,
        evt.entity_id ?? null,
        evt.message ?? null,
        evt.payload ? JSON.stringify(evt.payload) : null,
      ],
    });
  } catch (err) {
    // Last-resort: don't let logging fail the caller. Console it so
    // Vercel's built-in logs catch it and Sentry instruments it.
    console.error("system_events insert failed:", err, evt);
  }
}

/**
 * Standard event type constants — central list so grepping + alerting
 * against event_type strings is reliable.
 */
export const EVT = {
  // SMS outcomes
  SMS_SENT: "sms.sent",
  SMS_FAILED: "sms.failed",
  SMS_RETRIED: "sms.retried",

  // Cron runs
  CRON_DROP_MARKETS_RAN: "cron.drop_markets.ran",
  CRON_OPS_CHECK_RAN: "cron.ops_check.ran",

  // Drop lifecycle
  DROP_FIRED: "drop.fired",
  DROP_MISSED: "drop.missed",

  // Auth
  AUTH_MAGIC_LINK_SENT: "auth.magic_link.sent",
  AUTH_MAGIC_LINK_RATE_LIMITED: "auth.magic_link.rate_limited",
  AUTH_VERIFY_SUCCESS: "auth.verify.success",
  AUTH_VERIFY_FAILURE: "auth.verify.failure",

  // Business events
  INQUIRY_CREATED: "inquiry.created",
  ITEM_POSTED: "item.posted",
  ITEM_SOLD: "item.sold",
  DEALER_APPLICATION_SUBMITTED: "dealer_application.submitted",
  DEALER_APPLICATION_APPROVED: "dealer_application.approved",

  // Ops alerts
  OPS_ALERT_FIRED: "ops.alert_fired",
  OPS_HEALTH_CHECK: "ops.health_check",
} as const;

export type EventType = (typeof EVT)[keyof typeof EVT];

/**
 * Daily cron. For every upcoming non-archived market, check whether
 * today lands on a trigger day (6 days before = "Monday", 3 days
 * before = "Thursday" for a Sunday show) and queue the corresponding
 * pending blast(s).
 *
 * Each queue insert has ON CONFLICT DO NOTHING so the cron is
 * idempotent — running twice in a day (or re-running after a transient
 * failure) doesn't double-queue.
 *
 * When a blast is freshly queued, text the admin phones with a
 * review link. Admin opens the link, edits the copy if they want,
 * then presses Send.
 *
 * Scheduled in vercel.json at 18:00 UTC (~11am PDT / 10am PST),
 * comfortably after LA workday start so Eli doesn't miss the text.
 */

import db from "@/lib/db";
import { json } from "@/lib/api";
import { logEvent, EVT } from "@/lib/system-events";
import { sendSMSWithLog } from "@/lib/sms";
import { composeScheduledBlastReady } from "@/lib/sms-templates";
import { nanoid } from "nanoid";
import { newId } from "@/lib/id";
import {
  laDayDiff,
  triggersForDays,
  queueBlast,
  resolveRecipients,
  BLAST_KIND_LABELS,
  type BlastKind,
} from "@/lib/scheduled-blasts";
import { getBaseUrl } from "@/lib/url";

export async function GET(request: Request) {
  const checked: Array<{
    market_id: string;
    market_name: string;
    days: number;
    queued: string[];
  }> = [];

  const markets = await db.execute({
    sql: `SELECT id, name, starts_at FROM markets
          WHERE (archived IS NULL OR archived = 0)
            AND status != 'closed'
            AND starts_at > now() - interval '1 day'
          ORDER BY starts_at ASC`,
    args: [],
  });

  const adminPhones = (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const baseUrl = getBaseUrl(request);

  for (const row of markets.rows) {
    const m = row as Record<string, unknown>;
    const marketId = m.id as string;
    const marketName = m.name as string;
    const startsAt = m.starts_at as string;
    const days = laDayDiff(startsAt);
    const triggers = triggersForDays(days);
    const queued: string[] = [];

    for (const kind of triggers) {
      const res = await queueBlast(marketId, marketName, startsAt, kind);
      if (!res || !res.inserted) continue;
      queued.push(kind);

      // Fresh queue — notify admins with a fresh-token review link so
      // they can tap it on their phone without re-authenticating.
      const recipients = await resolveRecipients(kind, marketName);
      const label = BLAST_KIND_LABELS[kind];

      await logEvent({
        event_type: EVT.SCHEDULED_BLAST_QUEUED,
        severity: "info",
        entity_type: "scheduled_blast",
        entity_id: res.id,
        message: `${label} queued for ${marketName} (${recipients.length} recipients)`,
        payload: { market_id: marketId, kind, recipient_count: recipients.length },
      });

      for (const phone of adminPhones) {
        const token = nanoid(32);
        const expiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        await db.execute({
          sql: `INSERT INTO auth_tokens (id, phone, token, token_type, expires_at)
                VALUES (?, ?, ?, 'login', ?)`,
          args: [newId(), phone, token, expiresAt],
        });
        const reviewUrl = `${baseUrl}/v/${token}?to=/admin/blast/pending/${res.id}`;
        await sendSMSWithLog(
          phone,
          composeScheduledBlastReady(label, marketName, recipients.length, reviewUrl),
          {
            event_type: "sms.scheduled_blast.ready",
            entity_type: "scheduled_blast",
            entity_id: res.id,
            meta: { kind, market_id: marketId },
          }
        );
      }
    }

    checked.push({ market_id: marketId, market_name: marketName, days, queued });
  }

  await logEvent({
    event_type: EVT.CRON_SCHEDULE_BLASTS_RAN,
    severity: "info",
    entity_type: "cron",
    entity_id: null,
    message: `schedule-blasts checked ${checked.length} markets`,
    payload: { checked },
  });

  return json({ ok: true, checked });
}

// Allow POST for manual triggers from the admin page without a body.
export async function POST(request: Request) {
  return GET(request);
}

// Pull in the correct blast-kind typing so the imported list compiles.
export type { BlastKind };

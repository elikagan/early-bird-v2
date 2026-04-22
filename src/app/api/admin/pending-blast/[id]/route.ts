import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  resolveRecipients,
  BLAST_KIND_LABELS,
  type BlastKind,
} from "@/lib/scheduled-blasts";

interface ScheduledBlastRow {
  id: string;
  market_id: string;
  kind: BlastKind;
  proposed_copy: string;
  queued_at: string;
  sent_at: string | null;
  sent_count: number | null;
  failed_count: number | null;
  market_name: string;
  market_starts_at: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;

  const rowRes = await db.execute({
    sql: `SELECT sb.id, sb.market_id, sb.kind, sb.proposed_copy, sb.queued_at,
                 sb.sent_at, sb.sent_count, sb.failed_count,
                 m.name AS market_name, m.starts_at AS market_starts_at
          FROM scheduled_blasts sb
          JOIN markets m ON m.id = sb.market_id
          WHERE sb.id = ?`,
    args: [id],
  });

  if (rowRes.rows.length === 0) {
    return error("Pending blast not found", 404);
  }

  const row = rowRes.rows[0] as unknown as ScheduledBlastRow;
  const recipients = await resolveRecipients(row.kind, row.market_name);

  return json({
    id: row.id,
    market_id: row.market_id,
    market_name: row.market_name,
    market_starts_at: row.market_starts_at,
    kind: row.kind,
    kind_label: BLAST_KIND_LABELS[row.kind],
    proposed_copy: row.proposed_copy,
    queued_at: row.queued_at,
    sent_at: row.sent_at,
    sent_count: row.sent_count,
    failed_count: row.failed_count,
    recipient_count: recipients.length,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const { id } = await params;
  const body = await request.json();
  const copy = body.proposed_copy;
  if (typeof copy !== "string" || copy.length === 0) {
    return error("proposed_copy is required");
  }
  if (!copy.includes("{link}")) {
    return error(
      "Message must include {link} — that's where each recipient's personalized link goes"
    );
  }

  await db.execute({
    sql: `UPDATE scheduled_blasts SET proposed_copy = ?
          WHERE id = ? AND sent_at IS NULL`,
    args: [copy, id],
  });

  return json({ ok: true });
}

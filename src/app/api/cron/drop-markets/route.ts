/**
 * Cron job — flip markets from 'upcoming' to 'live' at their drop_at,
 * then SMS everyone who follows the market with drop alerts enabled.
 *
 * Scheduled by vercel.json. Vercel Cron sends requests with an
 * Authorization: Bearer <CRON_SECRET> header. The CRON_SECRET env var
 * is automatically provided by Vercel when crons are configured.
 *
 * Idempotent: the atomic UPDATE claims the market by setting
 * drop_notified_at = now(). If it returns no rows, someone else already
 * fired the drop for this market; we skip.
 */

import { NextResponse, after } from "next/server";
import db from "@/lib/db";
import { sendSMS } from "@/lib/sms";
import { composeDropAlert } from "@/lib/sms-templates";
import { getBaseUrl } from "@/lib/url";

export async function GET(request: Request) {
  // Auth: only Vercel Cron (or someone with the secret) can fire this.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Find markets whose drop_at has passed but the drop hasn't fired yet.
  const due = await db.execute({
    sql: `SELECT id, name FROM markets
          WHERE drop_at <= now()
            AND drop_notified_at IS NULL
            AND status = 'upcoming'`,
    args: [],
  });

  const results: Array<{
    market_id: string;
    market_name: string;
    notified: number;
    failed: number;
    skipped_already_fired: boolean;
  }> = [];

  for (const row of due.rows) {
    const marketId = (row as Record<string, unknown>).id as string;
    const marketName = (row as Record<string, unknown>).name as string;

    // Atomic claim: only the request that actually flips the column wins.
    // Guards against duplicate sends on cron retries / concurrent runs.
    const claimed = await db.execute({
      sql: `UPDATE markets
            SET status = 'live', drop_notified_at = now()
            WHERE id = ? AND drop_notified_at IS NULL AND status = 'upcoming'
            RETURNING id`,
      args: [marketId],
    });

    if (claimed.rows.length === 0) {
      results.push({
        market_id: marketId,
        market_name: marketName,
        notified: 0,
        failed: 0,
        skipped_already_fired: true,
      });
      continue;
    }

    // Recipient list: followers with drop_alerts_enabled for this market
    // AND no user-level drop_alerts opt-out. 'shouldNotify' equivalent
    // inlined as a single query so we send in batches.
    const recipients = await db.execute({
      sql: `
        SELECT u.id, u.phone
        FROM buyer_market_follows bmf
        JOIN users u ON u.id = bmf.buyer_id
        LEFT JOIN notification_preferences np
          ON np.user_id = u.id AND np.key = 'drop_alerts'
        WHERE bmf.market_id = ?
          AND bmf.drop_alerts_enabled = 1
          AND (np.enabled IS NULL OR np.enabled = 1)
      `,
      args: [marketId],
    });

    // Counts for the SMS copy
    const counts = await db.execute({
      sql: `
        SELECT
          (SELECT COUNT(*) FROM items WHERE market_id = ? AND status != 'deleted') AS item_count,
          (SELECT COUNT(DISTINCT dealer_id) FROM items WHERE market_id = ? AND status != 'deleted') AS dealer_count
      `,
      args: [marketId, marketId],
    });
    const c = counts.rows[0] as Record<string, unknown>;
    const itemCount = Number(c.item_count ?? 0);
    const dealerCount = Number(c.dealer_count ?? 0);

    const url = `${getBaseUrl(request)}/buy?market=${marketId}`;
    const body = composeDropAlert(marketName, itemCount, dealerCount, url);

    const phones = recipients.rows.map(
      (r) => (r as Record<string, unknown>).phone as string
    );

    // SMS batch happens after() the response goes out so the Vercel
    // function doesn't hold the HTTP connection open while dozens /
    // hundreds of sends run. The DB is already in 'live + notified'
    // state by this point, so re-runs are safely idempotent.
    after(async () => {
      for (let i = 0; i < phones.length; i += 5) {
        const batch = phones.slice(i, i + 5);
        await Promise.allSettled(batch.map((p) => sendSMS(p, body)));
      }
    });

    results.push({
      market_id: marketId,
      market_name: marketName,
      notified: phones.length,
      failed: 0, // filled in-band isn't possible when sending via after()
      skipped_already_fired: false,
    });
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    markets_checked: due.rows.length,
    results,
  });
}

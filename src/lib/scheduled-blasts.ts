import db from "@/lib/db";
import { newId } from "@/lib/id";
import { showForMarket, marketReminderKey } from "@/lib/shows";

export type BlastKind =
  | "dealer_monday"
  | "dealer_thursday"
  | "buyer_thursday";

export const BLAST_KIND_LABELS: Record<BlastKind, string> = {
  dealer_monday: "Dealer reminder (Monday before)",
  dealer_thursday: "Dealer reminder (Thursday before)",
  buyer_thursday: "Buyer reminder (Thursday before)",
};

/**
 * Calendar-day distance (in LA time) from today to the market start.
 * 0 = today, 1 = tomorrow, 6 = six days out, etc. Negative = past.
 * Using LA-local days so "Sunday's show triggers on Monday / Thursday"
 * stays true even when the UTC date has rolled over.
 */
export function laDayDiff(marketStartsAtIso: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parse = (d: Date): number => {
    const [m, dd, y] = fmt.format(d).split("/").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round(
    (parse(new Date(marketStartsAtIso)) - parse(new Date())) /
      (1000 * 60 * 60 * 24)
  );
}

/**
 * Which blast kinds should trigger today for a given distance in days?
 * Sunday show:
 *   - Monday (6 days out) → dealer_monday
 *   - Thursday (3 days out) → dealer_thursday + buyer_thursday
 */
export function triggersForDays(days: number): BlastKind[] {
  if (days === 6) return ["dealer_monday"];
  if (days === 3) return ["dealer_thursday", "buyer_thursday"];
  return [];
}

/**
 * Default text the admin sees pre-filled. Placeholder `{link}` gets
 * swapped for each recipient's personalized URL at send time.
 */
export function defaultCopy(
  kind: BlastKind,
  marketName: string,
  shortDate: string
): string {
  switch (kind) {
    case "dealer_monday":
      return `Early Bird: ${marketName} is this Sunday ${shortDate}. We're starting to send buyers to the app Thursday to pre-shop — please post at least 3 pieces by then (one photo, title, and price each is all you need): {link}`;
    case "dealer_thursday":
      return `Early Bird: ${marketName} is Sunday ${shortDate}. Buyers are pre-shopping the app now. Make sure your items are posted: {link}`;
    case "buyer_thursday":
      return `Early Bird: ${marketName} is this Sunday ${shortDate}. Start pre-shopping now: {link}`;
  }
}

/**
 * Short "4.26" style date pinned to LA so the copy never says the
 * wrong day for a traveling admin.
 */
export function shortDateLA(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", {
    month: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const day = d.toLocaleString("en-US", {
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  return `${month}.${day}`;
}

export interface Recipient {
  phone: string;
  user_id?: string;
}

/**
 * Returns the recipient list for a specific blast kind + market.
 *
 * Dealer blasts key off dealer_market_subscriptions (by show name —
 * so "Rose Bowl Flea Market April 2026" pulls every dealer who said
 * they sell at "Rose Bowl").
 *
 * Buyer blasts key off notification_preferences.market_reminder_<slug>
 * (explicit opt-in, one key per show).
 */
export async function resolveRecipients(
  kind: BlastKind,
  marketName: string
): Promise<Recipient[]> {
  const showName = showForMarket(marketName);
  if (!showName) return [];

  if (kind === "dealer_monday" || kind === "dealer_thursday") {
    // dealer_market_subscriptions retired with the persistent-booth model.
    // For now scheduled dealer blasts have no recipient list — manual
    // admin blasts cover the use case. If we revive scheduled dealer
    // blasts later, scope by booth_settings history for this show name.
    void showName;
    return [];
  }

  const key = marketReminderKey(showName);
  const res = await db.execute({
    sql: `SELECT u.id AS user_id, u.phone
          FROM users u
          JOIN notification_preferences np ON np.user_id = u.id
          WHERE np.key = ? AND np.enabled = 1 AND u.phone IS NOT NULL`,
    args: [key],
  });
  return res.rows.map((r) => ({
    phone: r.phone as string,
    user_id: r.user_id as string,
  }));
}

/**
 * Queue a pending blast if one isn't already queued for this
 * (market, kind). Returns the blast id (new or existing).
 */
export async function queueBlast(
  marketId: string,
  marketName: string,
  startsAt: string,
  kind: BlastKind
): Promise<{ id: string; inserted: boolean } | null> {
  const copy = defaultCopy(kind, marketName, shortDateLA(startsAt));
  const id = newId();
  const result = await db.execute({
    sql: `INSERT INTO scheduled_blasts (id, market_id, kind, proposed_copy)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (market_id, kind) DO NOTHING
          RETURNING id`,
    args: [id, marketId, kind, copy],
  });
  if (result.rows.length === 0) {
    // Already queued. Return existing id.
    const existing = await db.execute({
      sql: `SELECT id FROM scheduled_blasts WHERE market_id = ? AND kind = ?`,
      args: [marketId, kind],
    });
    return existing.rows.length > 0
      ? { id: (existing.rows[0] as Record<string, unknown>).id as string, inserted: false }
      : null;
  }
  return { id: (result.rows[0] as Record<string, unknown>).id as string, inserted: true };
}

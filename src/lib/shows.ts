// Canonical list of LA flea market shows dealers can subscribe to.
// These are the *show series* (recurring events), not individual market
// instances. When a dealer says they sell at "Rose Bowl" that applies
// to every future Rose Bowl market, not just one date.
//
// Hardcoded for now — if/when we add a 5th show, flip this to a DB
// table and an admin editor.
export const SHOWS = [
  "Downtown Modernism",
  "Rose Bowl",
  "Long Beach",
  "Palm Springs",
] as const;

export type ShowName = (typeof SHOWS)[number];

export function isValidShow(s: unknown): s is ShowName {
  return typeof s === "string" && (SHOWS as readonly string[]).includes(s);
}

/**
 * notification_preferences key for buyer-side opt-in to a specific
 * show's pre-market reminder SMS. e.g. "Rose Bowl" →
 * "market_reminder_rose_bowl". One key per show so a buyer can pick
 * and choose. Dealers don't use this — they're auto-subscribed to
 * any show they have a booth at.
 */
export function marketReminderKey(show: ShowName): string {
  return `market_reminder_${show.toLowerCase().replace(/ /g, "_")}`;
}

/**
 * Given a market NAME (e.g. "Rose Bowl Flea Market"), return the
 * canonical show name it belongs to (e.g. "Rose Bowl"), or null if
 * the market name doesn't map to any known show. Simple prefix match
 * since our market names all start with the show name.
 */
export function showForMarket(marketName: string): ShowName | null {
  for (const show of SHOWS) {
    if (marketName === show || marketName.startsWith(show)) return show;
  }
  return null;
}

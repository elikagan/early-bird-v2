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

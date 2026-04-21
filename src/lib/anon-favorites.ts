/**
 * Anonymous (pre-signup) favorite storage.
 *
 * Buyers can favorite items without an account — state lives in
 * localStorage under `eb_anon_favorites` as a JSON array of item IDs.
 * On their first authenticated session (via the inquiry flow), the
 * AuthProvider drains the list into real /api/favorites rows.
 */

const KEY = "eb_anon_favorites";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function write(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    // storage blocked — silently drop
  }
}

export function getAnonFavorites(): Set<string> {
  return read();
}

export function hasAnonFavorite(itemId: string): boolean {
  return read().has(itemId);
}

export function addAnonFavorite(itemId: string): void {
  const set = read();
  set.add(itemId);
  write(set);
}

export function removeAnonFavorite(itemId: string): void {
  const set = read();
  set.delete(itemId);
  write(set);
}

export function clearAnonFavorites(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // swallow
  }
}

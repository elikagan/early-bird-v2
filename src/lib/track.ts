import db from "./db";
import { newId } from "./id";

/**
 * Fire-and-forget page view log. Writes to the existing system_events
 * table with event_type='page.view'. Safe to call from Server
 * Components — we don't await it, so a slow insert never slows the
 * page render.
 *
 * The /api/cron/prune-events job already rotates old system_events,
 * so no extra retention plumbing is needed.
 */
export function logPageView(opts: {
  path: string;
  referer?: string | null;
  userAgent?: string | null;
  userId?: string | null;
}): void {
  const id = newId();
  const payload = {
    path: opts.path,
    referer: opts.referer || null,
    user_agent: opts.userAgent || null,
  };
  // Filter crawlers so the count reflects real humans. Cheap UA-prefix
  // check; misses sophisticated bots but stops Googlebot etc.
  const ua = (opts.userAgent || "").toLowerCase();
  if (
    ua.includes("bot") ||
    ua.includes("crawler") ||
    ua.includes("spider") ||
    ua.includes("preview") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("headless")
  ) {
    return;
  }
  db.execute({
    sql: `INSERT INTO system_events (id, event_type, severity, entity_type, entity_id, payload)
          VALUES (?, 'page.view', 'info', ?, ?, ?::jsonb)`,
    args: [
      id,
      opts.userId ? "user" : null,
      opts.userId || null,
      JSON.stringify(payload),
    ],
  }).catch(() => {});
}

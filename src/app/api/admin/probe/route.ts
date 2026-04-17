/**
 * Admin-triggered "probe everything" — fires the ops-check cron on
 * demand. Returns the result inline so the admin dashboard can show
 * what was checked.
 */

import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getBaseUrl } from "@/lib/url";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  if (!process.env.CRON_SECRET) {
    return error("CRON_SECRET not configured", 500);
  }

  const res = await fetch(`${getBaseUrl(request)}/api/cron/ops-check`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  const body = await res.json().catch(() => ({}));
  return json({ ok: res.ok, status: res.status, body });
}

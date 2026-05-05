import { redirect } from "next/navigation";

/**
 * /buy was the catalog browser before the home merge. The home page
 * is now the canonical feed for everyone (anon + signed-in), so this
 * route is just a 308 redirect for legacy bookmarks and any old
 * external links that still point here. The bottom nav already
 * targets /, so no internal callers remain.
 */
export default function BuyRedirect() {
  redirect("/");
}

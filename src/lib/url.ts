/**
 * Get the app's base URL from the incoming request headers.
 * Falls back to NEXT_PUBLIC_APP_URL env var, then earlybird.la.
 */
export function getBaseUrl(request: Request): string {
  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "https://earlybird.la").trim();
}

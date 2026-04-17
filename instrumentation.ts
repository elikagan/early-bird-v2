// Next.js instrumentation hook — registers the Sentry SDK for both
// the Node runtime (API routes, server components) and the edge
// runtime (middleware).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Exports Sentry's helper for capturing request errors in the App
// Router so React-side throws get surfaced.
export { captureRequestError as onRequestError } from "@sentry/nextjs";

// Runs in the browser. Captures unhandled errors, user interactions,
// and route-change events from the React tree.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sample rate for performance/trace events. 10% keeps the Sentry
  // free tier well-clear while still giving representative samples.
  tracesSampleRate: 0.1,
  // Always capture errors (not sampled).
  // Replay only on errors — avoids wasteful session recordings.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  // Don't send events from localhost dev unless explicitly opted in.
  enabled: process.env.NODE_ENV === "production",
});

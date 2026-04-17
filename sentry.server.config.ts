// Runs in Next.js server-side code — API routes, server components,
// server actions. Captures any unhandled throw + instrumented errors.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});

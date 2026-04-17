/**
 * TEMPORARY — throws an intentional error so we can verify Sentry is
 * capturing runtime exceptions. Delete after Sentry's Issues page
 * confirms the event was received.
 *
 * Gated behind a ?key= query param match so randos can't trigger a
 * million Sentry events.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (key !== process.env.CRON_SECRET) {
    return new Response("Not found", { status: 404 });
  }

  throw new Error(
    `Early Bird Sentry smoke-test @ ${new Date().toISOString()}`
  );
}

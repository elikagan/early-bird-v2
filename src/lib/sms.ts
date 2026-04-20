/**
 * SMS provider — Pingram.
 *
 * 10DLC approved as of April 20, 2026 (A2P registration). The sending
 * number is bound to the API key on Pingram's side, so the app never
 * specifies a FROM number. Falls back to a console stub when
 * PINGRAM_API_KEY is unset so local dev doesn't require credentials.
 */

export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

class PingramSmsProvider implements SmsProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(to: string, body: string): Promise<void> {
    const res = await fetch("https://api.pingram.io/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "sms",
        to: { id: to, number: to },
        sms: { message: body },
        forceChannels: ["SMS"],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Pingram SMS failed:", res.status, errBody);
      throw new Error(`SMS delivery failed: ${res.status}`);
    }
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string): Promise<void> {
    console.log(`\n[SMS STUB] To: ${to}`);
    console.log(`[SMS STUB] Body: ${body}\n`);
  }
}

function createProvider(): SmsProvider {
  const apiKey = process.env.PINGRAM_API_KEY;
  if (!apiKey) {
    console.warn("PINGRAM_API_KEY not set, SMS will log to console only");
    return new ConsoleSmsProvider();
  }
  return new PingramSmsProvider(apiKey);
}

const provider: SmsProvider = createProvider();

export async function sendSMS(to: string, body: string): Promise<void> {
  return provider.send(to, body);
}

/**
 * Send SMS with retry (up to 2 re-tries with exponential backoff) and
 * full observability logging via system_events.
 *
 * Use this instead of the bare sendSMS() for any caller-code that
 * cares about reliability + visibility. Transient Pingram blips no
 * longer lose texts; every attempt + outcome lands in the ops log.
 *
 * Returns { ok, attempts, error } so the caller can decide whether a
 * failure is fatal (e.g. verify SMS) or best-effort (e.g. drop blast).
 */
interface SmsCallContext {
  event_type: string; // e.g. "sms.inquiry" — scoped per call-site
  entity_type?: string | null;
  entity_id?: string | null;
  meta?: Record<string, unknown>;
}

interface SmsOutcome {
  ok: boolean;
  attempts: number;
  error?: string;
}

export async function sendSMSWithLog(
  to: string,
  body: string,
  ctx: SmsCallContext
): Promise<SmsOutcome> {
  // Lazy-import to avoid a circular dep with @/lib/db at module load.
  const { logEvent, EVT } = await import("@/lib/system-events");

  const MAX_ATTEMPTS = 3; // initial + 2 retries
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await provider.send(to, body);
      await logEvent({
        event_type: EVT.SMS_SENT,
        severity: "info",
        entity_type: ctx.entity_type ?? null,
        entity_id: ctx.entity_id ?? null,
        message: `Sent to ${to} via ${ctx.event_type}`,
        payload: { to, attempts: attempt, sub_event: ctx.event_type, ...ctx.meta },
      });
      return { ok: true, attempts: attempt };
    } catch (err) {
      lastErr = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      // Log the retry attempt (info) if we have more tries left
      if (attempt < MAX_ATTEMPTS) {
        await logEvent({
          event_type: EVT.SMS_RETRIED,
          severity: "warn",
          entity_type: ctx.entity_type ?? null,
          entity_id: ctx.entity_id ?? null,
          message: `Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${errMsg}`,
          payload: { to, attempt, error: errMsg, sub_event: ctx.event_type, ...ctx.meta },
        });
        // Exponential backoff: 500ms, 1500ms
        await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt - 1)));
      }
    }
  }

  const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  await logEvent({
    event_type: EVT.SMS_FAILED,
    severity: "error",
    entity_type: ctx.entity_type ?? null,
    entity_id: ctx.entity_id ?? null,
    message: `All ${MAX_ATTEMPTS} attempts failed: ${errMsg}`,
    payload: { to, attempts: MAX_ATTEMPTS, error: errMsg, sub_event: ctx.event_type, ...ctx.meta },
  });
  return { ok: false, attempts: MAX_ATTEMPTS, error: errMsg };
}

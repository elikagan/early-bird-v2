/**
 * SMS provider abstraction.
 *
 * Supports Pingram (current) and Telnyx (pending 10DLC approval).
 * Switch by setting SMS_PROVIDER=telnyx in .env.local once the
 * Telnyx 10DLC campaign is MNO_APPROVED.
 *
 * See SMS_PROVIDERS.md for full history and switchover instructions.
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

class TelnyxSmsProvider implements SmsProvider {
  private apiKey: string;
  private fromNumber: string;
  private profileId: string | undefined;

  constructor(apiKey: string, fromNumber: string, profileId?: string) {
    this.apiKey = apiKey;
    this.fromNumber = fromNumber;
    this.profileId = profileId;
  }

  async send(to: string, body: string): Promise<void> {
    const payload: Record<string, string> = {
      from: this.fromNumber,
      to,
      text: body,
    };
    if (this.profileId) {
      payload.messaging_profile_id = this.profileId;
    }

    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Telnyx SMS failed:", res.status, errBody);
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

// ─── Provider selection ───────────────────────────────────────

function createProvider(): SmsProvider {
  const which = (process.env.SMS_PROVIDER || "pingram").toLowerCase();

  if (which === "telnyx") {
    const apiKey = process.env.TELNYX_API_KEY;
    const from = process.env.TELNYX_FROM_NUMBER;
    if (!apiKey || !from) {
      console.warn("TELNYX_API_KEY or TELNYX_FROM_NUMBER not set, falling back to console");
      return new ConsoleSmsProvider();
    }
    const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID;
    console.log(`SMS provider: Telnyx (from ${from})`);
    return new TelnyxSmsProvider(apiKey, from, profileId);
  }

  if (which === "pingram") {
    const apiKey = process.env.PINGRAM_API_KEY;
    if (!apiKey) {
      console.warn("PINGRAM_API_KEY not set, SMS will log to console only");
      return new ConsoleSmsProvider();
    }
    console.log("SMS provider: Pingram");
    return new PingramSmsProvider(apiKey);
  }

  console.warn(`Unknown SMS_PROVIDER "${which}", falling back to console`);
  return new ConsoleSmsProvider();
}

const provider: SmsProvider = createProvider();

export async function sendSMS(to: string, body: string): Promise<void> {
  return provider.send(to, body);
}

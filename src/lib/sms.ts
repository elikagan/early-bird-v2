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

const apiKey = process.env.PINGRAM_API_KEY;
const provider: SmsProvider = apiKey
  ? new PingramSmsProvider(apiKey)
  : new ConsoleSmsProvider();

if (!apiKey) {
  console.warn("PINGRAM_API_KEY not set, SMS will log to console only");
}

export async function sendSMS(to: string, body: string): Promise<void> {
  return provider.send(to, body);
}

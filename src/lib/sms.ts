export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string): Promise<void> {
    console.log(`\n╔═══════════���══════════════════════════════╗`);
    console.log(`║  [SMS] To: ${to.padEnd(28)} ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    for (const line of body.match(/.{1,40}/g) || [body]) {
      console.log(`║  ${line.padEnd(40)}║`);
    }
    console.log(`╚══════════════════════════════════════════╝\n`);
  }
}

const provider: SmsProvider = new ConsoleSmsProvider();

export async function sendSMS(to: string, body: string): Promise<void> {
  return provider.send(to, body);
}

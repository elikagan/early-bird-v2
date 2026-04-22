import db from "@/lib/db";
import { nanoid } from "nanoid";
import { newId } from "@/lib/id";

export interface DealerBlastRecipient {
  kind: "dealer" | "invite";
  phone: string;
  user_id?: string;
  display_name?: string | null;
  business_name?: string | null;
  code?: string;
}

/**
 * Recipient list for a dealer blast: UNION of unredeemed dealer_invites
 * with a phone and signed-up dealers. Deduped by phone, preferring the
 * signed-up dealer (auto-signin is a better UX than the invite flow).
 */
export async function getDealerBlastRecipients(): Promise<
  DealerBlastRecipient[]
> {
  const inviteRes = await db.execute({
    sql: `SELECT code, phone FROM dealer_invites
          WHERE phone IS NOT NULL AND used_at IS NULL
          ORDER BY created_at DESC`,
    args: [],
  });

  const dealerRes = await db.execute({
    sql: `SELECT u.id as user_id, u.phone, u.display_name,
                 d.business_name
          FROM users u
          JOIN dealers d ON d.user_id = u.id
          WHERE u.is_dealer = 1 AND u.phone IS NOT NULL`,
    args: [],
  });

  const byPhone = new Map<string, DealerBlastRecipient>();
  for (const row of dealerRes.rows) {
    const phone = row.phone as string;
    byPhone.set(phone, {
      kind: "dealer",
      phone,
      user_id: row.user_id as string,
      display_name: row.display_name as string | null,
      business_name: row.business_name as string | null,
    });
  }
  for (const row of inviteRes.rows) {
    const phone = row.phone as string;
    if (byPhone.has(phone)) continue;
    byPhone.set(phone, {
      kind: "invite",
      phone,
      code: row.code as string,
    });
  }

  return Array.from(byPhone.values());
}

const BLAST_TOKEN_EXPIRY_DAYS = 7;

/**
 * Per-recipient link:
 *  - signed-up dealer → /v/[fresh-token]?to=/sell (auto-signs in, lands on sell)
 *  - unredeemed invite → /invite/[code] (onboarding)
 * Dealer case mints a fresh 7-day login token, longer than the default 15-min
 * magic-link window so a busy dealer can tap the SMS later in the day.
 */
export async function generateDealerBlastLink(
  recipient: DealerBlastRecipient,
  originUrl: string
): Promise<string> {
  if (recipient.kind === "invite") {
    return `${originUrl}/invite/${recipient.code}`;
  }

  const token = nanoid(32);
  const expiresAt = new Date(
    Date.now() + BLAST_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  await db.execute({
    sql: `INSERT INTO auth_tokens (id, phone, token, token_type, expires_at)
          VALUES (?, ?, ?, 'login', ?)`,
    args: [newId(), recipient.phone, token, expiresAt],
  });
  return `${originUrl}/v/${token}?to=/sell`;
}

export function renderDealerBlastMessage(
  template: string,
  link: string
): string {
  return template.replace(/\{link\}/g, link);
}

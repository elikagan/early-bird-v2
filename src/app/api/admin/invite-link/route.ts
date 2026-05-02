import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { getBaseUrl } from "@/lib/url";
import { nanoid } from "nanoid";
import { sendSMSWithLog } from "@/lib/sms";
import { composeDealerInvite } from "@/lib/sms-templates";
import { normalizeUSPhone } from "@/lib/phone";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const rawPhone: string | undefined = body?.phone;
  const multiUse = body?.multi_use === true;

  // Multi-use invites can't be pre-bound to a phone. The whole point
  // of multi-use is "anyone with this link," and a phone-bound invite
  // would lock it to one person.
  if (multiUse && rawPhone && String(rawPhone).trim()) {
    return error("Universal invite links can't be tied to a phone");
  }

  // Single-use phone is optional for back-compat — admins can still
  // generate "bare" single-use links to share manually. When a phone
  // IS provided, we pre-bind it to the invite and SMS the dealer.
  let normalizedPhone: string | null = null;
  if (rawPhone && String(rawPhone).trim()) {
    const result = normalizeUSPhone(rawPhone);
    if (!result.ok) return error(result.reason);
    normalizedPhone = result.phone;
  }

  const code = nanoid(10);
  const id = newId();

  await db.execute({
    sql: `INSERT INTO dealer_invites (id, code, phone, multi_use) VALUES (?, ?, ?, ?)`,
    args: [id, code, normalizedPhone, multiUse],
  });

  const url = `${getBaseUrl(request)}/invite/${code}`;

  // If the admin supplied a phone, text the dealer the invite link
  // right away. Fire-and-succeed from the admin's perspective even if
  // SMS fails — admin can still copy the URL manually.
  if (normalizedPhone) {
    await sendSMSWithLog(normalizedPhone, composeDealerInvite(url), {
      event_type: "sms.dealer_invite",
      entity_type: "dealer_invite",
      entity_id: id,
    });
  }

  return json({ code, url, phone: normalizedPhone, multi_use: multiUse });
}

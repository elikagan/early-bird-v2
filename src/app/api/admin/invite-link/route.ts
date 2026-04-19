import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { getBaseUrl } from "@/lib/url";
import { nanoid } from "nanoid";
import { sendSMSWithLog } from "@/lib/sms";
import { composeDealerInvite } from "@/lib/sms-templates";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const rawPhone: string | undefined = body?.phone;

  // Phone is optional for back-compat — admins can still generate
  // "bare" invite links to share manually. But when a phone IS
  // provided, we pre-bind it to the invite and SMS the dealer.
  let normalizedPhone: string | null = null;
  if (rawPhone) {
    const digits = String(rawPhone).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      return error("Enter a valid US phone number");
    }
    normalizedPhone =
      digits.length === 11 && digits[0] === "1"
        ? `+${digits}`
        : `+1${digits}`;
  }

  const code = nanoid(10);
  const id = newId();

  await db.execute({
    sql: `INSERT INTO dealer_invites (id, code, phone) VALUES (?, ?, ?)`,
    args: [id, code, normalizedPhone],
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

  return json({ code, url, phone: normalizedPhone });
}

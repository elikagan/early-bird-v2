import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getDealerBlastRecipients } from "@/lib/dealer-blast";
import { formatPhone } from "@/lib/format";

export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const recipients = await getDealerBlastRecipients();
  const invites = recipients.filter((r) => r.kind === "invite").length;
  const dealers = recipients.filter((r) => r.kind === "dealer").length;

  return json({
    total: recipients.length,
    invites,
    dealers,
    // Admin's own sanity check before sending — show the real phone so
    // Eli can eyeball it, not a masked string. This endpoint is already
    // gated to admins.
    sample: recipients.slice(0, 3).map((r) => ({
      kind: r.kind,
      phone: formatPhone(r.phone),
      name:
        r.kind === "dealer"
          ? r.business_name || r.display_name || "(no name on file)"
          : "(unredeemed invite)",
    })),
  });
}

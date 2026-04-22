import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { sendSMSWithLog } from "@/lib/sms";
import { logAdminAction } from "@/lib/admin-log";
import {
  getDealerBlastRecipients,
  generateDealerBlastLink,
  renderDealerBlastMessage,
} from "@/lib/dealer-blast";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const body = await request.json();
  const { message, test_only } = body as {
    message: string;
    test_only?: boolean;
  };

  if (!message || !message.includes("{link}")) {
    return error(
      "Message must include {link} where each dealer's personalized link goes"
    );
  }

  const host = request.headers.get("host") || "earlybird.la";
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const originUrl = `${proto}://${host}`;

  const allRecipients = await getDealerBlastRecipients();
  // Test mode always sends to the admin on their own phone, regardless
  // of admin exclusion — this is the pre-flight eyeball check. If we
  // used the real recipient list, the admin's phone would never match
  // (they're filtered out) and the test would fail confusingly.
  const recipients = test_only
    ? [
        {
          kind: "dealer" as const,
          phone: user.phone,
          user_id: user.id,
          display_name: null,
          business_name: null,
        },
      ]
    : allRecipients;

  if (recipients.length === 0) {
    return error("No recipients");
  }

  const blastId = newId();
  let sent = 0;
  let failed = 0;
  const errors: { phone: string; error: string }[] = [];

  for (let i = 0; i < recipients.length; i += 5) {
    const batch = recipients.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const link = await generateDealerBlastLink(r, originUrl);
        const bodyText = renderDealerBlastMessage(message, link);
        return sendSMSWithLog(r.phone, bodyText, {
          event_type: "sms.dealer_blast",
          entity_type: "sms_blast",
          entity_id: blastId,
          meta: { kind: r.kind, user_id: r.user_id, code: r.code },
        });
      })
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        errors.push({
          phone: batch[idx].phone,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason || "Unknown"),
        });
      }
    });
  }

  await db.execute({
    sql: `INSERT INTO sms_blasts
          (id, market_id, audience, message, sent_count, fail_count, total_count, errors, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, now())`,
    args: [
      blastId,
      null,
      "dealers",
      message,
      sent,
      failed,
      recipients.length,
      errors.length > 0 ? JSON.stringify(errors) : null,
    ],
  });

  await logAdminAction(user.phone, "send_dealer_blast", "sms_blast", blastId, {
    sent,
    total: recipients.length,
    fail_count: failed,
    test_only: !!test_only,
  });

  return json({
    sent,
    failed,
    total: recipients.length,
    blast_id: blastId,
  });
}

import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getInitialUser } from "@/lib/auth";
import InviteFormView from "./invite-form-view";

/**
 * Server shell for the invite page. Three branches resolved before
 * the page renders:
 *
 *   - Already a dealer? Server-side redirect to /sell. No flash of the
 *     signup form, no client-side auth wait.
 *   - Invalid / used-up code? Render the NotFoundScreen variant.
 *   - Anyone else (anon or signed-in buyer)? Render the form. We pass
 *     the resolved session down so the form can pre-fill phone + name
 *     without any client-side fetch.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const me = await getInitialUser();

  // Already a dealer — they don't need to redeem an invite. Send them
  // straight to /sell.
  if (me?.is_dealer === 1) {
    redirect("/sell");
  }

  // Validate code: must exist, and either be multi-use or unused.
  const inviteRes = await db.execute({
    sql: `SELECT id, phone, multi_use FROM dealer_invites
          WHERE code = ?
            AND (multi_use = true OR used_at IS NULL)`,
    args: [code],
  });

  if (inviteRes.rows.length === 0) {
    return <InviteFormView code={code} invalid={true} />;
  }

  const invite = inviteRes.rows[0] as Record<string, unknown>;

  return (
    <InviteFormView
      code={code}
      invalid={false}
      invitePhone={(invite.phone as string) || null}
      initialUser={
        me
          ? {
              phone: me.phone,
              displayName: me.display_name || null,
            }
          : null
      }
    />
  );
}

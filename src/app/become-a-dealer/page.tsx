import { redirect } from "next/navigation";
import Link from "next/link";
import db from "@/lib/db";
import { Masthead } from "@/components/masthead";

/**
 * Public dealer self-signup entry. Looks up the most recently created
 * multi-use dealer invite and redirects to its /invite/[code] page.
 *
 * The "universal link" Eli shares (IG bio, dealer group DMs, etc.)
 * lives at this stable URL: earlybird.la/become-a-dealer. He generates
 * a multi-use invite once in /admin; this route keeps the URL fresh
 * without needing to swap hardcoded codes anywhere.
 *
 * If no active multi-use invite exists, render a friendly fallback
 * pointing to email — Eli can mint one in /admin and the URL goes
 * live the next request, no deploy needed.
 */
export default async function BecomeADealerPage() {
  const result = await db.execute(`
    SELECT code FROM dealer_invites
    WHERE multi_use = true
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (result.rows.length > 0) {
    const code = (result.rows[0] as Record<string, unknown>).code as string;
    redirect(`/invite/${code}`);
  }

  return (
    <>
      <Masthead href="/" right={null} />
      <main className="px-5 py-12 max-w-md mx-auto">
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight mb-3">
          Sign-ups paused
        </h1>
        <p className="text-eb-body text-eb-text leading-relaxed mb-6">
          We{"’"}re not taking new dealer sign-ups through this link
          right now. Email us and we{"’"}ll get you set up directly.
        </p>
        <a
          href="mailto:hi@earlybird.la?subject=Listing%20on%20Early%20Bird"
          className="eb-btn block text-center mb-4"
        >
          Email us
        </a>
        <Link
          href="/"
          className="text-eb-meta text-eb-muted underline block text-center"
        >
          Back to Early Bird
        </Link>
      </main>
    </>
  );
}

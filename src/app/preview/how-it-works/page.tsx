/**
 * TEMPORARY preview route — before/after comparison for the
 * "How it works" section on the dealer /home view. Delete this file
 * once the redesign is approved and applied to src/app/(app)/home/page.tsx.
 */

import { Masthead } from "@/components/masthead";

export default function HowItWorksPreview() {
  return (
    <div className="min-h-screen bg-eb-bg">
      <Masthead href={null} right={null} />

      <main className="pb-16">
        {/* Intro */}
        <div className="px-5 pt-6 pb-4 border-b border-eb-border">
          <div className="text-eb-micro uppercase tracking-widest text-eb-pop font-bold mb-1">
            Preview — not live
          </div>
          <h1 className="text-eb-title font-bold text-eb-black">
            &ldquo;How it works&rdquo; redesign
          </h1>
          <p className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
            Dealer-facing version of the How it works section on /home.
            Scroll to compare before/after.
          </p>
        </div>

        {/* BEFORE ───────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-eb-border">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Before
          </div>
        </div>
        <div className="eb-section border-t border-eb-border">
          <span>How it works</span>
        </div>
        <section className="px-5 pb-10">
          <div className="text-eb-body text-eb-muted leading-relaxed space-y-3">
            <p>
              Post your items anytime before the market. When we drop the
              market — typically the day before — everything goes live at once
              and buyers start browsing.
            </p>
            <p>
              When a buyer is interested, you get a single text with their
              name, phone number, and message. From there you talk directly —
              call, text, or sort it out at the booth.
            </p>
            <p>
              Buyers pay you in person, after you&apos;ve confirmed the sale.
              Early Bird never holds payment.
            </p>
          </div>
        </section>

        {/* AFTER ────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t-2 border-eb-black">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
            After
          </div>
        </div>

        {/* Strong section rule — anchors the block */}
        <div className="px-5 pt-8 pb-5 border-t-2 border-eb-black">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted font-bold">
            How it works
          </div>
          <h2 className="text-eb-title font-bold text-eb-black mt-2">
            Selling on Early Bird
          </h2>
        </div>

        {/* Three steps — number + label tight, body underneath,
            generous gap between steps for proximity-based grouping. */}
        <section className="px-5 pb-12 space-y-9">
          {/* Step 01 */}
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-eb-display font-bold tabular-nums text-eb-pop leading-none">
                01
              </span>
              <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                Post
              </span>
            </div>
            <p className="text-eb-body text-eb-text leading-relaxed">
              List your items anytime before the market. When we drop the
              market — typically the day before — everything goes live at
              once and buyers start browsing.
            </p>
          </div>

          {/* Step 02 */}
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-eb-display font-bold tabular-nums text-eb-pop leading-none">
                02
              </span>
              <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                Connect
              </span>
            </div>
            <p className="text-eb-body text-eb-text leading-relaxed">
              When a buyer&apos;s interested, you get a single text with their
              name, number, and message. Take it from there — call, text, or
              meet at the booth.
            </p>
          </div>

          {/* Step 03 */}
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-eb-display font-bold tabular-nums text-eb-pop leading-none">
                03
              </span>
              <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                Get paid
              </span>
            </div>
            <p className="text-eb-body text-eb-text leading-relaxed">
              Arrange payment with buyers however you like — cash, Venmo,
              Zelle, whatever works. Early Bird never handles money.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

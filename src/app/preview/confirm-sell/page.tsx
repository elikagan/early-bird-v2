/**
 * TEMPORARY preview — three pieces of the "mark sold" flow:
 *   1. Dealer's confirm-sell drawer (new copy)
 *   2. Winning buyer's SMS (new copy with warranty language)
 *   3. Losing buyer's watching-page row (new "Sold to another buyer" status)
 *
 * Delete once approved.
 */

"use client";

export default function ConfirmSellPreview() {
  const buyerFirst = "Jamie";
  const buyerDisplay = "Jamie R.";
  const dealerBusiness = "Object Lesson";
  const itemTitle = "Colorful Ceramic Pot";

  return (
    <div className="min-h-screen bg-eb-bg">
      {/* Preview header */}
      <header className="px-5 py-4 border-b-2 border-eb-black">
        <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
          Preview — mark sold flow
        </div>
        <div className="text-eb-caption text-eb-muted mt-1">
          Three pieces on one page so you can see all the copy at once.
        </div>
      </header>

      {/* ═══════════ 1. DEALER CONFIRM DRAWER ═══════════ */}
      <section className="border-b-2 border-eb-black">
        <div className="px-5 pt-8 pb-5">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Piece 01
          </div>
          <h2 className="text-eb-title font-bold text-eb-black mt-1.5">
            What the dealer sees in the confirm drawer
          </h2>
        </div>

        {/* Simulated drawer */}
        <div className="mx-5 mb-8 bg-white border-2 border-eb-black rounded-t-2xl px-5 pt-3 pb-6 shadow-lg">
          <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />

          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
              Mark sold to {buyerFirst}?
            </h3>
            <span
              aria-label="Close"
              className="text-eb-body text-eb-muted leading-none -mt-1"
            >
              {"\u2715"}
            </span>
          </div>

          <p className="text-eb-body text-eb-text leading-relaxed mt-3">
            Before you confirm, make sure you&apos;ve actually talked with{" "}
            <span className="font-bold text-eb-black">{buyerFirst}</span> and
            agreed on price, pickup, and payment.
          </p>

          <p className="text-eb-body text-eb-text leading-relaxed mt-3">
            Early Bird doesn&apos;t handle money or warranty the transaction —
            closing the deal is between you and {buyerFirst}. Use common sense.
          </p>

          <p className="text-eb-caption text-eb-muted leading-relaxed mt-4">
            Tapping below closes the listing, texts {buyerFirst} a receipt,
            and marks it sold in the app for the other inquirers.{" "}
            <span className="text-eb-black font-bold">Can&apos;t be undone.</span>
          </p>

          <div className="flex gap-2 mt-5">
            <button className="flex-1 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text">
              Cancel
            </button>
            <button className="flex-1 py-3 text-eb-caption font-bold uppercase tracking-wider bg-eb-black text-white">
              Mark sold to {buyerFirst}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ 2. WINNER SMS ═══════════ */}
      <section className="border-b-2 border-eb-black">
        <div className="px-5 pt-8 pb-5">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Piece 02
          </div>
          <h2 className="text-eb-title font-bold text-eb-black mt-1.5">
            The only SMS that goes out — to the winner
          </h2>
          <p className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
            Other inquirers get nothing via SMS. They see status in-app (see
            Piece 03).
          </p>
        </div>

        {/* Phone SMS bubble */}
        <div className="mx-5 mb-8 bg-eb-border/40 p-4 rounded-2xl">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Early Bird &rarr; {buyerFirst}
          </div>
          <div className="bg-white border border-eb-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-eb-caption text-eb-text leading-relaxed">
              Early Bird: Congrats! {dealerBusiness} marked the {itemTitle}{" "}
              sold to you. We trust you&apos;ll both honor whatever you
              agreed on. Early Bird doesn&apos;t warranty this transaction —
              use common sense.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ 3. LOSER WATCHING PAGE ROW ═══════════ */}
      <section>
        <div className="px-5 pt-8 pb-5">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Piece 03
          </div>
          <h2 className="text-eb-title font-bold text-eb-black mt-1.5">
            What other inquirers see in Watching
          </h2>
          <p className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
            No text. Just a clear in-app status. Currently everyone sees the
            same generic &ldquo;Sold&rdquo; — the winner and the losers. After
            this change they&apos;re differentiated.
          </p>
        </div>

        {/* Mock watching row: LOSER */}
        <div className="mx-5 mb-4 border border-eb-border p-4 flex gap-3 items-start">
          <div className="w-24 h-24 bg-eb-border shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="text-eb-body font-bold text-eb-black">
              {itemTitle}
            </div>
            <div className="text-eb-caption text-eb-text mt-0.5">$175</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="eb-avatar eb-avatar-sm">OL</span>
              <span className="text-eb-meta text-eb-muted">
                {dealerBusiness}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-eb-muted" />
              <span className="text-eb-meta text-eb-muted">
                Sold to another buyer
              </span>
            </div>
          </div>
        </div>

        {/* For comparison: winner's row */}
        <div className="px-5 pb-2 text-eb-meta text-eb-muted uppercase tracking-widest font-bold">
          And the winner sees this:
        </div>
        <div className="mx-5 mb-10 border border-eb-border p-4 flex gap-3 items-start">
          <div className="w-24 h-24 bg-eb-border shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="text-eb-body font-bold text-eb-black">
              {itemTitle}
            </div>
            <div className="text-eb-caption text-eb-text mt-0.5">$175</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="eb-avatar eb-avatar-sm">OL</span>
              <span className="text-eb-meta text-eb-muted">
                {dealerBusiness}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-eb-pop" />
              <span className="text-eb-meta text-eb-black font-bold">
                Sold to you
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

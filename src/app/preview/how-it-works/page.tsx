/**
 * TEMPORARY preview route — proposed redesign of the full dealer-viewed
 * /home page. Delete this file once the redesign is approved and applied
 * to src/app/(app)/home/page.tsx.
 *
 * Data is hardcoded so the design can be iterated on without the DB.
 */

import Link from "next/link";
import Image from "next/image";
import { Masthead } from "@/components/masthead";

export default function HomePreview() {
  // ─────── mock data ───────
  const liveMarket = {
    id: "preview-live",
    name: "Rose Bowl Flea Market",
    starts_at: "Sun, Apr 19",
    dealer_count: 42,
    item_count: 287,
  };
  const upcomingMarkets = [
    {
      id: "preview-pcc",
      name: "Pasadena City College Flea",
      starts_at: "Sun, May 3",
      daysUntil: 12,
      dealer_count: 38,
    },
    {
      id: "preview-lb",
      name: "Long Beach Antique Market",
      starts_at: "Sun, May 17",
      daysUntil: 26,
      dealer_count: 51,
    },
    {
      id: "preview-melrose",
      name: "Melrose Trading Post",
      starts_at: "Sun, Jun 7",
      daysUntil: 48,
      dealer_count: 33,
    },
  ];
  const previewThumbs = [
    "/promo/2.webp",
    "/promo/3.webp",
    "/promo/bowl.webp",
    "/promo/crowd.webp",
    "/promo/drop.webp",
    "/promo/sold.webp",
  ];

  return (
    <div className="min-h-screen bg-eb-bg">
      <Masthead href={null} right={null} />

      {/* Preview badge (not part of the real design) */}
      <div className="px-5 py-2 border-b border-eb-border">
        <div className="text-eb-micro uppercase tracking-widest text-eb-pop font-bold">
          Preview — not live
        </div>
      </div>

      <main className="pb-20">
        {/* ════════════════ HERO MARKET ════════════════ */}
        <section className="px-5 pt-8 pb-7 border-b-2 border-eb-black">
          {/* Eyebrow */}
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
            Live now
          </div>

          {/* Market name — biggest type on the page */}
          <h2 className="text-eb-hero text-eb-black leading-tight mt-2">
            {liveMarket.name}
          </h2>

          {/* Metadata row — tight under the title */}
          <div className="text-eb-caption text-eb-muted mt-2">
            {liveMarket.starts_at}
            <span className="mx-1.5 text-eb-light">·</span>
            {liveMarket.dealer_count} dealers
            <span className="mx-1.5 text-eb-light">·</span>
            {liveMarket.item_count} items
          </div>

          {/* Preview thumbnails — editorial strip, tighter than before */}
          <div className="grid grid-cols-3 gap-1.5 mt-5">
            {previewThumbs.slice(0, 6).map((src, i) => (
              <div
                key={i}
                className="relative w-full aspect-square bg-eb-border overflow-hidden"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 430px) 33vw, 130px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Primary CTA — clear end-of-section anchor */}
          <Link
            href="/home"
            className="eb-btn mt-6 text-center"
          >
            Browse the market {"\u2192"}
          </Link>
        </section>

        {/* ════════════════ COMING UP ════════════════ */}
        <section className="px-5 pt-8 pb-8 border-b-2 border-eb-black">
          {/* Section header: eyebrow + title */}
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Coming up
          </div>
          <h3 className="text-eb-title font-bold text-eb-black mt-1.5 mb-5">
            Next drops
          </h3>

          {/* Market list — tight rows, clear proximity grouping */}
          <div className="divide-y divide-eb-border -mx-5">
            {upcomingMarkets.map((m) => (
              <Link
                key={m.id}
                href="/home"
                className="flex items-start justify-between gap-4 px-5 py-4 active:bg-eb-border/40"
              >
                {/* Name + metadata grouped tightly */}
                <div className="min-w-0">
                  <div className="text-eb-body font-bold text-eb-black truncate">
                    {m.name}
                  </div>
                  <div className="text-eb-meta text-eb-muted mt-1">
                    {m.starts_at}
                    <span className="mx-1.5 text-eb-light">·</span>
                    ~{m.dealer_count} dealers
                  </div>
                </div>
                {/* Countdown — mono tabular for alignment */}
                <div className="shrink-0 text-eb-caption font-bold tabular-nums text-eb-black pt-0.5">
                  {m.daysUntil}d
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ════════════════ HOW IT WORKS ════════════════ */}
        <section>
          {/* Header block with thick top rule already supplied by previous section */}
          <div className="px-5 pt-8 pb-5">
            <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
              How it works
            </div>
            <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
              Selling on Early Bird
            </h3>
          </div>

          {/* Three numbered steps — tight internal grouping, generous gap between */}
          <div className="px-5 pb-10 space-y-9">
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
          </div>
        </section>
      </main>
    </div>
  );
}

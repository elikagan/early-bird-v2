/**
 * TEMPORARY preview — public landing (buyer mode, live market scenario)
 * restyled with the approved design language. Delete once approved.
 */

import Link from "next/link";
import Image from "next/image";
import { Masthead } from "@/components/masthead";

export default function LandingBuyerPreview() {
  const liveMarket = {
    id: "preview-live",
    name: "Rose Bowl Flea Market",
  };
  const upcomingMarkets = [
    { id: "1", name: "Pasadena City College Flea", location: "Pasadena", daysUntil: 12 },
    { id: "2", name: "Long Beach Antique Market",  location: "Long Beach", daysUntil: 26 },
    { id: "3", name: "Melrose Trading Post",       location: "West Hollywood", daysUntil: 48 },
  ];
  const previewItems = [
    { id: "1", src: "/promo/2.webp",     price: "$185" },
    { id: "2", src: "/promo/3.webp",     price: "$240" },
    { id: "3", src: "/promo/bowl.webp",  price: "$90"  },
    { id: "4", src: "/promo/crowd.webp", price: "$420" },
    { id: "5", src: "/promo/drop.webp",  price: "$55"  },
    { id: "6", src: "/promo/sold.webp",  price: "$310" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Masthead
        href={null}
        right={
          <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Dealer {"\u2192"}
          </span>
        }
      />

      {/* ═══════════════ HERO / MARKET ═══════════════ */}
      <section className="px-5 pt-8 pb-6 border-b-2 border-eb-black">
        <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
          Live now
        </div>
        <h2 className="text-eb-hero text-eb-black leading-tight mt-2">
          {liveMarket.name}
        </h2>
        <p className="text-eb-body text-eb-text leading-relaxed mt-3">
          Shop the market before it opens.
        </p>

        {/* Preview grid */}
        <div className="grid grid-cols-3 gap-1.5 mt-6">
          {previewItems.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square overflow-hidden bg-eb-border"
            >
              <Image
                src={item.src}
                alt=""
                fill
                sizes="(max-width: 430px) 33vw, 130px"
                className="object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                <span className="text-eb-micro text-white font-bold tabular-nums">
                  {item.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Link href="/home" className="eb-btn mt-6 text-center">
          Shop the market {"\u2192"}
        </Link>
      </section>

      {/* ═══════════════ SIGN UP ═══════════════ */}
      <section className="pt-8 pb-8 border-b-2 border-eb-black">
        <div className="px-5">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Get notified
          </div>
          <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
            See items before everyone else
          </h3>
          <p className="text-eb-body text-eb-text leading-relaxed mt-2">
            Get a text when the drop goes live — browse and claim items before
            the 4am crowd.
          </p>

          <input
            type="tel"
            inputMode="tel"
            placeholder="(213) 555-0134"
            className="eb-input mt-5"
          />
          <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
            <input type="checkbox" className="shrink-0 accent-eb-black" />
            <span className="text-eb-meta text-eb-muted">
              Text me when the drop goes live
            </span>
          </label>
          <button className="eb-btn mt-4">SIGN IN</button>
          <p className="text-eb-micro font-readable text-eb-muted mt-2 leading-relaxed">
            Msg &amp; data rates may apply. Frequency varies. Reply STOP to opt
            out, HELP for help. We will not share mobile info with third
            parties for marketing.{" "}
            <Link href="/terms" className="underline">Terms</Link>
            {" \u00b7 "}
            <Link href="/privacy" className="underline">Privacy</Link>
          </p>
        </div>
      </section>

      {/* ═══════════════ COMING UP ═══════════════ */}
      <section className="pt-8 pb-8 border-b-2 border-eb-black">
        <div className="px-5">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            Coming up
          </div>
          <h3 className="text-eb-title font-bold text-eb-black mt-1.5 mb-4">
            Next drops
          </h3>
        </div>

        <div className="divide-y divide-eb-border border-t border-eb-border">
          {upcomingMarkets.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="text-eb-body font-bold text-eb-black truncate">
                  {m.name}
                </div>
                <div className="text-eb-meta text-eb-muted mt-1">
                  {m.location}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
                  Drop in
                </div>
                <div className="text-eb-caption font-bold tabular-nums text-eb-black mt-0.5">
                  {m.daysUntil}d
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section>
        <div className="px-5 pt-8 pb-5">
          <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
            How it works
          </div>
          <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
            Shopping Early Bird
          </h3>
        </div>

        <div className="px-5 pb-10 space-y-9">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-eb-caption font-bold tabular-nums text-eb-pop">
                01
              </span>
              <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                Browse
              </span>
            </div>
            <p className="text-eb-body text-eb-text leading-relaxed">
              Dealers post what they&apos;re bringing before each flea market.
              Browse from your couch, save what you like, and reach out before
              the crowd shows up at 4am.
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-eb-caption font-bold tabular-nums text-eb-pop">
                02
              </span>
              <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                Connect
              </span>
            </div>
            <p className="text-eb-body text-eb-text leading-relaxed">
              Tap &ldquo;I&apos;m Interested&rdquo; on any item to send the
              dealer a single text with your name, number, and message. Take it
              from there — call, text, or meet at the booth.
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-eb-caption font-bold tabular-nums text-eb-pop">
                03
              </span>
              <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                Get it
              </span>
            </div>
            <p className="text-eb-body text-eb-text leading-relaxed">
              Pay the dealer in person, however they take payment. Early Bird
              never handles money.
            </p>
          </div>
        </div>
      </section>

      {/* Tagline */}
      <div className="py-8 text-center text-eb-caption text-eb-muted italic border-t border-eb-border">
        The early bird gets the credenza.
      </div>

      {/* Dealer switch */}
      <section className="px-5 py-6 border-t border-eb-border text-center">
        <p className="text-eb-meta text-eb-muted">
          Selling at a market?{" "}
          <span className="font-bold text-eb-pop">Dealer sign up {"\u2192"}</span>
        </p>
      </section>

      {/* ═══════════════ SITE FOOTER ═══════════════ */}
      <footer className="px-5 py-8 border-t-2 border-eb-black mt-auto">
        <div className="text-eb-meta font-bold text-eb-black uppercase tracking-widest">
          Early Bird
        </div>
        <div className="text-eb-micro text-eb-muted mt-1">Los Angeles, CA</div>
        <div className="flex gap-4 mt-3">
          <a href="mailto:hi@earlybird.la" className="text-eb-micro text-eb-muted">
            hi@earlybird.la
          </a>
          <a
            href="https://instagram.com/early_bird_la"
            className="text-eb-micro text-eb-muted"
            target="_blank"
            rel="noopener noreferrer"
          >
            @early_bird_la
          </a>
        </div>
        <div className="flex gap-4 mt-4">
          <Link href="/terms" className="text-eb-micro text-eb-muted underline">
            Terms
          </Link>
          <Link href="/privacy" className="text-eb-micro text-eb-muted underline">
            Privacy
          </Link>
        </div>
        <p className="text-eb-micro font-readable text-eb-muted mt-4 leading-relaxed">
          Early Bird is not affiliated with any market or organizer. We simply
          allow dealers to post items they&apos;re bringing.
        </p>
        <div className="text-eb-micro font-readable text-eb-muted mt-3">
          © {new Date().getFullYear()} Early Bird
        </div>
      </footer>
    </div>
  );
}

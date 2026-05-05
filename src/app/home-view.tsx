"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  formatPrice,
  formatShortDate,
  getInitials,
  daysUntilShort,
  isItemNew,
} from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";
import { SignupDrawer } from "@/components/signup-drawer";

/**
 * Single home view for both anon visitors and signed-in users. The
 * page is a feed of every dealer's live items. The featured-market
 * banner at the top is editorial atmosphere — name, date, platform-
 * wide stats — never a filter or gate.
 *
 * Cards in the feed get two pills:
 *   - NEW (filled) for items < 7 days old
 *   - RB · 503 (outlined) when the dealer's at the next show, with
 *     booth number where set
 *
 * Anon: "Dealer →" link in masthead, About + FAQ + footer at bottom,
 *       no BottomNav.
 *
 * Signed in: plain masthead, optional pending-application banner for
 *            non-dealer applicants, no footer/FAQ, BottomNav active.
 */

export interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  status: string;
  archived?: number;
}

export interface StreamItem {
  id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_name: string;
  // Decoration data — set on every row by the server query when there
  // is a featured market. at_market = 1 means the dealer said yes to
  // the next show; at_market_label is the abbreviation ("RB"); the
  // booth number is shown alongside if known.
  at_market: number;
  at_market_label: string | null;
  at_market_booth: string | null;
}

export default function HomeView({
  signedIn,
  pendingApp,
  featured,
  initialMarkets,
  initialStreamItems,
  dealerCount,
  liveItemCount,
}: {
  signedIn: boolean;
  pendingApp: boolean;
  featured: Market | null;
  initialMarkets: Market[];
  initialStreamItems: StreamItem[];
  dealerCount: number;
  liveItemCount: number;
}) {
  const [showSignIn, setShowSignIn] = useState(false);
  const comingUp = featured
    ? initialMarkets.filter((m) => m.id !== featured.id)
    : initialMarkets;

  return (
    <>
      <Masthead
        href={null}
        right={
          signedIn ? null : (
            <Link
              href="/dealer"
              className="text-eb-meta uppercase tracking-widest text-eb-muted"
            >
              Dealer {"→"}
            </Link>
          )
        }
      />

      {signedIn && pendingApp && (
        <div className="px-5 py-3 bg-eb-cream border-b-2 border-eb-pop">
          <div className="text-eb-caption font-bold text-eb-black uppercase tracking-wider">
            Application under review
          </div>
          <p className="text-eb-meta text-eb-muted mt-0.5">
            We{"’"}re reviewing your dealer application. We{"’"}ll
            text you when you{"’"}re approved. Browse as a buyer in the
            meantime.
          </p>
        </div>
      )}

      {/* Featured-market banner. Editorial only — name + date +
          platform-wide totals (dealers, items live). No CTA, no
          filtering, no promo grid. */}
      {featured ? (
        <section className="px-5 pt-5 pb-5 border-b border-eb-border">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
            This week
          </div>
          <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
            {featured.name}
          </h1>
          <div className="text-eb-meta text-eb-muted mt-2">
            {formatShortDate(featured.starts_at)}
            {featured.location ? ` · ${featured.location}` : ""}
          </div>
          <div className="text-eb-meta text-eb-muted mt-1">
            {dealerCount} {dealerCount === 1 ? "dealer" : "dealers"}
            {" · "}
            {liveItemCount} {liveItemCount === 1 ? "item" : "items"} live
          </div>
        </section>
      ) : (
        <section className="px-5 py-12 text-center border-b border-eb-border">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
            Between shows
          </div>
          <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
            Nothing up right now
          </h1>
          <p className="text-eb-caption text-eb-muted mt-3 leading-relaxed">
            Next market hasn{"’"}t been announced yet. Check back soon.
          </p>
        </section>
      )}

      {/* Coming up — informational rail of future shows. Non-tappable
          on purpose: there's no "filter the feed by this market"
          destination anymore, the catalog is just one flat feed. */}
      {comingUp.length > 0 && (
        <section className="pt-6 pb-2 border-b border-eb-border">
          <div className="px-5 text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
            Coming up
          </div>
          <div className="divide-y divide-eb-border border-y border-eb-border">
            {comingUp.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="text-eb-body font-bold text-eb-black truncate">
                    {m.name}
                  </div>
                  <div className="text-eb-meta text-eb-muted mt-1 tabular-nums">
                    {formatShortDate(m.starts_at)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
                    {daysUntilShort(m.starts_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The feed. Every dealer's live items, newest first. */}
      {initialStreamItems.length > 0 && (
        <section className={`pt-6 ${signedIn ? "pb-24" : "pb-6"}`}>
          <div className="eb-grid">
            {initialStreamItems.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";
              const showNew = isItemNew(item.created_at);
              const showMarket = item.at_market === 1 && !!item.at_market_label;
              const marketLabel = item.at_market_booth
                ? `${item.at_market_label} · ${item.at_market_booth}`
                : item.at_market_label || "";
              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
                >
                  {item.photo_url ? (
                    <Image
                      src={item.thumb_url || item.photo_url}
                      alt={item.title}
                      width={400}
                      height={400}
                      sizes="(max-width: 430px) 50vw, 215px"
                      className="eb-photo"
                    />
                  ) : (
                    <div className="eb-photo bg-eb-border" />
                  )}
                  <div className="eb-body">
                    <div className="eb-title">{item.title}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="eb-price">{formatPrice(item.price)}</div>
                      {isHeld && <span className="eb-tag-hold">HELD</span>}
                      {showNew && <span className="eb-tag-new">New</span>}
                      {showMarket && (
                        <span className="eb-tag-market">{marketLabel}</span>
                      )}
                    </div>
                    <div className="eb-dealer">
                      <span className="eb-avatar eb-avatar-sm">
                        {getInitials(item.dealer_name)}
                      </span>
                      <span className="eb-dealer-name">
                        {item.dealer_name}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* About + FAQ + Footer — anon only. Signed-in users have the
          BottomNav + Account tab as their wayfinding. */}
      {!signedIn && (
        <>
          <section className="px-5 pt-8 pb-12">
            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-4">
              About
            </div>
            <p className="text-eb-caption text-eb-muted leading-relaxed mb-6">
              Early Bird is a marketplace built by a group of LA flea market
              dealers. They post their inventory online so you can shop
              anytime {"—"} before a show, during a show, or between
              shows.
            </p>

            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-4 pt-4 border-t border-eb-border">
              FAQ
            </div>
            <div className="space-y-5">
              <div>
                <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
                  What is Early Bird?
                </h3>
                <p className="text-eb-meta text-eb-muted leading-relaxed">
                  A marketplace a group of LA flea market dealers built
                  together. They post their inventory online so buyers can
                  browse anytime and reach out about pieces they want.
                </p>
              </div>
              <div>
                <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
                  Is this affiliated with the shows listed above?
                </h3>
                <p className="text-eb-meta text-eb-muted leading-relaxed">
                  No. Early Bird is owned and operated by the dealers
                  themselves. We{"’"}re not affiliated with any of the
                  shows or their organizers {"—"} we just connect buyers
                  to the sellers going.
                </p>
              </div>
              <div>
                <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
                  How does it work?
                </h3>
                <p className="text-eb-meta text-eb-muted leading-relaxed">
                  Browse what dealers are bringing. Tap {"“"}I
                  {"’"}m interested{"”"} on anything you want. The
                  dealer gets your name, number, and a short note, and takes
                  it from there.
                </p>
              </div>
            </div>
          </section>

          <footer className="px-5 py-8 border-t border-eb-border">
            <div className="text-eb-meta font-bold text-eb-black uppercase tracking-wider">
              Early Bird
            </div>
            <div className="text-eb-micro text-eb-muted mt-1">Los Angeles, CA</div>
            <div className="flex flex-wrap gap-4 mt-3">
              <a
                href="mailto:hi@earlybird.la"
                className="text-eb-micro text-eb-muted"
              >
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
            <div className="flex flex-wrap gap-4 mt-4">
              <button
                type="button"
                onClick={() => setShowSignIn(true)}
                className="text-eb-micro text-eb-muted underline"
              >
                Sign in
              </button>
              <a
                href="/terms"
                className="text-eb-micro text-eb-muted underline"
              >
                Terms
              </a>
              <a
                href="/privacy"
                className="text-eb-micro text-eb-muted underline"
              >
                Privacy
              </a>
            </div>
          </footer>

          <SignupDrawer
            open={showSignIn}
            onClose={() => setShowSignIn(false)}
          />
        </>
      )}

      {signedIn && <BottomNav active="buy" />}
    </>
  );
}

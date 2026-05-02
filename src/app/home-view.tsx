"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  formatPrice,
  formatShortDate,
  getInitials,
  daysUntilShort,
} from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";
import { SignupDrawer } from "@/components/signup-drawer";

/**
 * Single home view for both anon visitors and signed-in users. The
 * featured market + promo grid + Coming Up rail render the same way
 * either way; only the chrome (masthead right slot, banner, footer,
 * BottomNav) differs.
 *
 * Anon: "Dealer →" link in masthead, About/FAQ + footer (sign-in,
 *       legal links, contact) at the bottom, no BottomNav.
 *
 * Signed in: plain masthead, optional pending-application banner for
 *            non-dealer applicants, no footer/FAQ, BottomNav with
 *            "Buy" tab active.
 */

export interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  status: string;
  archived?: number;
  dealer_count: number;
}

export interface PreviewItem {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_name: string;
}

// StreamItem is the same shape — kept as a separate type so the home
// page server fetch + the home view stay aligned without one mutating
// the promo type accidentally.
export interface StreamItem {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_name: string;
}

export default function HomeView({
  signedIn,
  pendingApp,
  featured,
  initialMarkets,
  initialFeaturedItems,
  initialStreamItems,
}: {
  signedIn: boolean;
  pendingApp: boolean;
  featured: Market | null;
  initialMarkets: Market[];
  initialFeaturedItems: PreviewItem[];
  initialStreamItems: StreamItem[];
}) {
  const [showSignIn, setShowSignIn] = useState(false);
  const featuredItems = initialFeaturedItems;
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

      {/* Pending dealer-application banner — signed-in non-dealers only */}
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

      {featured ? (
        <>
          {/* Featured (next upcoming) market */}
          <section className="px-5 pt-5 pb-5 border-b border-eb-border">
            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
              This week
            </div>
            <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
              {featured.name}
            </h1>
            <div className="text-eb-meta text-eb-muted mt-2">
              {formatShortDate(featured.starts_at)}
              {featured.dealer_count > 0
                ? ` · ${featured.dealer_count} dealers selling`
                : ""}
            </div>
          </section>

          {/* Promo grid */}
          {featuredItems.length > 0 && (
            <div className="eb-grid">
              {featuredItems.map((item) => {
                const isSold = item.status === "sold";
                const isHeld = item.status === "hold";
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
                      <div className="flex items-center gap-2">
                        <div className="eb-price">{formatPrice(item.price)}</div>
                        {isHeld && <span className="eb-tag-hold">HELD</span>}
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
          )}

          {/* Browse-all CTA */}
          <div className="px-5 pt-4 pb-6 border-b border-eb-border">
            <Link
              href={`/buy?market=${featured.id}`}
              className="eb-btn block text-center"
            >
              Browse {featured.name} {"→"}
            </Link>
          </div>

          {/* Coming up — editorial rows */}
          {comingUp.length > 0 && (
            <section className="pt-6 pb-2 border-b border-eb-border">
              <div className="px-5 text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                Coming up
              </div>
              <div className="divide-y divide-eb-border border-y border-eb-border">
                {comingUp.map((m) => (
                  <Link
                    key={m.id}
                    href={`/buy?market=${m.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 active:bg-eb-border/20"
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
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* No upcoming markets — rare fallback. */
        <section className="px-5 py-12 text-center">
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

      {/* Full catalog stream — every dealer's live inventory, no
          attendance filter. The "FB Marketplace" surface that lives
          below the editorial promo. Caps at 30 here; "Browse all"
          links to /buy for unbounded infinite scroll. */}
      {initialStreamItems.length > 0 && (
        <section className="pt-6">
          <div className="px-5 text-eb-micro uppercase tracking-widest text-eb-muted mb-3">
            Browse all items
          </div>
          <div className="eb-grid">
            {initialStreamItems.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";
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
                    <div className="flex items-center gap-2">
                      <div className="eb-price">{formatPrice(item.price)}</div>
                      {isHeld && <span className="eb-tag-hold">HELD</span>}
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
          <div className={`px-5 pt-4 ${signedIn ? "pb-24" : "pb-6"}`}>
            <Link
              href="/buy"
              className="eb-btn block text-center"
            >
              Browse all {"→"}
            </Link>
          </div>
        </section>
      )}

      {/* About + FAQ + Footer — anon only. Signed-in users have the
          BottomNav + the Account tab as their wayfinding. */}
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

      {/* BottomNav — signed-in only. Active tab is "buy" since /
          is the home / browse landing for everyone. */}
      {signedIn && <BottomNav active="buy" />}
    </>
  );
}

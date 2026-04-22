"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, formatShortDate, getInitials, marketEyebrow } from "@/lib/format";
import { Masthead } from "@/components/masthead";
import { SignupDrawer } from "@/components/signup-drawer";

interface Market {
  id: string;
  name: string;
  location: string | null;
  drop_at: string;
  starts_at: string;
  status: string;
  archived?: number;
  dealer_count: number;
  item_count: number;
}

interface PreviewItem {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_ref: string;
  dealer_name: string;
}

const MAX_PROMO_ITEMS = 8;

/**
 * Day-granularity countdown. Uses the calendar-day diff (not
 * millisecond-diff) so a show on "tomorrow 8am" reads as "opens
 * tomorrow" even at 11:59pm tonight.
 */
function daysUntilLabel(iso: string): string {
  const now = new Date();
  const start = new Date(iso);
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const days = Math.round((startDay - nowDay) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Open today";
  if (days === 1) return "Opens tomorrow";
  return `Opens in ${days} days`;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [featuredItems, setFeaturedItems] = useState<PreviewItem[]>([]);
  const [showSignIn, setShowSignIn] = useState(false);

  // Signed-in users get their personalized /home; this page is the
  // anonymous-visitor experience.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/home");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/markets");
      if (!res.ok) return;
      const raw: Market[] = await res.json();
      // Only non-archived, sorted earliest drop first (the API already
      // sorts by drop_at ASC, so just filter).
      const upcoming = raw.filter((m) => Number(m.archived ?? 0) !== 1);
      setMarkets(upcoming);

      const featured = upcoming[0];
      if (featured) {
        const itemsRes = await fetch(
          `/api/items?market_id=${featured.id}&limit=${MAX_PROMO_ITEMS}`
        );
        if (itemsRes.ok) {
          const items: PreviewItem[] = await itemsRes.json();
          setFeaturedItems(
            items.filter((i) => i.status !== "deleted").slice(0, MAX_PROMO_ITEMS)
          );
        }
      }
    }
    load();
  }, []);

  // Blocking: show masthead + spinner while auth state is resolving.
  // Once we know the user isn't signed in, show the full page.
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  const featured = markets?.[0] ?? null;
  const comingUp = markets?.slice(1) ?? [];

  return (
    <>
      {/* Logo is a non-navigating brand mark on this page (we're
          already home). Right slot is a "Dealer →" anchor link
          that smooth-scrolls down to the "For Dealers" section.
          Sign-in moves to the footer for returning users. */}
      <Masthead
        href={null}
        right={
          <Link
            href="/dealer"
            className="text-eb-meta uppercase tracking-widest text-eb-muted"
          >
            Dealer {"\u2192"}
          </Link>
        }
      />

      {markets === null ? (
        <div className="py-20 flex justify-center">
          <span className="eb-spinner" />
        </div>
      ) : featured ? (
        <>
          {/* Featured (next upcoming) market — matches /buy and /d/[id]
              header pattern: muted eyebrow (date · location) then big
              display name then stats. */}
          <section className="px-5 pt-5 pb-5 border-b border-eb-border">
            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
              {marketEyebrow(featured.starts_at)} {"\u00b7"}{" "}
              {formatShortDate(featured.starts_at)}
              {featured.location ? <> {"\u00b7"} {featured.location}</> : null}
            </div>
            <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
              {featured.name}
            </h1>
            {(featured.dealer_count > 0 || featured.item_count > 0) && (
              <div className="text-eb-meta text-eb-muted mt-2">
                {featured.item_count} items {"\u00b7"} {featured.dealer_count}{" "}
                dealers
              </div>
            )}
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
              href={`/early/${featured.id}`}
              className="eb-btn block text-center"
            >
              Browse all {featured.item_count} items {"\u2192"}
            </Link>
          </div>

          {/* Coming up — editorial list (single-border rows, not boxed
              cards), matches the divider pattern used elsewhere. */}
          {comingUp.length > 0 && (
            <section className="pt-6 pb-2 border-b border-eb-border">
              <div className="px-5 text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                Coming up
              </div>
              <div className="divide-y divide-eb-border border-y border-eb-border">
                {comingUp.map((m) => (
                  <Link
                    key={m.id}
                    href={`/early/${m.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 active:bg-eb-border/20"
                  >
                    <div className="min-w-0">
                      <div className="text-eb-body font-bold text-eb-black truncate">
                        {m.name}
                      </div>
                      <div className="text-eb-meta text-eb-muted mt-1 tabular-nums">
                        {formatShortDate(m.starts_at)}
                        {m.location ? <> {"\u00b7"} {m.location}</> : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
                        {daysUntilLabel(m.starts_at)}
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
            Next market hasn{"\u2019"}t been announced yet. Check back soon.
          </p>
        </section>
      )}

      {/* About + FAQ */}
      <section className="px-5 pt-8 pb-12">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-4">
          About
        </div>
        <p className="text-eb-caption text-eb-muted leading-relaxed mb-6">
          Early Bird is a tool built by a group of LA flea market dealers.
          They post what they{"\u2019"}re bringing so you can pre-shop their
          booths online before the event opens.
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
              A tool a group of LA flea market dealers built together so
              buyers could pre-shop their booths online before the event
              opens.
            </p>
          </div>
          <div>
            <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
              Is this affiliated with the shows listed above?
            </h3>
            <p className="text-eb-meta text-eb-muted leading-relaxed">
              No. Early Bird is owned and operated by the dealers
              themselves. We{"\u2019"}re not affiliated with any of the
              shows or their organizers {"\u2014"} we just connect buyers
              to the sellers going.
            </p>
          </div>
          <div>
            <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
              How does it work?
            </h3>
            <p className="text-eb-meta text-eb-muted leading-relaxed">
              Browse what dealers are bringing. Tap {"\u201C"}I
              {"\u2019"}m interested{"\u201D"} on anything you want. The
              dealer gets your name, number, and a short note, and takes
              it from there.
            </p>
          </div>
        </div>
      </section>

      {/* Footer — brand, contact, sign-in for returning users, legal */}
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
  );
}

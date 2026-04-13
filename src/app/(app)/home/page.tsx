"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatDate, daysUntil, heroCountdown } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";

interface Market {
  id: string;
  name: string;
  location: string;
  drop_at: string;
  starts_at: string;
  status: string;
  dealer_count: number;
  item_count: number;
}

export default function HomePage() {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const isDealer = user?.is_dealer === 1;

  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/markets");
      if (res.ok) setMarkets(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
        <BottomNav active={null} />
      </>
    );
  }

  const liveMarket = markets.find((m) => m.status === "live");
  const upcomingMarkets = markets.filter((m) => m.status === "upcoming");
  const heroMarket = liveMarket || upcomingMarkets[0];
  const otherMarkets = heroMarket
    ? markets.filter((m) => m.id !== heroMarket.id && m.status !== "closed")
    : [];

  return (
    <>
      <header className="eb-masthead">
        <h1>EARLY BIRD</h1>
        <div className="eb-sub">Your markets</div>
      </header>

      <main className="pb-24">
        {/* Hero market */}
        {heroMarket && (
          <section className="px-5 pt-7 pb-6 border-b-2 border-eb-black">
            {heroMarket.status === "live" && (
              <span className="inline-block text-eb-micro uppercase tracking-wider text-eb-pop bg-eb-pop-light px-1 py-0.5 mb-3">
                LIVE NOW
              </span>
            )}
            <h2 className="text-eb-display text-eb-black leading-tight">
              {heroMarket.name}
            </h2>
            <div className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
              {formatDate(heroMarket.starts_at)} ·{" "}
              {heroMarket.status === "live"
                ? `${heroMarket.dealer_count} dealers · ${heroMarket.item_count} items`
                : `~${heroMarket.dealer_count} dealers`}
            </div>

            {/* Drop box (upcoming only) */}
            {heroMarket.status === "upcoming" && (
              <div className="eb-drop-box">
                <div>
                  <div className="eb-drop-label">Drop opens</div>
                  <div className="eb-drop-sub">
                    {formatDate(heroMarket.drop_at)}
                  </div>
                </div>
                <div className="eb-drop-time">
                  {heroCountdown(heroMarket.drop_at)}
                </div>
              </div>
            )}

            {/* CTA */}
            {heroMarket.status === "live" && !isDealer && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="eb-btn mt-5 text-center"
              >
                Browse the market →
              </Link>
            )}
            {heroMarket.status === "live" && isDealer && (
              <Link
                href={`/sell?market=${heroMarket.id}`}
                className="eb-btn mt-5 text-center"
              >
                Manage your booth →
              </Link>
            )}
            {heroMarket.status === "upcoming" && isDealer && (
              <Link
                href={`/sell?market=${heroMarket.id}`}
                className="eb-btn mt-5 text-center"
              >
                Set up your booth →
              </Link>
            )}
            {heroMarket.status === "upcoming" && !isDealer && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="eb-btn mt-5 text-center"
              >
                Preview items →
              </Link>
            )}
          </section>
        )}

        {/* Coming up */}
        {otherMarkets.length > 0 && (
          <>
            <div className="eb-section">
              <span>Coming up</span>
            </div>
            {otherMarkets.map((m) => (
              <Link
                key={m.id}
                href={
                  isDealer ? `/sell?market=${m.id}` : `/buy?market=${m.id}`
                }
                className="block px-5 py-4 border-b border-eb-border"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-eb-body font-bold text-eb-black">
                    {m.name}
                  </span>
                  <span className="text-eb-caption font-bold tabular-nums text-eb-black">
                    {daysUntil(m.drop_at)}d
                  </span>
                </div>
                <div className="text-eb-meta text-eb-muted mt-1">
                  {formatDate(m.starts_at)} · ~{m.dealer_count} dealers
                </div>
              </Link>
            ))}
          </>
        )}

        {/* How it works */}
        <div className="eb-section border-t border-eb-border">
          <span>How it works</span>
        </div>
        <section className="px-5 pb-8">
          <div className="text-eb-body text-eb-muted leading-relaxed space-y-3">
            {isDealer ? (
              <>
                <p>
                  Your items go live the moment you publish, and they sit in
                  front of buyers right up to the drop. Set up days early
                  instead of hours and you&apos;ll hear from buyers before
                  sunrise.
                </p>
                <p>
                  When a buyer is interested, you get a single text with their
                  name, phone number, and message. From there you talk directly
                  — call, text, or sort it out at the booth.
                </p>
                <p>
                  Buyers pay you in person, after you&apos;ve confirmed the
                  sale. Early Bird never holds payment.
                </p>
              </>
            ) : (
              <>
                <p>
                  Dealers post photos and prices the night before each flea
                  market. You browse from your couch, save what you like, and
                  reach out before the crowd shows up at 4am.
                </p>
                <p>
                  Tap &ldquo;I&apos;m Interested&rdquo; on any item to send
                  the dealer a single text with your name, number, and message.
                  From there you talk directly — call, text, or meet at the
                  booth.
                </p>
                <p>
                  You pay the dealer in person, however they take payment. Early
                  Bird never handles money.
                </p>
              </>
            )}
          </div>
        </section>
      </main>

      <BottomNav active={null} />
    </>
  );
}

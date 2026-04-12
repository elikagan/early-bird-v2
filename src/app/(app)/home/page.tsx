"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  getInitials,
  formatDate,
  daysUntil,
  heroCountdown,
} from "@/lib/format";
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
          <span className="loading loading-spinner loading-md"></span>
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
      {/* Header */}
      <header className="px-4 pt-6 pb-3 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold tracking-tight">EARLY BIRD</div>
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-8 rounded-full">
              <span className="text-xs font-bold">
                {getInitials(user?.display_name || user?.first_name || "?")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* Hero */}
        {heroMarket && (
          <section className="px-4 pt-8 pb-7 border-b border-base-300">
            {heroMarket.status === "live" && (
              <div className="badge badge-success font-bold mb-4">LIVE NOW</div>
            )}
            <h1 className="text-3xl font-bold leading-tight tracking-tight mb-2">
              {heroMarket.name}
            </h1>
            <div className="text-xs text-base-content/60 leading-relaxed mb-6">
              {formatDate(heroMarket.starts_at)} ·{" "}
              {heroMarket.status === "live"
                ? `${heroMarket.dealer_count} dealers · ${heroMarket.item_count} items`
                : `~${heroMarket.dealer_count} dealers`}
            </div>

            {/* Dealer: countdown */}
            {isDealer && heroMarket.status === "upcoming" && (
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-widest text-base-content/60 mb-1">
                  Drops in
                </div>
                <div className="text-2xl font-bold tabular-nums leading-none">
                  {heroCountdown(heroMarket.drop_at)}
                </div>
                <div className="text-xs text-base-content/60 mt-1">
                  {formatDate(heroMarket.drop_at)}
                </div>
              </div>
            )}

            {/* Buyer: live → browse, upcoming → coming soon */}
            {heroMarket.status === "live" && !isDealer && (
              <>
                <div className="text-xs text-base-content/60 leading-relaxed mb-6">
                  Open until 8pm tonight
                </div>
                <Link
                  href={`/buy?market=${heroMarket.id}`}
                  className="btn btn-neutral btn-block"
                >
                  Browse the market →
                </Link>
              </>
            )}
            {heroMarket.status === "live" && isDealer && (
              <Link
                href={`/sell?market=${heroMarket.id}`}
                className="btn btn-neutral btn-block"
              >
                Manage your booth →
              </Link>
            )}
            {heroMarket.status === "upcoming" && isDealer && (
              <Link
                href={`/sell?market=${heroMarket.id}`}
                className="btn btn-neutral btn-block"
              >
                Set up your booth →
              </Link>
            )}
            {heroMarket.status === "upcoming" && !isDealer && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="btn btn-neutral btn-block"
              >
                Preview items →
              </Link>
            )}
          </section>
        )}

        {/* Coming up */}
        {otherMarkets.length > 0 && (
          <>
            <section className="px-4 pt-7 pb-3">
              <div className="text-xs uppercase tracking-widest text-base-content/60">
                Coming up
              </div>
            </section>
            {otherMarkets.map((m) => (
              <Link
                key={m.id}
                href={
                  isDealer
                    ? `/sell?market=${m.id}`
                    : `/buy?market=${m.id}`
                }
                className="block px-4 py-4 border-t border-base-300"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-base font-bold">{m.name}</div>
                  <div className="text-xs font-bold tabular-nums">
                    Drops in {daysUntil(m.drop_at)}d
                  </div>
                </div>
                <div className="text-xs text-base-content/60 mt-0.5">
                  {formatDate(m.starts_at)} · ~{m.dealer_count} dealers
                </div>
                <div className="text-xs text-base-content/60 mt-0.5">
                  {formatDate(m.drop_at)}
                </div>
              </Link>
            ))}
          </>
        )}

        {/* How it works */}
        <section className="px-4 pt-7 pb-8 border-t border-base-300">
          <div className="text-xs uppercase tracking-widest text-base-content/60 mb-4">
            How it works
          </div>
          <div className="text-sm text-base-content/70 leading-relaxed space-y-3">
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApp, setPendingApp] = useState(false);

  const isDealer = user?.is_dealer === 1;

  // /home is the signed-in landing. Signed-out users belong on /.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function load() {
      const [marketsRes, appRes] = await Promise.all([
        apiFetch("/api/markets"),
        user && !isDealer ? apiFetch("/api/dealer-applications") : Promise.resolve(null),
      ]);
      if (marketsRes.ok) setMarkets(await marketsRes.json());
      if (appRes?.ok) {
        const data = await appRes.json();
        if (data.application?.status === "pending") {
          setPendingApp(true);
        }
      }
      setLoading(false);
    }
    load();
  }, [user, isDealer]);

  if (authLoading || loading || !user) {
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
      </header>

      {/* Pending dealer application banner */}
      {pendingApp && (
        <div className="px-5 py-3 bg-eb-cream border-b-2 border-eb-pop">
          <div className="text-eb-caption font-bold text-eb-black uppercase tracking-wider">
            Application under review
          </div>
          <p className="text-eb-meta text-eb-muted mt-0.5">
            We{"\u2019"}re reviewing your dealer application. We{"\u2019"}ll
            text you when you{"\u2019"}re approved. Browse as a buyer in the
            meantime.
          </p>
        </div>
      )}

      <main className="pb-24">
        {/* Empty state */}
        {!heroMarket && (
          <div className="eb-empty">
            <div className="eb-icon">○</div>
            <p>
              You&apos;re not following any markets yet.
              <br />
              Follow LA flea markets to see drops and countdowns here.
            </p>
          </div>
        )}

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
            {heroMarket.status === "live" && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="eb-btn mt-5 text-center"
              >
                Browse the market {"\u2192"}
              </Link>
            )}
            {heroMarket.status === "upcoming" && user && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="eb-btn mt-5 text-center"
              >
                Preview items {"\u2192"}
              </Link>
            )}
            {heroMarket.status === "upcoming" && !user && (
              <Link
                href="/"
                className="eb-btn mt-5 text-center"
              >
                Sign up to get texted when items drop {"\u2192"}
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
                href={`/buy?market=${m.id}`}
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
            {user && isDealer ? (
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

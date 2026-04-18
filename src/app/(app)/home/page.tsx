"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatDate, daysUntil, heroCountdown } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";

interface Market {
  id: string;
  name: string;
  location: string;
  drop_at: string;
  starts_at: string;
  status: string;
  dealer_count: number;
  item_count: number;
  dealer_preshop_enabled: number;
}

interface PreviewItem {
  id: string;
  thumb_url: string | null;
  photo_url: string | null;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
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
      let loadedMarkets: Market[] = [];
      if (marketsRes.ok) {
        loadedMarkets = await marketsRes.json();
        setMarkets(loadedMarkets);
      }
      if (appRes?.ok) {
        const data = await appRes.json();
        if (data.application?.status === "pending") {
          setPendingApp(true);
        }
      }

      // Fetch preview items for hero market
      const live = loadedMarkets.find((m) => m.status === "live");
      const upcoming = loadedMarkets.filter((m) => m.status === "upcoming");
      const hero = live || upcoming[0];
      if (hero) {
        const previewRes = await apiFetch(`/api/items?market_id=${hero.id}&limit=6`);
        if (previewRes.ok) {
          const items = await previewRes.json();
          setPreviewItems(
            items
              .filter((i: PreviewItem) => i.thumb_url || i.photo_url)
              .slice(0, 6)
          );
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
        <BottomNav active="buy" />
      </>
    );
  }

  const liveMarket = markets.find((m) => m.status === "live");
  const upcomingMarkets = markets.filter((m) => m.status === "upcoming");
  const heroMarket = liveMarket || upcomingMarkets[0];
  const otherMarkets = heroMarket
    ? markets.filter((m) => m.id !== heroMarket.id && m.status !== "closed")
    : [];

  // Show the "Dealer pre-shopping is live" banner only when:
  //  1. the signed-in user is a dealer, AND
  //  2. there's at least one upcoming market where pre-shop is turned on.
  const showPreshopBanner =
    isDealer &&
    markets.some(
      (m) => m.status === "upcoming" && (m.dealer_preshop_enabled ?? 1) === 1
    );

  return (
    <>
      <Masthead href={null} right={null} />

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
              Follow LA flea markets to see upcoming ones here.
            </p>
          </div>
        )}

        {/* ═══════════════ HERO MARKET ═══════════════ */}
        {heroMarket && (
          <section className="px-5 pt-8 pb-7 border-b-2 border-eb-black">
            <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
              {heroMarket.status === "live" ? "Live now" : "Upcoming"}
            </div>
            <h2 className="text-eb-hero text-eb-black leading-tight mt-2">
              {heroMarket.name}
            </h2>
            <div className="text-eb-caption text-eb-muted mt-2">
              {formatDate(heroMarket.starts_at)}
              <span className="mx-1.5 text-eb-light">·</span>
              {heroMarket.status === "live"
                ? `${heroMarket.dealer_count} dealers · ${heroMarket.item_count} items`
                : `~${heroMarket.dealer_count} dealers`}
            </div>

            {/* Preview image grid */}
            {previewItems.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mt-5">
                {previewItems.map((pi) => (
                  <Link key={pi.id} href={`/item/${pi.id}`}>
                    <Image
                      src={pi.thumb_url || pi.photo_url || ""}
                      alt=""
                      width={200}
                      height={200}
                      sizes="(max-width: 430px) 33vw, 130px"
                      className="w-full aspect-square object-cover object-top"
                    />
                  </Link>
                ))}
              </div>
            )}

            {/* Countdown to when the market opens for shopping.
                For dealers on pre-shop-enabled markets, this doubles as
                the pre-shop status indicator (green dot + "pre-shopping
                is live" header) so the countdown and status live in
                one component instead of two stacked banners. */}
            {heroMarket.status === "upcoming" && (
              <div className="mt-4">
                {isDealer &&
                  (heroMarket.dealer_preshop_enabled ?? 1) === 1 && (
                    <div className="px-4 py-2 border-2 border-eb-green bg-eb-green/10 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-eb-green" />
                      <span className="text-eb-micro uppercase tracking-widest font-bold text-eb-green">
                        Dealer pre-shopping is live
                      </span>
                    </div>
                  )}
                <div className="eb-drop-box">
                  <div>
                    <div className="eb-drop-label">
                      {isDealer &&
                      (heroMarket.dealer_preshop_enabled ?? 1) === 1
                        ? "Regular shopping opens"
                        : "Shopping opens"}
                    </div>
                    <div className="eb-drop-sub">
                      {formatDate(heroMarket.drop_at)}
                    </div>
                  </div>
                  <div className="eb-drop-time">
                    {heroCountdown(heroMarket.drop_at)}
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            {heroMarket.status === "live" && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="eb-btn mt-6 text-center"
              >
                Browse the market {"\u2192"}
              </Link>
            )}
            {heroMarket.status === "upcoming" && user && (
              <Link
                href={`/buy?market=${heroMarket.id}`}
                className="eb-btn mt-6 text-center"
              >
                {isDealer && (heroMarket.dealer_preshop_enabled ?? 1) === 1
                  ? "Pre-shop now"
                  : "Preview items"}{" "}
                {"\u2192"}
              </Link>
            )}
            {heroMarket.status === "upcoming" && !user && (
              <Link href="/" className="eb-btn mt-6 text-center">
                Sign up to get texted when shopping opens {"\u2192"}
              </Link>
            )}
          </section>
        )}

        {/* ═══════════════ COMING UP ═══════════════ */}
        {otherMarkets.length > 0 && (
          <section className="pt-8 pb-8 border-b-2 border-eb-black">
            <div className="px-5">
              <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
                Coming up
              </div>
              <h3 className="text-eb-title font-bold text-eb-black mt-1.5 mb-4">
                Upcoming markets
              </h3>
            </div>

            <div className="divide-y divide-eb-border border-t border-eb-border">
              {otherMarkets.map((m) => (
                <Link
                  key={m.id}
                  href={`/buy?market=${m.id}`}
                  className="flex items-start justify-between gap-4 px-5 py-4 active:bg-eb-border/40"
                >
                  <div className="min-w-0">
                    <div className="text-eb-body font-bold text-eb-black truncate">
                      {m.name}
                    </div>
                    <div className="text-eb-meta text-eb-muted mt-1">
                      {formatDate(m.starts_at)}
                      <span className="mx-1.5 text-eb-light">·</span>~
                      {m.dealer_count} dealers
                    </div>
                  </div>
                  <div className="shrink-0 text-eb-caption font-bold tabular-nums text-eb-black pt-0.5">
                    {daysUntil(m.drop_at)}d
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section>
          <div className="px-5 pt-8 pb-5">
            <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
              How it works
            </div>
            <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
              {user && isDealer
                ? "Selling on Early Bird"
                : "Shopping Early Bird"}
            </h3>
          </div>

          <div className="px-5 pb-10 space-y-9">
            {(user && isDealer
              ? [
                  {
                    num: "01",
                    label: "Post",
                    body: "List your items anytime before the market. When we drop the market — typically the day before — everything goes live at once and buyers start browsing.",
                  },
                  {
                    num: "02",
                    label: "Connect",
                    body: "When a buyer\u2019s interested, you get a single text with their name, number, and message. Take it from there — call, text, or meet at the booth.",
                  },
                  {
                    num: "03",
                    label: "Get paid",
                    body: "Arrange payment with buyers however you like — cash, Venmo, Zelle, whatever works. Early Bird never handles money.",
                  },
                ]
              : [
                  {
                    num: "01",
                    label: "Browse",
                    body: "Dealers post what they\u2019re bringing before each flea market. Browse from your couch, save what you like, and reach out before the crowd shows up at 4am.",
                  },
                  {
                    num: "02",
                    label: "Connect",
                    body: "Tap \u201cI\u2019m Interested\u201d on any item to send the dealer a single text with your name, number, and message. Take it from there — call, text, or meet at the booth.",
                  },
                  {
                    num: "03",
                    label: "Get it",
                    body: "Pay the dealer in person, however they take payment. Early Bird never handles money.",
                  },
                ]
            ).map((step) => (
              <div key={step.num}>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-eb-caption font-bold tabular-nums text-eb-pop">
                    {step.num}
                  </span>
                  <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                    {step.label}
                  </span>
                </div>
                <p className="text-eb-body text-eb-text leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="buy" />
    </>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice, formatDate } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";
import { NotFoundScreen } from "@/components/not-found-screen";

const PROMO_IMAGES = ["/promo/hero.webp", "/promo/2.webp", "/promo/3.webp"];
const CYCLE_INTERVAL = 5000; // 5s per image

interface Item {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_name: string;
  dealer_display_name: string | null;
}

interface Market {
  id: string;
  name: string;
  drop_at: string;
  starts_at: string;
  status: string;
  dealer_count: number;
  item_count: number;
}

function BuyFeedContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const marketId = searchParams.get("market");

  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketId) {
      router.replace("/home");
      return;
    }

    async function load() {
      const fetches: Promise<Response>[] = [
        apiFetch(`/api/items?market_id=${marketId}`),
        apiFetch(`/api/markets/${marketId}`),
      ];
      // Only fetch favorites if logged in
      if (user) fetches.push(apiFetch("/api/favorites"));

      const [itemsRes, marketRes, favsRes] = await Promise.all(fetches);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (marketRes.ok) setMarket(await marketRes.json());

      if (favsRes?.ok) {
        const favs: { id: string }[] = await favsRes.json();
        setFavIds(new Set(favs.map((f) => f.id)));
      }

      setLoading(false);
    }

    load();
  }, [marketId, router, user]);

  // Countdown timer (ticks every second for pre-drop)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!market || market.status === "live") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [market]);

  // Image slideshow
  const [promoIndex, setPromoIndex] = useState(0);
  useEffect(() => {
    if (!market || market.status === "live") return;
    const interval = setInterval(
      () => setPromoIndex((i) => (i + 1) % PROMO_IMAGES.length),
      CYCLE_INTERVAL
    );
    return () => clearInterval(interval);
  }, [market]);

  if (loading) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
        <BottomNav active="buy" />
      </>
    );
  }

  if (!market) {
    return (
      <>
        <Masthead />
        <NotFoundScreen
          message="We couldn\u2019t find this market. It may have been removed or the link might be wrong."
          action={{ label: "Browse markets", href: "/home" }}
        />
        <BottomNav active="buy" />
      </>
    );
  }

  // Pre-drop view
  if (market.status !== "live") {
    const dropTime = new Date(market.drop_at).getTime();
    const diff = Math.max(0, dropTime - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");

    return (
      <>
        <Masthead />

        <main className="pb-24">
          {/* Countdown */}
          <section className="px-5 pt-10 pb-8 text-center">
            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-5">
              Dropping in
            </div>
            <div className="flex justify-center items-start gap-3">
              <div className="text-center">
                <div className="text-eb-hero text-eb-black tabular-nums">
                  {pad(days)}
                </div>
                <div className="text-eb-micro text-eb-muted uppercase tracking-widest mt-1">
                  Days
                </div>
              </div>
              <div className="text-eb-hero text-eb-light leading-none">:</div>
              <div className="text-center">
                <div className="text-eb-hero text-eb-black tabular-nums">
                  {pad(hours)}
                </div>
                <div className="text-eb-micro text-eb-muted uppercase tracking-widest mt-1">
                  Hrs
                </div>
              </div>
              <div className="text-eb-hero text-eb-light leading-none">:</div>
              <div className="text-center">
                <div className="text-eb-hero text-eb-black tabular-nums">
                  {pad(minutes)}
                </div>
                <div className="text-eb-micro text-eb-muted uppercase tracking-widest mt-1">
                  Min
                </div>
              </div>
              <div className="text-eb-hero text-eb-light leading-none">:</div>
              <div className="text-center">
                <div className="text-eb-hero text-eb-black tabular-nums">
                  {pad(seconds)}
                </div>
                <div className="text-eb-micro text-eb-muted uppercase tracking-widest mt-1">
                  Sec
                </div>
              </div>
            </div>
          </section>

          {/* Promo slideshow */}
          <div className="eb-promo">
            {PROMO_IMAGES.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={i === promoIndex ? "eb-promo-active" : ""}
              />
            ))}
          </div>

          {/* Teaser (only show counts when substantial) */}
          {items.length >= 50 && market.dealer_count >= 10 && (
            <div className="text-center py-6 text-eb-caption text-eb-muted">
              {items.length} items · {market.dealer_count} dealers
              <br />
              <span className="text-eb-meta">
                {formatDate(market.starts_at)}
              </span>
            </div>
          )}
        </main>

        <BottomNav active="buy" watchingCount={favIds.size} />
      </>
    );
  }

  return (
    <>
      <Masthead />

      {/* Drop bar */}
      <div className="eb-drop-bar">
        <div>
          Drop is <span className="eb-live">LIVE</span>
        </div>
        <span className="eb-cd">{items.length} items</span>
      </div>

      {/* Grid */}
      <main className="pb-24">
        {items.length > 0 ? (
          <div className="eb-grid">
            {items.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";

              const cardContent = (
                <>
                  {user && favIds.has(item.id) && (
                    <span className="eb-fav">{"\u2665"}</span>
                  )}
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
                    {user && (
                      <div className="eb-dealer">
                        <span className="eb-avatar eb-avatar-sm">
                          {getInitials(
                            item.dealer_display_name || item.dealer_name
                          )}
                        </span>
                        <span className="eb-dealer-name">
                          {item.dealer_display_name || item.dealer_name}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              );

              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">○</div>
            <p>
              No items in this market yet.
              <br />
              Dealers usually post the night before each drop.
            </p>
          </div>
        )}
      </main>

      <BottomNav active="buy" watchingCount={favIds.size} />

    </>
  );
}

export default function BuyFeedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
      }
    >
      <BuyFeedContent />
    </Suspense>
  );
}

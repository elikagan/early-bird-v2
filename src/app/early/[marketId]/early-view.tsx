"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatPrice, formatShortDate, getInitials } from "@/lib/format";
import {
  getAnonFavorites,
  addAnonFavorite,
  removeAnonFavorite,
} from "@/lib/anon-favorites";
import { BottomNav, adjustNavCount } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";
import { useInfiniteItems } from "@/lib/use-infinite-items";

export interface Item {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_ref: string;
  dealer_name: string;
}

export interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  status: string;
  archived?: number;
  dealer_count: number;
}

/**
 * Seeded PRNG (mulberry32). Stable shuffle per visitor-session —
 * the same seed yields the same order, so if the visitor refreshes
 * they see the same grid instead of a jarring re-shuffle. Seed is
 * cached in sessionStorage keyed to market id.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getSessionSeed(marketId: string): number {
  const key = `eb_shuffle_seed_${marketId}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return Number(cached);
    const seed = Math.floor(Math.random() * 2 ** 31);
    sessionStorage.setItem(key, String(seed));
    return seed;
  } catch {
    // sessionStorage blocked — fall back to fresh each render
    return Math.floor(Math.random() * 2 ** 31);
  }
}

export default function EarlyView({
  initialMarket,
  initialItems,
}: {
  initialMarket: Market;
  initialItems: Item[];
}) {
  const { user } = useAuth();
  const marketId = initialMarket.id;
  const market = initialMarket;

  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());
  const [anonFavs, setAnonFavs] = useState<Set<string>>(new Set());

  // Favorites — one-shot, since we need the whole set to mark hearts.
  useEffect(() => {
    async function loadFavs() {
      if (!user) {
        setAnonFavs(getAnonFavorites());
        return;
      }
      const favsRes = await apiFetch("/api/favorites");
      if (favsRes.ok) {
        const favs: { id: string; favorite_id: string }[] = await favsRes.json();
        setFavMap(new Map(favs.map((f) => [f.id, f.favorite_id])));
      }
    }
    loadFavs();
  }, [user]);

  // Items — first page pre-seeded from the server in DB order (so
  // SSR and initial client render match). Subsequent pages get
  // filtered + shuffled by pageTransform.
  const seed = useMemo(() => getSessionSeed(marketId), [marketId]);
  const pageTransform = useCallback(
    (page: Item[]) => {
      const visible = page.filter((i) => i.status !== "deleted");
      return shuffleWithSeed(visible, seed);
    },
    [seed]
  );
  const {
    items,
    hasMore,
    loadingMore,
    sentinelRef,
  } = useInfiniteItems<Item>(
    (offset, limit) =>
      `/api/items?market_id=${marketId}&limit=${limit}&offset=${offset}`,
    pageTransform,
    [marketId],
    initialItems
  );

  const toggleFav = useCallback(
    async (e: React.MouseEvent, itemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        setAnonFavs((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) {
            next.delete(itemId);
            removeAnonFavorite(itemId);
          } else {
            next.add(itemId);
            addAnonFavorite(itemId);
          }
          return next;
        });
        return;
      }
      const existingFavId = favMap.get(itemId);
      if (existingFavId) {
        setFavMap((prev) => {
          const next = new Map(prev);
          next.delete(itemId);
          return next;
        });
        adjustNavCount("watching", -1);
        await apiFetch(`/api/favorites/${existingFavId}`, { method: "DELETE" });
      } else {
        setFavMap((prev) => new Map([...prev, [itemId, "_pending"]]));
        adjustNavCount("watching", +1);
        const res = await apiFetch("/api/favorites", {
          method: "POST",
          body: JSON.stringify({ item_id: itemId }),
        });
        if (res.ok) {
          const fav = await res.json();
          setFavMap((prev) => new Map([...prev, [itemId, fav.id]]));
        } else {
          setFavMap((prev) => {
            const next = new Map(prev);
            next.delete(itemId);
            return next;
          });
          adjustNavCount("watching", -1);
        }
      }
    },
    [favMap, user, marketId]
  );

  return (
    <>
      <Masthead />

      {/* Strict-filter view header. Same shape as /buy. */}
      <section className="px-5 pt-5 pb-5 border-b border-eb-border">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
          Items at
        </div>
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          {market.name}
        </h1>
        <div className="text-eb-meta text-eb-muted mt-1">
          {formatShortDate(market.starts_at)}
          {market.dealer_count > 0
            ? ` \u00b7 ${market.dealer_count} dealers selling`
            : ""}
        </div>
      </section>

      <main className="pb-24">
        {items.length > 0 ? (
          <>
          <div className="eb-grid">
            {items.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";
              const isFav = user ? favMap.has(item.id) : anonFavs.has(item.id);
              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
                >
                  <button
                    type="button"
                    className="eb-fav"
                    onClick={(e) => toggleFav(e, item.id)}
                    aria-label={isFav ? "Remove favorite" : "Add favorite"}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={isFav ? "eb-fav-filled" : "eb-fav-outline"}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
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
                      <span className="eb-dealer-name">{item.dealer_name}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {/* Infinite-scroll sentinel — loadMore fires when this
              scrolls into view (with a 400px rootMargin lead). */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex justify-center py-6"
              aria-hidden="true"
            >
              {loadingMore && <span className="eb-spinner" />}
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="text-eb-meta text-eb-muted text-center py-6">
              That&apos;s all {items.length} items.
            </div>
          )}
          </>
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">{"\u25cb"}</div>
            <p>
              Nothing posted to {market.name} yet.
              <br />
              Check back soon.
            </p>
          </div>
        )}
      </main>

      <BottomNav active="buy" />
    </>
  );
}

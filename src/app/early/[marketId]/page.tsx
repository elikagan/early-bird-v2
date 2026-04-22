"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
import { NotFoundScreen } from "@/components/not-found-screen";

interface Item {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  dealer_ref: string;
  dealer_name: string;
}

interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  status: string;
  archived?: number;
  dealer_count: number;
  item_count: number;
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

export default function EarlyAccessPage() {
  const params = useParams();
  const { user } = useAuth();
  const marketId = params.marketId as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());
  const [anonFavs, setAnonFavs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const marketRes = await apiFetch(`/api/markets/${marketId}`);
        if (!marketRes.ok) {
          setInvalid(true);
          setLoading(false);
          return;
        }
        const marketData: Market = await marketRes.json();
        setMarket(marketData);

        const fetches: Promise<Response>[] = [
          apiFetch(`/api/items?market_id=${marketId}`),
        ];
        if (user) fetches.push(apiFetch("/api/favorites"));
        const [itemsRes, favsRes] = await Promise.all(fetches);

        if (itemsRes.ok) {
          const raw: Item[] = await itemsRes.json();
          const visible = raw.filter((i) => i.status !== "deleted");
          const seed = getSessionSeed(marketId);
          setItems(shuffleWithSeed(visible, seed));
        }

        if (favsRes?.ok) {
          const favs: { id: string; favorite_id: string }[] = await favsRes.json();
          setFavMap(new Map(favs.map((f) => [f.id, f.favorite_id])));
        }
        if (!user) setAnonFavs(getAnonFavorites());
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    }
    if (marketId) load();
  }, [marketId, user]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-eb-bg flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  if (invalid || !market) {
    return (
      <div className="min-h-screen bg-eb-bg">
        <NotFoundScreen
          title="Market not found"
          message="This link doesn't point to an active market. The show may have ended or the link might be wrong."
          action={{ label: "Go to Early Bird", href: "/" }}
        />
      </div>
    );
  }

  return (
    <>
      <Masthead />

      {/* Market hero */}
      <section className="px-5 pt-5 pb-5 border-b border-eb-border">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
          Pre-shop online via Early Bird
        </div>
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          {market.name}
        </h1>
        <div className="text-eb-body text-eb-black mt-2 tabular-nums">
          {formatShortDate(market.starts_at)}
          {market.location ? (
            <span className="text-eb-muted"> {"\u00b7"} {market.location}</span>
          ) : null}
        </div>
        {(market.dealer_count > 0 || market.item_count > 0) && (
          <div className="text-eb-meta text-eb-muted mt-1">
            {market.item_count} items {"\u00b7"} {market.dealer_count} dealers
          </div>
        )}
      </section>

      <main className="pb-24">
        {items.length > 0 ? (
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

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice, formatShortDate } from "@/lib/format";
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
  dealer_name: string;
  dealer_display_name: string | null;
}

export interface Market {
  id: string;
  name: string;
  location: string | null;
  drop_at: string | null;
  starts_at: string;
  status: string;
  dealer_count: number;
}

export default function BuyView({
  initialMarket,
  initialItems,
}: {
  initialMarket: Market | null;
  initialItems: Item[];
}) {
  const { user } = useAuth();
  const market = initialMarket;
  const marketId = initialMarket?.id ?? null;

  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());

  // Favorites (per-user). Only fetched when signed in.
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/favorites").then(async (res) => {
      if (!res.ok) return;
      const favs: { id: string; favorite_id: string }[] = await res.json();
      setFavMap(new Map(favs.map((f) => [f.id, f.favorite_id])));
    });
  }, [user]);

  // Paginated items — seeded with the server's first page; subsequent
  // pages fetched client-side as the user scrolls. When no market is
  // set, /api/items returns the full unfiltered catalog.
  const {
    items,
    hasMore,
    loadingMore,
    sentinelRef,
  } = useInfiniteItems<Item>(
    (offset, limit) =>
      marketId
        ? `/api/items?market_id=${marketId}&limit=${limit}&offset=${offset}`
        : `/api/items?limit=${limit}&offset=${offset}`,
    undefined,
    [marketId],
    initialItems
  );

  const toggleFav = useCallback(
    async (e: React.MouseEvent, itemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) return;
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
    [favMap, user]
  );

  return (
    <>
      <Masthead />

      {/* Header. Market mode = "Items at [name] · date". Unfiltered
          mode = "Browsing · all dealers". */}
      <section className="px-5 pt-5 pb-5 border-b border-eb-border">
        {market ? (
        <>
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
          Items at
        </div>
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          {market.name}
        </h1>
        <div className="text-eb-meta text-eb-muted mt-2">
          {formatShortDate(market.starts_at)}
          {market.dealer_count > 0
            ? ` \u00b7 ${market.dealer_count} dealers selling`
            : ""}
        </div>
        </>
        ) : (
        <>
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
          Browsing
        </div>
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          All Items
        </h1>
        <div className="text-eb-meta text-eb-muted mt-2">
          Every dealer{"\u2019"}s live inventory
        </div>
        </>
        )}
      </section>

      <main className="pb-24">
        {items.length > 0 ? (
          <>
          <div className="eb-grid">
            {items.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";
              const isFav = favMap.has(item.id);
              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
                >
                  {user && (
                    <button
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
              {market ? (
                <>
                  Nothing posted to this market yet.
                  <br />
                  Check back soon.
                </>
              ) : (
                <>
                  No items live right now.
                  <br />
                  Check back soon.
                </>
              )}
            </p>
          </div>
        )}
      </main>

      <BottomNav active="buy" />
    </>
  );
}

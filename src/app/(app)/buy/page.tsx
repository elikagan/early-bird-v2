"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice, formatShortDate } from "@/lib/format";
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
  dealer_name: string;
  dealer_display_name: string | null;
}

interface Market {
  id: string;
  name: string;
  location: string | null;
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
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());
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
      if (user) fetches.push(apiFetch("/api/favorites"));

      const [itemsRes, marketRes, favsRes] = await Promise.all(fetches);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (marketRes.ok) setMarket(await marketRes.json());

      if (favsRes?.ok) {
        const favs: { id: string; favorite_id: string }[] = await favsRes.json();
        setFavMap(new Map(favs.map((f) => [f.id, f.favorite_id])));
      }

      setLoading(false);
    }

    load();
  }, [marketId, router, user]);

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
          action={{ label: "Browse markets", href: "/" }}
        />
        <BottomNav active="buy" />
      </>
    );
  }

  return (
    <>
      <Masthead />

      {/* Market header — matches /d/[id] and /early/[id] patterns:
          muted eyebrow + big display name + date/location + stats. */}
      <section className="px-5 pt-5 pb-5 border-b border-eb-border">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
          {formatShortDate(market.starts_at)}
          {market.location ? <> {"\u00b7"} {market.location}</> : null}
        </div>
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          {market.name}
        </h1>
        {(market.dealer_count > 0 || market.item_count > 0) && (
          <div className="text-eb-meta text-eb-muted mt-2">
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
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">{"\u25cb"}</div>
            <p>
              Nothing posted to this market yet.
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

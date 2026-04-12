"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice, formatDate } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";

interface Item {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  dealer_name: string;
  dealer_display_name: string | null;
}

interface Market {
  id: string;
  name: string;
  starts_at: string;
  status: string;
  dealer_count: number;
  item_count: number;
}

function BuyFeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
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
      const [itemsRes, marketRes, favsRes] = await Promise.all([
        apiFetch(`/api/items?market_id=${marketId}`),
        apiFetch(`/api/markets/${marketId}`),
        apiFetch("/api/favorites"),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (marketRes.ok) setMarket(await marketRes.json());

      if (favsRes.ok) {
        const favs = await favsRes.json();
        const map = new Map<string, string>();
        for (const f of favs) {
          map.set(f.id, f.favorite_id);
        }
        setFavMap(map);
      }

      setLoading(false);
    }

    load();
  }, [marketId, router]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent, itemId: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (favMap.has(itemId)) {
        const favId = favMap.get(itemId)!;
        await apiFetch(`/api/favorites/${favId}`, { method: "DELETE" });
        setFavMap((prev) => {
          const next = new Map(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        const res = await apiFetch("/api/favorites", {
          method: "POST",
          body: JSON.stringify({ item_id: itemId }),
        });
        if (res.ok) {
          const fav = await res.json();
          setFavMap((prev) => new Map(prev).set(itemId, fav.id));
        }
      }
    },
    [favMap]
  );

  if (loading || !market) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
        <BottomNav active="buy" />
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="px-4 pt-6 pb-3 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <Link href="/home" className="text-lg font-bold tracking-tight">
            EARLY BIRD
          </Link>
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-8 rounded-full">
              <span className="text-xs font-bold">
                {getInitials(user?.display_name || user?.first_name || "?")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">{market.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-base-content/60">
              {formatDate(market.starts_at)}
            </div>
          </div>
          {market.status === "live" && (
            <div className="badge badge-success gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success-content"></span>
              LIVE
            </div>
          )}
          {market.status === "upcoming" && (
            <div className="badge badge-outline">UPCOMING</div>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-base-content/60 mt-2">
          {items.length} items · {market.dealer_count} dealers
        </div>
      </header>

      {/* Items grid */}
      <main className="flex-1 px-4 py-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const isSold = item.status === "sold";
            const isHeld = item.status === "hold";
            const isFav = favMap.has(item.id);

            return (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className={`card card-compact bg-base-100 border border-base-300 overflow-hidden${isSold ? " opacity-60" : ""}`}
              >
                <figure className="aspect-square bg-base-200 relative">
                  {item.photo_url && (
                    <img
                      src={item.photo_url}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {isHeld && (
                    <div className="absolute top-2 left-2">
                      <div className="badge badge-warning badge-sm font-bold">
                        HELD
                      </div>
                    </div>
                  )}
                  {isSold && (
                    <div className="absolute top-2 left-2">
                      <div className="badge badge-neutral badge-sm font-bold">
                        SOLD
                      </div>
                    </div>
                  )}
                  {!isSold && (
                    <div className="absolute top-2 right-2">
                      <button
                        className="btn btn-circle btn-xs btn-ghost bg-base-100/90"
                        onClick={(e) => toggleFavorite(e, item.id)}
                      >
                        {isFav ? "♥" : "♡"}
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content w-10 rounded-full ring-2 ring-base-100">
                        <span className="text-xs font-bold">
                          {getInitials(
                            item.dealer_display_name || item.dealer_name
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </figure>
                <div className="card-body">
                  <div
                    className={`text-xs font-bold leading-tight line-clamp-2${isSold ? " line-through" : ""}`}
                  >
                    {item.title}
                  </div>
                  <div
                    className={`font-bold text-sm${isSold ? " line-through" : ""}`}
                  >
                    {formatPrice(item.price)}
                  </div>
                  {isSold ? (
                    <button className="btn btn-xs btn-disabled mt-1">
                      Sold
                    </button>
                  ) : (
                    <button className="btn btn-xs btn-neutral mt-1">
                      Interested
                    </button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Bottom nav */}
      <BottomNav active="buy" watchingCount={favMap.size} />
    </>
  );
}

export default function BuyFeedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      }
    >
      <BuyFeedContent />
    </Suspense>
  );
}

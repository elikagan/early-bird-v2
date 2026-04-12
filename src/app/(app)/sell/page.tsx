"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";

interface Item {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  status: string;
  photo_url: string | null;
  watcher_count: number;
  inquiry_count: number;
  sold_to: string | null;
}

interface Market {
  id: string;
  name: string;
  starts_at: string;
  status: string;
  item_count: number;
}

function SellContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  const marketId = searchParams.get("market");

  useEffect(() => {
    if (!user?.dealer_id) return;

    async function load() {
      let mktId = marketId;

      // If no market param, fetch markets and pick the first one
      if (!mktId) {
        const marketsRes = await apiFetch("/api/markets");
        if (marketsRes.ok) {
          const markets = await marketsRes.json();
          if (markets.length > 0) {
            const live = markets.find((m: Market) => m.status === "live");
            mktId = (live || markets[0]).id;
          }
        }
      }

      if (!mktId) {
        setLoading(false);
        return;
      }

      const [itemsRes, marketRes] = await Promise.all([
        apiFetch(`/api/items?market_id=${mktId}&dealer_id=${user!.dealer_id}`),
        apiFetch(`/api/markets/${mktId}`),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (marketRes.ok) setMarket(await marketRes.json());
      setLoading(false);
    }
    load();
  }, [marketId, user]);

  const updateItemStatus = useCallback(
    async (itemId: string, status: string) => {
      const res = await apiFetch(`/api/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, ...updated } : i))
        );
      }
    },
    []
  );

  if (loading) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
        <BottomNav active="sell" />
      </>
    );
  }

  const totalWatchers = items.reduce((s, i) => s + (i.watcher_count || 0), 0);
  const totalInquiries = items.reduce(
    (s, i) => s + (i.inquiry_count || 0),
    0
  );

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
        {market && (
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">{market.name}</div>
            <div className="badge badge-outline">
              {market.item_count} ITEMS
            </div>
          </div>
        )}
      </header>

      {/* Live stats */}
      <section className="px-4 py-4 bg-base-200">
        <div className="stats stats-horizontal w-full bg-base-100">
          <div className="stat p-3">
            <div className="stat-title text-[10px] uppercase tracking-wider">
              Listed
            </div>
            <div className="stat-value text-xl">{items.length}</div>
          </div>
          <div className="stat p-3">
            <div className="stat-title text-[10px] uppercase tracking-wider">
              Watchers
            </div>
            <div className="stat-value text-xl">{totalWatchers}</div>
          </div>
          <div className="stat p-3">
            <div className="stat-title text-[10px] uppercase tracking-wider">
              Inquiries
            </div>
            <div className="stat-value text-xl">{totalInquiries}</div>
          </div>
        </div>
      </section>

      {/* Action bar */}
      <div className="px-4 py-3 border-b border-base-300">
        <Link
          href={`/sell/add${market ? `?market=${market.id}` : ""}`}
          className="btn btn-sm btn-neutral"
        >
          + Add Listing
        </Link>
      </div>

      {/* Items grid */}
      <main className="flex-1 px-4 py-4 pb-32">
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const isSold = item.status === "sold";
            const isHeld = item.status === "hold";

            return (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className={`card card-compact bg-base-100 border border-base-300 overflow-hidden${isSold ? " opacity-60" : ""}`}
              >
                <figure className="aspect-square bg-base-200 relative">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-base-content/30">
                      Photo
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <div
                    className={`text-xs font-bold leading-tight line-clamp-2${isSold ? " line-through" : ""}`}
                  >
                    {item.title}
                  </div>
                  {item.original_price ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-sm${isSold ? " line-through" : ""}`}
                      >
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-xs text-base-content/40 line-through">
                        {formatPrice(item.original_price)}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`font-bold text-sm${isSold ? " line-through" : ""}`}
                    >
                      {formatPrice(item.price)}
                    </div>
                  )}
                  {!isSold && (item.watcher_count > 0 || item.inquiry_count > 0) && (
                    <div className="text-[10px] text-base-content/60 truncate">
                      {[
                        item.watcher_count > 0 &&
                          `${item.watcher_count} watchers`,
                        item.inquiry_count > 0 &&
                          `${item.inquiry_count} ${item.inquiry_count === 1 ? "inquiry" : "inquiries"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  {isSold && (
                    <div className="text-[10px] text-base-content/60 truncate">
                      Sold
                    </div>
                  )}
                  <div className="flex flex-col gap-1 mt-1">
                    {isSold ? (
                      <button className="btn btn-xs btn-neutral" disabled>
                        SOLD
                      </button>
                    ) : isHeld ? (
                      <>
                        <button className="btn btn-xs btn-neutral">HELD</button>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateItemStatus(item.id, "sold");
                          }}
                        >
                          Mark Sold
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateItemStatus(item.id, "hold");
                          }}
                        >
                          Hold
                        </button>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateItemStatus(item.id, "sold");
                          }}
                        >
                          Mark Sold
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* FAB */}
      <Link
        href={`/sell/add${market ? `?market=${market.id}` : ""}`}
        className="max-w-md mx-auto fixed bottom-20 right-4 left-auto btn btn-circle btn-lg btn-neutral shadow-lg z-10"
      >
        +
      </Link>

      <BottomNav active="sell" />
    </>
  );
}

export default function SellPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      }
    >
      <SellContent />
    </Suspense>
  );
}

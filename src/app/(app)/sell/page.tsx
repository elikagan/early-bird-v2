"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { formatPrice, formatDate } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";

interface Item {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  status: string;
  photo_url: string | null;
  view_count: number;
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
  const { user } = useRequireAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [boothNumber, setBoothNumber] = useState("");
  const [boothSaving, setBoothSaving] = useState(false);
  const [boothSaved, setBoothSaved] = useState(false);

  const marketId = searchParams.get("market");

  useEffect(() => {
    if (!user?.dealer_id) return;

    async function load() {
      let mktId = marketId;

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

      // Load booth number
      const boothRes = await apiFetch(`/api/booth/${mktId}`);
      if (boothRes.ok) {
        const boothData = await boothRes.json();
        setBoothNumber(boothData.booth_number || "");
      }

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

  const saveBooth = useCallback(
    async (value: string) => {
      if (!market) return;
      setBoothSaving(true);
      const res = await apiFetch("/api/booth", {
        method: "POST",
        body: JSON.stringify({
          market_id: market.id,
          booth_number: value.trim() || null,
        }),
      });
      setBoothSaving(false);
      if (res.ok) {
        setBoothSaved(true);
        setTimeout(() => setBoothSaved(false), 1500);
      }
    },
    [market]
  );

  if (loading) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
        <BottomNav active="sell" sellCount={items.filter(i => i.status !== "deleted").length} />
      </>
    );
  }

  const totalViews = items.reduce((s, i) => s + (i.view_count || 0), 0);
  const totalWatchers = items.reduce((s, i) => s + (i.watcher_count || 0), 0);
  const totalInquiries = items.reduce(
    (s, i) => s + (i.inquiry_count || 0),
    0
  );

  return (
    <>
      {/* Masthead */}
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
        {market && <div className="eb-sub">{market.name} {"\u00b7"} {formatDate(market.starts_at)}</div>}
      </header>

      {/* Stats */}
      <div className="eb-stats border-b border-eb-border">
        <div className="eb-stat">
          <div className="eb-stat-num">{items.length}</div>
          <div className="eb-stat-label">Listed</div>
        </div>
        <div className="eb-stat">
          <div className="eb-stat-num">{totalViews}</div>
          <div className="eb-stat-label">Views</div>
        </div>
        <div className="eb-stat">
          <div className="eb-stat-num">{totalWatchers}</div>
          <div className="eb-stat-label">Watchers</div>
        </div>
        <div className="eb-stat">
          <div className="eb-stat-num">{totalInquiries}</div>
          <div className="eb-stat-label">Inquiries</div>
        </div>
      </div>

      {/* Booth number */}
      {market && (
        <div className="px-5 py-4 border-b border-eb-border">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Your Booth
            </span>
            <span className="text-eb-meta text-eb-muted">
              {boothSaving ? "Saving\u2026" : boothSaved ? "Saved" : ""}
            </span>
          </div>
          <input
            type="text"
            className="eb-input"
            placeholder="A12"
            value={boothNumber}
            onChange={(e) => {
              const v = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
              setBoothNumber(v);
            }}
            onBlur={() => saveBooth(boothNumber)}
            inputMode="text"
          />
          <p className="text-eb-micro text-eb-muted mt-1">
            Buyers see this on your listings so they can find you.
          </p>
        </div>
      )}

      {/* Add listing */}
      <div className="px-3 py-3 border-b border-eb-border">
        <Link
          href={`/sell/add${market ? `?market=${market.id}` : ""}`}
          className="inline-block text-eb-caption font-bold bg-eb-black text-white px-4 py-2 tracking-wider uppercase"
        >
          + Add Listing
        </Link>
      </div>

      {/* Items grid */}
      <main className="pb-32">
        {items.length > 0 ? (
          <div className="eb-grid mt-3">
            {items.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";
              const isDeleted = item.status === "deleted";
              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className={`eb-grid-card${isSold || isDeleted ? " eb-sold" : ""}`}
                >
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.title}
                      className="eb-photo"
                    />
                  ) : (
                    <div className="eb-photo bg-eb-border" />
                  )}
                  <div className="eb-body">
                    <div className="eb-title">{item.title}</div>
                    <div className="eb-price">
                      {formatPrice(item.price)}
                      {item.original_price && (
                        <span className="eb-price-was">
                          {formatPrice(item.original_price)}
                        </span>
                      )}
                    </div>
                    {!isSold &&
                      (item.watcher_count > 0 ||
                        item.inquiry_count > 0) && (
                        <div className="text-eb-meta text-eb-muted mt-1 truncate">
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
                    <div className="flex flex-col gap-1 mt-2">
                      {isSold ? (
                        <span className="text-eb-meta text-eb-muted">
                          Sold
                        </span>
                      ) : isHeld ? (
                        <>
                          <span className="eb-tag-hold inline-block">
                            HELD
                          </span>
                          <button
                            className="text-eb-caption font-bold border border-eb-border px-2 py-0.5 text-eb-text text-left"
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
                            className="text-eb-caption font-bold border border-eb-border px-2 py-0.5 text-eb-text text-left"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateItemStatus(item.id, "hold");
                            }}
                          >
                            Hold
                          </button>
                          <button
                            className="text-eb-caption font-bold border border-eb-border px-2 py-0.5 text-eb-text text-left"
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
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">○</div>
            <p>
              No items listed yet.
              <br />
              Add your first listing to get started.
            </p>
            <Link
              href={`/sell/add${market ? `?market=${market.id}` : ""}`}
            >
              Add a listing →
            </Link>
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        href={`/sell/add${market ? `?market=${market.id}` : ""}`}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-eb-black text-white flex items-center justify-center text-2xl font-bold shadow-lg z-10"
      >
        +
      </Link>

      <BottomNav active="sell" sellCount={items.filter(i => i.status !== "deleted").length} />
    </>
  );
}

export default function SellPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
      }
    >
      <SellContent />
    </Suspense>
  );
}

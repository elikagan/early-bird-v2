"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { formatPrice, formatDate } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";

interface Item {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
  view_count: number;
  watcher_count: number;
  inquiry_count: number;
  sold_to: string | null;
}

interface Market {
  id: string;
  name: string;
  starts_at: string;
  drop_at: string;
  status: string;
  item_count: number;
  dealer_preshop_enabled: number;
}

function SellContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useRequireAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [boothNumber, setBoothNumber] = useState("");
  const [boothSaving, setBoothSaving] = useState(false);
  const [boothSaved, setBoothSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // All markets the app knows about — powers the show-switcher drawer.
  // The currently-selected market is `market` above; this list also
  // includes upcoming / past markets so the dealer can see what's
  // coming even though those aren't open for inventory yet.
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const marketId = searchParams.get("market");

  useEffect(() => {
    if (!user?.dealer_id) return;

    async function load() {
      let mktId = marketId;

      // Always fetch the markets list — used to pick the default
      // market AND to populate the show-switcher drawer.
      const marketsRes = await apiFetch("/api/markets");
      let markets: Market[] = [];
      if (marketsRes.ok) {
        markets = await marketsRes.json();
        setAllMarkets(markets);
      }

      if (!mktId && markets.length > 0) {
        const live = markets.find((m: Market) => m.status === "live");
        mktId = (live || markets[0]).id;
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
        <BottomNav active="sell" />
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
      <Masthead right={null} />

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

      {/* Header — small eyebrow, market name as a tappable title that
          truncates on long names, and a secondary booth-number row
          that doesn't compete with the title.  */}
      {market && (
        <div className="px-5 py-4 border-b border-eb-border">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
            Your booth
          </div>
          <button
            type="button"
            onClick={() => setShowSwitcher(true)}
            aria-label={`Switch show (current: ${market.name})`}
            className="group mt-1 flex items-baseline gap-2 w-full text-left"
          >
            <span className="text-eb-title font-bold text-eb-black truncate min-w-0">
              {market.name}
            </span>
            <span
              aria-hidden="true"
              className="text-eb-caption text-eb-muted shrink-0 group-hover:text-eb-black transition-colors"
            >
              {"\u25BE"}
            </span>
          </button>

          <div className="mt-3 pt-3 border-t border-eb-border/60 flex items-center gap-3">
            <label
              htmlFor="booth-number-input"
              className="text-eb-micro uppercase tracking-widest text-eb-muted shrink-0"
            >
              Booth #
            </label>
            <input
              id="booth-number-input"
              type="text"
              className="w-24 shrink-0 text-eb-caption tabular-nums bg-transparent border-0 border-b border-eb-border px-0 py-0.5 focus:outline-none focus:border-eb-black placeholder:text-eb-light"
              placeholder={"\u2014"}
              value={boothNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
                setBoothNumber(v);
              }}
              onBlur={() => saveBooth(boothNumber)}
              inputMode="text"
            />
            <span className="text-eb-micro text-eb-muted ml-auto shrink-0">
              {boothSaving ? "Saving\u2026" : boothSaved ? "Saved" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Show-switcher drawer */}
      {showSwitcher && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowSwitcher(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-5 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
              Switch show
            </h3>
            <p className="text-eb-caption text-eb-muted mt-1 mb-4 leading-relaxed">
              You can pre-shop any upcoming show once inventory opens
              for dealers.
            </p>
            <div className="divide-y divide-eb-border border-y border-eb-border">
              {allMarkets.map((m) => {
                const isCurrent = m.id === market?.id;
                const isPreshopOpen =
                  m.status === "live" ||
                  (m.status === "upcoming" &&
                    (m.dealer_preshop_enabled ?? 1) === 1);
                const canSwitch = isPreshopOpen && !isCurrent;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!canSwitch}
                    onClick={() => {
                      if (!canSwitch) return;
                      setShowSwitcher(false);
                      router.push(`/sell?market=${m.id}`);
                    }}
                    className={`w-full flex items-start justify-between gap-4 px-1 py-3 text-left ${
                      canSwitch
                        ? "active:bg-eb-border/40"
                        : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-eb-body font-bold text-eb-black truncate">
                        {m.name}
                        {isCurrent && (
                          <span className="ml-2 text-eb-micro uppercase tracking-widest text-eb-pop font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-eb-meta text-eb-muted mt-1">
                        {m.status === "live"
                          ? "Open now"
                          : isPreshopOpen
                            ? "Pre-shop open"
                            : `Opens ${new Date(m.drop_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </div>
                    </div>
                    {canSwitch && (
                      <span className="shrink-0 text-eb-caption text-eb-muted mt-0.5">
                        {"\u2192"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Share your booth */}
      {market && user?.dealer_id && (
        <div className="px-5 py-4 border-b border-eb-border">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Share your booth
          </div>
          <p className="text-eb-caption text-eb-muted mb-3 leading-relaxed">
            Post this link so buyers can see everything you{"\u2019"}re bringing.
          </p>
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 flex items-center py-3 px-4 bg-white border-2 border-eb-border text-eb-caption text-eb-text truncate">
              earlybird.la/d/{user.dealer_id}
            </div>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/d/${user.dealer_id}?market=${market.id}`;
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="flex items-center px-4 py-3 bg-eb-black text-white text-eb-caption font-bold uppercase tracking-wider shrink-0 border-2 border-eb-black"
            >
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>
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

      <BottomNav active="sell" />
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

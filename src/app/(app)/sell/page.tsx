"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { formatPrice, formatDate, formatShortDate } from "@/lib/format";
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
  const [boothSaveError, setBoothSaveError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  // Dealer's market subscriptions. null = not yet loaded, [] = loaded
  // and they haven't picked any (backfill case — banner shown).
  const [subscriptions, setSubscriptions] = useState<string[] | null>(null);
  // All markets the app knows about — powers the show-switcher drawer.
  // The currently-selected market is `market` above; this list also
  // includes upcoming / past markets so the dealer can see what's
  // coming even though those aren't open for inventory yet.
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showBoothEditor, setShowBoothEditor] = useState(false);

  useBodyScrollLock(showSwitcher || showBoothEditor);
  const [boothEditDraft, setBoothEditDraft] = useState("");

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

      // Load subscriptions — used to decide whether to show the
      // "pick your shows" banner (for pre-subscription dealers).
      const meRes = await apiFetch("/api/users/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setSubscriptions(
          Array.isArray(me.market_subscriptions) ? me.market_subscriptions : []
        );
      }

      setLoading(false);
    }
    load();
  }, [marketId, user]);

  const saveBooth = useCallback(
    async (value: string) => {
      if (!market) return;
      const previous = boothNumber;
      // Optimistic update — revert below if the server rejects.
      setBoothNumber(value);
      setBoothSaving(true);
      setBoothSaveError(null);
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
      } else {
        setBoothNumber(previous);
        setBoothSaveError("Couldn't save booth number — try again.");
        setTimeout(() => setBoothSaveError(null), 3500);
      }
    },
    [market, boothNumber]
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

      {/* Show-subscription banner — only for pre-subscription dealers
          (redeemed before we added this feature). New dealers set
          subscriptions during invite redemption, so they'll never see
          this. Tap opens /account where the picker lives. */}
      {subscriptions !== null && subscriptions.length === 0 && (
        <Link
          href="/account"
          className="block px-5 py-3 bg-eb-pop-light border-b border-eb-border active:opacity-70 transition-opacity"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-eb-micro font-bold uppercase tracking-widest text-eb-pop">
                Finish setup
              </div>
              <div className="text-eb-caption text-eb-black mt-0.5 leading-snug">
                Tell us which shows you sell at so we only text you about yours.
              </div>
            </div>
            <span className="shrink-0 text-eb-pop text-eb-body font-bold">
              {"\u2192"}
            </span>
          </div>
        </Link>
      )}

      {/* Header — two columns on one row. Each value IS the button.
          Market on the left, booth on the right.  */}
      {market && (
        <div className="px-5 py-4 border-b border-eb-border">
          {boothSaveError && (
            <p className="text-eb-meta text-eb-red mb-2" role="alert">
              {boothSaveError}
            </p>
          )}
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-0.5 truncate">
                Your booth
              </div>
              <button
                type="button"
                onClick={() => setShowSwitcher(true)}
                className="text-eb-title font-bold text-eb-black truncate max-w-full text-left underline decoration-eb-pop decoration-2 underline-offset-4 active:opacity-60 transition-opacity"
              >
                {market.name}
                <span className="text-eb-meta font-normal text-eb-muted ml-2 tabular-nums no-underline">
                  {formatShortDate(market.starts_at)}
                </span>
              </button>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-0.5">
                Booth #
              </div>
              <button
                type="button"
                onClick={() => {
                  setBoothEditDraft(boothNumber);
                  setShowBoothEditor(true);
                }}
                className={`text-eb-title font-bold tabular-nums underline decoration-eb-pop decoration-2 underline-offset-4 active:opacity-60 transition-opacity ${
                  boothNumber ? "text-eb-black" : "text-eb-pop"
                }`}
              >
                {boothNumber || "Set"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booth editor drawer — 16px input so iOS doesn't auto-zoom,
          and focus/dismiss are clean. */}
      {showBoothEditor && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowBoothEditor(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-5 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
              Booth number
            </h3>
            <p className="text-eb-caption text-eb-muted mt-1 mb-5 leading-relaxed">
              Buyers see this on your listings so they can find you at{" "}
              {market?.name}.
            </p>
            <input
              type="text"
              className="eb-input tabular-nums"
              style={{ fontSize: "16px" }}
              value={boothEditDraft}
              onChange={(e) =>
                setBoothEditDraft(
                  // Allow letters, digits, dash, slash — real booth
                  // numbers include formats like "A-12" or "B/4".
                  e.target.value.replace(/[^a-zA-Z0-9\-/]/g, "").slice(0, 10)
                )
              }
              placeholder="A12"
              inputMode="text"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowBoothEditor(false)}
                className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowBoothEditor(false);
                  await saveBooth(boothEditDraft);
                }}
                className="flex-1 py-3 text-eb-caption font-bold uppercase tracking-wider bg-eb-black text-white"
              >
                Save
              </button>
            </div>
          </div>
        </>
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
                // Dealers can switch between any non-archived upcoming or
                // live market they're participating in. The drop mechanic
                // is retired — there's no "pre-shop" gate anymore.
                const canSwitch = !isCurrent && m.status !== "closed";
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
                        {new Date(m.starts_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
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
              earlybird.la/d/{user.dealer_id}?market={market.id}
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

      {/* Add listing — big obvious button above the grid so it's
          the first thing a dealer sees after their booth header.
          Pairs with the FAB for scroll-away reachability. */}
      <div className="px-5 py-4 border-b border-eb-border">
        <Link
          href={`/sell/add${market ? `?market=${market.id}` : ""}`}
          className="eb-btn block text-center"
        >
          + Add a new item
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
                    {isSold && (
                      <div className="text-eb-meta text-eb-muted mt-2">
                        Sold
                      </div>
                    )}
                    {isHeld && (
                      <div className="mt-2">
                        <span className="eb-tag-hold inline-block">HELD</span>
                      </div>
                    )}
                    {isDeleted && (
                      <div className="text-eb-meta text-eb-muted mt-2">
                        Removed
                      </div>
                    )}
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

      {/* FAB — sits above the bottom nav (which is z-10 per globals
          .eb-bnav). bottom-24 clears the nav + iOS safe-area even on
          notched phones. */}
      <Link
        href={`/sell/add${market ? `?market=${market.id}` : ""}`}
        aria-label="Add a new item"
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-eb-black text-white flex items-center justify-center text-2xl font-bold shadow-lg z-20"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
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

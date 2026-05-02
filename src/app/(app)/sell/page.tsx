"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";
import { MarketAttendancePrompt } from "@/components/market-attendance-prompt";

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

interface SellStats {
  range_days: number;
  listed: number;
  views: number;
  watchers: number;
  inquiries: number;
}

function SellContent() {
  const { user } = useRequireAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<SellStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  // When true, the items grid is filtered to only items with an open
  // inquiry. Toggled by tapping the Inquiries stat tile.
  const [inquiryFilter, setInquiryFilter] = useState(false);
  // Sold + deleted items live in a collapsed "Sold" section at the
  // bottom so they don't crowd what the dealer is actively selling.
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (!user?.dealer_id) return;

    async function load() {
      const [itemsRes, statsRes] = await Promise.all([
        apiFetch(`/api/items?dealer_id=${user!.dealer_id}`),
        apiFetch(`/api/sell/stats`),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      setLoading(false);
    }
    void load();
  }, [user]);

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

  // Stats are trailing-7-day numbers from /api/sell/stats. While the
  // payload's loading we show 0s rather than yanking the tiles in/out.
  const listed7d = stats?.listed ?? 0;
  const views7d = stats?.views ?? 0;
  const watchers7d = stats?.watchers ?? 0;
  const inquiries7d = stats?.inquiries ?? 0;
  // Inquiry-tile filter still runs against the live grid only — sold
  // items can't have open inquiries by definition. The badge count is
  // computed from items so a stale open inquiry doesn't get hidden.
  const totalInquiries = items.reduce(
    (s, i) => s + (i.inquiry_count || 0),
    0
  );
  // Split items: live (live + held — anything the dealer is actively
  // managing) vs archived (sold + soft-deleted). Held items stay with
  // the live work because they're an active in-flight state.
  const liveItems = items.filter(
    (i) => i.status !== "sold" && i.status !== "deleted"
  );
  const archivedItems = items.filter(
    (i) => i.status === "sold" || i.status === "deleted"
  );
  const visibleLive = inquiryFilter
    ? liveItems.filter((i) => i.inquiry_count > 0)
    : liveItems;

  // Single card renderer used by both the live grid and the sold
  // archive grid. Sold + deleted items get the eb-sold treatment so
  // they read as past-tense at a glance.
  const renderItemCard = (item: Item) => {
    const isSold = item.status === "sold";
    const isHeld = item.status === "hold";
    const isDeleted = item.status === "deleted";
    const hasInquiries = !isSold && item.inquiry_count > 0;
    return (
      <Link
        key={item.id}
        href={`/item/${item.id}`}
        className={`eb-grid-card${
          isSold || isDeleted ? " eb-sold" : ""
        }${hasInquiries ? " eb-grid-card-inquiry" : ""}`}
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
          {hasInquiries && (
            <div className="mt-2">
              <span className="eb-tag-inquiry">
                {item.inquiry_count}{" "}
                {item.inquiry_count === 1 ? "Inquiry" : "Inquiries"} {"→"}
              </span>
            </div>
          )}
          {!isSold && !hasInquiries && item.watcher_count > 0 && (
            <div className="text-eb-meta text-eb-muted mt-1 truncate">
              {item.watcher_count} watchers
            </div>
          )}
          {isSold && (
            <div className="text-eb-meta text-eb-muted mt-2">Sold</div>
          )}
          {isHeld && (
            <div className="mt-2">
              <span className="eb-tag-hold inline-block">HELD</span>
            </div>
          )}
          {isDeleted && (
            <div className="text-eb-meta text-eb-muted mt-2">Removed</div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <Masthead right={null} />

      {/* Weekly attendance prompt — appears when there's a featured
          market the dealer hasn't answered for yet, collapses to a
          confirmation badge once they have. */}
      <MarketAttendancePrompt />

      {/* Stats — trailing 7 days. Eyebrow above the bar makes the
          window explicit; we don't want a dealer mistaking these for
          all-time numbers. The Inquiries tile is the only actionable
          one (tap to filter the grid). When there are open inquiries
          on ANY item the tile glows orange — that filter is all-time,
          not 7-day-scoped, so a dealer never misses an open question
          even on an older item. */}
      <div className="border-b border-eb-border">
        <div className="px-5 pt-4 pb-1 text-eb-meta uppercase tracking-widest text-eb-muted">
          Last 7 days
        </div>
        <div className="eb-stats">
          <div className="eb-stat eb-stat-inert">
            <div className="eb-stat-num">{listed7d}</div>
            <div className="eb-stat-label">Listed</div>
          </div>
          <div className="eb-stat eb-stat-inert">
            <div className="eb-stat-num">{views7d}</div>
            <div className="eb-stat-label">Views</div>
          </div>
          <div className="eb-stat eb-stat-inert">
            <div className="eb-stat-num">{watchers7d}</div>
            <div className="eb-stat-label">Watchers</div>
          </div>
          <button
            type="button"
            onClick={() => totalInquiries > 0 && setInquiryFilter((v) => !v)}
            disabled={totalInquiries === 0}
            aria-pressed={inquiryFilter}
            className={`eb-stat eb-stat-button ${
              totalInquiries > 0 ? "eb-stat-urgent" : ""
            } ${inquiryFilter ? "eb-stat-active" : ""}`}
          >
            <div className="eb-stat-num">{inquiries7d}</div>
            <div className="eb-stat-label">Inquiries</div>
          </button>
        </div>
      </div>

      {/* Share your booth — links to the dealer's persistent profile
          page so the link works forever, not just for one market. */}
      {user?.dealer_id && (
        <div className="px-5 py-4 border-b border-eb-border">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Share your booth
          </div>
          <p className="text-eb-caption text-eb-muted mb-3 leading-relaxed">
            Post this link on Instagram so buyers can browse everything
            you{"’"}re selling.
          </p>
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 flex items-center py-3 px-4 bg-white border-2 border-eb-border text-eb-caption text-eb-text truncate">
              earlybird.la/d/{user.dealer_id}
            </div>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/d/${user.dealer_id}`;
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

      {/* Add listing — big obvious button above the grid */}
      <div className="px-5 py-4 border-b border-eb-border">
        <Link href="/sell/add" className="eb-btn block text-center">
          + Add a new item
        </Link>
      </div>

      {/* Items grid. Live (and held) items render at the top; sold +
          soft-deleted items live in a collapsible "Sold" section below
          so they don't crowd active inventory. */}
      <main className="pb-32">
        {liveItems.length > 0 ? (
          <>
            {inquiryFilter && (
              <div className="px-5 pt-3 pb-1 flex items-center justify-between gap-3">
                <div className="text-eb-meta text-eb-muted">
                  Showing {visibleLive.length} of {liveItems.length} — items
                  with open inquiries
                </div>
                <button
                  type="button"
                  onClick={() => setInquiryFilter(false)}
                  className="text-eb-meta text-eb-pop font-bold uppercase tracking-wider"
                >
                  Show all
                </button>
              </div>
            )}
            <div className="eb-grid mt-3">
              {visibleLive.map(renderItemCard)}
            </div>
          </>
        ) : archivedItems.length === 0 ? (
          <div className="eb-empty">
            <div className="eb-icon">○</div>
            <p>
              No items listed yet.
              <br />
              Add your first listing to get started.
            </p>
            <Link href="/sell/add">Add a listing →</Link>
          </div>
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">○</div>
            <p>
              Nothing live right now.
              <br />
              Your sold items are below.
            </p>
            <Link href="/sell/add">Add a new listing →</Link>
          </div>
        )}

        {/* Sold archive — collapsed by default. Hidden when the
            inquiry filter is on so the dealer's view stays focused on
            open questions. */}
        {archivedItems.length > 0 && !inquiryFilter && (
          <div className="mt-6 border-t border-eb-border">
            <button
              type="button"
              onClick={() => setArchiveOpen((v) => !v)}
              aria-expanded={archiveOpen}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 min-h-[44px]"
            >
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Sold ({archivedItems.length})
              </span>
              <span className="text-eb-meta text-eb-pop font-bold uppercase tracking-wider">
                {archiveOpen ? "Hide" : "Show"}
              </span>
            </button>
            {archiveOpen && (
              <div className="eb-grid">
                {archivedItems.map(renderItemCard)}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        href="/sell/add"
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

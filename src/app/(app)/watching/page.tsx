"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice, timeAgo } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";

interface FavItem {
  id: string;
  favorite_id: string;
  favorited_at: string;
  title: string;
  price: number;
  original_price: number | null;
  status: string;
  dealer_name: string;
  market_name: string;
  market_id: string;
  photo_url: string | null;
  my_inquiry_message: string | null;
  my_inquiry_status: string | null;
}

export default function WatchingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/favorites");
      if (res.ok) setItems(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
        <BottomNav active="watching" />
      </>
    );
  }

  const marketName = items[0]?.market_name;

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
        <div className="text-[10px] uppercase tracking-widest text-base-content/60">
          Watching
        </div>
        {marketName && (
          <div className="text-sm font-bold mt-1">{marketName}</div>
        )}
      </header>

      {/* Items list */}
      <main className="flex-1 pb-24">
        {items.map((item) => {
          const isSold = item.status === "sold";
          const isHeld = item.status === "hold";
          const hasInquiry = !!item.my_inquiry_status;

          return (
            <Link
              key={item.favorite_id}
              href={`/item/${item.id}`}
              className={`flex items-start gap-3 px-4 py-4 border-b border-base-300${isSold ? " opacity-60" : ""}`}
            >
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={item.title}
                  className="w-20 h-20 bg-base-200 rounded flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-base-200 rounded flex-shrink-0 flex items-center justify-center text-[9px] uppercase tracking-widest text-base-content/30">
                  Photo
                </div>
              )}
              <div className="flex-1 min-w-0">
                {/* Status/time header */}
                <div className="flex items-center gap-2 mb-1">
                  {isHeld && (
                    <div className="badge badge-warning badge-sm font-bold">
                      HELD
                    </div>
                  )}
                  {isSold && (
                    <div className="badge badge-neutral badge-sm font-bold">
                      SOLD
                    </div>
                  )}
                  {!isHeld && !isSold && (
                    <span className="text-[10px] text-base-content/60 uppercase tracking-wider">
                      {hasInquiry ? `Asked ` : `Saved `}
                      {timeAgo(item.favorited_at)}
                    </span>
                  )}
                </div>

                <div
                  className={`text-sm font-bold leading-tight truncate${isSold ? " line-through" : ""}`}
                >
                  {item.title}
                </div>
                <div className="text-xs text-base-content/60 truncate">
                  {item.dealer_name} · {item.market_name}
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`font-bold text-sm${isSold ? " line-through" : ""}`}
                  >
                    {formatPrice(item.price)}
                  </span>
                  {item.original_price && (
                    <span className="text-xs text-base-content/40 line-through">
                      {formatPrice(item.original_price)}
                    </span>
                  )}
                </div>

                {/* Heart + inquiry status */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base-content text-xs">♥</span>
                  {hasInquiry && (
                    <span className="text-[10px] uppercase tracking-wider text-base-content/60">
                      Inquiry Sent
                    </span>
                  )}
                </div>

                {/* Inquiry message */}
                {item.my_inquiry_message && (
                  <div className="text-xs text-base-content/70 italic mt-1 leading-snug">
                    &ldquo;{item.my_inquiry_message}&rdquo;
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="text-base-content/30 text-4xl mb-4">♡</div>
            <div className="text-sm font-bold mb-2">Nothing watched yet</div>
            <div className="text-xs text-base-content/60">
              Tap the heart on any item to save it here.
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <BottomNav active="watching" watchingCount={items.length} />
    </>
  );
}

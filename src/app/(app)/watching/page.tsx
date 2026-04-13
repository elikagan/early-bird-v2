"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice } from "@/lib/format";
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
          <span className="eb-spinner" />
        </div>
        <BottomNav active="watching" />
      </>
    );
  }

  return (
    <>
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
        <div className="eb-sub">Your watchlist</div>
      </header>

      <main className="pb-24">
        {items.length > 0 ? (
          <>
            <div className="eb-section">
              <span>{items.length} items</span>
            </div>
            <div className="eb-grid">
              {items.map((item) => {
                const isSold = item.status === "sold";
                const isHeld = item.status === "hold";

                return (
                  <Link
                    key={item.favorite_id}
                    href={`/item/${item.id}`}
                    className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
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
                        {item.original_price &&
                          item.original_price > item.price && (
                            <span className="eb-price-was">
                              {formatPrice(item.original_price)}
                            </span>
                          )}
                      </div>
                      <div className="eb-dealer">
                        <span className="eb-avatar eb-avatar-sm">
                          {getInitials(item.dealer_name)}
                        </span>
                        <span className="eb-dealer-name">
                          {item.dealer_name}
                        </span>
                      </div>
                      {isHeld && (
                        <div className="eb-status">
                          <span className="eb-dot eb-dot-green" />
                          <span>On hold</span>
                        </div>
                      )}
                      {isSold && (
                        <div className="eb-status">
                          <span className="eb-dot eb-dot-red" />
                          <span>Sold</span>
                        </div>
                      )}
                      {!isHeld &&
                        !isSold &&
                        item.my_inquiry_status && (
                          <div className="eb-status">
                            <span className="eb-dot eb-dot-amber" />
                            <span>Inquiry sent</span>
                          </div>
                        )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">♡</div>
            <p>
              Nothing watched yet.
              <br />
              Tap the heart on any item to save it here.
            </p>
            <Link href="/buy">Browse the drop →</Link>
          </div>
        )}
      </main>

      <BottomNav active="watching" watchingCount={items.length} />
    </>
  );
}

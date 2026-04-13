"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  const marketId = searchParams.get("market");

  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [favCount, setFavCount] = useState(0);
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
        setFavCount(favs.length);
      }

      setLoading(false);
    }

    load();
  }, [marketId, router]);

  if (loading || !market) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
        <BottomNav active="buy" />
      </>
    );
  }

  return (
    <>
      {/* Masthead */}
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
        <div className="eb-sub">
          {market.name} · {formatDate(market.starts_at)}
        </div>
      </header>

      {/* Drop bar */}
      <div className="eb-drop-bar">
        <div>
          {market.status === "live" ? (
            <>
              Drop is <span className="eb-live">LIVE</span>
            </>
          ) : (
            "Coming soon"
          )}
        </div>
        <span className="eb-cd">{items.length} items</span>
      </div>

      {/* Section label */}
      <div className="eb-section">
        <span>All listings</span>
        <span>{items.length} items</span>
      </div>

      {/* Grid */}
      <main className="pb-24">
        {items.length > 0 ? (
          <div className="eb-grid">
            {items.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";

              return (
                <Link
                  key={item.id}
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
                    <div className="eb-price">{formatPrice(item.price)}</div>
                    {isHeld && <span className="eb-tag-hold">HELD</span>}
                    <div className="eb-dealer">
                      <span className="eb-avatar eb-avatar-sm">
                        {getInitials(
                          item.dealer_display_name || item.dealer_name
                        )}
                      </span>
                      <span className="eb-dealer-name">
                        {item.dealer_display_name || item.dealer_name}
                      </span>
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
              No items in this market yet.
              <br />
              Dealers usually post the night before each drop.
            </p>
          </div>
        )}
      </main>

      <BottomNav active="buy" watchingCount={favCount} />
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

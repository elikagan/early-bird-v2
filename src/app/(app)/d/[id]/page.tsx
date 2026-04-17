"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice, formatDate } from "@/lib/format";
import { BottomNav, adjustNavCount } from "@/components/bottom-nav";
import { SignupDrawer } from "@/components/signup-drawer";
import { Masthead } from "@/components/masthead";

interface DealerProfile {
  id: string;
  business_name: string;
  instagram_handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  payment_methods: string[];
  booth_number: string | null;
  item_count: number;
}

interface Item {
  id: string;
  title: string;
  price: number;
  status: string;
  photo_url: string | null;
  thumb_url: string | null;
}

interface Market {
  id: string;
  name: string;
  starts_at: string;
  status: string;
}

function DealerPageContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const fromItem = searchParams.get("from") === "item";

  const [dealer, setDealer] = useState<DealerProfile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    async function load() {
      // Determine market: use query param or find the live market
      let marketId = searchParams.get("market");

      if (!marketId) {
        const marketsRes = await apiFetch("/api/markets");
        if (marketsRes.ok) {
          const markets: Market[] = await marketsRes.json();
          const live = markets.find((m) => m.status === "live");
          if (live) marketId = live.id;
          else if (markets.length > 0) marketId = markets[0].id;
        }
      }

      if (!marketId) {
        setLoading(false);
        return;
      }

      const fetches: Promise<Response>[] = [
        apiFetch(`/api/dealers/${id}?market_id=${marketId}`),
        apiFetch(`/api/items?market_id=${marketId}&dealer_id=${id}`),
        apiFetch(`/api/markets/${marketId}`),
      ];
      if (user) fetches.push(apiFetch("/api/favorites"));

      const [dealerRes, itemsRes, marketRes, favsRes] = await Promise.all(fetches);

      if (dealerRes.ok) setDealer(await dealerRes.json());
      if (itemsRes.ok) {
        const allItems: Item[] = await itemsRes.json();
        // Filter out deleted for public view
        setItems(allItems.filter((i) => i.status !== "deleted"));
      }
      if (marketRes.ok) setMarket(await marketRes.json());
      if (favsRes?.ok) {
        const favs: { id: string; favorite_id: string }[] = await favsRes.json();
        setFavMap(new Map(favs.map((f) => [f.id, f.favorite_id])));
      }

      setLoading(false);
    }
    if (id) load();
  }, [id, searchParams]);

  const toggleFav = useCallback(async (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const existingFavId = favMap.get(itemId);
    if (existingFavId) {
      setFavMap((prev) => { const next = new Map(prev); next.delete(itemId); return next; });
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
        setFavMap((prev) => { const next = new Map(prev); next.delete(itemId); return next; });
        adjustNavCount("watching", -1); // revert optimistic bump
      }
    }
  }, [favMap]);

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

  if (!dealer) {
    return (
      <>
        <Masthead />
        <div className="eb-empty">
          <div className="eb-icon">{"\u2205"}</div>
          <p>Dealer not found.</p>
        </div>
        <BottomNav active="buy" />
      </>
    );
  }

  const dealerName = dealer.display_name || dealer.first_name || null;
  const boothName = dealer.business_name || dealerName || "Dealer";
  const showDealerName = dealerName && dealerName !== dealer.business_name;
  const marketDate = market ? formatDate(market.starts_at) : "";

  const formatMethod = (m: string) =>
    ({ cash: "Cash", venmo: "Venmo", zelle: "Zelle", apple_pay: "Apple Pay", card: "Card" }[m] || m);

  return (
    <>
      <Masthead />

      {/* Back to listing (when navigated from item detail) */}
      {fromItem && (
        <div className="px-5 py-2.5 border-b border-eb-border">
          <button
            onClick={() => router.back()}
            className="text-eb-caption text-eb-muted"
          >
            {"\u2190"} Back to listing
          </button>
        </div>
      )}

      {/* Dealer profile */}
      <section className="px-5 pt-7 pb-5 border-b border-eb-border">
        <h2 className="text-eb-display text-eb-black leading-tight">
          {boothName}
        </h2>

        {showDealerName && (
          <div className="flex items-center gap-2 mt-2">
            <span className="eb-avatar eb-avatar-sm">
              {getInitials(dealerName)}
            </span>
            <span className="text-eb-caption text-eb-muted">{dealerName}</span>
          </div>
        )}

        <div className="text-eb-meta text-eb-muted mt-2">
          {[
            dealer.booth_number ? `Booth ${dealer.booth_number}` : null,
            market?.name,
            marketDate,
          ].filter(Boolean).join(" \u00b7 ")}
        </div>

        {dealer.instagram_handle && (
          <a
            href={`https://instagram.com/${dealer.instagram_handle.replace("@", "")}`}
            className="inline-block text-eb-meta text-eb-muted mt-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            @{dealer.instagram_handle.replace("@", "")} {"\u2197"}
          </a>
        )}

        {dealer.payment_methods.length > 0 && (
          <div className="text-eb-meta text-eb-muted mt-3 pt-3 border-t border-eb-border">
            {dealer.payment_methods.map(formatMethod).join(" \u00b7 ")}
          </div>
        )}
      </section>

      {/* Items header */}
      <div className="eb-section">
        <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
      </div>

      {/* Items grid */}
      <main className="pb-24">
        {items.length > 0 ? (
          <div className="eb-grid">
            {items.map((item) => {
              const isSold = item.status === "sold";
              const isHeld = item.status === "hold";

              const isFav = favMap.has(item.id);
              const cardContent = (
                <>
                  {user && (
                    <button className="eb-fav" onClick={(e) => toggleFav(e, item.id)}>
                      <svg viewBox="0 0 24 24" className={isFav ? "eb-fav-filled" : "eb-fav-outline"}>
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
                  </div>
                </>
              );

              return user ? (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
                >
                  {cardContent}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    localStorage.setItem("eb_return_to", `/item/${item.id}`);
                    setShowSignup(true);
                  }}
                  className={`eb-grid-card text-left${isSold ? " eb-sold" : ""}`}
                >
                  {cardContent}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">{"\u25cb"}</div>
            <p>
              {dealerName} hasn{"\u2019"}t posted any items yet.
              <br />
              Check back closer to the market.
            </p>
          </div>
        )}
      </main>

      {/* Browse full market CTA (only on direct link, not from item detail) */}
      {market && !fromItem && (
        <section className="px-5 pb-6">
          <Link
            href={`/buy?market=${market.id}`}
            className="eb-btn text-center block"
          >
            Browse all of {market.name} {"\u2192"}
          </Link>
        </section>
      )}

      <BottomNav active="buy" />

      <SignupDrawer
        open={showSignup}
        onClose={() => setShowSignup(false)}
        headline="See the full collection"
        subtext="Get early access to prices, photos, and direct dealer contact."
      />
    </>
  );
}

export default function DealerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
      }
    >
      <DealerPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatPrice, formatShortDate, getInitials } from "@/lib/format";
import {
  getAnonFavorites,
  addAnonFavorite,
  removeAnonFavorite,
} from "@/lib/anon-favorites";
import { BottomNav, adjustNavCount } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";

interface DealerProfile {
  id: string;
  business_name: string;
  instagram_handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
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
  dealer_ref: string; // dealer id of the item's owner
  dealer_name: string; // business_name
}

interface Market {
  id: string;
  name: string;
  starts_at: string;
  status: string;
}

function DealerPageContent() {
  const { id: dealerId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [dealer, setDealer] = useState<DealerProfile | null>(null);
  const [ownItems, setOwnItems] = useState<Item[]>([]);
  const [otherItems, setOtherItems] = useState<Item[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());
  // Anonymous favorites live in localStorage; we hydrate this set on
  // mount so the hearts on the grid reflect prior anon favoriting.
  const [anonFavs, setAnonFavs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Pick the market: explicit query param wins, else the earliest-by-drop
      // upcoming market this dealer is actually selling at. The items API
      // call does the heavy lifting by returning items for that specific
      // market — so we just need a market_id to anchor on.
      let marketId = searchParams.get("market");

      if (!marketId) {
        const marketsRes = await apiFetch("/api/markets");
        if (marketsRes.ok) {
          const markets: Market[] = await marketsRes.json();
          // Look for the soonest non-archived market. /api/markets returns
          // them drop_at ASC, so the first match is the earliest.
          const next = markets.find((m) => m.status === "live") || markets[0];
          if (next) marketId = next.id;
        }
      }

      if (!marketId) {
        setLoading(false);
        return;
      }

      // Two grid calls so we can preserve "dealer's own items first" ordering
      // without shipping a sort to the API. All items come from the same
      // /api/items endpoint, filtered two ways.
      const fetches: Promise<Response>[] = [
        apiFetch(`/api/dealers/${dealerId}?market_id=${marketId}`),
        apiFetch(`/api/items?market_id=${marketId}&dealer_id=${dealerId}`),
        apiFetch(`/api/items?market_id=${marketId}`),
        apiFetch(`/api/markets/${marketId}`),
      ];
      if (user) fetches.push(apiFetch("/api/favorites"));

      const [dealerRes, ownRes, allRes, marketRes, favsRes] = await Promise.all(fetches);

      if (dealerRes.ok) setDealer(await dealerRes.json());
      if (marketRes.ok) setMarket(await marketRes.json());

      const own: Item[] = ownRes.ok ? await ownRes.json() : [];
      const all: Item[] = allRes.ok ? await allRes.json() : [];

      const visibleOwn = own.filter((i) => i.status !== "deleted");
      setOwnItems(visibleOwn);

      // "Also at this show" excludes the featured dealer's items (by
      // dealer_ref) and deleted entries. Preserves API ordering.
      const ownIds = new Set(visibleOwn.map((i) => i.id));
      setOtherItems(
        all.filter((i) => i.status !== "deleted" && !ownIds.has(i.id))
      );

      if (favsRes?.ok) {
        const favs: { id: string; favorite_id: string }[] = await favsRes.json();
        setFavMap(new Map(favs.map((f) => [f.id, f.favorite_id])));
      }

      // Anon favorites from localStorage (separate from authed ones)
      if (!user) {
        setAnonFavs(getAnonFavorites());
      }

      setLoading(false);
    }
    if (dealerId) load();
  }, [dealerId, searchParams, user]);

  const toggleFav = useCallback(
    async (e: React.MouseEvent, itemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      // Anonymous favoriting: toggle in localStorage. AuthProvider
      // drains these on first login into real /api/favorites rows.
      if (!user) {
        setAnonFavs((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) {
            next.delete(itemId);
            removeAnonFavorite(itemId);
          } else {
            next.add(itemId);
            addAnonFavorite(itemId);
          }
          return next;
        });
        return;
      }
      const existingFavId = favMap.get(itemId);
      if (existingFavId) {
        setFavMap((prev) => {
          const next = new Map(prev);
          next.delete(itemId);
          return next;
        });
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
          setFavMap((prev) => {
            const next = new Map(prev);
            next.delete(itemId);
            return next;
          });
          adjustNavCount("watching", -1);
        }
      }
    },
    [favMap, user, dealerId]
  );

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

  return (
    <>
      <Masthead />

      {/* Market eyebrow — small, above the dealer block */}
      {market && (
        <div className="px-5 pt-5">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
            {market.name}
            <span className="ml-2 tabular-nums">
              {formatShortDate(market.starts_at)}
            </span>
          </div>
        </div>
      )}

      {/* Dealer card — business name big, facts small */}
      <section className="px-5 pt-2 pb-5 border-b border-eb-border">
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          {boothName}
        </h1>

        <div className="text-eb-meta text-eb-muted mt-2">
          {[
            dealerName && dealerName !== dealer.business_name ? dealerName : null,
            dealer.booth_number ? `Booth ${dealer.booth_number}` : null,
            `${ownItems.length} ${ownItems.length === 1 ? "item" : "items"} this show`,
          ]
            .filter(Boolean)
            .join(" \u00b7 ")}
        </div>

        {dealer.instagram_handle && (
          <a
            href={`https://instagram.com/${dealer.instagram_handle.replace("@", "")}`}
            className="inline-block text-eb-meta text-eb-muted mt-2 underline decoration-eb-border underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            @{dealer.instagram_handle.replace("@", "")} {"\u2197"}
          </a>
        )}
      </section>

      <main className="pb-24">
        {/* Dealer's own items — no dealer name under price since we're already
            on their page */}
        {ownItems.length > 0 ? (
          <ItemGrid
            items={ownItems}
            showDealerName={false}
            favMap={favMap}
            anonFavs={anonFavs}
            onFavToggle={toggleFav}
            user={user}
          />
        ) : (
          <div className="eb-empty">
            <div className="eb-icon">{"\u25cb"}</div>
            <p>
              Nothing posted to {market?.name || "this show"} yet.
              <br />
              Check back soon.
            </p>
          </div>
        )}

        {/* Everything else at the show */}
        {otherItems.length > 0 && (
          <>
            <div className="eb-section mt-6">
              <span>Also at this show</span>
            </div>
            <ItemGrid
              items={otherItems}
              showDealerName={true}
              favMap={favMap}
              anonFavs={anonFavs}
              onFavToggle={toggleFav}
              user={user}
            />
          </>
        )}
      </main>

      <BottomNav active="buy" />
    </>
  );
}

/**
 * Reusable grid. showDealerName = false on a dealer's own page (they're
 * already the context), true everywhere else (so a buyer scrolling the
 * "Also at this show" rail always knows whose item it is).
 */
function ItemGrid({
  items,
  showDealerName,
  favMap,
  anonFavs,
  onFavToggle,
  user,
}: {
  items: Item[];
  showDealerName: boolean;
  favMap: Map<string, string>;
  anonFavs: Set<string>;
  onFavToggle: (e: React.MouseEvent, itemId: string) => void;
  user: { id: string } | null;
}) {
  return (
    <div className="eb-grid">
      {items.map((item) => {
        const isSold = item.status === "sold";
        const isHeld = item.status === "hold";
        const isFav = user ? favMap.has(item.id) : anonFavs.has(item.id);

        return (
          <Link
            key={item.id}
            href={`/item/${item.id}`}
            className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
          >
            <button
              type="button"
              className="eb-fav"
              onClick={(e) => onFavToggle(e, item.id)}
              aria-label={isFav ? "Remove favorite" : "Add favorite"}
            >
              <svg
                viewBox="0 0 24 24"
                className={isFav ? "eb-fav-filled" : "eb-fav-outline"}
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
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
              {showDealerName && (
                <div className="eb-dealer">
                  <span className="eb-avatar eb-avatar-sm">
                    {getInitials(item.dealer_name)}
                  </span>
                  <span className="eb-dealer-name">{item.dealer_name}</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
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

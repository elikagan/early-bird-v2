"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  formatPrice,
  formatShortDate,
  getInitials,
  marketEyebrow,
} from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";

interface Market {
  id: string;
  name: string;
  location: string | null;
  drop_at: string;
  starts_at: string;
  status: string;
  archived?: number;
  dealer_count: number;
  item_count: number;
}

interface PreviewItem {
  id: string;
  title: string;
  price: number;
  status: string;
  thumb_url: string | null;
  photo_url: string | null;
  dealer_name: string;
}

const MAX_PROMO_ITEMS = 8;

/**
 * Day-granularity countdown. Mirrors the `/` page helper — same rules,
 * same output.
 */
function daysUntilLabel(iso: string): string {
  const now = new Date();
  const start = new Date(iso);
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const days = Math.round((startDay - nowDay) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Open today";
  if (days === 1) return "Opens tomorrow";
  return `Opens in ${days} days`;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [featuredItems, setFeaturedItems] = useState<PreviewItem[]>([]);
  const [pendingApp, setPendingApp] = useState(false);

  const isDealer = user?.is_dealer === 1;

  // /home is the signed-in landing. Signed-out users belong on /.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function load() {
      const [marketsRes, appRes] = await Promise.all([
        apiFetch("/api/markets"),
        user && !isDealer
          ? apiFetch("/api/dealer-applications")
          : Promise.resolve(null),
      ]);

      let upcoming: Market[] = [];
      if (marketsRes.ok) {
        const raw: Market[] = await marketsRes.json();
        // Only non-archived; API already sorts drop_at ASC so we just
        // filter. This matches the `/` page pipeline exactly.
        upcoming = raw.filter((m) => Number(m.archived ?? 0) !== 1);
        setMarkets(upcoming);
      } else {
        setMarkets([]);
      }

      if (appRes?.ok) {
        const data = await appRes.json();
        if (data.application?.status === "pending") {
          setPendingApp(true);
        }
      }

      const featured = upcoming[0];
      if (featured) {
        const itemsRes = await apiFetch(
          `/api/items?market_id=${featured.id}&limit=${MAX_PROMO_ITEMS}`
        );
        if (itemsRes.ok) {
          const items: PreviewItem[] = await itemsRes.json();
          setFeaturedItems(
            items
              .filter((i) => i.status !== "deleted")
              .slice(0, MAX_PROMO_ITEMS)
          );
        }
      }
    }
    if (user) load();
  }, [user, isDealer]);

  if (authLoading || !user || markets === null) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
        <BottomNav active="buy" />
      </>
    );
  }

  const featured = markets[0] ?? null;
  const comingUp = markets.slice(1);

  return (
    <>
      <Masthead href={null} right={null} />

      {/* Pending dealer application banner */}
      {pendingApp && (
        <div className="px-5 py-3 bg-eb-cream border-b-2 border-eb-pop">
          <div className="text-eb-caption font-bold text-eb-black uppercase tracking-wider">
            Application under review
          </div>
          <p className="text-eb-meta text-eb-muted mt-0.5">
            We{"\u2019"}re reviewing your dealer application. We{"\u2019"}ll
            text you when you{"\u2019"}re approved. Browse as a buyer in the
            meantime.
          </p>
        </div>
      )}

      {featured ? (
        <>
          {/* Featured market — same pattern as / and /buy: muted
              eyebrow (date + location) then display name then stats. */}
          <section className="px-5 pt-5 pb-5 border-b border-eb-border">
            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
              {marketEyebrow(featured.starts_at)} {"\u00b7"}{" "}
              {formatShortDate(featured.starts_at)}
              {featured.location ? <> {"\u00b7"} {featured.location}</> : null}
            </div>
            <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
              {featured.name}
            </h1>
            {(featured.dealer_count > 0 || featured.item_count > 0) && (
              <div className="text-eb-meta text-eb-muted mt-2">
                {featured.item_count} items {"\u00b7"} {featured.dealer_count}{" "}
                dealers
              </div>
            )}
          </section>

          {/* Promo grid — 2-wide, first N items of the featured market. */}
          {featuredItems.length > 0 && (
            <div className="eb-grid">
              {featuredItems.map((item) => {
                const isSold = item.status === "sold";
                const isHeld = item.status === "hold";
                return (
                  <Link
                    key={item.id}
                    href={`/item/${item.id}`}
                    className={`eb-grid-card${isSold ? " eb-sold" : ""}`}
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
                      <div className="flex items-center gap-2">
                        <div className="eb-price">{formatPrice(item.price)}</div>
                        {isHeld && <span className="eb-tag-hold">HELD</span>}
                      </div>
                      <div className="eb-dealer">
                        <span className="eb-avatar eb-avatar-sm">
                          {getInitials(item.dealer_name)}
                        </span>
                        <span className="eb-dealer-name">
                          {item.dealer_name}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Browse-all CTA — signed-in users go to /buy?market= */}
          <div className="px-5 pt-4 pb-6 border-b border-eb-border">
            <Link
              href={`/buy?market=${featured.id}`}
              className="eb-btn block text-center"
            >
              Browse all {featured.item_count} items {"\u2192"}
            </Link>
          </div>

          {/* Coming up — editorial rows */}
          {comingUp.length > 0 && (
            <section className="pt-6 pb-24">
              <div className="px-5 text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                Coming up
              </div>
              <div className="divide-y divide-eb-border border-y border-eb-border">
                {comingUp.map((m) => (
                  <Link
                    key={m.id}
                    href={`/buy?market=${m.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 active:bg-eb-border/20"
                  >
                    <div className="min-w-0">
                      <div className="text-eb-body font-bold text-eb-black truncate">
                        {m.name}
                      </div>
                      <div className="text-eb-meta text-eb-muted mt-1 tabular-nums">
                        {formatShortDate(m.starts_at)}
                        {m.location ? <> {"\u00b7"} {m.location}</> : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
                        {daysUntilLabel(m.starts_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="px-5 py-12 text-center">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
            Between shows
          </div>
          <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
            Nothing up right now
          </h1>
          <p className="text-eb-caption text-eb-muted mt-3 leading-relaxed">
            Next market hasn{"\u2019"}t been announced yet. Check back soon.
          </p>
        </section>
      )}

      <BottomNav active="buy" />
    </>
  );
}

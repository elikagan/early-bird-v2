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
  daysUntilShort,
} from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";

export interface Market {
  id: string;
  name: string;
  location: string | null;
  drop_at: string | null;
  starts_at: string;
  status: string;
  archived?: number;
  dealer_count: number;
}

export interface PreviewItem {
  id: string;
  title: string;
  price: number;
  status: string;
  thumb_url: string | null;
  photo_url: string | null;
  dealer_name: string;
}

export default function HomeView({
  featured,
  initialMarkets,
  initialFeaturedItems,
}: {
  featured: Market | null;
  initialMarkets: Market[];
  initialFeaturedItems: PreviewItem[];
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pendingApp, setPendingApp] = useState(false);

  const isDealer = user?.is_dealer === 1;
  const featuredItems = initialFeaturedItems;
  const comingUp = featured
    ? initialMarkets.filter((m) => m.id !== featured.id)
    : initialMarkets;

  // /home is the signed-in landing. Signed-out users belong on /.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Dealer-application banner — only for signed-in non-dealers.
  useEffect(() => {
    if (!user || isDealer) return;
    apiFetch("/api/dealer-applications").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.application?.status === "pending") setPendingApp(true);
    });
  }, [user, isDealer]);

  if (authLoading || !user) {
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
              This week
            </div>
            <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
              {featured.name}
            </h1>
            <div className="text-eb-meta text-eb-muted mt-2">
              {formatShortDate(featured.starts_at)}
              {featured.dealer_count > 0
                ? ` \u00b7 ${featured.dealer_count} dealers selling`
                : ""}
            </div>
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
              Browse {featured.name} {"\u2192"}
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
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
                        {daysUntilShort(m.starts_at)}
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

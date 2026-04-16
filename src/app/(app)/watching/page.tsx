"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { Masthead } from "@/components/masthead";
import { SignupDrawer } from "@/components/signup-drawer";

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
  thumb_url: string | null;
  my_inquiry_message: string | null;
  my_inquiry_status: string | null;
}

export default function WatchingPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    async function load() {
      const res = await apiFetch("/api/favorites");
      if (res.ok) setItems(await res.json());
      setLoading(false);
    }
    load();
  }, [user, authLoading]);

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

  // Logged-out: prompt to sign up
  if (!user) {
    return (
      <>
        <Masthead right={null} />
        <div className="eb-empty">
          <div className="eb-icon">{"\u2661"}</div>
          <p>
            Sign up to save items to your watchlist
            and get notified about price drops.
          </p>
          <button
            onClick={() => {
              localStorage.setItem("eb_return_to", "/watching");
              setShowSignup(true);
            }}
            className="eb-btn mt-4"
          >
            Sign up {"\u2192"}
          </button>
        </div>
        <BottomNav active="watching" />
        <SignupDrawer
          open={showSignup}
          onClose={() => setShowSignup(false)}
          headline="Never miss a price drop"
          subtext="Save items and get texted the instant a price changes."
        />
      </>
    );
  }

  return (
    <>
      <Masthead right={null} />

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
                const isDeleted = item.status === "deleted";

                return (
                  <Link
                    key={item.favorite_id}
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
                      {isDeleted && (
                        <div className="eb-status">
                          <span className="eb-dot eb-dot-red" />
                          <span>Removed by dealer</span>
                        </div>
                      )}
                      {!isHeld &&
                        !isSold &&
                        !isDeleted &&
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
            <Link href="/home">Browse listings {"\u2192"}</Link>
          </div>
        )}
      </main>

      <BottomNav active="watching" watchingCount={items.length} />
    </>
  );
}

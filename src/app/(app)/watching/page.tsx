"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPrice } from "@/lib/format";
import { BottomNav, adjustNavCount } from "@/components/bottom-nav";
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

  const unfavorite = useCallback(async (e: React.MouseEvent, favId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setItems((prev) => prev.filter((i) => i.favorite_id !== favId));
    adjustNavCount("watching", -1);
    await apiFetch(`/api/favorites/${favId}`, { method: "DELETE" });
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

  // Logged-out: prompt to sign up
  if (!user) {
    return (
      <>
        <Masthead right={null} />
        <div className="eb-empty">
          <div className="eb-icon">{"\u2661"}</div>
          <p>
            Sign in to save items to your watchlist
            and get notified about price drops.
          </p>
          <button
            onClick={() => {
              localStorage.setItem("eb_return_to", "/watching");
              setShowSignup(true);
            }}
            className="eb-btn mt-4"
          >
            Sign in {"\u2192"}
          </button>
        </div>
        <BottomNav active="watching" />
        <SignupDrawer
          open={showSignup}
          onClose={() => setShowSignup(false)}
          headline="Sign in to save items"
          subtext="We'll text a sign-in link. Once you're in, hearts on any listing save it to this watchlist and you'll get pinged on price changes."
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
                    <button className="eb-fav" onClick={(e) => unfavorite(e, item.favorite_id)}>
                      <svg viewBox="0 0 24 24" className="eb-fav-filled">
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
                          <span className="eb-dot eb-dot-amber" />
                          <span>On hold</span>
                        </div>
                      )}
                      {isSold && item.my_inquiry_status === "sold" && (
                        <div className="eb-status">
                          <span className="eb-dot eb-dot-green" />
                          <span className="text-eb-black font-bold">
                            Sold to you
                          </span>
                        </div>
                      )}
                      {isSold && item.my_inquiry_status !== "sold" && (
                        <div className="eb-status">
                          <span className="eb-dot bg-eb-muted" />
                          <span>Sold to another buyer</span>
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
              Browse items, then tap the heart on anything you want to save here.
            </p>
            <Link href="/">Browse listings {"\u2192"}</Link>
          </div>
        )}
      </main>

      <BottomNav active="watching" />
    </>
  );
}

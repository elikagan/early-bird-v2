"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

type Tab = "buy" | "watching" | "sell" | "account" | null;

const CACHE_KEY = "eb_nav_counts";

interface Counts {
  watching: number | null;
  sell: number | null;
}

/** Synchronously read the last-known counts from localStorage so the
 *  badges render instantly on page load — no flash from "Watching" →
 *  "Watching (3)" when the fetch completes. */
function readCachedCounts(): Counts {
  if (typeof window === "undefined") return { watching: null, sell: null };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { watching: null, sell: null };
    const parsed = JSON.parse(raw);
    return {
      watching: typeof parsed.watching === "number" ? parsed.watching : null,
      sell: typeof parsed.sell === "number" ? parsed.sell : null,
    };
  } catch {
    return { watching: null, sell: null };
  }
}

function writeCachedCounts(counts: Counts) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(counts));
  } catch {}
}

export function BottomNav({
  active,
  watchingCount,
  sellCount,
}: {
  active: Tab;
  /** Optional override — if a page already knows the fresh count
   *  (e.g. the watching page after a toggle), pass it in and it
   *  wins over the cached/fetched default. */
  watchingCount?: number;
  sellCount?: number;
}) {
  const { user } = useAuth();
  const isDealer = user?.is_dealer === 1;
  const isLoggedIn = !!user;

  // Hydrate from localStorage on first render so badges show correct
  // numbers immediately — avoids the "Watching" → "Watching (3)" flash
  // on every navigation.
  const [counts, setCounts] = useState<Counts>(() => readCachedCounts());

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/nav-counts");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const fresh: Counts = {
          watching: typeof data.watching === "number" ? data.watching : null,
          sell: typeof data.sell === "number" ? data.sell : null,
        };
        setCounts(fresh);
        writeCachedCounts(fresh);
      } catch {
        // Network error — keep whatever cached counts we already had.
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Clear the cache when the user logs out so the next user doesn't
  // briefly see the previous user's numbers.
  useEffect(() => {
    if (!isLoggedIn) {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
    }
  }, [isLoggedIn]);

  // Sync prop overrides into the cache so navigating away from a page
  // that just mutated a count (e.g. unhearting on /watching) doesn't
  // briefly show the stale value on the next page.
  useEffect(() => {
    if (watchingCount == null && sellCount == null) return;
    setCounts((prev) => {
      const next: Counts = {
        watching: watchingCount ?? prev.watching,
        sell: sellCount ?? prev.sell,
      };
      writeCachedCounts(next);
      return next;
    });
  }, [watchingCount, sellCount]);

  // Prop override wins over cached/fetched — used when a page knows
  // its local state is fresher than the last sync.
  const effectiveWatching = watchingCount ?? counts.watching;
  const effectiveSell = sellCount ?? counts.sell;

  const watchLabel =
    effectiveWatching != null && effectiveWatching > 0
      ? `Watching (${effectiveWatching})`
      : "Watching";
  const sellLabel =
    effectiveSell != null && effectiveSell > 0
      ? `Sell (${effectiveSell})`
      : "Sell";

  // Signed-out users never see the bottom nav. They reach sign-in via
  // the top-right SignInLink in the masthead, matching web conventions
  // (Airbnb, Etsy, StockX, Depop). The previous lone-button signed-out
  // branch rendered as a 5px-tall vestigial bar — dead code removed.
  if (!isLoggedIn) return null;

  return (
    <nav className="eb-bnav">
      <Link href="/home">
        <span className={active === "buy" ? "eb-active" : ""}>Buy</span>
      </Link>
      <Link href="/watching">
        <span className={active === "watching" ? "eb-active" : ""}>
          {watchLabel}
        </span>
      </Link>
      {isDealer && (
        <Link href="/sell">
          <span className={active === "sell" ? "eb-active" : ""}>
            {sellLabel}
          </span>
        </Link>
      )}
      <Link href="/account">
        <span className={active === "account" ? "eb-active" : ""}>
          Account
        </span>
      </Link>
    </nav>
  );
}

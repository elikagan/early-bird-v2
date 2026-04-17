"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

type Tab = "buy" | "watching" | "sell" | "account" | null;

const CACHE_KEY = "eb_nav_counts";
const COUNTS_EVENT = "eb-nav-counts-updated";

interface Counts {
  watching: number | null;
  sell: number | null;
}

/** Synchronously read the last-known counts from localStorage so the
 *  badges render instantly on page load — no flash. */
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
    window.dispatchEvent(new CustomEvent(COUNTS_EVENT, { detail: counts }));
  } catch {}
}

/** Optimistic update helper for pages that mutate favorites/items.
 *  Call this after a successful mutation — e.g. after a favorite
 *  toggle or an item create/delete — and the bottom nav badge
 *  updates instantly across all mounted instances.
 *
 *  Example:
 *    await apiFetch("/api/favorites", { method: "POST", ... });
 *    adjustNavCount("watching", +1);
 */
export function adjustNavCount(key: "watching" | "sell", delta: number) {
  if (typeof window === "undefined") return;
  const current = readCachedCounts();
  const currentValue = typeof current[key] === "number" ? current[key]! : 0;
  const next: Counts = {
    ...current,
    [key]: Math.max(0, currentValue + delta),
  };
  writeCachedCounts(next);
}

export function BottomNav({ active }: { active: Tab }) {
  const { user } = useAuth();
  const isDealer = user?.is_dealer === 1;
  const isLoggedIn = !!user;

  // Hydrate synchronously from localStorage — first paint already has
  // the correct numbers from the last session.
  const [counts, setCounts] = useState<Counts>(() => readCachedCounts());

  // Fetch the authoritative counts once per mount and update the cache.
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
        // Network error — keep the cached counts.
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Listen for optimistic updates from other pages in the same tab
  // (e.g. user favorites an item on /buy — the badge updates without
  // waiting for a refetch).
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<Counts>).detail;
      if (detail) setCounts(detail);
    }
    window.addEventListener(COUNTS_EVENT, handler);
    return () => window.removeEventListener(COUNTS_EVENT, handler);
  }, []);

  // Cross-tab sync: pick up updates from other tabs via localStorage events.
  useEffect(() => {
    function handler(e: StorageEvent) {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCounts({
            watching: typeof parsed.watching === "number" ? parsed.watching : null,
            sell: typeof parsed.sell === "number" ? parsed.sell : null,
          });
        } catch {}
      }
    }
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Clear the cache when the user logs out so the next user doesn't
  // briefly see the previous user's numbers.
  useEffect(() => {
    if (!isLoggedIn) {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
    }
  }, [isLoggedIn]);

  const watchLabel =
    counts.watching != null && counts.watching > 0
      ? `Watching (${counts.watching})`
      : "Watching";
  const sellLabel =
    counts.sell != null && counts.sell > 0
      ? `Sell (${counts.sell})`
      : "Sell";

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

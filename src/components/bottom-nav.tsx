"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

type Tab = "buy" | "watching" | "sell" | "account" | null;

export function BottomNav({
  active,
  watchingCount,
  sellCount,
}: {
  active: Tab;
  /** Optional override — if a page already knows the fresh count
   *  (e.g. the watching page after a toggle), pass it in and it
   *  wins over the fetched default. */
  watchingCount?: number;
  sellCount?: number;
}) {
  const { user } = useAuth();
  const isDealer = user?.is_dealer === 1;
  const isLoggedIn = !!user;

  // Default counts fetched from /api/nav-counts so every page renders
  // consistent badges regardless of which tab the user is viewing.
  const [fetchedWatching, setFetchedWatching] = useState<number | null>(null);
  const [fetchedSell, setFetchedSell] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/nav-counts");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setFetchedWatching(typeof data.watching === "number" ? data.watching : null);
        setFetchedSell(typeof data.sell === "number" ? data.sell : null);
      } catch {
        // Network error — silently fall back to no badge numbers.
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Prop override wins over fetched. Fetched wins over nothing.
  const effectiveWatching = watchingCount ?? fetchedWatching;
  const effectiveSell = sellCount ?? fetchedSell;

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

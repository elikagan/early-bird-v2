"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Tab = "buy" | "watching" | "sell" | "account" | null;

export function BottomNav({
  active,
  watchingCount,
  sellCount,
}: {
  active: Tab;
  watchingCount?: number;
  sellCount?: number;
}) {
  const { user } = useAuth();
  const isDealer = user?.is_dealer === 1;
  const isLoggedIn = !!user;
  const watchLabel =
    watchingCount != null && watchingCount > 0
      ? `Watching (${watchingCount})`
      : "Watching";
  const sellLabel =
    sellCount != null && sellCount > 0 ? `Sell (${sellCount})` : "Sell";

  if (!isLoggedIn) {
    return (
      <nav className="eb-bnav">
        <Link href="/">
          <span className="eb-active">Sign Up</span>
        </Link>
      </nav>
    );
  }

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

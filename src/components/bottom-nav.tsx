"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Tab = "buy" | "watching" | "sell" | "account" | null;

export function BottomNav({
  active,
  watchingCount,
}: {
  active: Tab;
  watchingCount?: number;
}) {
  const { user } = useAuth();
  const isDealer = user?.is_dealer === 1;
  const watchLabel =
    watchingCount != null && watchingCount > 0
      ? `Watching (${watchingCount})`
      : "Watching";

  return (
    <nav className="eb-bnav">
      <Link href="/buy">
        <span className={active === "buy" ? "eb-active" : ""}>
          Buy{active === "buy" && <span className="eb-bnav-dot" />}
        </span>
      </Link>
      <Link href="/watching">
        <span className={active === "watching" ? "eb-active" : ""}>
          {watchLabel}{active === "watching" && <span className="eb-bnav-dot" />}
        </span>
      </Link>
      {isDealer && (
        <Link href="/sell">
          <span className={active === "sell" ? "eb-active" : ""}>
            Sell{active === "sell" && <span className="eb-bnav-dot" />}
          </span>
        </Link>
      )}
      <Link href="/account">
        <span className={active === "account" ? "eb-active" : ""}>
          Account{active === "account" && <span className="eb-bnav-dot" />}
        </span>
      </Link>
    </nav>
  );
}

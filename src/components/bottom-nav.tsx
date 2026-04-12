"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Tab = "buy" | "watching" | "sell" | "account" | null;

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  const cls = active
    ? "flex-1 flex flex-col items-center py-3 text-base-content font-bold border-t-2 border-neutral"
    : "flex-1 flex flex-col items-center py-3 text-base-content/60";
  return (
    <Link href={href} className={cls}>
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </Link>
  );
}

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
    <nav className="max-w-md mx-auto fixed bottom-0 left-0 right-0 bg-base-200 flex">
      <NavItem href="/buy" label="Buy" active={active === "buy"} />
      <NavItem
        href="/watching"
        label={watchLabel}
        active={active === "watching"}
      />
      <div className="w-px bg-base-300 my-2"></div>
      {isDealer && (
        <NavItem href="/sell" label="Sell" active={active === "sell"} />
      )}
      <NavItem
        href="/account"
        label="Account"
        active={active === "account"}
      />
    </nav>
  );
}

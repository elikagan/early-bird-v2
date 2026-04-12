"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { getInitials, formatPhone } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";

interface UserProfile {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  is_dealer: number;
  dealer_id: string | null;
  business_name: string | null;
  instagram_handle: string | null;
  market_follows: Array<{ market_id: string; market_name: string }>;
  notification_preferences: Array<{ key: string; enabled: number }>;
  payment_methods?: Array<{ method: string; enabled: number }>;
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "venmo", label: "Venmo" },
  { key: "zelle", label: "Zelle" },
  { key: "apple_pay", label: "Apple Pay / Card" },
];

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isDealer = user?.is_dealer === 1;

  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/users/me");
      if (res.ok) setProfile(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  const getPref = (key: string): boolean => {
    const p = profile?.notification_preferences?.find((n) => n.key === key);
    return p ? p.enabled === 1 : false;
  };

  const getPayment = (method: string): boolean => {
    const p = profile?.payment_methods?.find((m) => m.method === method);
    return p ? p.enabled === 1 : false;
  };

  if (loading || !profile) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
        <BottomNav active="account" />
      </>
    );
  }

  const displayName =
    profile.display_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "User";

  return (
    <>
      {/* Header */}
      <header className="px-4 pt-6 pb-3 border-b border-base-300">
        <div className="flex items-center justify-between">
          <Link href="/home" className="text-lg font-bold tracking-tight">
            EARLY BIRD
          </Link>
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-8 rounded-full">
              <span className="text-xs font-bold">
                {getInitials(displayName)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Profile */}
      <section className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-16 rounded-full">
              <span className="text-xl font-bold">
                {getInitials(displayName)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{displayName}</div>
            <div className="text-xs text-base-content/60">
              {formatPhone(profile.phone)}
            </div>
          </div>
          <button className="btn btn-ghost btn-xs rounded-full gap-1 text-base-content/60">
            Edit ✎
          </button>
        </div>
      </section>

      {/* Dealer: Business name + Instagram */}
      {isDealer && (
        <>
          <section className="px-4 pb-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
                  Business Name
                </span>
              </div>
              <input
                type="text"
                defaultValue={profile.business_name || ""}
                className="input input-bordered w-full"
                readOnly
              />
            </label>
          </section>
          <section className="px-4 pb-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
                  Instagram
                </span>
                <span className="label-text-alt text-xs text-base-content/40">
                  Optional
                </span>
              </div>
              <input
                type="text"
                defaultValue={profile.instagram_handle || ""}
                placeholder="@yourhandle"
                className="input input-bordered w-full"
                readOnly
              />
            </label>
          </section>
        </>
      )}

      {/* Buyer: Stats */}
      {!isDealer && (
        <section className="px-4 pb-4">
          <div className="stats stats-horizontal bg-base-200 w-full">
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase tracking-wider">
                Watching
              </div>
              <div className="stat-value text-xl">—</div>
            </div>
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase tracking-wider">
                Inquiries
              </div>
              <div className="stat-value text-xl">—</div>
            </div>
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase tracking-wider">
                Bought
              </div>
              <div className="stat-value text-xl">—</div>
            </div>
          </div>
        </section>
      )}

      <div className="divider mx-4 my-0"></div>

      {/* Dealer: Payment methods */}
      {isDealer && (
        <>
          <section className="px-4 py-5">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-1">
              Payment Methods
            </div>
            <div className="text-[10px] text-base-content/60 mb-3 leading-relaxed max-w-[22rem]">
              Buyers see which methods you accept. Payment happens in person at
              the booth.
            </div>
            {PAYMENT_METHODS.map((pm, i) => (
              <div
                key={pm.key}
                className={`flex items-center gap-3 py-3${i < PAYMENT_METHODS.length - 1 ? " border-b border-base-300" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={getPayment(pm.key)}
                  className="checkbox checkbox-sm"
                  readOnly
                />
                <div className="font-bold text-sm">{pm.label}</div>
              </div>
            ))}
          </section>
          <div className="divider mx-4 my-0"></div>
        </>
      )}

      {/* Notifications */}
      <section className="px-4 py-5">
        <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
          Notifications
        </div>
        {isDealer ? (
          <>
            <div className="form-control">
              <label className="label cursor-pointer justify-between p-0 py-3 gap-4 border-b border-base-300">
                <div className="flex-1">
                  <div className="text-sm font-bold">New Inquiries</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    Text me when a buyer sends an inquiry
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref("new_inquiries")}
                  className="toggle"
                  readOnly
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-between p-0 py-3 gap-4 border-b border-base-300">
                <div className="flex-1">
                  <div className="text-sm font-bold">Drop Reminders</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    Text me the day before a drop
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref("drop_reminders")}
                  className="toggle"
                  readOnly
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-between p-0 py-3 gap-4">
                <div className="flex-1">
                  <div className="text-sm font-bold">Watcher Milestones</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    Text me when items hit 10+ watchers
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref("watcher_milestones")}
                  className="toggle"
                  readOnly
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="form-control">
              <label className="label cursor-pointer justify-between p-0 py-3 gap-4 border-b border-base-300">
                <div className="flex-1">
                  <div className="text-sm font-bold">Drop Alerts</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    Text me when markets I follow go live
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref("drop_alerts")}
                  className="toggle"
                  readOnly
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-between p-0 py-3 gap-4 border-b border-base-300">
                <div className="flex-1">
                  <div className="text-sm font-bold">Price Drops</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    Text me when watched items drop in price
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref("price_drops")}
                  className="toggle"
                  readOnly
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-between p-0 py-3 gap-4">
                <div className="flex-1">
                  <div className="text-sm font-bold">New Markets</div>
                  <div className="text-xs text-base-content/60 leading-tight mt-0.5">
                    Text me when new LA markets are added
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref("new_markets")}
                  className="toggle"
                  readOnly
                />
              </label>
            </div>
          </>
        )}
      </section>

      <div className="divider mx-4 my-0"></div>

      {/* Buyer: Become a seller */}
      {!isDealer && (
        <>
          <section className="px-4 py-5">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              Become A Seller
            </div>
            <div className="text-sm leading-relaxed">
              Are you selling at an upcoming market and wanna post here for
              free?{" "}
              <a href="#" className="link font-bold">
                Learn more →
              </a>
            </div>
          </section>
          <div className="divider mx-4 my-0"></div>
        </>
      )}

      {/* More */}
      <section className="px-4 py-5 pb-8">
        <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
          More
        </div>

        {isDealer && (
          <>
            <a className="flex items-center justify-between py-3 border-b border-base-300">
              <div className="text-sm font-bold">Dealer Help</div>
              <div className="text-sm text-base-content/40">›</div>
            </a>
            <a className="flex items-center justify-between py-3 border-b border-base-300">
              <div className="text-sm font-bold">Sales History</div>
              <div className="text-sm text-base-content/40">›</div>
            </a>
          </>
        )}
        {!isDealer && (
          <a className="flex items-center justify-between py-3 border-b border-base-300">
            <div className="text-sm font-bold">Help &amp; Support</div>
            <div className="text-sm text-base-content/40">›</div>
          </a>
        )}
        <a className="flex items-center justify-between py-3 border-b border-base-300">
          <div className="text-sm font-bold">Privacy Policy</div>
          <div className="text-sm text-base-content/40">›</div>
        </a>
        <a className="flex items-center justify-between py-3 border-b border-base-300">
          <div className="text-sm font-bold">Terms</div>
          <div className="text-sm text-base-content/40">›</div>
        </a>

        <button
          className="btn btn-sm btn-outline w-full mt-6"
          onClick={logout}
        >
          Sign Out
        </button>
        <div className="text-xs text-base-content/60 text-center mt-4">
          Early Bird v1.0 · LA{isDealer ? " · Dealer Account" : ""}
        </div>
      </section>

      <div className="h-16"></div>
      <BottomNav active="account" />
    </>
  );
}

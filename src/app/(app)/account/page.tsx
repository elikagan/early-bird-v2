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
          <span className="eb-spinner" />
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
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
      </header>

      {/* Profile */}
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <span className="eb-avatar eb-avatar-xl">
            {getInitials(displayName)}
          </span>
          <div className="flex-1">
            <div className="text-eb-body font-bold text-eb-black">
              {displayName}
            </div>
            <div className="text-eb-meta text-eb-muted">
              {formatPhone(profile.phone)}
            </div>
          </div>
          <button className="text-eb-meta text-eb-muted">Edit</button>
        </div>
      </section>

      {/* Dealer: Business name + Instagram */}
      {isDealer && (
        <>
          <section className="px-5 pb-4">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1.5">
              Business Name
            </div>
            <input
              type="text"
              defaultValue={profile.business_name || ""}
              className="eb-input"
              readOnly // readOnly: will be editable in Session 2
            />
          </section>
          <section className="px-5 pb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Instagram
              </span>
              <span className="text-eb-meta text-eb-light">Optional</span>
            </div>
            <input
              type="text"
              defaultValue={profile.instagram_handle || ""}
              placeholder="@yourhandle"
              className="eb-input"
              readOnly // readOnly: will be editable in Session 2
            />
          </section>
        </>
      )}

      {/* Buyer: Stats */}
      {!isDealer && (
        <div className="eb-stats border-y border-eb-border">
          <div className="eb-stat">
            <div className="eb-stat-num">&mdash;</div>
            <div className="eb-stat-label">Watching</div>
          </div>
          <div className="eb-stat">
            <div className="eb-stat-num">&mdash;</div>
            <div className="eb-stat-label">Inquiries</div>
          </div>
          <div className="eb-stat">
            <div className="eb-stat-num">&mdash;</div>
            <div className="eb-stat-label">Bought</div>
          </div>
        </div>
      )}

      <div className="border-t border-eb-border mx-5" />

      {/* Dealer: Payment methods */}
      {isDealer && (
        <>
          <section className="px-5 py-5">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
              Payment Methods
            </div>
            <div className="text-eb-micro text-eb-muted mb-3 leading-relaxed max-w-[22rem]">
              Buyers see which methods you accept. Payment happens in person at
              the booth.
            </div>
            {PAYMENT_METHODS.map((pm, i) => (
              <div
                key={pm.key}
                className={`flex items-center gap-3 py-3${i < PAYMENT_METHODS.length - 1 ? " border-b border-eb-border" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={getPayment(pm.key)}
                  className="eb-check"
                  readOnly // readOnly: will be toggleable in Session 2
                />
                <div className="text-eb-body font-bold text-eb-black">
                  {pm.label}
                </div>
              </div>
            ))}
          </section>
          <div className="border-t border-eb-border mx-5" />
        </>
      )}

      {/* Notifications */}
      <section className="px-5 py-5">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Notifications
        </div>
        {isDealer ? (
          <>
            {[
              {
                key: "new_inquiries",
                title: "New Inquiries",
                desc: "Text me when a buyer sends an inquiry",
              },
              {
                key: "drop_reminders",
                title: "Drop Reminders",
                desc: "Text me the day before a drop",
              },
              {
                key: "watcher_milestones",
                title: "Watcher Milestones",
                desc: "Text me when items hit 10+ watchers",
              },
            ].map((n, i, arr) => (
              <label
                key={n.key}
                className={`flex items-center justify-between py-3 gap-4 cursor-pointer${i < arr.length - 1 ? " border-b border-eb-border" : ""}`}
              >
                <div className="flex-1">
                  <div className="text-eb-body font-bold text-eb-black">
                    {n.title}
                  </div>
                  <div className="text-eb-meta text-eb-muted leading-tight mt-0.5">
                    {n.desc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref(n.key)}
                  className="eb-toggle"
                  readOnly // readOnly: will be toggleable in Session 2
                />
              </label>
            ))}
          </>
        ) : (
          <>
            {[
              {
                key: "drop_alerts",
                title: "Drop Alerts",
                desc: "Text me when markets I follow go live",
              },
              {
                key: "price_drops",
                title: "Price Drops",
                desc: "Text me when watched items drop in price",
              },
              {
                key: "new_markets",
                title: "New Markets",
                desc: "Text me when new LA markets are added",
              },
            ].map((n, i, arr) => (
              <label
                key={n.key}
                className={`flex items-center justify-between py-3 gap-4 cursor-pointer${i < arr.length - 1 ? " border-b border-eb-border" : ""}`}
              >
                <div className="flex-1">
                  <div className="text-eb-body font-bold text-eb-black">
                    {n.title}
                  </div>
                  <div className="text-eb-meta text-eb-muted leading-tight mt-0.5">
                    {n.desc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={getPref(n.key)}
                  className="eb-toggle"
                  readOnly // readOnly: will be toggleable in Session 2
                />
              </label>
            ))}
          </>
        )}
      </section>

      <div className="border-t border-eb-border mx-5" />

      {/* Buyer: Become a seller */}
      {!isDealer && (
        <>
          <section className="px-5 py-5">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              Become A Seller
            </div>
            <div className="text-eb-body text-eb-text leading-relaxed">
              Are you selling at an upcoming market and wanna post here for
              free? Reach out to us — we&apos;ll get you set up.
            </div>
          </section>
          <div className="border-t border-eb-border mx-5" />
        </>
      )}

      {/* More */}
      <section className="px-5 py-5 pb-8">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          More
        </div>

        <div className="flex items-center justify-between py-3 border-b border-eb-border">
          <div className="text-eb-body font-bold text-eb-black">
            Privacy Policy
          </div>
          <div className="text-eb-body text-eb-light">&rsaquo;</div>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-eb-border">
          <div className="text-eb-body font-bold text-eb-black">Terms</div>
          <div className="text-eb-body text-eb-light">&rsaquo;</div>
        </div>

        <button
          className="w-full mt-6 py-2.5 text-eb-caption font-bold border-2 border-eb-black text-eb-black uppercase tracking-wider"
          onClick={logout}
        >
          Sign Out
        </button>
        <div className="text-eb-meta text-eb-muted text-center mt-4">
          Early Bird v1.0 · LA{isDealer ? " · Dealer Account" : ""}
        </div>
      </section>

      <div className="h-16" />
      <BottomNav active="account" />
    </>
  );
}

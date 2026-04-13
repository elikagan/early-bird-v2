"use client";

import { useEffect, useState, useCallback } from "react";
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
  watching_count: number;
  inquiries_count: number;
  bought_count: number;
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "venmo", label: "Venmo" },
  { key: "zelle", label: "Zelle" },
  { key: "apple_pay", label: "Apple Pay / Card" },
];

export default function AccountPage() {
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [bizValue, setBizValue] = useState("");
  const [bizSaving, setBizSaving] = useState(false);
  const [igValue, setIgValue] = useState("");
  const [igSaving, setIgSaving] = useState(false);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const isDealer = user?.is_dealer === 1;

  const loadProfile = useCallback(async () => {
    const res = await apiFetch("/api/users/me");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setNameValue(data.display_name || "");
      setBizValue(data.business_name || "");
      setIgValue(data.instagram_handle || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Save helpers ──

  const saveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Name can't be blank");
      return;
    }
    if (trimmed.length > 30) {
      setNameError("Max 30 characters");
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      setProfile((p) => (p ? { ...p, display_name: trimmed } : p));
      setEditingName(false);
      refreshUser();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setNameSaving(false);
    }
  }, [nameValue, refreshUser]);

  const saveField = useCallback(
    async (field: "business_name" | "instagram_handle", value: string) => {
      const setter = field === "business_name" ? setBizSaving : setIgSaving;
      setter(true);
      try {
        const res = await apiFetch("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          setProfile((p) => (p ? { ...p, [field]: value || null } : p));
        }
      } finally {
        setter(false);
      }
    },
    []
  );

  const togglePayment = useCallback(
    async (method: string) => {
      if (!profile) return;
      const current = profile.payment_methods?.find((m) => m.method === method);
      const currentEnabled = current ? current.enabled === 1 : false;
      const newEnabled = !currentEnabled;

      // Prevent unchecking all
      if (
        !newEnabled &&
        profile.payment_methods?.filter((m) => m.enabled === 1).length === 1 &&
        currentEnabled
      ) {
        return; // Can't uncheck the last one
      }

      // Optimistic update
      setProfile((p) => {
        if (!p) return p;
        const methods = (p.payment_methods || []).map((m) =>
          m.method === method ? { ...m, enabled: newEnabled ? 1 : 0 } : m
        );
        // If method wasn't in the list yet, add it
        if (!methods.find((m) => m.method === method)) {
          methods.push({ method, enabled: newEnabled ? 1 : 0 });
        }
        return { ...p, payment_methods: methods };
      });

      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          payment_methods: [{ method, enabled: newEnabled }],
        }),
      });

      // Revert on failure
      if (!res.ok) {
        setProfile((p) => {
          if (!p) return p;
          const methods = (p.payment_methods || []).map((m) =>
            m.method === method
              ? { ...m, enabled: currentEnabled ? 1 : 0 }
              : m
          );
          return { ...p, payment_methods: methods };
        });
      }
    },
    [profile]
  );

  const toggleNotif = useCallback(
    async (key: string) => {
      if (!profile) return;
      const current = profile.notification_preferences?.find(
        (n) => n.key === key
      );
      const currentEnabled = current ? current.enabled === 1 : false;
      const newEnabled = !currentEnabled;

      // Optimistic update
      setProfile((p) => {
        if (!p) return p;
        const prefs = (p.notification_preferences || []).map((n) =>
          n.key === key ? { ...n, enabled: newEnabled ? 1 : 0 } : n
        );
        if (!prefs.find((n) => n.key === key)) {
          prefs.push({ key, enabled: newEnabled ? 1 : 0 });
        }
        return { ...p, notification_preferences: prefs };
      });

      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          notification_preferences: [{ key, enabled: newEnabled }],
        }),
      });

      // Revert on failure
      if (!res.ok) {
        setProfile((p) => {
          if (!p) return p;
          const prefs = (p.notification_preferences || []).map((n) =>
            n.key === key
              ? { ...n, enabled: currentEnabled ? 1 : 0 }
              : n
          );
          return { ...p, notification_preferences: prefs };
        });
      }
    },
    [profile]
  );

  // ── Derived ──

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

  const DEALER_NOTIFS = [
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
  ];

  const BUYER_NOTIFS = [
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
  ];

  const notifItems = isDealer ? DEALER_NOTIFS : BUYER_NOTIFS;

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
        {!editingName ? (
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
            <button
              onClick={() => {
                setNameValue(profile.display_name || "");
                setEditingName(true);
                setNameError(null);
              }}
              className="text-eb-meta text-eb-pop font-bold"
            >
              Edit
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="eb-avatar eb-avatar-xl">
                {getInitials(nameValue || "?")}
              </span>
              <input
                type="text"
                className="eb-input flex-1"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value.slice(0, 30))}
                autoFocus
                placeholder="Your name"
              />
            </div>
            {nameError && (
              <p className="text-eb-meta text-eb-red mb-2">{nameError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={saveName}
                disabled={nameSaving}
                className="eb-btn flex-1"
              >
                {nameSaving ? "Saving\u2026" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNameError(null);
                }}
                className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
            <div className="text-eb-meta text-eb-muted mt-2">
              {formatPhone(profile.phone)}
            </div>
          </div>
        )}
      </section>

      {/* Dealer: Business name + Instagram */}
      {isDealer && (
        <>
          <section className="px-5 pb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Business Name
              </span>
              {bizSaving && <span className="eb-spinner-sm" />}
            </div>
            <input
              type="text"
              className="eb-input"
              value={bizValue}
              onChange={(e) => setBizValue(e.target.value.slice(0, 50))}
              onBlur={() => {
                if (bizValue.trim() !== (profile.business_name || "")) {
                  saveField("business_name", bizValue.trim());
                }
              }}
              placeholder="Your business name"
            />
          </section>
          <section className="px-5 pb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Instagram
              </span>
              <div className="flex items-center gap-2">
                {igSaving && <span className="eb-spinner-sm" />}
                <span className="text-eb-meta text-eb-light">Optional</span>
              </div>
            </div>
            <input
              type="text"
              className="eb-input"
              value={igValue}
              onChange={(e) => setIgValue(e.target.value.slice(0, 31))}
              onBlur={() => {
                const cleaned = igValue.startsWith("@")
                  ? igValue.slice(1)
                  : igValue;
                if (cleaned !== (profile.instagram_handle || "")) {
                  saveField("instagram_handle", cleaned);
                }
              }}
              placeholder="@yourhandle"
            />
          </section>
        </>
      )}

      {/* Buyer: Stats */}
      {!isDealer && (
        <div className="eb-stats border-y border-eb-border">
          <div className="eb-stat">
            <div className="eb-stat-num">{profile.watching_count}</div>
            <div className="eb-stat-label">Watching</div>
          </div>
          <div className="eb-stat">
            <div className="eb-stat-num">{profile.inquiries_count}</div>
            <div className="eb-stat-label">Inquiries</div>
          </div>
          <div className="eb-stat">
            <div className="eb-stat-num">{profile.bought_count}</div>
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
              <label
                key={pm.key}
                className={`flex items-center gap-3 py-3 cursor-pointer${i < PAYMENT_METHODS.length - 1 ? " border-b border-eb-border" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={getPayment(pm.key)}
                  onChange={() => togglePayment(pm.key)}
                  className="eb-check"
                />
                <div className="text-eb-body font-bold text-eb-black">
                  {pm.label}
                </div>
              </label>
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
        {notifItems.map((n, i, arr) => (
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
              onChange={() => toggleNotif(n.key)}
              className="eb-toggle"
            />
          </label>
        ))}
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

        {/* Sign Out with confirmation */}
        {!showSignOutConfirm ? (
          <button
            className="w-full mt-6 py-2.5 text-eb-caption font-bold border-2 border-eb-black text-eb-black uppercase tracking-wider"
            onClick={() => setShowSignOutConfirm(true)}
          >
            Sign Out
          </button>
        ) : (
          <div className="mt-6 border-2 border-eb-black p-4">
            <p className="text-eb-body font-bold text-eb-black mb-3">
              Sign out of Early Bird?
            </p>
            <div className="flex gap-2">
              <button
                onClick={logout}
                className="flex-1 py-2.5 text-eb-caption font-bold bg-eb-black text-eb-white uppercase tracking-wider"
              >
                Yes, Sign Out
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="text-eb-meta text-eb-muted text-center mt-4">
          Early Bird v1.0 · LA{isDealer ? " · Dealer Account" : ""}
        </div>
      </section>

      <div className="h-16" />
      <BottomNav active="account" />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";

interface Market {
  id: string;
  name: string;
  starts_at: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [followedMarkets, setFollowedMarkets] = useState<Set<string>>(
    new Set()
  );
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    drop_alerts: true,
    price_drops: true,
    new_markets: false,
  });
  const [saving, setSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Fetch available markets
  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/markets");
      if (res.ok) {
        const data = await res.json();
        setMarkets(data);
        // Pre-check first two markets
        const initial = new Set<string>();
        data.slice(0, 2).forEach((m: Market) => initial.add(m.id));
        setFollowedMarkets(initial);
      }
    }
    load();
  }, []);

  const toggleMarket = (id: string) => {
    setFollowedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNotif = (key: string) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = async () => {
    if (!displayName || saving) return;
    setSaving(true);

    await apiFetch("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        display_name: displayName,
        market_follows: Array.from(followedMarkets).map((id) => ({
          market_id: id,
          drop_alerts_enabled: true,
        })),
        notification_preferences: Object.entries(notifPrefs).map(
          ([key, enabled]) => ({ key, enabled })
        ),
      }),
    });

    await refreshUser();
    setSaving(false);
    router.replace("/home");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-eb-body text-eb-muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Masthead */}
      <div className="eb-masthead">
        <h1>EARLY BIRD</h1>
      </div>

      {/* Intro */}
      <section className="px-6 pt-8 pb-6">
        <h2 className="text-eb-display text-eb-black">
          Get set up
          <br />
          to shop the drop.
        </h2>
        <p className="mt-3 text-eb-body text-eb-muted">
          Set your profile and pick the markets you want to shop.
        </p>
      </section>

      {/* Selfie */}
      <section className="px-6 pb-6">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Selfie
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-eb-border flex items-center justify-center">
            <span className="text-eb-display text-eb-light">?</span>
          </div>
          <div className="flex-1">
            <button className="w-full py-2.5 text-eb-body font-bold border-2 border-eb-black text-eb-black">
              Take Selfie
            </button>
            <p className="text-eb-meta text-eb-muted mt-2">
              So dealers can spot you at the booth.
            </p>
          </div>
        </div>
      </section>

      {/* Display Name */}
      <section className="px-6 pb-6">
        <label className="text-eb-meta uppercase tracking-widest text-eb-muted block mb-1.5">
          Display Name
        </label>
        <input
          type="text"
          placeholder="John C."
          className="eb-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-eb-meta text-eb-muted mt-1.5">
          Whatever you type is what dealers see.
        </p>
      </section>

      {/* Phone (readonly) */}
      <section className="px-6 pb-6">
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Phone
          </label>
          <span className="text-eb-micro uppercase tracking-widest text-eb-green">
            VERIFIED
          </span>
        </div>
        <input
          type="tel"
          value={formatPhone(user.phone)}
          readOnly
          className="eb-input text-eb-muted"
        />
      </section>

      {/* Follow Markets */}
      {markets.length > 0 && (
        <section className="px-6 pb-6">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
            Follow Markets
          </div>
          <div className="space-y-2">
            {markets.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 p-3 border border-eb-border cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={followedMarkets.has(m.id)}
                  onChange={() => toggleMarket(m.id)}
                  className="w-4 h-4 accent-eb-black"
                />
                <span className="text-eb-body">{m.name}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      <section className="px-6 pb-6">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Notifications
        </div>
        <div className="space-y-2">
          {[
            {
              key: "drop_alerts",
              label: "Drop alerts",
              desc: "SMS when a followed market\u2019s drop goes live.",
            },
            {
              key: "price_drops",
              label: "Price drops",
              desc: "SMS when an item you\u2019re watching drops price.",
            },
            {
              key: "new_markets",
              label: "New markets",
              desc: "When a new flea market is added near you.",
            },
          ].map((n) => (
            <label
              key={n.key}
              className="flex items-start gap-3 p-3 border border-eb-border cursor-pointer"
            >
              <input
                type="checkbox"
                checked={notifPrefs[n.key]}
                onChange={() => toggleNotif(n.key)}
                className="w-4 h-4 mt-0.5 accent-eb-black"
              />
              <div className="flex-1">
                <div className="text-eb-body">{n.label}</div>
                <div className="text-eb-meta text-eb-muted mt-0.5">
                  {n.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Continue */}
      <footer className="px-6 py-6 mt-auto border-t border-eb-border">
        <button
          className="eb-btn"
          onClick={handleContinue}
          disabled={!displayName || saving}
        >
          {saving ? "SAVING…" : "CONTINUE"}
        </button>
      </footer>
    </div>
  );
}

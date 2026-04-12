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
      <div className="max-w-md mx-auto min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-10 pb-6">
        <div className="text-xl font-bold tracking-tight">EARLY BIRD</div>
      </header>

      {/* Intro */}
      <section className="px-6 pb-8">
        <h1 className="text-2xl font-bold leading-tight">
          Get set up
          <br />
          to shop the drop.
        </h1>
        <p className="text-sm text-base-content/70 mt-4 leading-relaxed">
          Set your profile and pick the markets you want to shop.
        </p>
      </section>

      {/* Selfie (placeholder) */}
      <section className="px-6 pb-8">
        <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
          Selfie
        </div>
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-base-200 text-base-content/40 w-20 rounded-full border border-base-300">
              <span className="text-2xl font-bold">?</span>
            </div>
          </div>
          <div className="flex-1">
            <button className="btn btn-sm btn-outline w-full">
              Take Selfie
            </button>
            <p className="text-xs text-base-content/60 mt-2">
              So dealers can spot you at the booth.
            </p>
          </div>
        </div>
      </section>

      {/* Display Name */}
      <section className="px-6 pb-8">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
              Display Name
            </span>
          </div>
          <input
            type="text"
            placeholder="John C."
            className="input input-bordered w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div className="label">
            <span className="label-text-alt text-xs text-base-content/60">
              Whatever you type is what dealers see.
            </span>
          </div>
        </label>
      </section>

      {/* Phone (readonly) */}
      <section className="px-6 pb-8">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
              Phone
            </span>
            <span className="label-text-alt badge badge-outline px-3 py-2">
              Verified
            </span>
          </div>
          <input
            type="tel"
            value={formatPhone(user.phone)}
            readOnly
            className="input input-bordered w-full"
          />
        </label>
      </section>

      {/* Follow Markets */}
      {markets.length > 0 && (
        <section className="px-6 pb-8">
          <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
            Follow Markets
          </div>
          <div className="space-y-2">
            {markets.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 p-3 border border-base-300 rounded-md cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={followedMarkets.has(m.id)}
                  onChange={() => toggleMarket(m.id)}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm flex-1">{m.name}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Notification Preferences */}
      <section className="px-6 pb-8">
        <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
          Notifications
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 border border-base-300 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={notifPrefs.drop_alerts}
              onChange={() => toggleNotif("drop_alerts")}
              className="checkbox checkbox-sm mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm">Drop alerts</div>
              <div className="text-xs text-base-content/60 mt-0.5">
                SMS when a followed market&apos;s drop goes live.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border border-base-300 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={notifPrefs.price_drops}
              onChange={() => toggleNotif("price_drops")}
              className="checkbox checkbox-sm mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm">Price drops</div>
              <div className="text-xs text-base-content/60 mt-0.5">
                SMS when an item you&apos;re watching drops price.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border border-base-300 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={notifPrefs.new_markets}
              onChange={() => toggleNotif("new_markets")}
              className="checkbox checkbox-sm mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm">New markets</div>
              <div className="text-xs text-base-content/60 mt-0.5">
                When a new flea market is added near you.
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* Continue */}
      <footer className="px-6 py-6 mt-auto bg-base-200">
        <button
          className={`btn btn-neutral w-full${saving ? " loading" : ""}`}
          onClick={handleContinue}
          disabled={!displayName || saving}
        >
          Continue
        </button>
      </footer>
    </div>
  );
}

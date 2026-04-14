"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";

interface Market {
  id: string;
  name: string;
  starts_at: string;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isDealerSignup, setIsDealerSignup] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [dealerError, setDealerError] = useState<string | null>(null);

  // Detect dealer signup from query param (set by verify page from SMS link)
  useEffect(() => {
    if (searchParams.get("dealer") === "1") {
      setIsDealerSignup(true);
    }
  }, [searchParams]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const stored = localStorage.getItem("eb_token");
      if (!stored) {
        router.replace("/");
      }
    }
  }, [authLoading, user, router]);

  // Fetch available markets
  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/markets");
      if (res.ok) {
        const data = await res.json();
        setMarkets(data);
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
    if (isDealerSignup && (!businessName.trim() || !instagram.trim())) return;
    setSaving(true);
    setDealerError(null);

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

    // Submit dealer application if this is a dealer signup
    if (isDealerSignup) {
      const appRes = await apiFetch("/api/dealer-applications", {
        method: "POST",
        body: JSON.stringify({
          name: displayName.trim(),
          business_name: businessName.trim(),
          instagram_handle: instagram.trim(),
        }),
      });
      if (!appRes.ok) {
        const data = await appRes.json().catch(() => ({}));
        setDealerError(data.error || "Failed to submit application");
        setSaving(false);
        return;
      }
    }

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
      <section className="px-6 pt-8 pb-4">
        <h2 className="text-eb-display text-eb-black">
          {isDealerSignup ? "Set up your dealer account." : "Get set up."}
        </h2>
        <p className="mt-2 text-eb-body text-eb-muted">
          {isDealerSignup
            ? "We\u2019ll review your application. You can browse as a buyer in the meantime."
            : "Takes 30 seconds. Then you can start shopping."}
        </p>
      </section>

      {/* Step 1: Display Name */}
      <section className="px-6 py-5 border-t-2 border-eb-black">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-eb-body font-bold text-eb-pop">01</span>
          <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Your name
          </span>
        </div>
        <input
          type="text"
          placeholder="John C."
          className="eb-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-eb-meta text-eb-muted mt-1.5">
          This is what dealers see when you message them.
        </p>
      </section>

      {/* Step 2: Phone (readonly) */}
      <section className="px-6 py-5 border-t border-eb-border">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-eb-body font-bold text-eb-pop">02</span>
          <div className="flex-1 flex justify-between items-center">
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Phone
            </span>
            <span className="text-eb-micro uppercase tracking-widest text-eb-green font-bold">
              VERIFIED
            </span>
          </div>
        </div>
        <input
          type="tel"
          value={formatPhone(user.phone)}
          readOnly // readOnly: phone is verified, not editable
          className="eb-input text-eb-muted"
        />
      </section>

      {/* Dealer fields: Business Name + Instagram */}
      {isDealerSignup && (
        <>
          <section className="px-6 py-5 border-t border-eb-border">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-eb-body font-bold text-eb-pop">03</span>
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Business name
              </span>
            </div>
            <input
              type="text"
              placeholder="Vintage Finds LA"
              className="eb-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value.slice(0, 60))}
            />
          </section>

          <section className="px-6 py-5 border-t border-eb-border">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-eb-body font-bold text-eb-pop">04</span>
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Instagram
              </span>
            </div>
            <input
              type="text"
              placeholder="@yourhandle"
              className="eb-input"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.slice(0, 31))}
            />
            <p className="text-eb-meta text-eb-muted mt-1.5">
              We review your Instagram to verify your business.
            </p>
          </section>
        </>
      )}

      {/* Follow Markets */}
      {markets.length > 0 && (
        <section className="px-6 py-5 border-t border-eb-border">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-eb-body font-bold text-eb-pop">
              {isDealerSignup ? "05" : "03"}
            </span>
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Follow markets
            </span>
          </div>
          <div className="space-y-2">
            {markets.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 p-3 border-2 cursor-pointer ${
                  followedMarkets.has(m.id)
                    ? "border-eb-black bg-eb-white"
                    : "border-eb-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={followedMarkets.has(m.id)}
                  onChange={() => toggleMarket(m.id)}
                  className="eb-check"
                />
                <span className="text-eb-body font-bold">{m.name}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      <section className="px-6 py-5 border-t border-eb-border">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-eb-body font-bold text-eb-pop">
            {isDealerSignup ? "06" : "04"}
          </span>
          <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Notifications
          </span>
        </div>
        <div className="space-y-2">
          {[
            {
              key: "drop_alerts",
              label: "Drop alerts",
              desc: "Text me when a market\u2019s drop goes live.",
            },
            {
              key: "price_drops",
              label: "Price drops",
              desc: "Text me when something I\u2019m watching gets cheaper.",
            },
            {
              key: "new_markets",
              label: "New markets",
              desc: "Text me when a new market is added.",
            },
          ].map((n) => (
            <label
              key={n.key}
              className={`flex items-start gap-3 p-3 border-2 cursor-pointer ${
                notifPrefs[n.key]
                  ? "border-eb-black bg-eb-white"
                  : "border-eb-border"
              }`}
            >
              <input
                type="checkbox"
                checked={notifPrefs[n.key]}
                onChange={() => toggleNotif(n.key)}
                className="eb-check mt-0.5"
              />
              <div className="flex-1">
                <div className="text-eb-body font-bold">{n.label}</div>
                <div className="text-eb-meta text-eb-muted mt-0.5">
                  {n.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Continue */}
      <footer className="px-6 py-6 mt-auto border-t-2 border-eb-black">
        {dealerError && (
          <p className="text-eb-meta text-eb-red mb-3">{dealerError}</p>
        )}
        <button
          className="eb-cta"
          onClick={handleContinue}
          disabled={
            !displayName ||
            saving ||
            (isDealerSignup && (!businessName.trim() || !instagram.trim()))
          }
        >
          {saving
            ? "SAVING\u2026"
            : isDealerSignup
              ? "SUBMIT & START BROWSING"
              : "START SHOPPING"}
        </button>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-eb-body text-eb-muted">Loading\u2026</span>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

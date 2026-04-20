"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { normalizeUSPhone } from "@/lib/phone";
import { formatShortDate } from "@/lib/format";
import { NotFoundScreen } from "@/components/not-found-screen";

interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  drop_at: string;
  status: string;
  dealer_count: number;
  item_count: number;
}

type Step =
  | "loading"
  | "invalid"
  | "form"       // anonymous user: show signup form
  | "granting"   // signed-in user: API call in flight
  | "sent";      // SMS sent, waiting on buyer to tap link

export default function EarlyAccessPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const marketId = params.marketId as string;

  const [step, setStep] = useState<Step>("loading");
  const [market, setMarket] = useState<Market | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch market info. If the market is already live (past drop),
  // there's nothing to "early access" — just punt them into /buy.
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/markets/${marketId}`);
        if (!res.ok) {
          setStep("invalid");
          return;
        }
        const data: Market = await res.json();
        setMarket(data);

        if (data.status === "live") {
          router.replace(`/buy?market=${data.id}`);
          return;
        }

        // Wait for auth state to settle before deciding next step.
        // authLoading flip below handles the rest.
        setStep("form");
      } catch {
        setStep("invalid");
      }
    }
    load();
  }, [marketId, router]);

  // Signed-in user: grant access immediately on mount (skip the SMS
  // round-trip) and drop them into the market.
  useEffect(() => {
    if (authLoading || !market || !user) return;
    if (market.status === "live") return;

    let cancelled = false;
    async function grant() {
      setStep("granting");
      try {
        const res = await apiFetch("/api/early-access/grant", {
          method: "POST",
          body: JSON.stringify({ market_id: marketId, source: "share" }),
        });
        if (cancelled) return;
        if (res.ok) {
          router.replace(`/buy?market=${marketId}`);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Couldn't grant access");
          setStep("form");
        }
      } catch {
        if (!cancelled) {
          setError("Something went wrong");
          setStep("form");
        }
      }
    }
    grant();
    return () => { cancelled = true; };
  }, [authLoading, user, market, marketId, router]);

  const submit = async () => {
    if (submitting) return;
    setError(null);
    const result = normalizeUSPhone(phone);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/early-access/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: result.phone,
          name: name.trim(),
          market_id: marketId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't send link");
      }
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send link");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "invalid") {
    return (
      <div className="min-h-screen bg-eb-bg">
        <NotFoundScreen
          title="Market not found"
          message="This link doesn't point to an active market. The show may have ended or the link might be wrong."
          action={{ label: "Go to Early Bird", href: "/" }}
        />
      </div>
    );
  }

  if (step === "loading" || step === "granting" || !market) {
    return (
      <div className="min-h-screen bg-eb-bg flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eb-bg flex flex-col">
      <header className="py-6 text-center">
        <div className="text-eb-title tracking-widest text-eb-black">
          EARLY BIRD
        </div>
      </header>

      {/* Market hero */}
      <main className="px-5 flex-1 max-w-md mx-auto w-full">
        <div className="py-6 border-y border-eb-border text-center">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
            Pre-shop
          </div>
          <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
            {market.name}
          </h1>
          <div className="text-eb-body text-eb-black mt-2 tabular-nums">
            {formatShortDate(market.starts_at)}
            {market.location ? (
              <span className="text-eb-muted"> · {market.location}</span>
            ) : null}
          </div>
          {(market.dealer_count > 0 || market.item_count > 0) && (
            <div className="text-eb-meta text-eb-muted mt-2">
              {market.item_count} items · {market.dealer_count} dealers
            </div>
          )}
        </div>

        {/* Form or confirmation */}
        <div className="py-6">
          {step === "sent" ? (
            <div className="border-l-2 border-eb-pop pl-4 py-2">
              <h3 className="text-eb-display font-bold uppercase tracking-wider text-eb-black mb-2">
                Check your texts
              </h3>
              <p className="text-eb-caption text-eb-muted leading-relaxed">
                We sent a link to{" "}
                <span className="font-bold text-eb-black">{phone}</span>. Tap
                it to open your early-access pass to {market.name}.
              </p>
              <button
                onClick={() => {
                  setStep("form");
                  setPhone("");
                }}
                className="text-eb-meta text-eb-muted mt-3 underline"
              >
                Use a different number
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-1">
                Get early access
              </h2>
              <p className="text-eb-meta text-eb-muted leading-relaxed mb-5">
                Drop your number and we{"\u2019"}ll text you a link to shop {market.name} before it opens to everyone.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    className="eb-input"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    placeholder="Jane Doe"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    className="eb-input"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^\d()\-\s+.]/g, "").slice(0, 32))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>

                {error && <p className="text-eb-meta text-eb-red">{error}</p>}

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="eb-btn w-full"
                >
                  {submitting ? "Sending\u2026" : "Text Me The Link"}
                </button>

                <p className="text-eb-micro font-readable text-eb-muted text-center leading-relaxed">
                  Msg &amp; data rates may apply. Reply STOP to opt out.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

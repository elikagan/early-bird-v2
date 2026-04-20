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
          earlybird.la
        </div>
      </header>

      {/* Market hero */}
      <main className="px-5 flex-1 max-w-md mx-auto w-full">
        <div className="py-6 border-y border-eb-border text-center">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
            Pre-shop online via Early Bird
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
                it to pre-shop {market.name} online.
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
                Get your link
              </h2>
              <p className="text-eb-meta text-eb-muted leading-relaxed mb-5">
                A group of dealers going to {market.name} put their best pieces on Early Bird so you can browse and claim them before the show opens.
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

        {/* FAQ — always visible so buyers can read while waiting for the
            SMS. Keeps the page self-explanatory for cold traffic landing
            from an Instagram share. */}
        <section className="border-t border-eb-border pt-6 pb-10">
          <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-4">
            FAQ
          </div>
          <div className="space-y-5">
            <div>
              <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
                What is Early Bird?
              </h3>
              <p className="text-eb-meta text-eb-muted leading-relaxed">
                A tool a group of LA flea market dealers built together so buyers could pre-shop their booths online before the event opens.
              </p>
            </div>
            <div>
              <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
                Is this affiliated with {market.name}?
              </h3>
              <p className="text-eb-meta text-eb-muted leading-relaxed">
                No. Early Bird is owned and operated by the dealers themselves. We{"\u2019"}re not affiliated with the show or its organizers {"\u2014"} we just connect buyers to the sellers going.
              </p>
            </div>
            <div>
              <h3 className="text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-1">
                How does it work?
              </h3>
              <p className="text-eb-meta text-eb-muted leading-relaxed">
                Browse what dealers are bringing. Tap {"\u201C"}I{"\u2019"}m interested{"\u201D"} on anything you want. The dealer gets your name, number, and a short note, and takes it from there.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

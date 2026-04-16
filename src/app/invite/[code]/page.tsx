"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { NotFoundScreen } from "@/components/not-found-screen";
import { InstagramInput } from "@/components/instagram-input";

type Step = "loading" | "form" | "sent" | "invalid";

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<Step>("loading");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [biz, setBiz] = useState("");
  const [ig, setIg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate invite code on load
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/invite/check?code=${encodeURIComponent(code)}`);
        setStep(res.ok ? "form" : "invalid");
      } catch {
        setStep("invalid");
      }
    }
    check();
  }, [code]);

  const submit = useCallback(async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!biz.trim()) {
      setError("Business name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          phone: phone.trim(),
          name: name.trim(),
          business_name: biz.trim(),
          instagram_handle: ig.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      setStep("sent");
    } catch (err) {
      if (err instanceof Error && (err.message.includes("expired") || err.message.includes("used"))) {
        setStep("invalid");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }, [code, phone, name, biz, ig]);

  return (
    <div className="min-h-screen bg-eb-bg flex flex-col">
      <header className="py-6 text-center">
        <div className="text-eb-title tracking-widest text-eb-black">
          EARLY BIRD
        </div>
      </header>

      <main className="px-5 flex-1 max-w-md mx-auto w-full">
        {step === "loading" ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <span className="eb-spinner" />
          </div>
        ) : step === "invalid" ? (
          <NotFoundScreen
            title="Invite not found"
            message="This invite link has expired, already been used, or doesn\u2019t exist. Contact the person who sent it to get a new one."
            action={{ label: "Go to Early Bird", href: "/" }}
          />
        ) : step === "sent" ? (
          <div className="text-center py-12">
            <div className="text-eb-body font-bold text-eb-black mb-2">
              Check your phone
            </div>
            <p className="text-eb-meta text-eb-muted leading-relaxed">
              We sent a login link to {phone}. Tap it to finish setting up your
              dealer account.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-1">
              You&apos;re Invited
            </h1>
            <p className="text-eb-meta text-eb-muted leading-relaxed mb-6">
              Set up your seller account on Early Bird — the pre-market preview
              for LA flea markets.
            </p>

            <div className="space-y-4">
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
                    setPhone(e.target.value.replace(/[^\d()\-\s+]/g, "").slice(0, 16))
                  }
                  placeholder="(555) 123-4567"
                  autoFocus
                />
              </div>

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
                />
              </div>

              <div>
                <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  className="eb-input"
                  value={biz}
                  onChange={(e) => setBiz(e.target.value.slice(0, 60))}
                  placeholder="Vintage Finds LA"
                />
              </div>

              <div>
                <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                  Instagram
                  <span className="text-eb-light ml-1">optional</span>
                </label>
                <InstagramInput value={ig} onChange={setIg} />
              </div>

              {error && <p className="text-eb-meta text-eb-red">{error}</p>}

              <button
                onClick={submit}
                disabled={submitting}
                className="eb-btn w-full"
              >
                {submitting ? "Setting up\u2026" : "Get Started"}
              </button>

              <p className="text-eb-micro text-eb-light text-center leading-relaxed">
                We&apos;ll text you a login link to verify your number.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

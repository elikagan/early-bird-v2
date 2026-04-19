"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { NotFoundScreen } from "@/components/not-found-screen";

type Step = "loading" | "form" | "invalid";

function formatPhoneForDisplay(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [step, setStep] = useState<Step>("loading");
  // invitePhone is set when the admin bound a phone to the invite.
  // When present, the dealer sees it read-only and can't edit.
  const [invitePhone, setInvitePhone] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [biz, setBiz] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate invite code + fetch prefilled phone on load
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/invite/check?code=${encodeURIComponent(code)}`);
        if (!res.ok) {
          setStep("invalid");
          return;
        }
        const data = await res.json();
        setInvitePhone(data.phone || null);
        setStep("form");
      } catch {
        setStep("invalid");
      }
    }
    check();
  }, [code]);

  const submit = useCallback(async () => {
    // Phone only validated if the dealer is the one entering it
    // (legacy invites without pre-bound phone).
    if (!invitePhone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        setError("Enter a valid phone number");
        return;
      }
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
        credentials: "include",
        body: JSON.stringify({
          code,
          phone: invitePhone ? undefined : phone.trim(),
          name: name.trim(),
          business_name: biz.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      // Redeem sets the session cookie on response. Head straight to
      // the booth for the upcoming show — no magic-link round-trip.
      router.refresh();
      router.push("/sell");
    } catch (err) {
      if (err instanceof Error && (err.message.includes("expired") || err.message.includes("used"))) {
        setStep("invalid");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }, [code, phone, invitePhone, name, biz, router]);

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
        ) : (
          <>
            <h1 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-1">
              You&apos;re Invited
            </h1>
            <p className="text-eb-meta text-eb-muted leading-relaxed mb-6">
              Set up your seller account on Early Bird — the pre-shopping
              preview for LA flea markets.
            </p>

            <div className="space-y-4">
              {invitePhone ? (
                <div>
                  <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                    Phone Number
                  </label>
                  <div className="eb-input flex items-center bg-eb-border/30 text-eb-text cursor-not-allowed select-none">
                    {formatPhoneForDisplay(invitePhone)}
                  </div>
                  <p className="text-eb-micro text-eb-muted mt-1">
                    This is the number your admin added for you.
                  </p>
                </div>
              ) : (
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
              )}

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
                  autoFocus={!!invitePhone}
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

              {error && <p className="text-eb-meta text-eb-red">{error}</p>}

              <button
                onClick={submit}
                disabled={submitting}
                className="eb-btn w-full"
              >
                {submitting ? "Setting up\u2026" : "Get Started"}
              </button>

              <p className="text-eb-micro font-readable text-eb-muted text-center leading-relaxed">
                You&apos;ll land on your booth for the next show.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

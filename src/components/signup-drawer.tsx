"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { normalizeUSPhone } from "@/lib/phone";

export function SignupDrawer({
  open,
  onClose,
  headline,
  subtext,
  consentLabel,
}: {
  open: boolean;
  onClose: () => void;
  headline?: string;
  subtext?: string;
  consentLabel?: string;
}) {
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!phone || sending) return;
    setSending(true);
    const result = normalizeUSPhone(phone);
    if (!result.ok) {
      setSending(false);
      alert(result.reason);
      return;
    }
    const formatted = result.phone;
    const res = await apiFetch("/api/auth/start", {
      method: "POST",
      body: JSON.stringify({ phone: formatted, sms_consent: smsConsent }),
    });
    setSending(false);
    if (res.ok) setSent(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-6 pt-3 pb-8 animate-slide-up">
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-5" />

        {sent ? (
          <div className="border-l-2 border-eb-pop pl-4 py-2">
            <h3 className="text-eb-display font-bold uppercase tracking-wider text-eb-black mb-2">
              Check your texts
            </h3>
            <p className="text-eb-caption text-eb-muted leading-relaxed">
              Sign-in link sent to{" "}
              <span className="font-bold text-eb-black">{phone}</span>
            </p>
            <button
              onClick={() => {
                setSent(false);
                setPhone("");
                setSmsConsent(false);
              }}
              className="text-eb-meta text-eb-muted mt-3 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-2">
              {headline || "Sign up"}
            </h3>
            <p className="text-eb-caption text-eb-muted mb-4 leading-relaxed">
              {subtext || "Enter your phone number to get a sign-in link. No passwords, no codes."}
            </p>
            <input
              type="tel"
              inputMode="tel"
              placeholder="(213) 555-0134"
              className="eb-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="shrink-0 accent-eb-black"
              />
              <span className="text-eb-meta text-eb-muted">
                {consentLabel || "Text me when the drop goes live"}
              </span>
            </label>
            <button
              className="eb-btn mt-5"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "SENDING\u2026" : "SIGN IN"}
            </button>
            <p className="text-eb-micro font-readable text-eb-muted mt-1.5 text-center leading-relaxed">
              Msg &amp; data rates may apply. Frequency varies. Reply STOP to
              opt out, HELP for help. We will not share mobile info with third
              parties for marketing.{" "}
              <a href="/terms" className="underline">Terms</a>
              {" \u00b7 "}
              <a href="/privacy" className="underline">Privacy</a>
            </p>
          </>
        )}
      </div>
    </>
  );
}

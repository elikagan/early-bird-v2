"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { normalizeUSPhone } from "@/lib/phone";
import { formatPhone } from "@/lib/format";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

/**
 * Phone-entry drawer that mints a magic-link SMS via /api/auth/start.
 *
 * Used for BOTH sign-up (new phone, creates a user) and sign-in
 * (existing phone, just mints the link) — the backend doesn't
 * distinguish, so neither does the UI.
 *
 * Intentionally has no marketing-consent checkbox. Earlier iterations
 * shipped with a "Text me when shopping opens" checkbox that wrote
 * to the drop_alerts notification preference. That was net-negative:
 * (a) unchecked state actively opted new users OUT of a preference
 *     that defaults to on, and (b) it silently overwrote returning
 * users' existing prefs every time they signed in. Marketing opt-in
 * belongs in /account, not a phone-entry form. The A2P compliance
 * footer below is sufficient for the transactional magic-link SMS
 * we actually send from this drawer.
 */
export function SignupDrawer({
  open,
  onClose,
  headline,
  subtext,
}: {
  open: boolean;
  onClose: () => void;
  headline?: string;
  subtext?: string;
}) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentPhone, setSentPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  if (!open) return null;

  const handleSend = async () => {
    if (!phone || sending) return;
    setError(null);
    setSending(true);
    const result = normalizeUSPhone(phone);
    if (!result.ok) {
      setSending(false);
      setError(result.reason);
      return;
    }
    const formatted = result.phone;
    const res = await apiFetch("/api/auth/start", {
      method: "POST",
      body: JSON.stringify({ phone: formatted }),
    });
    setSending(false);
    if (res.ok) {
      setSentPhone(formatted);
      setSent(true);
      setError(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error ||
          "Couldn't send the sign-in link — try again in a moment."
      );
    }
  };

  const reset = () => {
    setSent(false);
    setPhone("");
    setSentPhone("");
    setError(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-6 pt-3 pb-8 animate-slide-up">
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-5" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-eb-muted hover:text-eb-black"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        {sent ? (
          <div className="border-l-2 border-eb-pop pl-4 py-2">
            <h3 className="text-eb-display font-bold uppercase tracking-wider text-eb-black mb-2">
              Check your texts
            </h3>
            <p className="text-eb-caption text-eb-muted leading-relaxed">
              Sign-in link sent to{" "}
              <span className="font-bold text-eb-black">
                {formatPhone(sentPhone)}
              </span>
            </p>
            <button
              onClick={reset}
              className="text-eb-meta text-eb-muted mt-3 underline"
            >
              Use a different number
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-2">
              {headline || "Sign in"}
            </h3>
            <p className="text-eb-caption text-eb-muted mb-4 leading-relaxed">
              {subtext ||
                "New here or returning, same thing — enter your phone and we'll text you a one-tap sign-in link. No passwords, no codes."}
            </p>
            <input
              type="tel"
              inputMode="tel"
              placeholder="(213) 555-0134"
              className="eb-input"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
            {error && (
              <p className="text-eb-meta text-eb-red mt-2" role="alert">
                {error}
              </p>
            )}
            <button
              className="eb-btn mt-5"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "SENDING\u2026" : "SIGN IN"}
            </button>
            <p className="text-eb-micro font-readable text-eb-muted mt-3 text-center leading-relaxed">
              Msg &amp; data rates may apply. Reply STOP to opt out, HELP for
              help.{" "}
              <a href="/terms" className="underline">
                Terms
              </a>
              {" \u00b7 "}
              <a href="/privacy" className="underline">
                Privacy
              </a>
            </p>
          </>
        )}
      </div>
    </>
  );
}

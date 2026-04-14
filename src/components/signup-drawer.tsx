"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

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

  if (!open) return null;

  const handleSend = async () => {
    if (!phone || sending) return;
    setSending(true);
    const digits = phone.replace(/\D/g, "");
    const formatted =
      digits.length === 10
        ? `+1${digits}`
        : digits.length === 11 && digits[0] === "1"
          ? `+${digits}`
          : `+${digits}`;
    const res = await apiFetch("/api/auth/start", {
      method: "POST",
      body: JSON.stringify({ phone: formatted }),
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
          <>
            <h3 className="text-eb-body font-bold text-eb-black mb-2">
              Check your texts
            </h3>
            <p className="text-eb-caption text-eb-muted leading-relaxed">
              We texted a sign-in link to {phone}. Tap it to get in.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setPhone("");
              }}
              className="text-eb-meta text-eb-light mt-4 block"
            >
              Didn&apos;t get it? Try again
            </button>
          </>
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
              placeholder="(213) 555-0134"
              className="eb-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <button
              className="eb-btn mt-3"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "SENDING\u2026" : "TEXT ME A SIGN-IN LINK"}
            </button>
            <p className="text-eb-micro text-eb-muted mt-2 text-center">
              Free forever. No spam.
            </p>
          </>
        )}
      </div>
    </>
  );
}

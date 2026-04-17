"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { InstagramInput } from "@/components/instagram-input";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function DealerApplyDrawer({ open, onClose, onSubmitted }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [biz, setBiz] = useState("");
  const [ig, setIg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!name.trim() || !biz.trim() || !ig.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/dealer-applications", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          business_name: biz.trim(),
          instagram_handle: ig.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [name, biz, ig, onSubmitted]);

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-eb-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-eb-white rounded-t-2xl px-5 pt-5 pb-8 animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-eb-border" />
        </div>

        <h2 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-1">
          Apply to Sell
        </h2>
        <p className="text-eb-meta text-eb-muted leading-relaxed mb-5">
          Tell us about yourself. We&apos;ll review your application and text
          you when you&apos;re approved.
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
            </label>
            <InstagramInput value={ig} onChange={setIg} />
          </div>

          <p className="text-eb-micro text-eb-muted">
            We&apos;ll review your application and text you at{" "}
            {formatPhone(user.phone)} when you&apos;re approved.
          </p>

          {error && <p className="text-eb-meta text-eb-red">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting || !name.trim() || !biz.trim() || !ig.trim()}
              className="eb-btn flex-1"
            >
              {submitting ? "Submitting\u2026" : "Submit Application"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

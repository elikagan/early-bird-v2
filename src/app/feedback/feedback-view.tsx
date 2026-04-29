"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Masthead } from "@/components/masthead";
import { formatShortDate } from "@/lib/format";

export type Audience = "buyer" | "dealer";

export interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
}

export interface ExistingResponse {
  responses: Record<string, unknown>;
}

// Three questions per audience. Keep the form short so people actually
// finish it.
const BUYER_QUESTIONS = [
  {
    key: "went",
    label: "Did you go to the market?",
    type: "choice" as const,
    options: ["Yes", "No"],
  },
  {
    key: "found",
    label: "Did you find / buy what you wanted?",
    type: "choice" as const,
    options: [
      "Yes — bought something",
      "Yes — found, didn't buy",
      "No",
      "Didn't end up shopping",
    ],
  },
  {
    key: "comments",
    label: "Anything we should fix or do differently? (optional)",
    type: "text" as const,
  },
];

const DEALER_QUESTIONS = [
  {
    key: "rating",
    label: "How was the show for you overall?",
    type: "choice" as const,
    options: ["Great", "OK", "Bad"],
  },
  {
    key: "drove_sales",
    label: "Did Early Bird drive any sales?",
    type: "choice" as const,
    options: [
      "Yes — multiple",
      "Yes — one",
      "Inquiries but no sales",
      "No inquiries",
      "Not sure",
    ],
  },
  {
    key: "comments",
    label: "Anything we should fix or do differently? (optional)",
    type: "text" as const,
  },
];

export default function FeedbackView({
  market,
  audience,
  signedInDisplayName,
  existing,
}: {
  market: Market | null;
  audience: Audience | null;
  signedInDisplayName: string | null;
  existing: ExistingResponse | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    if (existing?.responses) {
      for (const [k, v] of Object.entries(existing.responses)) {
        if (typeof v === "string") seed[k] = v;
      }
    }
    return seed;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(!!existing);
  const [error, setError] = useState<string | null>(null);

  if (!market) {
    return (
      <>
        <Masthead />
        <div className="px-5 py-12 text-center">
          <p className="text-eb-body text-eb-muted">
            No recent market to give feedback on.
          </p>
        </div>
      </>
    );
  }

  if (!audience) {
    // Not signed in. Send to sign-in then bounce back here.
    return (
      <>
        <Masthead />
        <div className="px-5 py-10">
          <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight mb-3">
            Tell us how it went
          </h1>
          <p className="text-eb-body text-eb-text leading-relaxed mb-6">
            We{"’"}re collecting feedback on{" "}
            <strong>{market.name}</strong>. Sign in with your phone to leave
            a response.
          </p>
          <Link
            href={`/?next=${encodeURIComponent(
              `/feedback?market=${market.id}`
            )}`}
            className="eb-btn block text-center"
          >
            Sign in
          </Link>
        </div>
      </>
    );
  }

  const questions =
    audience === "dealer" ? DEALER_QUESTIONS : BUYER_QUESTIONS;

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await apiFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        market_id: market.id,
        responses: answers,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't save. Try again.");
    }
  };

  return (
    <>
      <Masthead />
      <div className="px-5 pt-6 pb-12 max-w-md">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-1">
          Feedback{signedInDisplayName ? ` · ${signedInDisplayName}` : ""}
        </div>
        <h1 className="text-eb-display font-bold text-eb-black uppercase tracking-wider leading-tight">
          {market.name}
        </h1>
        <div className="text-eb-meta text-eb-muted mt-1">
          {formatShortDate(market.starts_at)}
          {market.location ? <> {"·"} {market.location}</> : null}
        </div>

        {done ? (
          <div className="mt-8 border-2 border-eb-black p-5">
            <div className="text-eb-title font-bold uppercase tracking-wider text-eb-black mb-1">
              Thanks {"—"} got it.
            </div>
            <p className="text-eb-meta text-eb-muted leading-relaxed">
              You can update your answers any time by re-opening this link.
            </p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-4 text-eb-meta text-eb-pop font-bold uppercase tracking-wider"
            >
              Edit my answers
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
            className="mt-8 space-y-7"
          >
            {questions.map((q) => (
              <div key={q.key}>
                <label className="block text-eb-caption font-bold text-eb-black uppercase tracking-wider mb-2">
                  {q.label}
                </label>
                {q.type === "choice" ? (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt) => {
                      const on = answers[q.key] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.key]: opt }))
                          }
                          className={`text-left px-4 py-3 text-eb-body border-2 ${
                            on
                              ? "border-eb-black bg-eb-black text-white"
                              : "border-eb-border text-eb-text"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={answers[q.key] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                    rows={4}
                    maxLength={2000}
                    className="eb-input w-full resize-none"
                    placeholder="Optional"
                  />
                )}
              </div>
            ))}

            {error && (
              <p className="text-eb-meta text-eb-red" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="eb-btn block w-full"
            >
              {submitting ? "Saving…" : "Submit feedback"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

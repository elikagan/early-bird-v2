"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Masthead } from "@/components/masthead";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { formatShortDate } from "@/lib/format";

interface PendingBlast {
  id: string;
  market_id: string;
  market_name: string;
  market_starts_at: string;
  kind: "dealer_monday" | "dealer_thursday" | "buyer_thursday";
  kind_label: string;
  proposed_copy: string;
  queued_at: string;
  sent_at: string | null;
  sent_count: number | null;
  failed_count: number | null;
  recipient_count: number;
}

export default function PendingBlastPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [blast, setBlast] = useState<PendingBlast | null>(null);
  const [loading, setLoading] = useState(true);
  const [copy, setCopy] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/admin/pending-blast/${id}`);
    if (res.ok) {
      const data: PendingBlast = await res.json();
      setBlast(data);
      setCopy(data.proposed_copy);
    } else {
      setError("Couldn't load this blast. The link may be stale.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCopy = useCallback(async () => {
    if (!copy.includes("{link}")) {
      setError("Copy must include {link} — that's where each recipient's personalized URL goes.");
      return;
    }
    setError(null);
    setSaving(true);
    const res = await apiFetch(`/api/admin/pending-blast/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ proposed_copy: copy }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't save the copy. Try again.");
    }
  }, [copy, id]);

  const doSend = useCallback(async () => {
    setConfirmOpen(false);
    setSending(true);
    setError(null);
    // Save latest copy first
    await apiFetch(`/api/admin/pending-blast/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ proposed_copy: copy }),
    });
    const res = await apiFetch(`/api/admin/pending-blast/${id}/send`, {
      method: "POST",
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Send failed. Check Health tab for SMS errors.");
    }
  }, [id, copy, load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  if (!blast) {
    return (
      <>
        <Masthead right={null} />
        <div className="px-5 py-8">
          <p className="text-eb-body text-eb-red">{error || "Not found."}</p>
          <Link href="/admin" className="text-eb-caption text-eb-pop underline mt-3 inline-block">
            Back to admin
          </Link>
        </div>
      </>
    );
  }

  const sampleRenderedCopy = copy.replace(
    /\{link\}/g,
    blast.kind === "buyer_thursday"
      ? `https://earlybird.la/v/…?to=/buy?market=${blast.market_id}`
      : "https://earlybird.la/v/…?to=/sell"
  );

  const alreadySent = !!blast.sent_at;

  return (
    <>
      <Masthead right={null} />
      <div className="px-5 pt-4 pb-24 space-y-5">
        <div>
          <Link
            href="/admin"
            className="text-eb-caption text-eb-muted underline"
          >
            {"\u2190"} Back to admin
          </Link>
        </div>

        <div>
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
            {blast.kind_label}
          </div>
          <h1 className="text-eb-title font-bold uppercase tracking-wider text-eb-black">
            {blast.market_name}
          </h1>
          <p className="text-eb-caption text-eb-muted mt-1 tabular-nums">
            Show {formatShortDate(blast.market_starts_at)}
          </p>
        </div>

        {alreadySent ? (
          <div className="border-2 border-eb-green p-4">
            <div className="text-eb-body font-bold text-eb-green">
              Sent {new Date(blast.sent_at!).toLocaleString()}
            </div>
            <p className="text-eb-caption text-eb-muted mt-1">
              {blast.sent_count ?? 0} delivered · {blast.failed_count ?? 0} failed
            </p>
          </div>
        ) : (
          <>
            <div className="border border-eb-border p-3">
              <div className="text-eb-body font-bold">
                Will send to {blast.recipient_count} {blast.kind === "buyer_thursday" ? "buyer" : "dealer"}
                {blast.recipient_count === 1 ? "" : "s"}
              </div>
              {blast.recipient_count === 0 && (
                <p className="text-eb-micro text-eb-muted mt-1 leading-relaxed">
                  No one is opted in for this kind of reminder yet. Nothing will send if you tap Send.
                </p>
              )}
            </div>

            <div>
              <label className="block text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
                Message (use <span className="font-bold">{"{link}"}</span> as placeholder)
              </label>
              <textarea
                className="eb-input w-full min-h-[140px] leading-relaxed"
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                onBlur={saveCopy}
                disabled={sending}
              />
              <div className="flex items-center justify-between text-eb-micro text-eb-muted mt-1">
                <span>{copy.length} characters</span>
                <span>
                  {saving
                    ? "Saving\u2026"
                    : savedAt
                      ? "Saved \u2713"
                      : "Auto-saves on blur"}
                </span>
              </div>
            </div>

            <div>
              <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
                Preview (what a recipient sees)
              </div>
              <div className="border-2 border-eb-border bg-eb-bg-soft p-3 text-eb-caption whitespace-pre-wrap break-words">
                {sampleRenderedCopy}
              </div>
            </div>

            {error && (
              <div className="text-eb-caption text-eb-red border border-eb-red p-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!copy.includes("{link}")) {
                    setError("Copy must include {link}.");
                    return;
                  }
                  setError(null);
                  setConfirmOpen(true);
                }}
                disabled={sending || blast.recipient_count === 0}
                className="flex-1 py-3 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider disabled:opacity-50"
              >
                {sending
                  ? "Sending\u2026"
                  : `Send to ${blast.recipient_count} ${blast.kind === "buyer_thursday" ? "buyer" : "dealer"}${blast.recipient_count === 1 ? "" : "s"}`}
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="border-2 border-eb-green p-3">
            <div className="text-eb-body font-bold text-eb-green">Blast sent</div>
            <div className="text-eb-micro text-eb-muted mt-1">
              {result.sent} delivered · {result.failed} failed · {result.total} total
            </div>
          </div>
        )}
      </div>

      <ConfirmDrawer
        open={confirmOpen}
        title={`Send to ${blast?.recipient_count ?? 0} ${blast?.kind === "buyer_thursday" ? "buyer" : "dealer"}${(blast?.recipient_count ?? 0) === 1 ? "" : "s"}?`}
        message="This fires a real text to every recipient. Can't be undone."
        confirmLabel="Send blast"
        destructive
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

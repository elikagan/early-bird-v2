"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatDate, daysUntilShort } from "@/lib/format";

/**
 * Weekly attendance prompt at the top of /sell. The dealer answers
 * once per featured market: "I'm in" or "Not this one." Clicking
 * "I'm in" saves immediately (using the booth number from the dealer's
 * last instance of this same recurring show as a pre-fill, when one
 * exists). The confirmed state then exposes an Edit/Add affordance for
 * the booth #. After Monday 12:01 PT the new featured market generates
 * a fresh prompt for the next week.
 *
 * View modes:
 *   asking         — no answer yet; two equal-weight CTAs
 *   confirmed_yes  — pop-bg badge with booth + edit/add
 *   confirmed_no   — quiet single-line "Skipping ..." with change
 *   editing_booth  — booth # input + Save; entered via Edit/Add
 *
 * Touch targets are all >= 44px (Apple HIG); the booth input uses
 * fontSize:16px to keep iOS Safari from auto-zooming on focus.
 */

interface AttendanceState {
  market: { id: string; name: string; starts_at: string } | null;
  current: { declined: boolean; booth_number: string | null } | null;
  prefill: { wasYes: boolean; boothNumber: string | null } | null;
}

type Mode = "asking" | "editing_booth" | "confirmed";

export function MarketAttendancePrompt() {
  const [state, setState] = useState<AttendanceState | null>(null);
  const [mode, setMode] = useState<Mode>("asking");
  const [boothInput, setBoothInput] = useState("");
  const [saving, setSaving] = useState<"yes" | "no" | "booth" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await apiFetch("/api/sell/attendance");
    if (!res.ok) return;
    const data = (await res.json()) as AttendanceState;
    setState(data);
    if (data.current) {
      setMode("confirmed");
      setBoothInput(
        !data.current.declined && data.current.booth_number
          ? data.current.booth_number
          : ""
      );
    } else {
      setMode("asking");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (
    declined: boolean,
    boothNumber: string | null,
    label: "yes" | "no" | "booth"
  ) => {
    if (!state?.market) return;
    setSaving(label);
    setError(null);
    const res = await apiFetch("/api/sell/attendance", {
      method: "POST",
      body: JSON.stringify({
        market_id: state.market.id,
        declined,
        booth_number: boothNumber,
      }),
    });
    setSaving(null);
    if (res.ok) {
      void load();
    } else {
      setError("Couldn't save — try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!state || !state.market) return null;

  const { market, current, prefill } = state;
  const startDate = formatDate(market.starts_at);
  const countdown = daysUntilShort(market.starts_at).toUpperCase();

  // ===== Confirmed YES — collapsed badge =====
  if (mode === "confirmed" && current && !current.declined) {
    return (
      <div className="px-5 py-4 border-b border-eb-border bg-eb-pop-bg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-eb-meta uppercase tracking-widest text-eb-pop font-bold mb-1">
              You{"’"}re in
            </div>
            <div className="text-eb-caption text-eb-text leading-snug">
              {market.name} {"·"} {startDate}
              {current.booth_number ? (
                <>
                  {" · "}
                  <span className="font-bold">
                    Booth {current.booth_number}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setBoothInput(current.booth_number || "");
              setMode("editing_booth");
            }}
            className="text-eb-meta text-eb-pop font-bold uppercase tracking-wider min-h-[44px] flex items-center shrink-0"
          >
            {current.booth_number ? "Edit" : "+ Booth #"}
          </button>
        </div>
      </div>
    );
  }

  // ===== Confirmed NO — quiet single line =====
  if (mode === "confirmed" && current && current.declined) {
    return (
      <div className="px-5 py-3 border-b border-eb-border flex items-center justify-between gap-3">
        <div className="text-eb-meta text-eb-muted truncate">
          Skipping {market.name} {"·"} {startDate}
        </div>
        <button
          type="button"
          onClick={() => setMode("asking")}
          className="text-eb-meta text-eb-pop font-bold uppercase tracking-wider min-h-[44px] flex items-center shrink-0"
        >
          Change
        </button>
      </div>
    );
  }

  // ===== Editing booth # (entered via Edit/Add) =====
  if (mode === "editing_booth") {
    return (
      <div className="px-5 py-5 border-b border-eb-border bg-eb-pop-bg">
        <div className="text-eb-meta uppercase tracking-widest text-eb-pop font-bold mb-1">
          You{"’"}re in
        </div>
        <div className="text-eb-title font-bold text-eb-black leading-tight">
          {market.name}
        </div>
        <div className="text-eb-caption text-eb-muted mt-1 mb-4">
          {startDate}
        </div>

        {error && (
          <p className="text-eb-meta text-eb-red mb-2" role="alert">
            {error}
          </p>
        )}

        <label
          htmlFor="booth-input"
          className="block text-eb-meta uppercase tracking-widest text-eb-muted mb-2"
        >
          Booth number
        </label>
        <div className="flex gap-2 items-stretch">
          <input
            id="booth-input"
            type="text"
            inputMode="text"
            placeholder="e.g. 503"
            value={boothInput}
            onChange={(e) =>
              setBoothInput(
                e.target.value.replace(/[^a-zA-Z0-9\-/]/g, "").slice(0, 10)
              )
            }
            className="flex-1 px-3 py-3 bg-white border-2 border-eb-black tabular-nums min-h-[44px]"
            style={{ fontSize: "16px" }}
            aria-label="Booth number"
          />
          <button
            type="button"
            onClick={() => save(false, boothInput.trim() || null, "booth")}
            disabled={saving !== null}
            className="px-5 py-3 bg-eb-black text-white text-eb-caption font-bold uppercase tracking-wider min-h-[44px] disabled:opacity-50"
          >
            {saving === "booth" ? "…" : "Save"}
          </button>
        </div>
        <p className="text-eb-meta text-eb-muted mt-2 leading-relaxed">
          Helps buyers find you on the day. Optional.
        </p>
        <button
          type="button"
          onClick={() => {
            setBoothInput(current?.booth_number || "");
            setMode(current ? "confirmed" : "asking");
          }}
          className="mt-3 text-eb-meta text-eb-muted underline min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ===== Asking (no answer yet) =====
  return (
    <div className="px-5 py-5 border-b border-eb-border bg-eb-pop-bg">
      <div className="text-eb-meta uppercase tracking-widest text-eb-pop font-bold mb-1">
        {countdown}
      </div>
      <div className="text-eb-title font-bold text-eb-black leading-tight">
        {market.name}
      </div>
      <div className="text-eb-caption text-eb-muted mt-1 mb-4">
        {startDate} {"·"} Are you selling there?
      </div>

      {error && (
        <p className="text-eb-meta text-eb-red mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            save(false, prefill?.wasYes ? prefill.boothNumber : null, "yes")
          }
          disabled={saving !== null}
          className="px-4 py-3 bg-eb-black text-white text-eb-caption font-bold uppercase tracking-wider min-h-[44px] disabled:opacity-50"
        >
          {saving === "yes" ? "…" : "I’m in"}
        </button>
        <button
          type="button"
          onClick={() => save(true, null, "no")}
          disabled={saving !== null}
          className="px-4 py-3 bg-white border-2 border-eb-black text-eb-black text-eb-caption font-bold uppercase tracking-wider min-h-[44px] disabled:opacity-50"
        >
          {saving === "no" ? "…" : "Not this one"}
        </button>
      </div>

      {prefill?.wasYes && prefill.boothNumber && (
        <p className="text-eb-meta text-eb-muted mt-3 leading-relaxed">
          Last time you were at booth {prefill.boothNumber}.
        </p>
      )}
    </div>
  );
}

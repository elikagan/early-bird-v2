"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

/**
 * Time-aware prompt at the top of /sell asking the dealer about the
 * featured upcoming market: "Selling at Rose Bowl this Sunday?"
 *
 * States:
 *   loading           — initial fetch
 *   no_featured       — no featured market exists, prompt hidden
 *   asking            — fresh prompt, toggle defaults from prior history
 *   confirmed_yes     — answered yes (just now or earlier in the week)
 *   confirmed_no      — answered no
 *
 * Once answered, prompt collapses to a small confirmation badge with
 * an "edit" link. After Monday 12:01 PT the new featured market
 * generates a fresh prompt for the next week.
 */

interface AttendanceState {
  market: {
    id: string;
    name: string;
    starts_at: string;
  } | null;
  current: {
    declined: boolean;
    booth_number: string | null;
  } | null;
  prefill: {
    wasYes: boolean;
    boothNumber: string | null;
  } | null;
}

export function MarketAttendancePrompt() {
  const [state, setState] = useState<AttendanceState | null>(null);
  const [editing, setEditing] = useState(false);
  const [boothInput, setBoothInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await apiFetch("/api/sell/attendance");
    if (res.ok) {
      const data = (await res.json()) as AttendanceState;
      setState(data);
      // Pre-fill the booth input from prior history if no current answer.
      if (!data.current && data.prefill?.boothNumber) {
        setBoothInput(data.prefill.boothNumber);
      } else if (data.current && !data.current.declined && data.current.booth_number) {
        setBoothInput(data.current.booth_number);
      }
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (action: "yes" | "no") => {
    if (!state?.market) return;
    setSaving(true);
    setError(null);
    const res = await apiFetch("/api/sell/attendance", {
      method: "POST",
      body: JSON.stringify({
        market_id: state.market.id,
        declined: action === "no",
        booth_number: action === "yes" ? boothInput.trim() || null : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      void load();
    } else {
      setError("Couldn't save — try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!state) return null;
  if (!state.market) return null;

  const { market, current } = state;
  const startDate = formatDate(market.starts_at);

  // Already answered, not editing → collapsed badge
  if (current && !editing) {
    if (current.declined) {
      return (
        <div className="px-5 py-3 border-b border-eb-border flex items-center justify-between gap-3">
          <div className="text-eb-meta text-eb-muted">
            Not at {market.name} {startDate}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-eb-meta text-eb-pop font-bold uppercase tracking-wider"
          >
            Change
          </button>
        </div>
      );
    }
    return (
      <div className="px-5 py-3 border-b border-eb-border flex items-center justify-between gap-3 bg-eb-pop-bg">
        <div className="text-eb-caption text-eb-text">
          {"✓"} At {market.name}, {startDate}
          {current.booth_number ? ` · Booth ${current.booth_number}` : ""}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-eb-meta text-eb-pop font-bold uppercase tracking-wider"
        >
          Edit
        </button>
      </div>
    );
  }

  // Asking (fresh) or editing
  return (
    <div className="px-5 py-4 border-b border-eb-border bg-eb-pop-bg">
      <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
        This week
      </div>
      <div className="text-eb-title font-bold text-eb-black mb-3">
        Selling at {market.name}, {startDate}?
      </div>
      {error && (
        <p className="text-eb-meta text-eb-red mb-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          inputMode="text"
          placeholder="Booth #"
          value={boothInput}
          onChange={(e) =>
            setBoothInput(
              e.target.value.replace(/[^a-zA-Z0-9\-/]/g, "").slice(0, 10)
            )
          }
          className="flex-1 px-3 py-3 bg-white border-2 border-eb-black tabular-nums"
          style={{ fontSize: "16px" }}
          aria-label="Booth number (optional)"
        />
        <button
          type="button"
          onClick={() => save("yes")}
          disabled={saving}
          className="px-4 py-3 bg-eb-black text-white text-eb-caption font-bold uppercase tracking-wider"
        >
          {saving ? "…" : "Yes"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => save("no")}
        disabled={saving}
        className="mt-3 text-eb-meta text-eb-muted underline"
      >
        Not this one
      </button>
    </div>
  );
}

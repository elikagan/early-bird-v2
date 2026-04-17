/**
 * TEMPORARY preview — redesigned "I'm Interested" inquiry drawer.
 * Three preset options + one custom. Delete once approved.
 */

"use client";

import { useState } from "react";

type OptionKey = "buy" | "discuss" | "price" | "custom";

const OPTIONS: {
  key: OptionKey;
  label: string;
  text: string; // exact text that gets sent to the dealer
}[] = [
  {
    key: "buy",
    label: "Ready to buy",
    text: "I'm interested and ready to buy.",
  },
  {
    key: "discuss",
    label: "Let's discuss",
    text: "I'm interested — I'd like to discuss.",
  },
  {
    key: "price",
    label: "What's your best price?",
    text: "What's your best price?",
  },
  {
    key: "custom",
    label: "Write your own",
    text: "", // filled by the user
  },
];

export default function InquiryPreview() {
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [custom, setCustom] = useState("");

  const dealerBusiness = "Vintage Finds LA";
  const itemTitle = "Mid-century walnut chair";

  const canSend =
    selected !== null && (selected !== "custom" || custom.trim().length > 0);

  return (
    <>
      {/* Dimmed backdrop — shows the drawer is an overlay on top of the item page */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-5 pt-3 pb-6">
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
            I&apos;m Interested
          </h3>
          <button
            aria-label="Close"
            className="text-eb-body text-eb-muted leading-none -mt-1"
          >
            {"\u2715"}
          </button>
        </div>
        <p className="text-eb-caption text-eb-muted leading-relaxed mb-5">
          We&apos;ll text{" "}
          <span className="font-bold text-eb-black">{dealerBusiness}</span>{" "}
          your message and number. They&apos;ll contact you directly — no
          in-app messaging.
        </p>

        {/* Options */}
        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelected(opt.key)}
                className={
                  "w-full text-left px-4 py-3 border-2 transition-colors " +
                  (isSelected
                    ? "border-eb-pop bg-eb-pop-bg"
                    : "border-eb-border bg-white active:bg-eb-border/30")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                      {opt.label}
                    </div>
                    {opt.key !== "custom" && (
                      <div className="text-eb-meta text-eb-muted mt-1 leading-relaxed">
                        &ldquo;{opt.text}&rdquo;
                      </div>
                    )}
                  </div>
                  {/* Radio marker */}
                  <div
                    className={
                      "shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center " +
                      (isSelected ? "border-eb-pop" : "border-eb-border")
                    }
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-eb-pop" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom textarea reveals below when that option is selected */}
        {selected === "custom" && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-eb-meta uppercase tracking-wider text-eb-muted">
                Your Message
              </span>
              <span className="text-eb-meta text-eb-muted tabular-nums">
                {custom.length} / 240
              </span>
            </div>
            <textarea
              className="eb-input h-24 resize-none"
              placeholder={`Love the ${itemTitle.toLowerCase()} — any details?`}
              value={custom}
              onChange={(e) => setCustom(e.target.value.slice(0, 240))}
              autoFocus
            />
          </div>
        )}

        {/* Send button — disabled until a valid selection exists */}
        <button className="eb-btn mt-5" disabled={!canSend}>
          Send Inquiry
        </button>
      </div>
    </>
  );
}

"use client";

import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface Props {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared confirm drawer for destructive actions. Replaces native
 * confirm() across the admin surfaces. Matches the visual pattern
 * the item-detail walkup-sold + inquiry-sold drawers use.
 */
export function ConfirmDrawer({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useBodyScrollLock(open);
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onCancel}
      />
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-5 pt-3 pb-6">
        <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
        <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
          {title}
        </h3>
        {message && (
          <div className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
            {message}
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 text-eb-caption font-bold uppercase tracking-wider text-white ${
              destructive ? "bg-eb-red" : "bg-eb-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Lock document scrolling while `locked` is true.
 *
 * Uses overflow:hidden + overscroll-behavior:none on <html>. This is
 * enough on modern iOS Safari and doesn't trigger the paint-layer
 * shift that position:fixed on body does — that shift blocks the main
 * thread for 1-3s on tall scrolled pages and feels like a frozen drawer.
 *
 * Supports nested / stacked locks via a module-level counter: only the
 * outermost lock touches the document; subsequent locks no-op until the
 * first one releases.
 */

let lockCount = 0;
let savedOverflow = "";
let savedOverscroll = "";

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      const html = document.documentElement;
      savedOverflow = html.style.overflow;
      savedOverscroll = html.style.overscrollBehavior;
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        const html = document.documentElement;
        html.style.overflow = savedOverflow;
        html.style.overscrollBehavior = savedOverscroll;
      }
    };
  }, [locked]);
}

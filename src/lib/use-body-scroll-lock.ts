"use client";

import { useEffect } from "react";

/**
 * Lock document body scrolling while `locked` is true.
 *
 * Standard approach (overflow:hidden on body) is ignored by iOS Safari
 * in many cases, so we also pin body position:fixed at the current
 * scrollY and restore it on unlock. The user isn't thrown to the top
 * of the page when a drawer closes.
 *
 * Supports nested / stacked locks via a module-level counter: only the
 * outermost lock touches the body; subsequent locks no-op until the
 * first one releases.
 */

let lockCount = 0;
let savedScrollY = 0;
let savedOverflow = "";
let savedPosition = "";
let savedTop = "";
let savedWidth = "";

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      savedOverflow = document.body.style.overflow;
      savedPosition = document.body.style.position;
      savedTop = document.body.style.top;
      savedWidth = document.body.style.width;

      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.width = "100%";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.position = savedPosition;
        document.body.style.top = savedTop;
        document.body.style.width = savedWidth;
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [locked]);
}

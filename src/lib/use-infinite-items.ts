"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";

const PAGE_SIZE = 30;

export interface InfiniteItemsState<T> {
  items: T[];
  hasMore: boolean;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: boolean;
  sentinelRef: (node: HTMLElement | null) => void;
  reset: () => void;
}

/**
 * Infinite-scroll items fetcher. Pages the server's /api/items with
 * limit + offset. Caller provides a URL builder (so the same hook
 * works for /early, /buy, /d etc. with their per-page query params).
 *
 * `transform` runs on each fetched page before it's stored — used by
 * /early to filter deleted and shuffle within-batch. Runs on the page
 * only, not the accumulated array, so scrolled-in items don't cause
 * already-visible items to re-order.
 */
export function useInfiniteItems<T>(
  buildUrl: (offset: number, limit: number) => string,
  transform: (page: T[]) => T[] = (p) => p,
  deps: unknown[] = [],
  initialPage?: T[]
): InfiniteItemsState<T> {
  const seeded = initialPage != null;
  const seedLen = initialPage?.length ?? 0;
  const [items, setItems] = useState<T[]>(initialPage ?? []);
  // If the server sent a full page, assume there may be more; if it sent
  // a partial page, we're already at the end.
  const [hasMore, setHasMore] = useState(!seeded || seedLen === PAGE_SIZE);
  const [loadingInitial, setLoadingInitial] = useState(!seeded);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const offsetRef = useRef(seedLen);
  const inflightRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // First useEffect pass should skip refetching if we already have the
  // seeded page. Subsequent dep changes (market switch, filter change)
  // refetch as normal.
  const skipNextLoadRef = useRef(seeded);

  const loadPage = useCallback(async () => {
    if (inflightRef.current || !hasMore) return;
    inflightRef.current = true;
    if (offsetRef.current === 0) setLoadingInitial(true);
    else setLoadingMore(true);
    try {
      const res = await apiFetch(
        buildUrl(offsetRef.current, PAGE_SIZE)
      );
      if (!res.ok) {
        setError(true);
        return;
      }
      const page: T[] = await res.json();
      const transformed = transform(page);
      setItems((prev) =>
        offsetRef.current === 0 ? transformed : [...prev, ...transformed]
      );
      offsetRef.current += page.length;
      // Server returned fewer than a full page → no more to fetch.
      if (page.length < PAGE_SIZE) setHasMore(false);
    } catch {
      setError(true);
    } finally {
      inflightRef.current = false;
      setLoadingInitial(false);
      setLoadingMore(false);
    }
    // buildUrl and transform may be new closures each render; we
    // re-build inside useEffect's deps dependency array, so don't
    // chain them here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  // Kick off first page and reset when any dep changes (e.g. marketId).
  // When seeded (first render after SSR), skip the initial fetch — we
  // already rendered the first page from RSC props.
  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    offsetRef.current = 0;
    setItems([]);
    setHasMore(true);
    setError(false);
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Sentinel observer — fires loadPage when the sentinel scrolls into
  // view. Uses a callback ref so we re-observe when the sentinel node
  // mounts/unmounts (e.g. after "hasMore" flips).
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !hasMore) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) loadPage();
        },
        // Start loading slightly before the sentinel hits the viewport
        // so the user doesn't see empty space while the next page fetches.
        { rootMargin: "400px" }
      );
      observerRef.current.observe(node);
    },
    [loadPage, hasMore]
  );

  const reset = useCallback(() => {
    offsetRef.current = 0;
    setItems([]);
    setHasMore(true);
    setError(false);
    loadPage();
  }, [loadPage]);

  return {
    items,
    hasMore,
    loadingInitial,
    loadingMore,
    error,
    sentinelRef,
    reset,
  };
}

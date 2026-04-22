"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { processImage, createThumbnail } from "@/lib/image-processing";
import {
  getInitials,
  formatPrice,
  formatDate,
  formatPhone,
  timeAgo,
} from "@/lib/format";
import {
  SHOWS,
  type ShowName,
  marketReminderKey,
  showForMarket,
} from "@/lib/shows";
import { BottomNav, adjustNavCount } from "@/components/bottom-nav";
import { NotFoundScreen } from "@/components/not-found-screen";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface Photo {
  id: string;
  url: string;
  position: number;
}

interface Market {
  id: string;
  name: string;
  location: string;
  starts_at: string;
  status: string;
}

interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  price_firm: number;
  status: string;
  held_for: string | null;
  held_for_name: string | null;
  held_for_avatar: string | null;
  sold_to: string | null;
  sold_to_name: string | null;
  sold_to_avatar: string | null;
  dealer_ref: string;
  dealer_name: string;
  dealer_instagram: string | null;
  dealer_display_name: string | null;
  dealer_user_id: string;
  view_count: number;
  watcher_count: number;
  inquiry_count: number;
  booth_number: string | null;
  photos: Photo[];
  market: Market | null;
  is_favorited?: boolean;
  favorite_id?: string;
  my_inquiry_status?: string | null;
}

interface Inquiry {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  buyer_id: string;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  buyer_display_name: string | null;
  buyer_phone: string;
}

// ── New photo slot for upload during edit ──
interface NewPhotoSlot {
  tempId: string;
  preview: string;
  url: string | null;
  thumb_url: string | null;
  status: "processing" | "uploading" | "done" | "error";
  error?: string;
}

const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transition, setTransition] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; dx: number; swiping: boolean } | null>(null);

  // Favorites
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);

  // Inquiry drawer (buyer)
  const [showInquiry, setShowInquiry] = useState(false);

  // When the drawer is open: (1) lock body scroll, (2) track the iOS
  // virtual keyboard height via visualViewport and write --eb-kb-offset
  // on :root so the drawer CSS can lift itself above the keyboard,
  // (3) attach NATIVE (non-passive) touch listeners to the drag
  // handle so we can preventDefault and stop iOS from interpreting
  // the drag as a scroll of the drawer's content.
  useEffect(() => {
    if (!showInquiry) return;

    // 1. Lock body scroll
    document.body.classList.add("eb-scroll-lock");

    // 2. Keyboard offset
    const vv = window.visualViewport;
    const updateKb = () => {
      if (!vv) return;
      const occluded = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      document.documentElement.style.setProperty(
        "--eb-kb-offset",
        `${occluded}px`
      );
    };
    if (vv) {
      vv.addEventListener("resize", updateKb);
      vv.addEventListener("scroll", updateKb);
      updateKb();
    }

    // 3. Drag-to-resize handle. Native listeners with passive:false
    //    so preventDefault works. The drawer is resized in real time
    //    by writing inline height on the ref (DOM mutation, not
    //    JSX inline style).
    const handle = handleRef.current;
    const drawer = drawerRef.current;
    let startY: number | null = null;
    let startHeight = 0;

    const onTouchStart = (ev: TouchEvent) => {
      if (!drawer) return;
      ev.preventDefault();
      startY = ev.touches[0].clientY;
      startHeight = drawer.getBoundingClientRect().height;
      // Disable transition during active drag for direct feel.
      drawer.style.transition = "none";
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (startY == null || !drawer) return;
      ev.preventDefault();
      const dy = ev.touches[0].clientY - startY;
      // Drag DOWN (positive dy) = shrink. Drag UP (negative dy) = grow.
      const next = startHeight - dy;
      // Clamp to a minimum of 120 so the drawer never disappears while
      // the user is still interacting. Max is handled by CSS
      // max-height: 100svh - kb-offset.
      drawer.style.height = `${Math.max(120, next)}px`;
    };
    const onTouchEnd = (ev: TouchEvent) => {
      if (startY == null || !drawer) return;
      const dy = ev.changedTouches[0].clientY - startY;
      const finalHeight = startHeight - dy;
      startY = null;
      // Restore transition
      drawer.style.transition = "";
      // Closed-threshold: if the user dragged it small, dismiss.
      if (finalHeight < 200) {
        drawer.style.height = "";
        setShowInquiry(false);
        setAnonSent(false);
        setAnonError(null);
      }
      // Otherwise keep the new height (no snap points — user owns it).
    };
    const onTouchCancel = () => {
      startY = null;
      if (drawer) drawer.style.transition = "";
    };

    if (handle) {
      handle.addEventListener("touchstart", onTouchStart, { passive: false });
      handle.addEventListener("touchmove", onTouchMove, { passive: false });
      handle.addEventListener("touchend", onTouchEnd);
      handle.addEventListener("touchcancel", onTouchCancel);
    }

    return () => {
      document.body.classList.remove("eb-scroll-lock");
      if (vv) {
        vv.removeEventListener("resize", updateKb);
        vv.removeEventListener("scroll", updateKb);
      }
      document.documentElement.style.removeProperty("--eb-kb-offset");
      if (handle) {
        handle.removeEventListener("touchstart", onTouchStart);
        handle.removeEventListener("touchmove", onTouchMove);
        handle.removeEventListener("touchend", onTouchEnd);
        handle.removeEventListener("touchcancel", onTouchCancel);
      }
      // Clear any inline height on the drawer so next open is default.
      if (drawerRef.current) {
        drawerRef.current.style.height = "";
        drawerRef.current.style.transition = "";
      }
    };
  }, [showInquiry]);
  const [inquiryMsg, setInquiryMsg] = useState("");
  const [inquiryOption, setInquiryOption] = useState<
    "buy" | "discuss" | "price" | "custom" | null
  >(null);
  const [sending, setSending] = useState(false);
  // Anon inquiry fields — only rendered when user is logged out. The
  // signed-in flow keeps the original preset-message UI.
  const [anonName, setAnonName] = useState("");
  const [anonPhone, setAnonPhone] = useState("");
  const [anonError, setAnonError] = useState<string | null>(null);
  // Anon drawer has three post-submit states:
  //   "pending" — form submitted, verification SMS sent, dealer NOT
  //               notified yet. Waiting on the buyer to tap the link.
  //   "confirmed" — buyer tapped the link, they've been redirected
  //                 back to /item/[id]?sent=1, dealer has been texted.
  //   false/null — pre-submission, or drawer closed.
  const [anonSent, setAnonSent] = useState<"pending" | "confirmed" | false>(
    false
  );

  // Shows the buyer has opted into pre-market reminder SMS for.
  // Seeded when the drawer enters "confirmed" state — we auto-sub
  // them to the show they just inquired on (that's the consent
  // signal). Extra shows are explicit-opt-in via checkbox.
  const [subscribedShows, setSubscribedShows] = useState<Set<ShowName>>(
    new Set()
  );
  const autoSubscribedRef = useRef(false);

  // When verify redirects us here with ?sent=1, open the drawer in
  // "confirmed" state. Then strip the query param via replaceState so
  // browser Back from this page goes to the user's previous page
  // (their listings grid), not a stale ?sent=1 URL.
  useEffect(() => {
    if (searchParams.get("sent") !== "1") return;
    setShowInquiry(true);
    setAnonSent("confirmed");
    // Clean the URL in-place without adding a history entry
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("sent");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams]);

  // When the drawer enters "confirmed" state with an item loaded,
  // auto-subscribe the buyer to pre-market reminders for the show
  // they just inquired on. The inquiry itself is the consent signal;
  // the UI lets them uncheck or add other shows from there.
  // autoSubscribedRef guards against double-running when the user
  // toggles back into the drawer.
  useEffect(() => {
    if (anonSent !== "confirmed") return;
    if (!item?.market?.name) return;
    if (autoSubscribedRef.current) return;
    const show = showForMarket(item.market.name);
    if (!show) return;

    autoSubscribedRef.current = true;
    setSubscribedShows((prev) => {
      const next = new Set(prev);
      next.add(show);
      return next;
    });
    // Fire-and-forget PATCH to persist. If this fails, the local
    // state still reflects the intent; the user can toggle to retry.
    fetch("/api/users/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification_preferences: [
          { key: marketReminderKey(show), enabled: true },
        ],
      }),
    }).catch(() => {});
  }, [anonSent, item]);

  const toggleShowSubscription = useCallback(async (show: ShowName) => {
    const key = marketReminderKey(show);
    let nextEnabled = false;
    setSubscribedShows((prev) => {
      const next = new Set(prev);
      if (next.has(show)) {
        next.delete(show);
        nextEnabled = false;
      } else {
        next.add(show);
        nextEnabled = true;
      }
      return next;
    });
    await fetch("/api/users/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification_preferences: [{ key, enabled: nextEnabled }],
      }),
    }).catch(() => {});
  }, []);

  // Confirm drawer (dealer-own)
  const [confirmInquiry, setConfirmInquiry] = useState<Inquiry | null>(null);
  const [confirmWalkupSold, setConfirmWalkupSold] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Body-scroll-lock: any open drawer on this page freezes background scroll.
  useBodyScrollLock(
    showInquiry || !!confirmInquiry || confirmWalkupSold || showDeleteConfirm
  );

  // ── Edit mode state ──
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFirm, setEditFirm] = useState(false);
  const [removePhotoIds, setRemovePhotoIds] = useState<Set<string>>(new Set());
  const [newPhotos, setNewPhotos] = useState<NewPhotoSlot[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View type
  const isOwner = !!(item && user && item.dealer_user_id === user.id);
  const isDealerBrowsing = !!(
    item &&
    user &&
    user.is_dealer === 1 &&
    !isOwner
  );

  useEffect(() => {
    async function load() {
      const res = await apiFetch(`/api/items/${id}`);
      if (!res.ok) {
        router.replace("/buy");
        return;
      }
      const data: ItemDetail = await res.json();
      setItem(data);
      // Authed users: heart state comes from the /api/items/[id]
      // payload. Anons: check localStorage.
      if (user) {
        setIsFav(data.is_favorited || false);
        setFavId(data.favorite_id || null);
      } else {
        const { hasAnonFavorite } = await import("@/lib/anon-favorites");
        setIsFav(hasAnonFavorite(data.id));
      }

      // Dealer-own: fetch inquiries
      if (user && data.dealer_user_id === user.id) {
        const inqRes = await apiFetch(`/api/items/${id}/inquiries`);
        if (inqRes.ok) setInquiries(await inqRes.json());
      }

      setLoading(false);
    }
    if (id) load();
  }, [id, user, router]);

  // ── Edit helpers ──

  const enterEditMode = useCallback(() => {
    if (!item) return;
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditPrice(String(item.price / 100));
    setEditFirm(item.price_firm === 1);
    setRemovePhotoIds(new Set());
    setNewPhotos([]);
    setEditError(null);
    setEditing(true);
  }, [item]);

  const cancelEdit = useCallback(() => {
    // Revoke object URLs from new photo previews
    newPhotos.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
    setEditing(false);
    setNewPhotos([]);
    setRemovePhotoIds(new Set());
    setEditError(null);
  }, [newPhotos]);

  const uploadEditPhoto = useCallback(async (file: File, tempId: string) => {
    setNewPhotos((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, status: "processing" } : p))
    );

    let processed: Blob;
    try {
      const result = await processImage(file);
      processed = result.blob;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setNewPhotos((prev) =>
        prev.map((p) => (p.tempId === tempId ? { ...p, status: "error", error: msg } : p))
      );
      return;
    }

    setNewPhotos((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, status: "uploading" } : p))
    );

    const form = new FormData();
    form.append("file", processed, "photo.jpg");

    try {
      const res = await apiFetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setNewPhotos((prev) =>
        prev.map((p) =>
          p.tempId === tempId ? { ...p, status: "done", url: data.url, thumb_url: data.thumb_url || null } : p
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setNewPhotos((prev) =>
        prev.map((p) => (p.tempId === tempId ? { ...p, status: "error", error: msg } : p))
      );
    }
  }, []);

  const handleEditFiles = useCallback(
    async (files: FileList) => {
      if (!item) return;
      const existingCount = item.photos.filter((p) => !removePhotoIds.has(p.id)).length;
      const remaining = MAX_PHOTOS - existingCount - newPhotos.length;
      if (remaining <= 0) return;

      const toAdd = Array.from(files).slice(0, remaining);
      const slots: NewPhotoSlot[] = [];

      for (const file of toAdd) {
        if (file.size > 15 * 1024 * 1024) {
          setEditError(`${file.name} too large (max 15MB)`);
          continue;
        }
        const tempId = crypto.randomUUID();
        const preview = await createThumbnail(file);
        slots.push({ tempId, preview, url: null, thumb_url: null, status: "processing" });
        uploadEditPhoto(file, tempId);
      }

      if (slots.length > 0) {
        setNewPhotos((prev) => [...prev, ...slots]);
        setEditError(null);
      }
    },
    [item, removePhotoIds, newPhotos.length, uploadEditPhoto]
  );

  const saveEdit = useCallback(async () => {
    if (!item || editSaving) return;

    const trimTitle = editTitle.trim();
    if (!trimTitle || trimTitle.length > 60) {
      setEditError("Title must be 1-60 characters");
      return;
    }
    const priceNum = Math.round(parseFloat(editPrice) * 100);
    if (!Number.isFinite(priceNum) || priceNum < 100) {
      setEditError("Price must be at least $1");
      return;
    }

    const keptPhotos = item.photos.filter((p) => !removePhotoIds.has(p.id)).length;
    const uploadedNew = newPhotos.filter((p) => p.status === "done").length;
    if (keptPhotos + uploadedNew < 1) {
      setEditError("Item must have at least 1 photo");
      return;
    }

    const uploading = newPhotos.some(
      (p) => p.status === "processing" || p.status === "uploading"
    );
    if (uploading) {
      setEditError("Wait for photos to finish uploading");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    const body: Record<string, unknown> = {
      title: trimTitle,
      description: editDesc.trim() || null,
      price: priceNum,
      price_firm: editFirm,
    };

    const addPhotos = newPhotos.filter((p) => p.url).map((p) => ({ url: p.url, thumb_url: p.thumb_url || null }));
    if (addPhotos.length > 0) body.add_photos = addPhotos;

    const removeIds = Array.from(removePhotoIds);
    if (removeIds.length > 0) body.remove_photo_ids = removeIds;

    try {
      const res = await apiFetch(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }

      // Reload the full item to get fresh photo list
      const refreshRes = await apiFetch(`/api/items/${id}`);
      if (refreshRes.ok) {
        const fresh = await refreshRes.json();
        setItem(fresh);
      }

      newPhotos.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
      setEditing(false);
      setNewPhotos([]);
      setRemovePhotoIds(new Set());
      setPhotoIndex(0);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setEditSaving(false);
    }
  }, [item, editTitle, editDesc, editPrice, editFirm, removePhotoIds, newPhotos, id, editSaving]);

  // ── Existing handlers ──

  const toggleFavorite = useCallback(async () => {
    if (!item) return;
    // Anonymous path: toggle in localStorage. On their first login
    // the AuthProvider drains this list into real /api/favorites rows.
    if (!user) {
      const { hasAnonFavorite, addAnonFavorite, removeAnonFavorite } =
        await import("@/lib/anon-favorites");
      if (hasAnonFavorite(item.id)) {
        removeAnonFavorite(item.id);
        setIsFav(false);
      } else {
        addAnonFavorite(item.id);
        setIsFav(true);
      }
      return;
    }
    // Authenticated path: hit the API
    if (isFav && favId) {
      await apiFetch(`/api/favorites/${favId}`, { method: "DELETE" });
      setIsFav(false);
      setFavId(null);
      adjustNavCount("watching", -1);
    } else {
      const res = await apiFetch("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ item_id: item.id }),
      });
      if (res.ok) {
        const fav = await res.json();
        setIsFav(true);
        setFavId(fav.id);
        adjustNavCount("watching", +1);
      }
    }
  }, [item, isFav, favId, user]);

  const sendInquiry = useCallback(async () => {
    if (!item || sending) return;

    // Unified message resolution — both auth states use the same
    // preset options. Anons add name + phone on top.
    if (!inquiryOption) return;
    let message = "";
    if (inquiryOption === "buy") message = "I'm interested and ready to buy.";
    else if (inquiryOption === "discuss") message = "I'm interested — I'd like to discuss.";
    else if (inquiryOption === "price") message = "What's your best price?";
    else if (inquiryOption === "custom") message = inquiryMsg.trim();
    if (!message) return;

    let body: Record<string, unknown> = { item_id: item.id, message };
    if (!user) {
      const trimmedName = anonName.trim();
      if (!trimmedName) {
        setAnonError("Name is required");
        return;
      }
      if (!anonPhone) {
        setAnonError("Phone is required");
        return;
      }
      body = { ...body, name: trimmedName, phone: anonPhone };
      setAnonError(null);
    }

    setSending(true);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setSending(false);
    if (res.ok) {
      if (user) {
        // Signed-in path: collapse drawer and flip the CTA.
        setShowInquiry(false);
        setInquiryMsg("");
        setInquiryOption(null);
        setIsFav(true);
        setItem((prev) => (prev ? { ...prev, my_inquiry_status: "open" } : prev));
      } else {
        // Anon path: stay in the drawer but swap to the "pending
        // verification" state. Dealer has NOT been texted yet — the
        // buyer needs to tap the verify link for the inquiry to go
        // through. Item page's "?sent=1" handler flips this to
        // "confirmed" after they return from the magic link.
        setAnonSent("pending");
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (!user) {
        setAnonError(errData.error || "Couldn't send your message. Try again.");
      }
    }
  }, [item, user, inquiryMsg, inquiryOption, sending, anonName, anonPhone]);

  const updateStatus = useCallback(
    async (status: string, soldTo?: string) => {
      if (!item) return;
      const body: Record<string, unknown> = { status };
      if (soldTo) body.sold_to = soldTo;
      const res = await apiFetch(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem((prev) => (prev ? { ...prev, ...updated } : prev));
        setConfirmInquiry(null);
        const inqRes = await apiFetch(`/api/items/${id}/inquiries`);
        if (inqRes.ok) setInquiries(await inqRes.json());
      }
    },
    [item, id]
  );

  const deleteItem = useCallback(async () => {
    setDeleting(true);
    const res = await apiFetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      // Only dealers delete their own items, and only items in the
      // current sell-focus market affect the sell count. Safe to
      // optimistically decrement — the fresh fetch on /sell will
      // reconcile if this item wasn't in the counted market.
      if (isOwner) adjustNavCount("sell", -1);
      router.replace("/sell");
    } else {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [id, router, isOwner]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  if (!item) {
    return (
      <NotFoundScreen
        message="This item may have been removed or the link might be wrong."
        action={{ label: "Browse listings", href: "/home" }}
      />
    );
  }

  const marketDate = item.market ? formatDate(item.market.starts_at) : "";
  const boothStr = item.booth_number ? `Booth ${item.booth_number}` : null;

  // Edit mode: compute visible photos
  const keptPhotos = editing
    ? item.photos.filter((p) => !removePhotoIds.has(p.id))
    : item.photos;
  const totalEditPhotos = keptPhotos.length + newPhotos.length;

  return (
    <>
      {/* Back + edit/fav row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-eb-border">
        <button
          onClick={() => {
            if (editing) { cancelEdit(); return; }
            // router.back() doesn't work when the user arrived via the
            // SMS inquiry-confirmation flow (the /v/[token] page was
            // replaced out of history). Route explicitly to the market
            // grid the item belongs to.
            const marketId = item?.market?.id;
            if (marketId) {
              router.push(user ? `/buy?market=${marketId}` : `/early/${marketId}`);
            } else {
              router.push("/");
            }
          }}
          className="text-eb-caption text-eb-muted"
        >
          {editing ? "\u2715 Cancel edit" : isOwner ? "\u2190 Back to my booth" : "\u2190 Back to listings"}
        </button>
        {isOwner && !editing ? (
          <button
            onClick={enterEditMode}
            className="text-eb-meta uppercase tracking-wider text-eb-pop font-bold"
          >
            Edit
          </button>
        ) : !isOwner && user ? (
          <button
            onClick={toggleFavorite}
            className="eb-fav-btn"
          >
            <svg viewBox="0 0 24 24" className={isFav ? "eb-fav-filled" : "eb-fav-outline"}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        ) : !isOwner && !user ? (
          <button
            onClick={toggleFavorite}
            className="eb-fav-btn"
          >
            <svg viewBox="0 0 24 24" className={isFav ? "eb-fav-filled" : "eb-fav-outline"}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* ── EDIT MODE: Photo grid ── */}
      {editing ? (
        <section className="px-5 py-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Photos
            </span>
            <span className="text-eb-meta text-eb-muted">
              {totalEditPhotos} / {MAX_PHOTOS}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Existing photos (not removed) */}
            {keptPhotos.map((photo, i) => (
              <div key={photo.id} className="relative aspect-square bg-eb-cream border-2 border-eb-border overflow-hidden">
                <Image src={photo.url} alt="Item photo" width={200} height={200} sizes="33vw" className="w-full h-full object-cover" />
                <button
                  onClick={() => setRemovePhotoIds((prev) => new Set([...prev, photo.id]))}
                  className="absolute top-1 right-1 w-6 h-6 bg-eb-black text-eb-white flex items-center justify-center text-eb-micro font-bold"
                >
                  {"\u2715"}
                </button>
                {i === 0 && newPhotos.filter((p) => p.status === "done").length === 0 && (
                  <span className="absolute bottom-1 left-1 bg-eb-pop text-eb-white text-eb-micro px-1.5 py-0.5 font-bold uppercase">
                    Hero
                  </span>
                )}
              </div>
            ))}

            {/* New uploads */}
            {newPhotos.map((photo) => (
              <div key={photo.tempId} className="relative aspect-square bg-eb-cream border-2 border-eb-border overflow-hidden">
                {photo.preview && (
                  <img src={photo.preview} alt="New photo" className="w-full h-full object-cover" />
                )}
                {(photo.status === "processing" || photo.status === "uploading") && (
                  <div className="absolute inset-0 bg-eb-black/50 flex items-center justify-center">
                    <span className="eb-spinner" />
                  </div>
                )}
                {photo.status === "error" && (
                  <div className="absolute inset-0 bg-eb-black/60 flex items-center justify-center p-2">
                    <span className="text-eb-micro text-eb-red text-center">{photo.error || "Failed"}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (photo.preview) URL.revokeObjectURL(photo.preview);
                    setNewPhotos((prev) => prev.filter((p) => p.tempId !== photo.tempId));
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-eb-black text-eb-white flex items-center justify-center text-eb-micro font-bold"
                >
                  {"\u2715"}
                </button>
              </div>
            ))}

            {/* Add button */}
            {totalEditPhotos < MAX_PHOTOS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-white border-2 border-dashed border-eb-black flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-eb-black">+</span>
                  <span className="text-eb-micro uppercase tracking-wider text-eb-black">Add</span>
                </div>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleEditFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </section>
      ) : (
        <>
          {/* VIEW MODE: Sliding photo carousel */}
          <div
            className="relative w-full overflow-hidden"
            ref={carouselRef}
            onTouchStart={(e) => {
              const t = e.touches[0];
              dragRef.current = { sx: t.clientX, sy: t.clientY, dx: 0, swiping: false };
              setDragging(true);
              setTransition(false);
            }}
            onTouchMove={(e) => {
              if (!dragRef.current) return;
              const t = e.touches[0];
              const dx = t.clientX - dragRef.current.sx;
              const dy = t.clientY - dragRef.current.sy;
              // Lock to horizontal once we know direction
              if (!dragRef.current.swiping && Math.abs(dx) > 8) {
                if (Math.abs(dx) > Math.abs(dy)) {
                  dragRef.current.swiping = true;
                } else {
                  dragRef.current = null;
                  setDragging(false);
                  return;
                }
              }
              if (dragRef.current.swiping) {
                e.preventDefault();
                // Resist at edges
                let clamped = dx;
                if ((photoIndex === 0 && dx > 0) || (photoIndex === item.photos.length - 1 && dx < 0)) {
                  clamped = dx * 0.3;
                }
                dragRef.current.dx = clamped;
                setDragOffset(clamped);
              }
            }}
            onTouchEnd={() => {
              if (!dragRef.current) return;
              const { dx, swiping } = dragRef.current;
              dragRef.current = null;
              setDragging(false);
              setTransition(true);
              setDragOffset(0);
              if (swiping && Math.abs(dx) > 40) {
                if (dx < 0 && photoIndex < item.photos.length - 1) {
                  setPhotoIndex(photoIndex + 1);
                } else if (dx > 0 && photoIndex > 0) {
                  setPhotoIndex(photoIndex - 1);
                }
              }
            }}
          >
            <div
              className="flex"
              style={{
                transform: `translateX(calc(-${photoIndex * 100}% + ${dragOffset}px))`,
                transition: transition && !dragging ? "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
              }}
            >
              {item.photos.map((photo, i) => (
                <Image
                  key={photo.id}
                  src={photo.url}
                  alt={i === 0 ? item.title : `${item.title} photo ${i + 1}`}
                  width={860}
                  height={860}
                  sizes="100vw"
                  priority={i === 0}
                  className="w-full shrink-0 block"
                  draggable={false}
                />
              ))}
            </div>
          </div>
          {/* Photo dots */}
          {item.photos.length > 1 && (
            <div className="flex justify-center gap-1.5 py-2.5">
              {item.photos.map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full cursor-pointer ${
                    i === photoIndex ? "bg-eb-black" : "bg-eb-light"
                  }`}
                  onClick={() => setPhotoIndex(i)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dealer-own: Status controls (hidden during edit) */}
      {isOwner && !editing && (
        <section className="px-5 pt-5 pb-4 border-b border-eb-border">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Status
          </div>
          <div className="flex w-full border border-eb-border">
            {(["live", "hold", "sold"] as const).map((s, i) => {
              const isActive = item.status === s;
              const handleClick = () => {
                if (isActive) return; // no-op if already in this state
                if (s === "sold") {
                  // SOLD from the status pill = walk-up sale. Destructive,
                  // open confirm drawer. (Per-inquiry sell uses a
                  // different drawer.)
                  setConfirmWalkupSold(true);
                  return;
                }
                updateStatus(s);
              };
              return (
                <button
                  key={s}
                  className={`flex-1 py-4 text-eb-body font-bold uppercase tracking-wider ${
                    i > 0 ? "border-l border-eb-border" : ""
                  } ${
                    isActive
                      ? "bg-eb-black text-white"
                      : "bg-white text-eb-text active:bg-eb-border/30"
                  }`}
                  onClick={handleClick}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
          <p className="text-eb-meta text-eb-muted mt-2 leading-relaxed">
            Tap <span className="font-bold text-eb-black">Hold</span> to
            pause the listing temporarily. Tap{" "}
            <span className="font-bold text-eb-black">Sold</span> for a
            walk-up sale with no prior inquiry, or hit{" "}
            <span className="font-bold text-eb-black">Sell</span> on a
            specific inquiry below to text that buyer a receipt.
          </p>
        </section>
      )}

      {/* ── EDIT MODE: Form fields ── */}
      {editing ? (
        <section className="px-5 py-5 space-y-5">
          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Title *
              </span>
              <span className="text-eb-meta text-eb-muted">
                {editTitle.length} / 60
              </span>
            </div>
            <input
              type="text"
              className="eb-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value.slice(0, 60))}
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Description
              </span>
              <span className="text-eb-meta text-eb-muted">
                {editDesc.length} / 500
              </span>
            </div>
            <textarea
              className="eb-input h-28 resize-none"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value.slice(0, 500))}
            />
          </div>

          {/* Price */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Price *
              </span>
              <button
                type="button"
                onClick={() => setEditFirm(!editFirm)}
                className={
                  editFirm
                    ? "eb-tag-firm"
                    : "inline-block text-eb-micro uppercase tracking-wider text-eb-muted border border-eb-border px-1 py-0.5"
                }
              >
                FIRM
              </button>
            </div>
            <div className="flex items-center border-2 border-eb-black bg-white">
              <span className="pl-4 font-bold text-eb-muted">$</span>
              <input
                type="text"
                inputMode="decimal"
                className="flex-1 py-3.5 px-2 bg-transparent outline-none text-base"
                value={editPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  if (v.split(".").length <= 2) setEditPrice(v);
                }}
              />
            </div>
          </div>

          {/* Error */}
          {editError && (
            <p className="text-eb-meta text-eb-red">{editError}</p>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={editSaving}
              className="eb-btn flex-1"
            >
              {editSaving ? "Saving\u2026" : "Save Changes"}
            </button>
            <button
              onClick={cancelEdit}
              className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* VIEW MODE: Title + price */}
          <section className="px-5 pt-4 pb-3">
            <h1 className="text-eb-display text-eb-black leading-tight">
              {item.title}
            </h1>
            <div className="flex items-center gap-2.5 mt-2">
              <span className="text-eb-title text-eb-muted">
                {formatPrice(item.price)}
              </span>
              {item.original_price && (
                <span className="text-eb-meta text-eb-muted line-through">
                  {formatPrice(item.original_price)}
                </span>
              )}
              {item.price_firm === 1 && !item.original_price && (
                <span className="eb-tag-firm">FIRM</span>
              )}
              {item.status === "hold" && (
                <span className="eb-tag-hold">HOLD</span>
              )}
              {item.status === "sold" && (
                <span className="eb-tag-sold">SOLD</span>
              )}
            </div>
          </section>

          {/* Dealer-own: Stats */}
          {isOwner && (
            <div className="eb-stats mx-5 mb-4 border border-eb-border">
              <div className="eb-stat">
                <div className="eb-stat-num">{item.view_count || 0}</div>
                <div className="eb-stat-label">Views</div>
              </div>
              <div className="eb-stat">
                <div className="eb-stat-num">{item.watcher_count}</div>
                <div className="eb-stat-label">Watchers</div>
              </div>
              <div className="eb-stat">
                <div className="eb-stat-num">{item.inquiry_count}</div>
                <div className="eb-stat-label">Inquiries</div>
              </div>
            </div>
          )}

          {/* Dealer-own: Sold-to identity */}
          {isOwner && item.status === "sold" && item.sold_to && (
            <div className="mx-5 mb-4 p-4 border border-eb-border">
              <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                Sold To
              </div>
              <div className="flex items-center gap-3">
                {item.sold_to_avatar ? (
                  <Image
                    src={item.sold_to_avatar}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="eb-avatar eb-avatar-md">
                    {getInitials(item.sold_to_name || "Buyer")}
                  </span>
                )}
                <span className="text-eb-body font-bold text-eb-black">
                  {item.sold_to_name || "Buyer"}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <section className="px-5 pb-5">
              {isOwner && (
                <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
                  Description
                </div>
              )}
              <p className="text-eb-body leading-relaxed text-eb-text">
                {item.description}
              </p>
            </section>
          )}
        </>
      )}

      {/* Dealer card — links to dealer page (logged-in only) */}
      {!isOwner && !editing && user && (
        <Link
          href={`/d/${item.dealer_ref}${item.market ? `?market=${item.market.id}&from=item` : "?from=item"}`}
          className="mx-5 mb-5 p-4 border border-eb-border flex gap-3 items-center"
        >
          <span className="eb-avatar eb-avatar-lg">
            {getInitials(item.dealer_name)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="text-eb-body font-bold text-eb-black">
                {item.dealer_name}
              </div>
              <span className="text-eb-meta text-eb-muted">{"\u2192"}</span>
            </div>
            <div className="text-eb-meta text-eb-muted mt-0.5">
              {boothStr ? `${boothStr} ${"\u00b7"} ` : ""}
              {item.market?.name} {"\u00b7"} {marketDate}
            </div>
            {item.dealer_instagram && (
              <div className="text-eb-meta text-eb-muted mt-0.5">
                @{item.dealer_instagram.replace("@", "")}
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Market context — hidden in edit mode */}
      {!editing && item.market && (
        <section className="px-5 py-4">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            {isOwner ? "Listed In" : "Available At"}
          </div>
          <div className="border border-eb-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-eb-body font-bold text-eb-black">
                  {item.market.name}
                </div>
                <div className="text-eb-meta text-eb-muted mt-0.5">
                  {marketDate} {"\u00b7"}{" "}
                  {isOwner && boothStr ? boothStr : item.market.location}
                </div>
              </div>
              {item.market.status === "live" && (
                <span className="text-eb-micro uppercase tracking-wider text-eb-green">
                  LIVE
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Dealer-browsing alert */}
      {isDealerBrowsing && !editing && (
        <section className="mx-5 mb-5 p-4 border border-eb-border bg-eb-pop-bg">
          <div className="text-eb-meta font-bold uppercase tracking-wider text-eb-black mb-1">
            You&apos;re viewing this as a buyer
          </div>
          <p className="text-eb-meta text-eb-muted leading-relaxed">
            {item.dealer_name} is another dealer at this market. Inquiry
            works the same as any buyer — they&apos;ll get your phone
            number.
          </p>
        </section>
      )}

      {/* Dealer-own: Inquiry log — hidden in edit mode */}
      {isOwner && !editing && (
        <section className="px-5 pt-4 pb-24 border-t border-eb-border">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
            Inquiries ({inquiries.length})
          </div>
          <p className="text-eb-meta text-eb-muted mb-4 leading-relaxed">
            These buyers reached out through Early Bird. Contact them
            directly to make the deal.
          </p>
          <div className="flex flex-col gap-3">
            {inquiries.map((inq) => {
              const buyerName =
                inq.buyer_display_name ||
                `${inq.buyer_first_name || ""} ${(inq.buyer_last_name || "")[0] || ""}`.trim() ||
                "Buyer";
              return (
                <div key={inq.id} className="border border-eb-border p-4">
                  <div className="flex items-start gap-3">
                    <span className="eb-avatar eb-avatar-md">
                      {getInitials(buyerName)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-eb-body font-bold text-eb-black">
                          {buyerName}
                        </span>
                        <span className="text-eb-meta uppercase tracking-wider text-eb-muted">
                          {timeAgo(inq.created_at)}
                        </span>
                      </div>
                      <a
                        href={`tel:${inq.buyer_phone}`}
                        className="text-eb-caption font-bold text-eb-black underline"
                      >
                        {formatPhone(inq.buyer_phone)}
                      </a>
                      {inq.message && (
                        <p className="text-eb-caption text-eb-text mt-2 leading-relaxed">
                          &ldquo;{inq.message}&rdquo;
                        </p>
                      )}
                      {inq.status === "open" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            className="px-3 py-1 text-eb-caption font-bold border border-eb-border text-eb-text"
                            onClick={() => setConfirmInquiry(inq)}
                          >
                            Sell
                          </button>
                          <a
                            href={`tel:${inq.buyer_phone}`}
                            className="px-3 py-1 text-eb-caption font-bold border border-eb-border text-eb-text"
                          >
                            Call
                          </a>
                          <a
                            href={`sms:${inq.buyer_phone}`}
                            className="px-3 py-1 text-eb-caption font-bold border border-eb-border text-eb-text"
                          >
                            Text
                          </a>
                        </div>
                      )}
                      {inq.status === "sold" && (
                        <span className="inline-block mt-3 text-eb-micro uppercase tracking-wider text-eb-green border border-eb-green px-1">
                          SOLD
                        </span>
                      )}
                      {inq.status === "lost" && (
                        <span className="inline-block mt-3 text-eb-micro uppercase tracking-wider text-eb-muted border border-eb-muted px-1">
                          LOST
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Dealer-own: Delete — hidden in edit mode */}
      {isOwner && !editing && (
        <section className="px-5 py-5 border-t border-eb-border">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 text-eb-caption font-bold border border-eb-red text-eb-red uppercase tracking-wider"
          >
            Delete Listing
          </button>
        </section>
      )}

      {/* Delete confirmation drawer */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-6 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-3">
              Delete this listing?
            </h3>
            <p className="text-eb-caption text-eb-muted mb-5 leading-relaxed">
              This removes &ldquo;{item.title}&rdquo; and all its photos permanently. This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deleteItem}
                disabled={deleting}
                className="flex-1 py-2.5 text-eb-caption font-bold bg-eb-red text-white uppercase tracking-wider"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-eb-caption font-bold border border-eb-border text-eb-muted uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Buyer / dealer-browsing: Status banner + CTA — hidden in edit mode */}
      {!isOwner && !editing && (
        <>
          {item.status === "hold" && (
            <section className="mx-5 mb-4 p-4 border border-eb-amber bg-eb-pop-bg">
              <div className="text-eb-meta font-bold uppercase tracking-wider text-eb-black mb-1">
                On Hold
              </div>
              <p className="text-eb-meta text-eb-muted leading-relaxed">
                The dealer is holding this item for another buyer. You can still
                inquire in case it falls through.
              </p>
            </section>
          )}
          {item.status === "sold" && (
            <section className="mx-5 mb-4 p-4 border border-eb-muted">
              <div className="text-eb-meta font-bold uppercase tracking-wider text-eb-black mb-1">
                Sold
              </div>
              <p className="text-eb-meta text-eb-muted leading-relaxed">
                This item has been sold.
              </p>
            </section>
          )}
          {item.status === "deleted" && (
            <section className="mx-5 mb-4 p-4 border border-eb-muted">
              <div className="text-eb-meta font-bold uppercase tracking-wider text-eb-black mb-1">
                Removed
              </div>
              <p className="text-eb-meta text-eb-muted leading-relaxed">
                The dealer has removed this listing.
              </p>
            </section>
          )}
          {(item.status === "live" || item.status === "hold") && user && !isOwner && (
            <>
              {item.my_inquiry_status &&
              item.my_inquiry_status !== "lost" ? (
                <>
                  <section className="px-5 pb-4">
                    <button
                      className="eb-cta"
                      disabled
                      aria-disabled="true"
                    >
                      Already inquired {"\u2713"}
                    </button>
                  </section>
                  <p className="text-eb-meta text-eb-muted text-center px-5 pb-8 leading-relaxed">
                    {item.dealer_name} has your name and number. They&apos;ll
                    reach out directly.
                  </p>
                </>
              ) : (
                <>
                  <section className="px-5 pb-4">
                    <button
                      className="eb-cta"
                      onClick={() => setShowInquiry(true)}
                    >
                      I&apos;M INTERESTED {"\u2192"}
                    </button>
                  </section>
                  <p className="text-eb-meta text-eb-muted text-center px-5 pb-8 leading-relaxed">
                    Sends {item.dealer_name} a text with your name and number.
                    You deal directly.
                  </p>
                </>
              )}
            </>
          )}
          {(item.status === "live" || item.status === "hold") && !user && (
            <>
              <section className="px-5 pb-4">
                <button
                  className="eb-cta"
                  onClick={() => setShowInquiry(true)}
                >
                  I{"\u2019"}M INTERESTED {"\u2192"}
                </button>
              </section>
              <p className="text-eb-meta text-eb-muted text-center px-5 pb-8 leading-relaxed">
                Sends {item.dealer_name} a text with your name and number.
                You deal directly.
              </p>
            </>
          )}
        </>
      )}

      {/* Bottom nav */}
      <BottomNav active={isOwner ? "sell" : "buy"} />

      {/* Inquiry drawer */}
      {showInquiry && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => {
              setShowInquiry(false);
              setAnonSent(false);
              setAnonError(null);
            }}
          />
          <div
            ref={drawerRef}
            className="eb-drawer-kb-aware fixed left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 flex flex-col"
          >
            {/* Drag handle — pinned to the top of the drawer, above
                everything. Content below scrolls under it. Native
                touch listeners are attached in the drawer's useEffect
                so we can preventDefault and own the gesture. Drag up =
                grow, drag down = shrink, drag too small = close. */}
            <div
              ref={handleRef}
              className="eb-drawer-handle shrink-0 px-5 pt-3 pb-2 flex justify-center touch-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1 bg-eb-border rounded-full" />
            </div>

            {/* Scrollable content area — takes remaining drawer height. */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            {/* Confirmed state. Buyer tapped the verify link, dealer
                has been notified, session is now active. Show regardless
                of auth state — after verify the user IS signed in, but
                we still want them to see "inquiry sent" not the form
                with "Ready to buy" options. */}
            {anonSent === "confirmed" ? (
              <>
                <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black mb-2">
                  Inquiry sent
                </h3>
                <p className="text-eb-caption text-eb-muted leading-relaxed">
                  {item.dealer_name} has your name and number. They
                  {"\u2019"}ll text you directly.
                </p>

                {/* Market reminders — show they just inquired on is
                    auto-checked (inquiry = consent for that show).
                    They can uncheck or add others. */}
                <div className="mt-6 pt-5 border-t border-eb-border">
                  <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
                    Market Reminders
                  </div>
                  <p className="text-eb-meta text-eb-muted leading-relaxed mb-3">
                    Text me before each show to see what top dealers are
                    bringing.
                  </p>
                  <div className="space-y-2">
                    {SHOWS.map((show) => {
                      const on = subscribedShows.has(show);
                      return (
                        <label
                          key={show}
                          className={`flex items-center gap-3 p-3 border-2 cursor-pointer ${
                            on
                              ? "border-eb-black bg-eb-white"
                              : "border-eb-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleShowSubscription(show)}
                            className="eb-check"
                          />
                          <div className="text-eb-body font-bold flex-1">
                            {show}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  className="eb-btn mt-5"
                  onClick={() => {
                    setShowInquiry(false);
                    setAnonSent(false);
                    setAnonName("");
                    setAnonPhone("");
                    setInquiryMsg("");
                    // Reset the auto-subscribe guard so a fresh
                    // inquiry next time can auto-subscribe again.
                    autoSubscribedRef.current = false;
                  }}
                >
                  Keep browsing
                </button>
              </>
            ) : !user && anonSent === "pending" ? (
              /* Pending verification. Form was submitted; dealer has
                 NOT been texted yet. Buyer needs to tap the verify link. */
              <>
                <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black mb-2">
                  Confirm it{"\u2019"}s you
                </h3>
                <p className="text-eb-caption text-eb-muted leading-relaxed">
                  We just texted a link to{" "}
                  <span className="font-bold text-eb-black">{anonPhone}</span>.
                  Tap it and {item.dealer_name} gets your message.
                </p>
                <p className="text-eb-meta text-eb-muted leading-relaxed mt-3">
                  Don{"\u2019"}t see it? Check your messages in a minute, or{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAnonSent(false);
                      setAnonPhone("");
                    }}
                    className="underline"
                  >
                    use a different number
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
                    I&apos;m Interested
                  </h3>
                  <button
                    aria-label="Close"
                    className="text-eb-body text-eb-muted leading-none -mt-1"
                    onClick={() => setShowInquiry(false)}
                  >
                    {"\u2715"}
                  </button>
                </div>
                <p className="text-eb-caption text-eb-muted leading-relaxed mb-5">
                  {item.dealer_name} gets your name and number and takes it
                  from there.
                </p>

                {/* Anon-only: name + phone collected above the preset
                    choices. Signed-in users skip these — we already
                    have their account. */}
                  {!user && (
                    <div className="space-y-4 mb-5">
                      <div>
                        <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                          Your Name
                        </label>
                        <input
                          type="text"
                          className="eb-input"
                          value={anonName}
                          onChange={(e) => setAnonName(e.target.value.slice(0, 60))}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          className="eb-input"
                          value={anonPhone}
                          onChange={(e) =>
                            setAnonPhone(
                              e.target.value
                                .replace(/[^\d()\-\s+.]/g, "")
                                .slice(0, 32)
                            )
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preset options — same UI for both auth states. */}
                  <div className="space-y-2">
                    {[
                      { key: "buy" as const,     label: "Ready to buy",            text: "I'm interested and ready to buy." },
                      { key: "discuss" as const, label: "Let's discuss",           text: "I'm interested \u2014 I'd like to discuss." },
                      { key: "price" as const,   label: "What's your best price?", text: "What's your best price?" },
                      { key: "custom" as const,  label: "Write your own",          text: "" },
                    ].map((opt) => {
                      const isSelected = inquiryOption === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setInquiryOption(opt.key)}
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

                  {/* Custom textarea — reveals when "Write your own" is selected */}
                  {inquiryOption === "custom" && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-eb-meta uppercase tracking-wider text-eb-muted">
                          Your Message
                        </span>
                        <span className="text-eb-meta text-eb-muted tabular-nums">
                          {inquiryMsg.length} / 240
                        </span>
                      </div>
                      <textarea
                        className="eb-input h-24 resize-none"
                        placeholder={`Love the ${item.title.toLowerCase()} \u2014 any details?`}
                        value={inquiryMsg}
                        onChange={(e) => setInquiryMsg(e.target.value.slice(0, 240))}
                        onFocus={(e) => {
                          // Wait for the keyboard + visualViewport listener
                          // to settle, then pull the textarea into the
                          // visible portion of the drawer. iOS won't do
                          // this automatically inside a fixed container.
                          const el = e.currentTarget;
                          setTimeout(() => {
                            el?.scrollIntoView({
                              block: "center",
                              behavior: "smooth",
                            });
                          }, 300);
                        }}
                      />
                    </div>
                  )}

                  {!user && anonError && (
                    <p className="text-eb-meta text-eb-red mt-3">{anonError}</p>
                  )}

                  <button
                    className="eb-btn mt-5"
                    onClick={sendInquiry}
                    disabled={
                      sending ||
                      !inquiryOption ||
                      (inquiryOption === "custom" && inquiryMsg.trim().length === 0)
                    }
                  >
                    {sending ? "Sending\u2026" : user ? "Send Inquiry" : "Text the dealer"}
                  </button>

                {!user && (
                  <p className="text-eb-micro font-readable text-eb-muted text-center leading-relaxed mt-2">
                    Msg &amp; data rates may apply. Reply STOP to opt out.
                  </p>
                )}
              </>
            )}
            </div>
          </div>
        </>
      )}

      {/* Confirm sell drawer */}
      {confirmInquiry && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setConfirmInquiry(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-5 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <button
              className="absolute top-3 right-4 text-eb-body text-eb-muted"
              aria-label="Close"
              onClick={() => setConfirmInquiry(null)}
            >
              {"\u2715"}
            </button>
            <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
              Mark sold to{" "}
              {confirmInquiry.buyer_first_name ||
                confirmInquiry.buyer_display_name ||
                "this buyer"}
              ?
            </h3>

            <p className="text-eb-body text-eb-text leading-relaxed mt-3">
              Before you confirm, make sure you&apos;ve actually talked with{" "}
              <span className="font-bold text-eb-black">
                {confirmInquiry.buyer_first_name ||
                  confirmInquiry.buyer_display_name ||
                  "this buyer"}
              </span>{" "}
              and agreed on price, pickup, and payment.
            </p>

            <p className="text-eb-body text-eb-text leading-relaxed mt-3">
              Early Bird doesn&apos;t handle money or warranty the transaction
              — closing the deal is between you and{" "}
              {confirmInquiry.buyer_first_name ||
                confirmInquiry.buyer_display_name ||
                "the buyer"}
              . Use common sense.
            </p>

            <p className="text-eb-caption text-eb-muted leading-relaxed mt-4">
              Tapping below closes the listing, texts{" "}
              {confirmInquiry.buyer_first_name ||
                confirmInquiry.buyer_display_name ||
                "the buyer"}{" "}
              a receipt, and marks it sold in the app for the other inquirers.{" "}
              <span className="text-eb-black font-bold">
                Can&apos;t be undone.
              </span>
            </p>

            <div className="flex gap-2 mt-5">
              <button
                className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text"
                onClick={() => setConfirmInquiry(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 min-w-0 py-3 text-eb-caption font-bold uppercase tracking-wider bg-eb-black text-white whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() =>
                  updateStatus("sold", confirmInquiry.buyer_id)
                }
              >
                Mark sold to{" "}
                {confirmInquiry.buyer_first_name ||
                  confirmInquiry.buyer_display_name ||
                  "buyer"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Walk-up sold confirm drawer — dealer hit the SOLD status pill
          with no specific buyer. Destructive, irreversible; require
          explicit confirmation. */}
      {confirmWalkupSold && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setConfirmWalkupSold(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-5 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <button
              className="absolute top-3 right-4 text-eb-body text-eb-muted"
              aria-label="Close"
              onClick={() => setConfirmWalkupSold(false)}
            >
              {"\u2715"}
            </button>
            <h3 className="text-eb-title font-bold uppercase tracking-widest text-eb-black">
              Mark sold at the booth?
            </h3>

            <p className="text-eb-body text-eb-text leading-relaxed mt-3">
              This is for a walk-up sale — someone bought it in person with
              no prior inquiry. If you&apos;re selling to someone who
              inquired through Early Bird,{" "}
              <span className="font-bold text-eb-black">
                use the Sell button on their inquiry card below
              </span>{" "}
              so they get the receipt text.
            </p>

            <p className="text-eb-caption text-eb-muted leading-relaxed mt-4">
              Tapping below closes the listing and marks anyone who
              inquired as &ldquo;sold to another buyer&rdquo; in the app.
              No text goes out.{" "}
              <span className="text-eb-black font-bold">
                Can&apos;t be undone.
              </span>
            </p>

            <div className="flex gap-2 mt-5">
              <button
                className="shrink-0 px-5 py-3 text-eb-caption font-bold uppercase tracking-wider border border-eb-border text-eb-text"
                onClick={() => setConfirmWalkupSold(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 min-w-0 py-3 text-eb-caption font-bold uppercase tracking-wider bg-eb-black text-white whitespace-nowrap"
                onClick={() => {
                  setConfirmWalkupSold(false);
                  updateStatus("sold");
                }}
              >
                Mark sold at booth
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

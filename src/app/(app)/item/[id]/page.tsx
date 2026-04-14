"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { BottomNav } from "@/components/bottom-nav";

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
  sold_to: string | null;
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
  status: "processing" | "uploading" | "done" | "error";
  error?: string;
}

const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Favorites
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);

  // Inquiry drawer (buyer)
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Confirm drawer (dealer-own)
  const [confirmInquiry, setConfirmInquiry] = useState<Inquiry | null>(null);

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
      setIsFav(data.is_favorited || false);
      setFavId(data.favorite_id || null);

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
          p.tempId === tempId ? { ...p, status: "done", url: data.url } : p
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
        slots.push({ tempId, preview, url: null, status: "processing" });
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

    const addUrls = newPhotos.filter((p) => p.url).map((p) => p.url);
    if (addUrls.length > 0) body.add_photo_urls = addUrls;

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
    if (isFav && favId) {
      await apiFetch(`/api/favorites/${favId}`, { method: "DELETE" });
      setIsFav(false);
      setFavId(null);
    } else {
      const res = await apiFetch("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ item_id: item.id }),
      });
      if (res.ok) {
        const fav = await res.json();
        setIsFav(true);
        setFavId(fav.id);
      }
    }
  }, [item, isFav, favId]);

  const sendInquiry = useCallback(async () => {
    if (!item || sending) return;
    setSending(true);
    const res = await apiFetch("/api/inquiries", {
      method: "POST",
      body: JSON.stringify({ item_id: item.id, message: inquiryMsg }),
    });
    setSending(false);
    if (res.ok) {
      setShowInquiry(false);
      setInquiryMsg("");
      setIsFav(true);
    }
  }, [item, inquiryMsg, sending]);

  const updateStatus = useCallback(
    async (status: string, heldFor?: string, soldTo?: string) => {
      if (!item) return;
      const body: Record<string, unknown> = { status };
      if (heldFor) body.held_for = heldFor;
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

  if (loading || !item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  const currentPhoto = item.photos[photoIndex]?.url;
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
            router.back();
          }}
          className="text-eb-caption text-eb-muted"
        >
          {editing ? "\u2715 Cancel edit" : "\u2190 Back to listings"}
        </button>
        {isOwner && !editing ? (
          <button
            onClick={enterEditMode}
            className="text-eb-meta uppercase tracking-wider text-eb-pop font-bold"
          >
            Edit
          </button>
        ) : !isOwner ? (
          <button
            onClick={toggleFavorite}
            className={`text-eb-title ${isFav ? "text-eb-pop" : "text-eb-muted"}`}
          >
            {isFav ? "\u2665" : "\u2661"}
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
                <img src={photo.url} alt="Item photo" className="w-full h-full object-cover" />
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
          {/* VIEW MODE: Photo */}
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={item.title}
              className="w-full block"
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-eb-border" />
          )}
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
            {(["live", "hold", "sold"] as const).map((s, i) => (
              <button
                key={s}
                className={`flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider ${
                  i > 0 ? "border-l border-eb-border" : ""
                } ${
                  item.status === s
                    ? "bg-eb-black text-white"
                    : "bg-white text-eb-text"
                }`}
                onClick={() => updateStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-eb-meta text-eb-muted mt-2 leading-relaxed">
            Mark SOLD the moment it sells at your booth. This closes the
            listing so no one else inquires.
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
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-eb-display text-eb-black">
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

      {/* Dealer card (buyer + dealer-browsing) — hidden in edit mode */}
      {!isOwner && !editing && (
        <section className="mx-5 mb-5 p-4 border border-eb-border flex gap-3 items-center">
          <span className="eb-avatar eb-avatar-lg">
            {getInitials(item.dealer_display_name || item.dealer_name)}
          </span>
          <div>
            <div className="text-eb-body font-bold text-eb-black">
              {item.dealer_name}
            </div>
            <div className="text-eb-meta text-eb-muted mt-0.5">
              {boothStr ? `${boothStr} \u00b7 ` : ""}
              {item.market?.name} {"\u00b7"} {marketDate}
            </div>
            {item.dealer_instagram && (
              <a
                href={`https://instagram.com/${item.dealer_instagram.replace("@", "")}`}
                className="text-eb-meta text-eb-muted mt-0.5 inline-block"
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.dealer_instagram} {"\u2197"}
              </a>
            )}
          </div>
        </section>
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
            These buyers texted you directly. Contact them to make the deal.
            Early Bird is not involved after this point.
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
                            onClick={() =>
                              updateStatus("hold", inq.buyer_id)
                            }
                          >
                            Hold
                          </button>
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
                      {inq.status === "held" && (
                        <span className="inline-block mt-3 text-eb-micro uppercase tracking-wider text-eb-amber border border-eb-amber px-1">
                          HELD
                        </span>
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

      {/* Buyer / dealer-browsing: CTA — hidden in edit mode */}
      {!isOwner && !editing && (
        <>
          <button className="eb-cta" onClick={() => setShowInquiry(true)}>
            I&apos;M INTERESTED {"\u2192"}
          </button>
          <p className="text-eb-meta text-eb-muted text-center px-5 pb-8 leading-relaxed">
            Sends {item.dealer_name} a text with your name and number. You deal
            directly.
          </p>
        </>
      )}

      {/* Bottom nav */}
      <BottomNav active={isOwner ? "sell" : "buy"} />

      {/* Inquiry drawer */}
      {showInquiry && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowInquiry(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-6 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <button
              className="absolute top-3 right-4 text-eb-body text-eb-muted"
              aria-label="Close"
              onClick={() => setShowInquiry(false)}
            >
              {"\u2715"}
            </button>
            <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-3">
              Send Inquiry
            </h3>
            <p className="text-eb-caption text-eb-muted mb-4 leading-relaxed">
              We&apos;ll text {item.dealer_name}{" "}your message and number.
              They&apos;ll contact you directly — no in-app messaging.
            </p>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-eb-meta uppercase tracking-wider text-eb-muted">
                  Your Message
                </span>
                <span className="text-eb-meta text-eb-muted">
                  {inquiryMsg.length} / 240
                </span>
              </div>
              <textarea
                className="eb-input h-24 resize-none"
                placeholder={`Love the ${item.title.toLowerCase()} \u2014 any details?`}
                value={inquiryMsg}
                onChange={(e) =>
                  setInquiryMsg(e.target.value.slice(0, 240))
                }
              />
            </div>
            <button
              className="eb-btn"
              onClick={sendInquiry}
              disabled={sending}
            >
              {sending ? "Sending..." : "Send Inquiry"}
            </button>
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
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl border-t border-eb-border z-50 px-6 pt-3 pb-6">
            <div className="w-12 h-1 bg-eb-border rounded-full mx-auto mb-4" />
            <button
              className="absolute top-3 right-4 text-eb-body text-eb-muted"
              aria-label="Close"
              onClick={() => setConfirmInquiry(null)}
            >
              {"\u2715"}
            </button>
            <h3 className="text-eb-body font-bold uppercase tracking-widest text-eb-black mb-3">
              Sell To{" "}
              {confirmInquiry.buyer_display_name ||
                confirmInquiry.buyer_first_name}
              ?
            </h3>
            <p className="text-eb-caption text-eb-muted mb-4 leading-relaxed">
              Closes the listing and sends these texts. No undo after this —
              make sure you&apos;ve confirmed with{" "}
              {confirmInquiry.buyer_first_name} at the booth.
            </p>
            {/* SMS preview: winner */}
            <div className="border border-eb-border bg-eb-bg p-4 mb-3">
              <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
                {confirmInquiry.buyer_first_name} Gets
              </div>
              <p className="text-eb-caption leading-relaxed text-eb-text">
                &ldquo;Early Bird: Sold! {item.title} is yours.{" "}
                {boothStr
                  ? `See ${item.dealer_name} at ${boothStr}`
                  : `See ${item.dealer_name}`}
                , {item.market?.name}, {marketDate}. Bring payment.&rdquo;
              </p>
            </div>
            {/* SMS preview: losers */}
            {inquiries.filter(
              (i) =>
                i.buyer_id !== confirmInquiry.buyer_id &&
                (i.status === "open" || i.status === "held")
            ).length > 0 && (
              <div className="border border-eb-border bg-eb-bg p-4 mb-4">
                <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
                  {inquiries
                    .filter(
                      (i) =>
                        i.buyer_id !== confirmInquiry.buyer_id &&
                        (i.status === "open" || i.status === "held")
                    )
                    .map(
                      (i) =>
                        i.buyer_display_name ||
                        `${i.buyer_first_name} ${(i.buyer_last_name || "")[0] || ""}`.trim()
                    )
                    .join(" + ")}{" "}
                  Get
                </div>
                <p className="text-eb-caption leading-relaxed text-eb-text">
                  &ldquo;Early Bird: {item.title} sold to another buyer. Keep
                  an eye on {item.dealer_name}&apos;s booth for more
                  drops.&rdquo;
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 text-eb-caption font-bold border border-eb-border text-eb-text"
                onClick={() => setConfirmInquiry(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 text-eb-caption font-bold bg-eb-black text-white"
                onClick={() =>
                  updateStatus("sold", undefined, confirmInquiry.buyer_id)
                }
              >
                Yes, Sell To {confirmInquiry.buyer_first_name}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

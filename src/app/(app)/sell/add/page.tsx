"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useRequireAuth } from "@/lib/require-auth";
import { processImage, createThumbnail } from "@/lib/image-processing";
import { formatDate } from "@/lib/format";
import { BottomNav, adjustNavCount } from "@/components/bottom-nav";

interface Market {
  id: string;
  name: string;
  starts_at: string;
  drop_at: string;
  status: string;
}

interface PhotoSlot {
  id: string;
  /** Local preview URL (object URL, available immediately) */
  preview: string;
  /** Remote URL after successful upload */
  url: string | null;
  /** Thumbnail URL after successful upload */
  thumb_url: string | null;
  /** Upload state */
  status: "processing" | "uploading" | "done" | "error";
  /** Error message if failed */
  error?: string;
}

const MAX_PHOTOS = 5;
const MAX_RAW_SIZE = 15 * 1024 * 1024; // 15MB per raw file
// image/* instead of an explicit MIME list — iOS Safari's photo
// picker falls back to single-select when an explicit list is given,
// which blocks the multi-select UX dealers expect. image/* still
// covers HEIC/HEIF from iPhone cameras.
const ACCEPTED_TYPES = "image/*";

function AddItemContent() {
  useRequireAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const marketId = searchParams.get("market");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [market, setMarket] = useState<Market | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceFirm, setPriceFirm] = useState(false);
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!marketId) return;
    async function load() {
      const res = await apiFetch(`/api/markets/${marketId}`);
      if (res.ok) setMarket(await res.json());
    }
    load();
  }, [marketId]);

  const uploadOne = useCallback(async (file: File, slotId: string) => {
    // Process (resize, compress, EXIF correct)
    setPhotos((prev) =>
      prev.map((p) => (p.id === slotId ? { ...p, status: "processing" } : p))
    );

    let processed: Blob;
    try {
      const result = await processImage(file);
      processed = result.blob;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === slotId ? { ...p, status: "error", error: msg } : p
        )
      );
      return;
    }

    // Upload
    setPhotos((prev) =>
      prev.map((p) => (p.id === slotId ? { ...p, status: "uploading" } : p))
    );

    const form = new FormData();
    form.append("file", processed, `photo.jpg`);

    try {
      const res = await apiFetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === slotId ? { ...p, status: "done", url: data.url, thumb_url: data.thumb_url || null } : p
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === slotId ? { ...p, status: "error", error: msg } : p
        )
      );
    }
  }, []);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const remaining = MAX_PHOTOS - photos.length;
      if (remaining <= 0) return;

      const toAdd = Array.from(files).slice(0, remaining);
      const newSlots: PhotoSlot[] = [];

      for (const file of toAdd) {
        if (file.size > MAX_RAW_SIZE) {
          setFormError(
            `${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB). Max 15MB.`
          );
          continue;
        }

        const slotId = crypto.randomUUID();
        const preview = await createThumbnail(file);

        newSlots.push({
          id: slotId,
          preview,
          url: null,
          thumb_url: null,
          status: "processing",
        });

        // Fire upload in background (don't await — they run in parallel)
        uploadOne(file, slotId);
      }

      if (newSlots.length > 0) {
        setPhotos((prev) => [...prev, ...newSlots]);
        setFormError(null);
      }
    },
    [photos.length, uploadOne]
  );

  const removePhoto = useCallback((slotId: string) => {
    setPhotos((prev) => {
      const slot = prev.find((p) => p.id === slotId);
      if (slot?.preview) URL.revokeObjectURL(slot.preview);
      return prev.filter((p) => p.id !== slotId);
    });
  }, []);

  const allUploaded = photos.length > 0 && photos.every((p) => p.status === "done");
  const hasError = photos.some((p) => p.status === "error");
  const uploading = photos.some((p) => p.status === "processing" || p.status === "uploading");

  const canSubmit =
    !!title &&
    !!price &&
    parseFloat(price) >= 1 &&
    allUploaded &&
    !saving;

  const submit = useCallback(async () => {
    if (!canSubmit || !marketId) return;

    const priceNum = Math.round(parseFloat(price) * 100);
    if (priceNum < 100) {
      setFormError("Price must be at least $1");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const res = await apiFetch("/api/items", {
        method: "POST",
        body: JSON.stringify({
          market_id: marketId,
          title: title.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          price_firm: priceFirm,
          photos: photos.map((p) => ({ url: p.url, thumb_url: p.thumb_url })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create item" }));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      adjustNavCount("sell", +1);
      // Invalidate any cached /sell data so the new item shows up
      // immediately on the redirect target, without requiring a
      // manual page reload.
      router.refresh();
      router.push(`/sell?market=${marketId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }, [canSubmit, marketId, title, description, price, priceFirm, photos, router]);

  const ctaText =
    market?.status === "live"
      ? "Live instantly \u00b7 Watchers get notified"
      : "Visible to buyers once you post";

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-eb-border">
        <button
          onClick={() => router.back()}
          className="text-eb-caption text-eb-muted"
        >
          {"\u2190"} Back to my booth
        </button>
      </div>

      {/* Photos */}
      <section className="px-5 py-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Photos *
          </span>
          <span className="text-eb-meta text-eb-muted">
            {photos.length} / {MAX_PHOTOS}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square bg-eb-cream border-2 border-eb-border overflow-hidden">
              {photo.preview && (
                <img
                  src={photo.preview}
                  alt="Photo preview"
                  className="w-full h-full object-cover object-top"
                />
              )}

              {/* Overlay for processing/uploading */}
              {(photo.status === "processing" || photo.status === "uploading") && (
                <div className="absolute inset-0 bg-eb-black/50 flex items-center justify-center">
                  <span className="eb-spinner" />
                </div>
              )}

              {/* Error overlay */}
              {photo.status === "error" && (
                <div className="absolute inset-0 bg-eb-black/60 flex flex-col items-center justify-center gap-1 p-2">
                  <span className="text-eb-micro text-eb-red text-center">
                    {photo.error || "Failed"}
                  </span>
                </div>
              )}

              {/* Remove button (always visible) */}
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-eb-black text-eb-white flex items-center justify-center text-eb-micro font-bold"
              >
                {"\u2715"}
              </button>

              {/* Position badge */}
              {photo.status === "done" && photos.indexOf(photo) === 0 && (
                <span className="absolute bottom-1 left-1 bg-eb-pop text-eb-white text-eb-micro px-1.5 py-0.5 font-bold uppercase">
                  Hero
                </span>
              )}
            </div>
          ))}

          {/* Add button */}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-white border-2 border-dashed border-eb-black flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-eb-black">+</span>
                <span className="text-eb-micro uppercase tracking-wider text-eb-black">
                  Add
                </span>
              </div>
            </button>
          )}
        </div>

        {photos.length === 0 && (
          <p className="text-eb-meta text-eb-muted mt-2">
            First photo is the hero image buyers see in the grid.
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      <div className="border-t border-eb-border mx-5" />

      {/* Form fields */}
      <section className="px-5 py-5 space-y-5">
        {/* Title */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Title *
            </span>
            <span className="text-eb-meta text-eb-muted">
              {title.length} / 60
            </span>
          </div>
          <input
            type="text"
            placeholder="Walnut Credenza"
            className="eb-input"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Description
            </span>
            <span className="text-eb-meta text-eb-muted">
              {description.length} / 500
            </span>
          </div>
          <textarea
            className="eb-input h-28 resize-none"
            placeholder="Condition, era, dimensions, any notable features..."
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
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
              onClick={() => setPriceFirm(!priceFirm)}
              className={
                priceFirm
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
              placeholder="450"
              value={price}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                if (v.split(".").length <= 2) setPrice(v);
              }}
            />
          </div>
          {price && parseFloat(price) < 1 && (
            <p className="text-eb-meta text-eb-red mt-1">Minimum $1</p>
          )}
        </div>
      </section>

      {/* Error */}
      {formError && (
        <div className="px-5 pb-3">
          <p className="text-eb-meta text-eb-red">{formError}</p>
        </div>
      )}

      {/* Submit */}
      <section className="px-5 pb-36">
        {hasError && !saving && !uploading && (
          <p className="text-eb-meta text-eb-red text-center mb-2">
            Fix photo errors above before posting.
          </p>
        )}
        <button
          className="eb-cta"
          onClick={submit}
          disabled={!canSubmit}
        >
          {saving
            ? "Posting\u2026"
            : uploading
              ? "Uploading photos\u2026"
              : "POST ITEM"}
        </button>
        {canSubmit && (
          <p className="text-eb-meta text-eb-muted text-center mt-2">
            {ctaText}
          </p>
        )}
      </section>

      <BottomNav active="sell" />
    </>
  );
}

export default function AddItemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
      }
    >
      <AddItemContent />
    </Suspense>
  );
}

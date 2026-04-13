"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { BottomNav } from "@/components/bottom-nav";

interface Market {
  id: string;
  name: string;
  starts_at: string;
  drop_at: string;
  status: string;
}

function AddItemContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const marketId = searchParams.get("market");

  const [market, setMarket] = useState<Market | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceFirm, setPriceFirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!marketId) return;
    async function load() {
      const res = await apiFetch(`/api/markets/${marketId}`);
      if (res.ok) setMarket(await res.json());
    }
    load();
  }, [marketId]);

  const submit = useCallback(async () => {
    if (!marketId || !title || !price || saving) return;
    setSaving(true);
    const res = await apiFetch("/api/items", {
      method: "POST",
      body: JSON.stringify({
        market_id: marketId,
        title,
        description: description || undefined,
        price: Math.round(parseFloat(price) * 100),
        price_firm: priceFirm,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/sell?market=${marketId}`);
    }
  }, [marketId, title, description, price, priceFirm, saving, router]);

  const ctaText =
    market?.status === "live"
      ? "Live instantly · Watchers get notified"
      : "Goes live when the market drops";

  return (
    <>
      {/* Header */}
      <header className="eb-masthead">
        <div className="flex items-center justify-between">
          <h1>ADD ITEM</h1>
          <button
            onClick={() => router.back()}
            className="text-eb-body text-eb-muted"
          >
            ✕
          </button>
        </div>
        {market && <div className="eb-sub">{market.name}</div>}
      </header>

      {/* Photos placeholder */}
      <section className="px-5 py-5">
        <div className="grid grid-cols-3 gap-2">
          <button className="aspect-square bg-white border-2 border-dashed border-eb-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-eb-black">+</span>
              <span className="text-eb-micro uppercase tracking-wider text-eb-black">
                Add
              </span>
            </div>
          </button>
        </div>
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
              type="number"
              className="flex-1 py-3.5 px-2 bg-transparent outline-none text-base"
              placeholder="450"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Submit */}
      <section className="px-5 pb-36">
        <button
          className="eb-btn"
          onClick={submit}
          disabled={!title || !price || saving}
        >
          {saving ? "Posting..." : "Post Item"}
        </button>
        <p className="text-eb-meta text-eb-muted text-center mt-2">
          {ctaText}
        </p>
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

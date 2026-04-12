"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

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
  const { user } = useAuth();
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
      : `Goes live when the market drops`;

  return (
    <>
      {/* Header */}
      <header className="px-4 pt-6 pb-3 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold tracking-tight">ADD ITEM</div>
          <button
            className="btn btn-sm btn-circle btn-ghost bg-base-200 border border-base-300 text-base-content/60"
            onClick={() => router.back()}
          >
            ✕
          </button>
        </div>
        {market && (
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">{market.name}</div>
          </div>
        )}
      </header>

      {/* Photos (placeholder — upload not implemented) */}
      <section className="px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          <button className="aspect-square bg-base-100 rounded border-2 border-dashed border-neutral flex items-center justify-center text-base-content">
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl font-bold">+</div>
              <div className="text-[9px] uppercase tracking-wider font-bold">
                Add
              </div>
            </div>
          </button>
        </div>
      </section>

      <div className="divider mx-4 my-0"></div>

      {/* Details */}
      <section className="px-4 py-5 space-y-5">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
              Title *
            </span>
            <span className="label-text-alt text-base-content/60">
              {title.length} / 60
            </span>
          </div>
          <input
            type="text"
            placeholder="Walnut Credenza"
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
          />
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
              Description
            </span>
            <span className="label-text-alt text-base-content/60">
              {description.length} / 500
            </span>
          </div>
          <textarea
            className="textarea textarea-bordered h-28"
            placeholder="Condition, era, dimensions, any notable features..."
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          ></textarea>
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-xs uppercase tracking-widest text-base-content/60">
              Price *
            </span>
            <label className="label-text-alt cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={priceFirm}
                onChange={(e) => setPriceFirm(e.target.checked)}
              />
              <span className="text-[10px] uppercase tracking-widest font-bold">
                Firm
              </span>
            </label>
          </div>
          <label className="input input-bordered flex items-center gap-2">
            <span className="text-base-content/60 font-bold">$</span>
            <input
              type="number"
              className="grow"
              placeholder="450"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </label>
      </section>

      {/* Spacer */}
      <div className="h-36"></div>

      {/* Sticky bottom: CTA + nav */}
      <div className="max-w-md mx-auto fixed bottom-0 left-0 right-0 bg-base-200">
        <div className="px-4 pt-4 pb-3">
          <button
            className={`btn btn-neutral w-full${saving ? " loading" : ""}`}
            onClick={submit}
            disabled={!title || !price || saving}
          >
            Post Item
          </button>
          <p className="text-[10px] text-center text-base-content/60 mt-2 uppercase tracking-wider">
            {ctaText}
          </p>
        </div>
        <nav className="flex bg-base-200">
          <Link
            href="/buy"
            className="flex-1 flex flex-col items-center py-3 text-base-content/60"
          >
            <span className="text-[10px] uppercase tracking-widest">Buy</span>
          </Link>
          <Link
            href="/watching"
            className="flex-1 flex flex-col items-center py-3 text-base-content/60"
          >
            <span className="text-[10px] uppercase tracking-widest">
              Watching
            </span>
          </Link>
          <div className="w-px bg-base-300 my-2"></div>
          <Link
            href="/sell"
            className="flex-1 flex flex-col items-center py-3 text-base-content font-bold border-t-2 border-neutral"
          >
            <span className="text-[10px] uppercase tracking-widest">Sell</span>
          </Link>
          <Link
            href="/account"
            className="flex-1 flex flex-col items-center py-3 text-base-content/60"
          >
            <span className="text-[10px] uppercase tracking-widest">
              Account
            </span>
          </Link>
        </nav>
      </div>
    </>
  );
}

export default function AddItemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      }
    >
      <AddItemContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
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
      setIsFav(true); // auto-favorited by API
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
        // Refresh inquiries
        const inqRes = await apiFetch(`/api/items/${id}/inquiries`);
        if (inqRes.ok) setInquiries(await inqRes.json());
      }
    },
    [item, id]
  );

  if (loading || !item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  const currentPhoto = item.photos[photoIndex]?.url;
  const marketDate = item.market ? formatDate(item.market.starts_at) : "";
  const boothStr = item.booth_number ? `Booth ${item.booth_number}` : null;

  return (
    <>
      {/* Hero photo */}
      <figure className="aspect-square bg-base-200 relative">
        {currentPhoto && (
          <img
            src={currentPhoto}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <button
          className="btn btn-sm btn-ghost gap-1 bg-base-100/80 absolute top-3 left-3"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        {isOwner ? (
          <button className="btn btn-sm btn-ghost text-xs uppercase tracking-wider bg-base-100/80 absolute top-3 right-3">
            Edit
          </button>
        ) : (
          <button
            className="btn btn-sm btn-circle btn-ghost bg-base-100/80 absolute top-3 right-3"
            onClick={toggleFavorite}
          >
            {isFav ? "♥" : "♡"}
          </button>
        )}
        {item.photos.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {item.photos.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${i === photoIndex ? "bg-base-content" : "bg-base-content/30"}`}
                onClick={() => setPhotoIndex(i)}
              />
            ))}
          </div>
        )}
      </figure>

      {/* Dealer-own: Status controls */}
      {isOwner && (
        <>
          <section className="px-4 pt-5 pb-4">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-2">
              Status
            </div>
            <div role="tablist" className="join w-full">
              {(["live", "hold", "sold"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  className={`btn btn-sm join-item flex-1${item.status === s ? " btn-neutral" : ""}`}
                  onClick={() => updateStatus(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-base-content/60 mt-2 leading-relaxed">
              Mark SOLD the moment it sells at your booth. This closes the
              listing so no one else inquires.
            </div>
          </section>
          <div className="divider mx-4 my-0"></div>
        </>
      )}

      {/* Title + price */}
      <section className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold leading-tight">{item.title}</h1>
        <div className="flex items-baseline gap-3 mt-2">
          <div className="text-3xl font-bold">{formatPrice(item.price)}</div>
          {item.original_price && (
            <div className="text-sm text-base-content/40 line-through">
              {formatPrice(item.original_price)}
            </div>
          )}
          {item.price_firm === 1 && !item.original_price && (
            <div className="badge badge-outline badge-sm">Price Firm</div>
          )}
        </div>
      </section>

      {/* Dealer-own: Stats */}
      {isOwner && (
        <section className="px-4 pb-4">
          <div className="stats stats-horizontal bg-base-200 w-full">
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase tracking-wider">
                Views
              </div>
              <div className="stat-value text-xl">—</div>
            </div>
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase tracking-wider">
                Watchers
              </div>
              <div className="stat-value text-xl">{item.watcher_count}</div>
            </div>
            <div className="stat p-3">
              <div className="stat-title text-[10px] uppercase tracking-wider">
                Inquiries
              </div>
              <div className="stat-value text-xl">{item.inquiry_count}</div>
            </div>
          </div>
        </section>
      )}

      {/* Description */}
      <section className="px-4 pb-4">
        {isOwner && (
          <div className="text-xs uppercase tracking-widest text-base-content/60 mb-2">
            Description
          </div>
        )}
        <p className="text-sm leading-relaxed text-base-content/80">
          {item.description}
        </p>
      </section>

      <div className="divider mx-4 my-0"></div>

      {/* Dealer card (buyer + dealer-browsing only) */}
      {!isOwner && (
        <>
          <section className="px-4 py-4">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              Dealer
            </div>
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content w-14 rounded-full">
                  <span className="text-sm font-bold">
                    {getInitials(
                      item.dealer_display_name || item.dealer_name
                    )}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{item.dealer_name}</div>
                <div className="text-xs text-base-content/60">
                  {boothStr ? `${boothStr} · ` : ""}
                  {item.inquiry_count} inquiries
                </div>
                {item.dealer_instagram && (
                  <a
                    href={`https://instagram.com/${item.dealer_instagram.replace("@", "")}`}
                    className="text-xs text-base-content/60 hover:text-base-content mt-0.5 inline-block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.dealer_instagram} ↗
                  </a>
                )}
              </div>
            </div>
          </section>
          <div className="divider mx-4 my-0"></div>
        </>
      )}

      {/* Market context */}
      {item.market && (
        <section className="px-4 py-4">
          <div className="text-xs uppercase tracking-widest text-base-content/60 mb-2">
            {isOwner ? "Listed In" : "Available At"}
          </div>
          <div className="card card-compact bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{item.market.name}</div>
                  <div className="text-xs text-base-content/60">
                    {marketDate} ·{" "}
                    {isOwner && boothStr
                      ? boothStr
                      : item.market.location}
                  </div>
                </div>
                {item.market.status === "live" && (
                  <div className="badge badge-success badge-sm gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-success-content"></span>
                    LIVE
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dealer-browsing: alert */}
      {isDealerBrowsing && (
        <section className="px-4 pb-4">
          <div className="alert bg-base-200 border border-base-300 text-xs">
            <div>
              <div className="font-bold uppercase tracking-wider mb-1">
                You&apos;re Viewing This As A Buyer
              </div>
              <div className="text-base-content/70 leading-relaxed">
                {item.dealer_name} is another dealer at this market. Inquiry
                works the same as any buyer — they&apos;ll get your phone
                number.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dealer-own: Inquiry log */}
      {isOwner && (
        <>
          <div className="divider mx-4 my-0"></div>
          <section className="px-4 py-4 pb-24">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              Inquiries ({inquiries.length})
            </div>
            <div className="text-[10px] text-base-content/60 mb-4 leading-relaxed">
              These buyers texted you directly. Contact them to make the deal.
              Early Bird is not involved after this point.
            </div>
            <div className="flex flex-col gap-3">
              {inquiries.map((inq) => {
                const buyerName =
                  inq.buyer_display_name ||
                  `${inq.buyer_first_name || ""} ${(inq.buyer_last_name || "")[0] || ""}`.trim() ||
                  "Buyer";
                return (
                  <div
                    key={inq.id}
                    className="card card-compact bg-base-100 border border-base-300"
                  >
                    <div className="card-body">
                      <div className="flex items-start gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content w-10 rounded-full">
                            <span className="text-xs font-bold">
                              {getInitials(buyerName)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-sm">
                              {buyerName}
                            </div>
                            <div className="text-[10px] text-base-content/60 uppercase tracking-wider">
                              {timeAgo(inq.created_at)}
                            </div>
                          </div>
                          <a
                            href={`tel:${inq.buyer_phone}`}
                            className="link link-hover text-xs font-bold"
                          >
                            {formatPhone(inq.buyer_phone)}
                          </a>
                          {inq.message && (
                            <div className="text-xs text-base-content/80 mt-2 leading-relaxed">
                              &ldquo;{inq.message}&rdquo;
                            </div>
                          )}
                          {inq.status === "open" && (
                            <div className="flex gap-2 mt-3">
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={() =>
                                  updateStatus("hold", inq.buyer_id)
                                }
                              >
                                Hold
                              </button>
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={() => setConfirmInquiry(inq)}
                              >
                                Sell
                              </button>
                              <a
                                href={`tel:${inq.buyer_phone}`}
                                className="btn btn-xs btn-outline"
                              >
                                Call
                              </a>
                              <a
                                href={`sms:${inq.buyer_phone}`}
                                className="btn btn-xs btn-outline"
                              >
                                Text
                              </a>
                            </div>
                          )}
                          {inq.status === "held" && (
                            <div className="badge badge-warning badge-sm mt-3">
                              HELD
                            </div>
                          )}
                          {inq.status === "sold" && (
                            <div className="badge badge-success badge-sm mt-3">
                              SOLD
                            </div>
                          )}
                          {inq.status === "lost" && (
                            <div className="badge badge-ghost badge-sm mt-3">
                              LOST
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Buyer / dealer-browsing: spacer + sticky CTA */}
      {!isOwner && (
        <>
          <div className={isDealerBrowsing ? "h-36" : "h-32"}></div>
          {isDealerBrowsing ? (
            <div className="max-w-md mx-auto fixed bottom-0 left-0 right-0 bg-base-200">
              <div className="px-4 pt-4 pb-3">
                <button
                  className="btn btn-neutral w-full"
                  onClick={() => setShowInquiry(true)}
                >
                  I&apos;m Interested
                </button>
                <p className="text-[10px] text-center text-base-content/60 mt-2 uppercase tracking-wider">
                  Dealer gets your phone + message
                </p>
              </div>
              <nav className="flex bg-base-200">
                <Link
                  href="/buy"
                  className="flex-1 flex flex-col items-center py-3 text-base-content font-bold border-t-2 border-neutral"
                >
                  <span className="text-[10px] uppercase tracking-widest">
                    Buy
                  </span>
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
                  className="flex-1 flex flex-col items-center py-3 text-base-content/60"
                >
                  <span className="text-[10px] uppercase tracking-widest">
                    Sell
                  </span>
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
          ) : (
            <div className="max-w-md mx-auto fixed bottom-0 left-0 right-0 bg-base-200 px-4 py-4">
              <button
                className="btn btn-neutral w-full"
                onClick={() => setShowInquiry(true)}
              >
                I&apos;m Interested
              </button>
              <p className="text-[10px] text-center text-base-content/60 mt-2 uppercase tracking-wider">
                Dealer gets your phone + message
              </p>
            </div>
          )}
        </>
      )}

      {/* Dealer-own: bottom nav */}
      {isOwner && <BottomNav active="sell" />}

      {/* Inquiry drawer backdrop + sheet */}
      {showInquiry && (
        <>
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setShowInquiry(false)}
          ></div>
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-base-100 rounded-t-2xl border-t border-base-300 z-50 px-6 pt-3 pb-6">
            <div className="w-12 h-1 bg-base-300 rounded-full mx-auto mb-4"></div>
            <button
              className="btn btn-sm btn-circle btn-ghost absolute top-3 right-3"
              aria-label="Close"
              onClick={() => setShowInquiry(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-3">
              Send Inquiry
            </h3>
            <p className="text-xs text-base-content/60 mb-4 leading-relaxed">
              We&apos;ll text {item.dealer_name} your message and number.
              They&apos;ll contact you directly — no in-app messaging.
            </p>
            <label className="form-control w-full mb-4">
              <div className="label">
                <span className="label-text text-xs uppercase tracking-wider">
                  Your Message
                </span>
                <span className="label-text-alt text-xs text-base-content/60">
                  {inquiryMsg.length} / 240
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder={`Love the ${item.title.toLowerCase()} — any details?`}
                value={inquiryMsg}
                onChange={(e) => setInquiryMsg(e.target.value.slice(0, 240))}
              ></textarea>
            </label>
            <button
              className={`btn btn-neutral w-full${sending ? " loading" : ""}`}
              onClick={sendInquiry}
              disabled={sending}
            >
              Send Inquiry
            </button>
          </div>
        </>
      )}

      {/* Confirm sell drawer */}
      {confirmInquiry && (
        <>
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setConfirmInquiry(null)}
          ></div>
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-base-100 rounded-t-2xl border-t border-base-300 z-50 px-6 pt-3 pb-6">
            <div className="w-12 h-1 bg-base-300 rounded-full mx-auto mb-4"></div>
            <button
              className="btn btn-sm btn-circle btn-ghost absolute top-3 right-3"
              aria-label="Close"
              onClick={() => setConfirmInquiry(null)}
            >
              ✕
            </button>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-3">
              Sell To{" "}
              {confirmInquiry.buyer_display_name ||
                confirmInquiry.buyer_first_name}
              ?
            </h3>
            <p className="text-xs text-base-content/60 mb-4 leading-relaxed">
              Closes the listing and sends these texts. No undo after this —
              make sure you&apos;ve confirmed with{" "}
              {confirmInquiry.buyer_first_name} at the booth.
            </p>
            {/* SMS preview: winner */}
            <div className="card card-compact bg-base-200 border border-base-300 mb-3">
              <div className="card-body">
                <div className="text-[10px] uppercase tracking-widest text-base-content/60 mb-1">
                  {confirmInquiry.buyer_first_name} Gets
                </div>
                <div className="text-xs leading-relaxed">
                  &ldquo;Early Bird: Sold! {item.title} is yours.{" "}
                  {boothStr
                    ? `See ${item.dealer_name} at ${boothStr}`
                    : `See ${item.dealer_name}`}
                  , {item.market?.name}, {marketDate}. Bring payment.&rdquo;
                </div>
              </div>
            </div>
            {/* SMS preview: losers */}
            {inquiries.filter(
              (i) =>
                i.buyer_id !== confirmInquiry.buyer_id &&
                (i.status === "open" || i.status === "held")
            ).length > 0 && (
              <div className="card card-compact bg-base-200 border border-base-300 mb-4">
                <div className="card-body">
                  <div className="text-[10px] uppercase tracking-widest text-base-content/60 mb-1">
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
                  <div className="text-xs leading-relaxed">
                    &ldquo;Early Bird: {item.title} sold to another buyer. Keep
                    an eye on {item.dealer_name}&apos;s booth for more
                    drops.&rdquo;
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-outline flex-1"
                onClick={() => setConfirmInquiry(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-neutral flex-1"
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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

  return (
    <>
      {/* Back + save/edit row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-eb-border">
        <button
          onClick={() => router.back()}
          className="text-eb-caption text-eb-muted"
        >
          ← Back to listings
        </button>
        {isOwner ? (
          <button className="text-eb-meta uppercase tracking-wider text-eb-muted">
            Edit
          </button>
        ) : (
          <button
            onClick={toggleFavorite}
            className={`text-eb-title ${isFav ? "text-eb-pop" : "text-eb-muted"}`}
          >
            {isFav ? "♥" : "♡"}
          </button>
        )}
      </div>

      {/* Photo */}
      {currentPhoto ? (
        <img
          src={currentPhoto}
          alt={item.title}
          className="w-full aspect-[4/3] object-cover block"
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

      {/* Dealer-own: Status controls */}
      {isOwner && (
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

      {/* Title + price */}
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
            <div className="eb-stat-num">—</div>
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

      {/* Dealer card (buyer + dealer-browsing) */}
      {!isOwner && (
        <section className="mx-5 mb-5 p-4 border border-eb-border flex gap-3 items-center">
          <span className="eb-avatar eb-avatar-lg">
            {getInitials(item.dealer_display_name || item.dealer_name)}
          </span>
          <div>
            <div className="text-eb-body font-bold text-eb-black">
              {item.dealer_name}
            </div>
            <div className="text-eb-meta text-eb-muted mt-0.5">
              {boothStr ? `${boothStr} · ` : ""}
              {item.market?.name} · {marketDate}
            </div>
            {item.dealer_instagram && (
              <a
                href={`https://instagram.com/${item.dealer_instagram.replace("@", "")}`}
                className="text-eb-meta text-eb-muted mt-0.5 inline-block"
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.dealer_instagram} ↗
              </a>
            )}
          </div>
        </section>
      )}

      {/* Market context */}
      {item.market && (
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
                  {marketDate} ·{" "}
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
      {isDealerBrowsing && (
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

      {/* Dealer-own: Inquiry log */}
      {isOwner && (
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

      {/* Buyer / dealer-browsing: CTA */}
      {!isOwner && (
        <>
          <button className="eb-cta" onClick={() => setShowInquiry(true)}>
            I&apos;M INTERESTED →
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
              ✕
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
                placeholder={`Love the ${item.title.toLowerCase()} — any details?`}
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
              ✕
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

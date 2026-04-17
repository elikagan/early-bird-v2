"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatDate, heroCountdown, formatPrice } from "@/lib/format";
import { Masthead } from "@/components/masthead";

interface Market {
  id: string;
  name: string;
  location: string;
  drop_at: string;
  starts_at: string;
  status: string;
  dealer_count: number;
  item_count: number;
}

interface PreviewItem {
  id: string;
  title: string;
  price: number;
  photo_url: string | null;
  thumb_url: string | null;
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"buyer" | "dealer">("buyer");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  // Persist dealer mode via URL hash. Reading window.location has to
  // happen post-mount (SSR has no window), so setState-in-effect is the
  // correct pattern here despite what the cascading-render lint rule says.
  useEffect(() => {
    if (window.location.hash === "#dealer") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("dealer");
    }
  }, []);

  const toggleMode = () => {
    const next = mode === "buyer" ? "dealer" : "buyer";
    setMode(next);
    window.history.replaceState(
      null,
      "",
      next === "dealer" ? "#dealer" : window.location.pathname
    );
  };

  // If already logged in, redirect to home
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/home");
    }
  }, [authLoading, user, router]);

  // Fetch markets + preview items
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) return;
        const data: Market[] = await res.json();
        setMarkets(data);

        // Fetch items from the live market for preview
        const live = data.find((m) => m.status === "live");
        if (live) {
          const itemsRes = await fetch(`/api/items?market_id=${live.id}`);
          if (itemsRes.ok) {
            const items = await itemsRes.json();
            setPreviewItems(items.slice(0, 6));
          }
        }
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  const handleSend = async () => {
    if (!phone || sending) return;
    setSending(true);
    // Landing-page sign-in is an INTENTIONAL fresh login. Any stale
    // eb_return_to from a previous "favorite this item while logged out"
    // flow should be discarded — otherwise users get routed to a random
    // item page after signing in instead of landing on /home.
    try { localStorage.removeItem("eb_return_to"); } catch {}
    const digits = phone.replace(/\D/g, "");
    const formatted =
      digits.length === 10
        ? `+1${digits}`
        : digits.length === 11 && digits[0] === "1"
          ? `+${digits}`
          : `+${digits}`;
    const res = await apiFetch("/api/auth/start", {
      method: "POST",
      body: JSON.stringify({ phone: formatted, dealer: mode === "dealer", sms_consent: smsConsent }),
    });
    setSending(false);
    if (res.ok) setSent(true);
  };

  const liveMarket = markets.find((m) => m.status === "live");
  const upcomingMarkets = markets.filter((m) => m.status === "upcoming");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-eb-body text-eb-muted">{"\u2026"}</span>
      </div>
    );
  }

  if (user) return null;

  // Shared phone form
  const phoneForm = sent ? (
    <div className="border-l-2 border-eb-pop pl-4 py-2">
      <p className="text-eb-display font-bold uppercase tracking-wider text-eb-black mb-2">
        Check your texts
      </p>
      <p className="text-eb-caption text-eb-muted leading-relaxed">
        Sign-in link sent to{" "}
        <span className="font-bold text-eb-black">{phone}</span>
      </p>
      <button
        onClick={() => { setSent(false); setPhone(""); setSmsConsent(false); }}
        className="text-eb-meta text-eb-muted mt-3 underline"
      >
        Try again
      </button>
    </div>
  ) : (
    <>
      {/* Input group — tight */}
      <input
        type="tel"
        inputMode="tel"
        placeholder="(213) 555-0134"
        className="eb-input"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
          className="shrink-0 accent-eb-black"
        />
        <span className="text-eb-meta text-eb-muted">
          {mode === "dealer" ? "Text me about upcoming markets" : "Text me when shopping opens"}
        </span>
      </label>

      {/* Action group — breathe above, tight below */}
      <button
        className="eb-btn mt-5"
        onClick={handleSend}
        disabled={sending}
      >
        {sending ? "SENDING\u2026" : "SIGN IN"}
      </button>
      <p className="text-eb-micro font-readable text-eb-muted mt-1.5 leading-relaxed">
        Msg &amp; data rates may apply. Frequency varies. Reply STOP to
        opt out, HELP for help. We will not share mobile info with third
        parties for marketing.{" "}
        <a href="/terms" className="underline">Terms</a>
        {" \u00b7 "}
        <a href="/privacy" className="underline">Privacy</a>
      </p>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Masthead
        href={null}
        right={
          <button
            onClick={toggleMode}
            className="text-eb-meta uppercase tracking-widest text-eb-muted"
          >
            {mode === "buyer" ? "Dealer \u2192" : "Buyer \u2192"}
          </button>
        }
      />

      {mode === "buyer" ? (
        <>
          {/* ═══════════════ HERO ═══════════════ */}
          {liveMarket ? (
            <section className="px-5 pt-8 pb-7 border-b-2 border-eb-black">
              <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-pop">
                Live now
              </div>
              <h2 className="text-eb-hero text-eb-black leading-tight mt-2">
                {liveMarket.name}
              </h2>
              <p className="text-eb-body text-eb-text leading-relaxed mt-3">
                Shop the market before the gates open.
              </p>

              {/* Preview grid */}
              {previewItems.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mt-6">
                  {previewItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="relative aspect-square overflow-hidden bg-eb-border"
                    >
                      {item.photo_url ? (
                        <Image
                          src={item.thumb_url || item.photo_url}
                          alt={item.title}
                          fill
                          sizes="33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-eb-border" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                        <span className="text-eb-micro text-white font-bold tabular-nums">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/buy?market=${liveMarket.id}`}
                className="eb-btn mt-6 text-center"
              >
                Shop the market {"\u2192"}
              </Link>
            </section>
          ) : (
            // Full-bleed editorial hero — image-forward, no apology.
            <section className="relative border-b-2 border-eb-black">
              <div className="relative aspect-[4/5]">
                <Image
                  src="/promo/hero.webp"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 430px) 100vw, 430px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/85" />
                <div className="absolute inset-x-0 bottom-0 p-5 pb-8">
                  <div className="text-eb-micro uppercase tracking-widest font-bold text-white/80">
                    Pre-shopping for LA flea markets
                  </div>
                  <h1 className="text-eb-hero text-white leading-[0.95] mt-3">
                    Shop before
                    <br />
                    sunrise.
                  </h1>
                  <p className="text-eb-body text-white/90 leading-relaxed mt-4 max-w-md">
                    Dealers post what they&apos;re bringing to market the
                    night before the gates open. See what&apos;s coming,
                    claim what you want, skip the 4am crowd.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════ SIGN UP ═══════════════ */}
          <section className="pt-8 pb-8 border-b-2 border-eb-black">
            <div className="px-5">
              <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
                Get notified
              </div>
              <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
                First look at the next market
              </h3>
              <p className="text-eb-body text-eb-text leading-relaxed mt-2 mb-5">
                Drop your number. We&apos;ll text you the moment each market
                opens for pre-shopping — the night before the gates.
              </p>
              {phoneForm}
            </div>
          </section>

          {/* ═══════════════ COMING UP ═══════════════ */}
          {upcomingMarkets.length > 0 && (
            <section className="pt-8 pb-8 border-b-2 border-eb-black">
              <div className="px-5">
                <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
                  Coming up
                </div>
                <h3 className="text-eb-title font-bold text-eb-black mt-1.5 mb-4">
                  Upcoming markets
                </h3>
              </div>

              <div className="divide-y divide-eb-border border-t border-eb-border">
                {upcomingMarkets.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="text-eb-body font-bold text-eb-black truncate">
                        {m.name}
                      </div>
                      <div className="text-eb-meta text-eb-muted mt-1">
                        {formatDate(m.starts_at)}
                        <span className="mx-1.5 text-eb-light">·</span>
                        {m.location}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-eb-micro uppercase tracking-widest text-eb-muted">
                        Shopping opens
                      </div>
                      <div className="text-eb-caption font-bold tabular-nums text-eb-black mt-0.5">
                        {heroCountdown(m.drop_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════ WHAT COMES THROUGH ═══════════════ */}
          {/* Image-forward gallery — proof that real stuff moves through
              Early Bird. Skipped when there's a live-market preview
              grid above (that already shows real items). */}
          {!liveMarket && (
            <section className="pt-8 pb-8 border-b-2 border-eb-black">
              <div className="px-5 mb-5">
                <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
                  From the markets
                </div>
                <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
                  What comes through
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {[
                  "/promo/2.webp",
                  "/promo/3.webp",
                  "/promo/bowl.webp",
                  "/promo/sold.webp",
                  "/promo/drop.webp",
                  "/promo/crowd.webp",
                ].map((src) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden bg-eb-border"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="(max-width: 430px) 50vw, 215px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════ HOW IT WORKS ═══════════════ */}
          <section>
            <div className="px-5 pt-8 pb-5">
              <div className="text-eb-micro uppercase tracking-widest font-bold text-eb-muted">
                How it works
              </div>
              <h3 className="text-eb-title font-bold text-eb-black mt-1.5">
                Shopping Early Bird
              </h3>
            </div>

            <div className="px-5 pb-10 space-y-9">
              {[
                {
                  num: "01",
                  label: "Browse",
                  body: "Dealers post what they\u2019re bringing before each flea market. Browse from your couch, save what you like, and reach out before the crowd shows up at 4am.",
                },
                {
                  num: "02",
                  label: "Connect",
                  body: "Tap \u201cI\u2019m Interested\u201d on any item to send the dealer a single text with your name, number, and message. Take it from there — call, text, or meet at the booth.",
                },
                {
                  num: "03",
                  label: "Get it",
                  body: "Pay the dealer in person, however they take payment. Early Bird never handles money.",
                },
              ].map((step) => (
                <div key={step.num}>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-eb-caption font-bold tabular-nums text-eb-pop">
                      {step.num}
                    </span>
                    <span className="text-eb-caption font-bold uppercase tracking-wider text-eb-black">
                      {step.label}
                    </span>
                  </div>
                  <p className="text-eb-body text-eb-text leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Tagline */}
          <div className="py-8 text-center text-eb-caption text-eb-muted italic border-t border-eb-border">
            The early bird gets the credenza.
          </div>

          {/* Dealer switch */}
          <section className="px-5 py-6 border-t border-eb-border text-center">
            <p className="text-eb-meta text-eb-muted">
              Selling at a market?{" "}
              <button onClick={toggleMode} className="font-bold text-eb-pop">
                Dealer sign up {"\u2192"}
              </button>
            </p>
          </section>
        </>
      ) : (
        <>
          {/* ════════════════════════════════════
              DEALER MODE
          ════════════════════════════════════ */}
          <section className="px-5 pt-12 pb-6">
            <h2 className="text-eb-hero tracking-tight text-eb-black">
              Sell before{" "}
              <span className="text-eb-pop">sunrise.</span>
            </h2>
            <p className="mt-4 text-eb-body text-eb-muted leading-relaxed">
              Imagine showing up to the flea market knowing you{"\u2019"}ve
              already made four sales. Post on Early Bird and get a
              head start on the market.
            </p>
          </section>

          <section className="px-5 pt-6 pb-8 border-t border-eb-border bg-eb-cream">
            <h3 className="text-eb-body font-bold text-eb-black">
              Get buyers before you load the truck
            </h3>
            <p className="text-eb-caption text-eb-muted mt-1 mb-4">
              We text you when new markets open for listing.
            </p>
            {phoneForm}
          </section>

          {/* Social proof / key stat */}
          <section className="px-5 pb-6">
            <div className="border-t-2 border-eb-black pt-6">
              <div className="text-eb-body font-bold text-eb-black">
                Free. No fees, no commissions.
              </div>
              <p className="text-eb-caption text-eb-muted mt-1 leading-relaxed">
                We{"\u2019"}re dealers too. We built Early Bird to help dealers
                make more money at flea markets. It{"\u2019"}s free now and for
                the foreseeable future while we grow.
              </p>
            </div>
          </section>

          <section className="px-5 pb-6">
            {[
              {
                title: "Buyers text you directly",
                desc: "No in-app chat. You get their name and number. Call, text, close the deal however you want.",
              },
              {
                title: "Drop a price, move a piece",
                desc: "Every buyer watching that item gets a text the moment you lower the price.",
              },
              {
                title: "Know what\u2019s hot before you set up",
                desc: "See which items have the most watchers. Load the truck accordingly.",
              },
              {
                title: "Skip the 5am haggle",
                desc: "Buyers commit before they arrive. Less bargaining, more selling.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="py-4 border-t border-eb-border"
              >
                <div className="text-eb-body font-bold text-eb-black">
                  {item.title}
                </div>
                <div className="text-eb-caption text-eb-muted mt-1 leading-relaxed">
                  {item.desc}
                </div>
              </div>
            ))}
          </section>

          <footer className="px-5 py-6 border-t border-eb-border">
            <p className="text-eb-meta text-center text-eb-muted">
              Just here to shop?{" "}
              <button onClick={toggleMode} className="font-bold text-eb-pop">
                Browse as a buyer {"\u2192"}
              </button>
            </p>
          </footer>
        </>
      )}

      {/* ════════════════════════════════════
          SITE FOOTER — A2P compliance
      ════════════════════════════════════ */}
      <footer className="px-5 py-8 border-t-2 border-eb-black mt-auto">
        <div className="text-eb-meta font-bold text-eb-black uppercase tracking-wider">
          Early Bird
        </div>
        <div className="text-eb-micro text-eb-muted mt-1">
          Los Angeles, CA
        </div>
        <div className="flex gap-4 mt-3">
          <a
            href="mailto:hi@earlybird.la"
            className="text-eb-micro text-eb-muted"
          >
            hi@earlybird.la
          </a>
          <a
            href="https://instagram.com/early_bird_la"
            className="text-eb-micro text-eb-muted"
            target="_blank"
            rel="noopener noreferrer"
          >
            @early_bird_la
          </a>
        </div>
        <div className="flex gap-4 mt-4">
          <a href="/terms" className="text-eb-micro text-eb-muted underline">
            Terms
          </a>
          <a href="/privacy" className="text-eb-micro text-eb-muted underline">
            Privacy
          </a>
        </div>
        <p className="text-eb-micro font-readable text-eb-muted mt-4 leading-relaxed">
          Early Bird is not affiliated with any market or organizer. We
          simply allow dealers to post items they{"\u2019"}re bringing.
        </p>
        <div className="text-eb-micro font-readable text-eb-muted mt-3">
          {"\u00a9"} {new Date().getFullYear()} Early Bird
        </div>
      </footer>
    </div>
  );
}

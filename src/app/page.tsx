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
    <div>
      <p className="text-eb-body font-bold text-eb-black">
        Check your texts.
      </p>
      <p className="text-eb-caption text-eb-muted mt-1">
        Sign-in link sent to {phone}.
      </p>
      <button
        onClick={() => { setSent(false); setPhone(""); setSmsConsent(false); }}
        className="text-eb-meta text-eb-muted mt-3"
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
      <label className="flex items-start gap-2.5 mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
          className="mt-0.5 shrink-0 accent-eb-black"
        />
        <span className="text-eb-meta text-eb-muted">
          {mode === "dealer" ? "Text me about upcoming markets" : "Text me when new items drop"}
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
          {/* ════════════════════════════════════
              LIVE MARKET — the main event
          ════════════════════════════════════ */}
          {liveMarket ? (
            <>
              {/* Hero */}
              <section className="px-5 pt-8 pb-4">
                <span className="inline-block text-eb-micro uppercase tracking-wider text-eb-pop bg-eb-pop-light px-1.5 py-0.5 mb-4 font-bold">
                  LIVE NOW
                </span>
                <h2 className="text-eb-hero tracking-tight text-eb-black leading-none">
                  {liveMarket.name}
                </h2>
                <p className="mt-3 text-eb-body text-eb-muted">
                  Shop the market before it opens.
                </p>
              </section>

              {/* Preview grid — real items from the market */}
              {previewItems.length > 0 && (
                <section className="px-5 pt-4 pb-2">
                  <div className="grid grid-cols-3 gap-1">
                    {previewItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/item/${item.id}`}
                        className="relative aspect-square overflow-hidden bg-eb-cream"
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
                          <span className="text-eb-micro text-white font-bold">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Browse CTA */}
              <section className="px-5 pt-4 pb-6">
                <Link
                  href={`/buy?market=${liveMarket.id}`}
                  className="eb-btn text-center block"
                >
                  SHOP THE MARKET {"\u2192"}
                </Link>
              </section>

              {/* Value props — tight, scannable */}
              <section className="px-5 py-6 border-t border-eb-border">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-eb-display text-eb-black">{"\u2709"}</div>
                    <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                      Text the dealer directly
                    </div>
                  </div>
                  <div>
                    <div className="text-eb-display text-eb-black">{"\u2764"}</div>
                    <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                      Save items to your watchlist
                    </div>
                  </div>
                  <div>
                    <div className="text-eb-display text-eb-black">{"\u26a1"}</div>
                    <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                      Get notified on price drops
                    </div>
                  </div>
                </div>
              </section>

              {/* Signup */}
              <section className="px-5 pt-6 pb-8 border-t border-eb-border bg-eb-cream">
                <h3 className="text-eb-body font-bold text-eb-black">
                  See items before everyone else
                </h3>
                <p className="text-eb-caption text-eb-muted mt-1 mb-4">
                  Get a text when the drop goes live — browse and claim
                  items before the 4am crowd.
                </p>
                {phoneForm}
              </section>
            </>
          ) : (
            <>
              {/* ════════════════════════════════════
                  NO LIVE MARKET — build anticipation
              ════════════════════════════════════ */}
              <section className="px-5 pt-12 pb-6">
                <h2 className="text-eb-hero tracking-tight text-eb-black">
                  Shop before <span className="text-eb-pop">sunrise.</span>
                </h2>
                <p className="mt-4 text-eb-body text-eb-muted leading-relaxed">
                  Dealers post what they{"\u2019"}re bringing before each market. You
                  browse from your couch and reach out to the ones you want.
                </p>
              </section>

              {/* Value props — same as live, always relevant */}
              <section className="px-5 py-6 border-t border-eb-border">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-eb-display text-eb-black">{"\u2709"}</div>
                    <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                      Text the dealer directly
                    </div>
                  </div>
                  <div>
                    <div className="text-eb-display text-eb-black">{"\u2764"}</div>
                    <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                      Save items to your watchlist
                    </div>
                  </div>
                  <div>
                    <div className="text-eb-display text-eb-black">{"\u26a1"}</div>
                    <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                      Get notified on price drops
                    </div>
                  </div>
                </div>
              </section>

              {/* Signup */}
              <section className="px-5 pt-6 pb-8 border-t border-eb-border bg-eb-cream">
                <h3 className="text-eb-body font-bold text-eb-black">
                  See items before everyone else
                </h3>
                <p className="text-eb-caption text-eb-muted mt-1 mb-4">
                  Get a text when the drop goes live — browse and claim
                  items before the 4am crowd.
                </p>
                {phoneForm}
              </section>
            </>
          )}

          {/* Upcoming markets */}
          {upcomingMarkets.length > 0 && (
            <section className="px-5 pb-6">
              <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
                Coming up
              </div>
              {upcomingMarkets.map((m) => (
                <div
                  key={m.id}
                  className="py-3.5 border-t border-eb-border flex justify-between items-baseline"
                >
                  <div>
                    <div className="text-eb-body font-bold text-eb-black">
                      {m.name}
                    </div>
                    <div className="text-eb-meta text-eb-muted mt-0.5">
                      {formatDate(m.starts_at)} {"\u00b7"} {m.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-eb-meta text-eb-muted">Drop in</div>
                    <div className="text-eb-meta font-bold text-eb-black">
                      {heroCountdown(m.drop_at)}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* How it works */}
          <section className="px-5 py-6 border-t border-eb-border">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-4">
              How it works
            </div>
            <div className="space-y-4">
              {[
                { num: "1", title: "Browse", desc: "Browse the best vintage dealers at the best flea markets before the crowd." },
                { num: "2", title: "Deal", desc: "Communicate directly with the dealers and make whatever deal you want." },
                { num: "3", title: "Pick up", desc: "Pick up at the flea market or make other arrangements." },
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <span className="text-eb-display font-bold text-eb-light leading-none">
                    {step.num}
                  </span>
                  <div>
                    <div className="text-eb-body font-bold text-eb-black">
                      {step.title}
                    </div>
                    <div className="text-eb-caption text-eb-muted mt-0.5 leading-relaxed">
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tagline + footer */}
          <div className="py-6 text-center text-eb-meta text-eb-muted italic">
            The early bird gets the credenza.
          </div>
          <footer className="px-5 py-6 border-t border-eb-border space-y-3">
            <p className="text-eb-meta text-center text-eb-muted">
              Selling at a market?{" "}
              <button onClick={toggleMode} className="font-bold text-eb-pop">
                Dealer sign up {"\u2192"}
              </button>
            </p>
          </footer>
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

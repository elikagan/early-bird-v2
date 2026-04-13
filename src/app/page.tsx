"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatDate, heroCountdown } from "@/lib/format";

interface Market {
  id: string;
  name: string;
  location: string;
  drop_at: string;
  starts_at: string;
  status: string;
  dealer_count: number;
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"buyer" | "dealer">("buyer");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [markets, setMarkets] = useState<Market[]>([]);

  // If already logged in, redirect to home
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/home");
    }
  }, [authLoading, user, router]);

  // Fetch markets for the upcoming drops section
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/markets");
        if (res.ok) setMarkets(await res.json());
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
      body: JSON.stringify({ phone: formatted }),
    });
    setSending(false);
    if (res.ok) setSent(true);
  };

  const upcomingMarkets = markets.filter(
    (m) => m.status === "upcoming" || m.status === "live"
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-eb-body text-eb-muted">Loading…</span>
      </div>
    );
  }

  if (user) return null; // redirect is happening

  // Phone form — shared between buyer and dealer modes
  const phoneForm = sent ? (
    <div>
      <p className="text-eb-display font-bold text-eb-black">Check your texts</p>
      <p className="text-eb-body text-eb-muted mt-2">
        We texted a sign-in link to {phone}.
        <br />
        Tap it to get in.
      </p>
      <button
        onClick={() => {
          setSent(false);
          setPhone("");
        }}
        className="text-eb-meta text-eb-light mt-6"
      >
        Didn&apos;t get it? Try again
      </button>
    </div>
  ) : (
    <>
      <label className="text-eb-meta uppercase tracking-widest text-eb-muted block mb-1.5">
        Your phone number
      </label>
      <input
        type="tel"
        placeholder="(213) 555-0134"
        className="eb-input"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        className="eb-btn mt-3"
        onClick={handleSend}
        disabled={sending}
      >
        {sending ? "SENDING…" : "TEXT ME A SIGN-IN LINK"}
      </button>
      <p className="text-eb-meta text-eb-muted mt-2 text-center">
        No passwords. No codes. Just a link.
      </p>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Masthead */}
      <div className="eb-masthead">
        <div className="flex justify-between items-start">
          <div>
            <h1>EARLY BIRD</h1>
            <div className="eb-sub">Los Angeles flea market classifieds</div>
          </div>
          <button
            onClick={() => setMode(mode === "buyer" ? "dealer" : "buyer")}
            className="text-eb-meta uppercase tracking-widest text-eb-muted"
          >
            {mode === "buyer" ? "Dealer →" : "Buyer →"}
          </button>
        </div>
      </div>

      {mode === "buyer" ? (
        <>
          {/* Hero */}
          <section className="px-6 pt-12 pb-8">
            <h2 className="text-eb-hero tracking-tight text-eb-black">
              Shop before <span className="text-eb-pop">sunrise.</span>
            </h2>
            <p className="mt-4 text-eb-body text-eb-muted">
              Dealers post prices the night before. You browse from your couch,
              text the ones you want, and show up first.
            </p>
          </section>

          {/* Phone form */}
          <section className="px-6 pb-8">{phoneForm}</section>

          {/* Upcoming markets */}
          {upcomingMarkets.length > 0 && (
            <section className="px-6 pb-8">
              <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
                Upcoming markets
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
                      {formatDate(m.starts_at)} · {m.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-eb-meta text-eb-muted">Drop in</div>
                    <div
                      className={
                        m.status === "live"
                          ? "text-eb-meta font-bold text-eb-pop"
                          : "text-eb-meta font-bold text-eb-black"
                      }
                    >
                      {m.status === "live" ? "LIVE" : heroCountdown(m.drop_at)}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Tagline */}
          <div className="py-6 text-center text-eb-meta text-eb-light italic">
            The early bird gets the credenza.
          </div>

          {/* FAQ */}
          <section className="px-6 pb-8">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              FAQ
            </div>
            {[
              {
                q: "How does it work?",
                a: "Dealers post what they\u2019re bringing the night before a market. You browse, favorite pieces, and tap \u201cI\u2019m Interested\u201d to message the dealer directly. They hold it for you until pickup at the booth.",
              },
              {
                q: "Is it free?",
                a: "Yes. Early Bird is free for buyers. We don\u2019t take a cut \u2014 you pay the dealer directly at the booth, however they prefer (cash, Venmo, Zelle, etc.).",
              },
              {
                q: "Do I still need to show up at 4am?",
                a: "No. That\u2019s the point. Skip the flashlight scramble and show up when the market opens \u2014 your pieces will be waiting at the dealer\u2019s booth.",
              },
              {
                q: "What if I miss the drop?",
                a: "Inventory stays visible for the whole market. Anything still available is yours to claim \u2014 and sold pieces stay visible too, so you can see what you missed and follow that dealer for their next drop.",
              },
            ].map((faq, i) => (
              <div key={i} className="py-3 border-t border-eb-border">
                <div className="text-eb-body font-bold text-eb-black">
                  {faq.q}
                </div>
                <div className="text-eb-caption text-eb-muted mt-1.5 leading-relaxed">
                  {faq.a}
                </div>
              </div>
            ))}
          </section>

          {/* About */}
          <section className="px-6 pb-8">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              About
            </div>
            <p className="text-eb-body text-eb-muted leading-relaxed">
              Every weekend, thousands of people wake up before dawn to go
              treasure hunting at LA flea markets. The best stuff goes fast. If
              you&apos;re not there at 4am with a flashlight, you&apos;re too
              late.
            </p>
            <p className="text-eb-body text-eb-muted leading-relaxed mt-3">
              Early Bird moves the hunt to the night before. Dealers show what
              they&apos;re bringing. Buyers shop from bed. The early bird still
              gets the worm &mdash; but now &ldquo;early&rdquo; means the couch,
              not the cold.
            </p>
          </section>

          {/* Footer */}
          <footer className="px-6 py-8 mt-auto border-t border-eb-border">
            <p className="text-eb-meta text-center text-eb-muted">
              Selling at a market?{" "}
              <button
                onClick={() => setMode("dealer")}
                className="font-bold text-eb-pop"
              >
                Dealer sign up
              </button>
            </p>
          </footer>
        </>
      ) : (
        <>
          {/* Dealer Hero */}
          <section className="px-6 pt-12 pb-6">
            <h2 className="text-eb-hero tracking-tight text-eb-black">
              Sell before <span className="text-eb-pop">sunrise.</span>
            </h2>
            <p className="mt-4 text-eb-body text-eb-muted">
              Post inventory the night before the market. Serious buyers reach
              out before you&apos;ve unloaded the truck. Free to use &mdash; no
              fees, no cut. You transact directly with the buyer.
            </p>
          </section>

          {/* Phone form */}
          <section className="px-6 pb-8">{phoneForm}</section>

          {/* Value Props */}
          <section className="px-6 pb-8">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              Why dealers use it
            </div>
            {[
              {
                num: "01",
                title: "Free. No fees, no cut.",
                desc: "No listing fees, no commissions. You keep every dollar of every sale.",
              },
              {
                num: "02",
                title: "Direct buyer contact",
                desc: "We text you the buyer\u2019s name and number. You call or text them directly. No in-app chat.",
              },
              {
                num: "03",
                title: "Sell without haggling at 5am",
                desc: "Buyers commit to pieces before they arrive. No cold-booth bargaining in the dark.",
              },
              {
                num: "04",
                title: "Price drops = sales",
                desc: "Didn\u2019t move by noon? Lower the price, and every watcher gets a text.",
              },
              {
                num: "05",
                title: "Dealers shop too",
                desc: "Same login, both sides of the market. Browse other booths while you sell your own.",
              },
            ].map((item) => (
              <div
                key={item.num}
                className="py-3 border-t border-eb-border flex gap-3"
              >
                <span className="text-eb-body font-bold text-eb-light">
                  {item.num}
                </span>
                <div>
                  <div className="text-eb-body font-bold text-eb-black">
                    {item.title}
                  </div>
                  <div className="text-eb-caption text-eb-muted mt-1">
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Stats */}
          <section className="px-6 pb-8">
            <div className="flex border-t border-eb-border">
              {[
                { value: "214", label: "Dealers" },
                { value: "9", label: "Markets" },
                { value: "1,842", label: "Inquiries" },
              ].map((stat, i) => (
                <div key={i} className="flex-1 py-4 text-center">
                  <div className="text-eb-display text-eb-black">
                    {stat.value}
                  </div>
                  <div className="text-eb-micro uppercase tracking-widest text-eb-muted mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dealer FAQ */}
          <section className="px-6 pb-8">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              FAQ
            </div>
            {[
              {
                q: "How much does it cost?",
                a: "Free. No listing fees, no commissions, no cut. You keep every dollar of every sale.",
              },
              {
                q: "How does payment work?",
                a: "The buyer pays you directly at the booth \u2014 cash, Venmo, Zelle, Apple Pay, card, whatever you accept. Early Bird never touches the money.",
              },
              {
                q: "Can I also shop other booths?",
                a: "Yes. Every dealer account is also a buyer account. Same login, both experiences.",
              },
              {
                q: "When does inventory go live?",
                a: "The evening before each market \u2014 the drop. All dealer inventory becomes visible simultaneously.",
              },
              {
                q: "What happens when a buyer is interested?",
                a: "We text you the buyer\u2019s first name, last initial, phone number, and a short note. You call or text them directly.",
              },
              {
                q: "Do I need to set up for every market?",
                a: "Once. Your booth location and payment methods carry forward. Add items per market, keep the rest on autopilot.",
              },
            ].map((faq, i) => (
              <div key={i} className="py-3 border-t border-eb-border">
                <div className="text-eb-body font-bold text-eb-black">
                  {faq.q}
                </div>
                <div className="text-eb-caption text-eb-muted mt-1.5 leading-relaxed">
                  {faq.a}
                </div>
              </div>
            ))}
          </section>

          {/* About */}
          <section className="px-6 pb-8">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              About
            </div>
            <p className="text-eb-body text-eb-muted leading-relaxed">
              Early Bird is the marketplace for LA flea market dealers and the
              people who shop them. Dealers post inventory the night before each
              market. Buyers browse from the couch and reach out before sunrise.
              No fees. No cut. You and the buyer handle the transaction directly
              at the booth &mdash; the app is a matchmaker, not a middleman.
            </p>
          </section>

          {/* Footer */}
          <footer className="px-6 py-8 mt-auto border-t border-eb-border">
            <p className="text-eb-meta text-center text-eb-muted">
              Just here to shop?{" "}
              <button
                onClick={() => setMode("buyer")}
                className="font-bold text-eb-pop"
              >
                Browse as a buyer →
              </button>
            </p>
          </footer>
        </>
      )}
    </div>
  );
}

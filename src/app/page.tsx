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
    const formatted = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits[0] === "1" ? `+${digits}` : `+${digits}`;
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
      <div className="max-w-md mx-auto min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (user) return null; // redirect is happening

  return (
    <div className="max-w-md mx-auto min-h-screen bg-base-100 flex flex-col">
      {mode === "buyer" ? (
        <>
          {/* Header */}
          <header className="px-6 pt-10 pb-5 flex justify-between items-start gap-4">
            <div>
              <div className="text-3xl font-bold tracking-tight">EARLY BIRD</div>
              <div className="text-xs uppercase tracking-widest text-base-content/60 mt-1">
                LA Flea Markets
              </div>
            </div>
            <button
              onClick={() => setMode("dealer")}
              className="link link-hover text-xs uppercase tracking-wider text-base-content/70 mt-2 whitespace-nowrap"
            >
              Dealer? →
            </button>
          </header>

          {/* Hero + Sign In */}
          <section className="px-6 pb-8">
            <h1 className="text-2xl font-bold leading-tight">
              Shop before sunrise.
            </h1>
            <p className="text-sm text-base-content/70 mt-3 leading-relaxed">
              Dealers post what they&apos;re bringing the night before. Browse
              from bed. Claim pieces before the alarm goes off.
            </p>

            {sent ? (
              <div className="mt-6">
                <div className="alert">
                  <div>
                    <div className="font-bold text-sm">Check your texts</div>
                    <div className="text-xs text-base-content/60 mt-1">
                      We sent a magic link to {phone}. Tap it to sign in.
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm w-full mt-3"
                  onClick={() => {
                    setSent(false);
                    setPhone("");
                  }}
                >
                  Use a different number
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <label className="form-control w-full">
                  <div className="label pb-1">
                    <span className="label-text text-xs uppercase tracking-wider">
                      Your Phone Number
                    </span>
                  </div>
                  <input
                    type="tel"
                    placeholder="(213) 555-0134"
                    className="input input-bordered w-full"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <button
                  className={`btn btn-neutral w-full mt-3${sending ? " loading" : ""}`}
                  onClick={handleSend}
                  disabled={sending}
                >
                  Send Magic Link
                </button>
                <p className="text-xs text-base-content/60 mt-2 text-center">
                  We&apos;ll text you a link. No passwords. No codes.
                </p>
              </div>
            )}
          </section>

          {/* Upcoming Markets */}
          {upcomingMarkets.length > 0 && (
            <section className="px-6 pb-8">
              <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
                Upcoming Drops
              </div>
              <div className="flex flex-col gap-3">
                {upcomingMarkets.map((m) => (
                  <div
                    key={m.id}
                    className="card card-compact bg-base-100 border border-base-300"
                  >
                    <div className="card-body">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-base">{m.name}</div>
                          <div className="text-xs text-base-content/60 mt-0.5">
                            {formatDate(m.starts_at)} · {m.location}
                          </div>
                        </div>
                        <div className="badge badge-neutral badge-sm">
                          {m.dealer_count} dealers
                        </div>
                      </div>
                      <div className="divider my-1"></div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase text-base-content/60">
                          Drops in
                        </div>
                        <div className="font-bold text-sm tabular-nums">
                          {heroCountdown(m.drop_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          <section className="px-6 pb-8">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              FAQ
            </div>
            <div className="flex flex-col gap-3">
              <div className="card card-compact bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="font-bold text-sm">How does it work?</div>
                  <div className="text-xs text-base-content/70 leading-relaxed mt-1">
                    Dealers post what they&apos;re bringing the night before a
                    market. You browse, favorite pieces, and tap &ldquo;I&apos;m
                    Interested&rdquo; to message the dealer directly. They hold
                    it for you until pickup at the booth.
                  </div>
                </div>
              </div>
              <div className="card card-compact bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="font-bold text-sm">Is it free?</div>
                  <div className="text-xs text-base-content/70 leading-relaxed mt-1">
                    Yes. Early Bird is free for buyers. We don&apos;t take a cut
                    — you pay the dealer directly at the booth, however they
                    prefer (cash, Venmo, Zelle, etc.).
                  </div>
                </div>
              </div>
              <div className="card card-compact bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="font-bold text-sm">
                    Do I still need to show up at 4am?
                  </div>
                  <div className="text-xs text-base-content/70 leading-relaxed mt-1">
                    No. That&apos;s the point. Skip the flashlight scramble and
                    show up when the market opens — your pieces will be waiting
                    at the dealer&apos;s booth.
                  </div>
                </div>
              </div>
              <div className="card card-compact bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="font-bold text-sm">
                    What if I miss the drop?
                  </div>
                  <div className="text-xs text-base-content/70 leading-relaxed mt-1">
                    Inventory stays visible for the whole market. Anything still
                    available is yours to claim — and sold pieces stay visible
                    too, so you can see what you missed and follow that dealer
                    for their next drop.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="px-6 pb-10">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              About
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Every weekend, thousands of people wake up before dawn to go
              treasure hunting at LA flea markets. The best stuff goes fast. If
              you&apos;re not there at 4am with a flashlight, you&apos;re too
              late.
            </p>
            <p className="text-sm text-base-content/70 leading-relaxed mt-3">
              Early Bird moves the hunt to the night before. Dealers show what
              they&apos;re bringing. Buyers shop from bed. The early bird still
              gets the worm — but now &ldquo;early&rdquo; means the couch, not
              the cold.
            </p>
          </section>

          {/* Footer */}
          <footer className="px-6 py-8 mt-auto bg-base-200">
            <div className="text-xs text-center text-base-content/70">
              Selling at a market?{" "}
              <button
                onClick={() => setMode("dealer")}
                className="link link-hover font-bold"
              >
                Dealer sign up
              </button>
            </div>
          </footer>
        </>
      ) : (
        <>
          {/* Dealer Header */}
          <header className="px-6 pt-10 pb-4 flex items-start justify-between">
            <div>
              <div className="text-3xl font-bold tracking-tight">EARLY BIRD</div>
              <div className="text-xs uppercase tracking-widest text-base-content/60 mt-1">
                LA Flea Markets · Dealer
              </div>
            </div>
            <button
              onClick={() => setMode("buyer")}
              className="link link-hover text-xs uppercase tracking-widest text-base-content/70 pt-3"
            >
              Buyer? →
            </button>
          </header>

          {/* Dealer Hero */}
          <section className="px-6 pb-5">
            <h1 className="text-2xl font-bold leading-tight">
              Sell before sunrise.
            </h1>
            <p className="text-sm text-base-content/70 mt-3 leading-relaxed">
              Post inventory the night before the market. Serious buyers reach
              out before you&apos;ve unloaded the truck. Free to use — no fees,
              no cut. You transact directly with the buyer.
            </p>
          </section>

          {/* Dealer Sign In */}
          <section className="px-6 pb-8">
            {sent ? (
              <div>
                <div className="alert">
                  <div>
                    <div className="font-bold text-sm">Check your texts</div>
                    <div className="text-xs text-base-content/60 mt-1">
                      We sent a magic link to {phone}. Tap it to sign in.
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm w-full mt-3"
                  onClick={() => {
                    setSent(false);
                    setPhone("");
                  }}
                >
                  Use a different number
                </button>
              </div>
            ) : (
              <>
                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text text-xs uppercase tracking-wider">
                      Phone Number
                    </span>
                  </div>
                  <input
                    type="tel"
                    placeholder="(213) 555-0134"
                    className="input input-bordered w-full"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <button
                  className={`btn btn-neutral w-full mt-4${sending ? " loading" : ""}`}
                  onClick={handleSend}
                  disabled={sending}
                >
                  Send Magic Link
                </button>
                <p className="text-xs text-base-content/60 mt-3 text-center">
                  We&apos;ll text you a link. No passwords. No codes.
                </p>
              </>
            )}
          </section>

          {/* Value Props */}
          <section className="px-6 pb-8">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              Why Dealers Use It
            </div>
            <div className="flex flex-col gap-3">
              {[
                {
                  num: "01",
                  title: "Free. No fees, no cut.",
                  desc: "No listing fees, no commissions. You keep every dollar of every sale.",
                },
                {
                  num: "02",
                  title: "Direct buyer contact",
                  desc: "We text you the buyer's name and number. You call or text them directly. No in-app chat.",
                },
                {
                  num: "03",
                  title: "Sell without haggling at 5am",
                  desc: "Buyers commit to pieces before they arrive. No cold-booth bargaining in the dark.",
                },
                {
                  num: "04",
                  title: "Price drops = sales",
                  desc: "Didn't move by noon? Lower the price, and every watcher gets a text.",
                },
                {
                  num: "05",
                  title: "Dealers shop too",
                  desc: "Same login, both sides of the market. Browse other booths while you sell your own.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="card card-compact bg-base-100 border border-base-300"
                >
                  <div className="card-body">
                    <div className="flex items-start gap-3">
                      <div className="badge badge-neutral badge-lg font-bold">
                        {item.num}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{item.title}</div>
                        <div className="text-xs text-base-content/60 mt-1">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="px-6 pb-8">
            <div className="stats stats-vertical bg-base-200 w-full">
              <div className="stat">
                <div className="stat-title text-xs uppercase tracking-wider">
                  Active Dealers
                </div>
                <div className="stat-value text-2xl">214</div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs uppercase tracking-wider">
                  Markets Covered
                </div>
                <div className="stat-value text-2xl">9</div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs uppercase tracking-wider">
                  Inquiries Last Drop
                </div>
                <div className="stat-value text-2xl">1,842</div>
              </div>
            </div>
          </section>

          {/* Dealer FAQ */}
          <section className="px-6 pb-8">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              FAQ
            </div>
            <div className="flex flex-col gap-2">
              {[
                {
                  q: "How much does it cost?",
                  a: "Free. No listing fees, no commissions, no cut. You keep every dollar of every sale.",
                },
                {
                  q: "How does payment work?",
                  a: "The buyer pays you directly at the booth — cash, Venmo, Zelle, Apple Pay, card, whatever you accept. Early Bird never touches the money. You confirm the sale in person.",
                },
                {
                  q: "Can I also shop other booths?",
                  a: "Yes. Every dealer account is also a buyer account. Same login, both experiences. Browse and buy from other dealers while your own booth is live.",
                },
                {
                  q: "When does inventory go live?",
                  a: "The evening before each market — the drop. All dealer inventory becomes visible simultaneously, and buyers can start reaching out the moment the drop goes live.",
                },
                {
                  q: "What happens when a buyer is interested?",
                  a: "We text you the buyer's first name, last initial, phone number, and a short note. You call or text them directly to work out the deal. No in-app chat, no threads, no inboxes.",
                },
                {
                  q: "Do I need to set up for every market?",
                  a: "Once. Your booth location and payment methods carry forward across markets unless you change them. Add items per market, keep the rest on autopilot.",
                },
              ].map((faq, i) => (
                <div
                  key={i}
                  className="collapse collapse-arrow bg-base-100 border border-base-300"
                >
                  <input type="checkbox" />
                  <div className="collapse-title text-sm font-bold">
                    {faq.q}
                  </div>
                  <div className="collapse-content text-xs text-base-content/70">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* About */}
          <section className="px-6 pb-10">
            <div className="text-xs uppercase tracking-widest text-base-content/60 mb-3">
              About
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Early Bird is the marketplace for LA flea market dealers and the
              people who shop them. Dealers post inventory the night before each
              market. Buyers browse from the couch and reach out before sunrise.
              No fees. No cut. You and the buyer handle the transaction directly
              at the booth — the app is a matchmaker, not a middleman.
            </p>
          </section>

          {/* Footer */}
          <footer className="px-6 py-8 mt-auto bg-base-200">
            <div className="text-xs text-center text-base-content/60">
              Just here to shop?{" "}
              <button
                onClick={() => setMode("buyer")}
                className="link link-hover font-bold"
              >
                Browse as a buyer →
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

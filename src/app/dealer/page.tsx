"use client";

import { useState } from "react";
import Link from "next/link";
import { Masthead } from "@/components/masthead";
import { SignupDrawer } from "@/components/signup-drawer";

/**
 * Public dealer landing page. Pitches Early Bird to LA flea market
 * dealers who are considering joining. Mirrors the anon buyer home
 * at /, but with dealer-focused copy and a "Buyer →" toggle back.
 *
 * Dealer onboarding itself is invite-only (admin issues /invite/[code]
 * links). This page's CTA is therefore "email us to get on" — not a
 * self-serve signup form.
 */
export default function DealerLandingPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <>
      <Masthead
        href="/"
        right={
          <Link
            href="/"
            className="text-eb-meta uppercase tracking-widest text-eb-muted"
          >
            Buyer {"\u2192"}
          </Link>
        }
      />

      {/* Hero */}
      <section className="px-5 pt-10 pb-8 border-b-2 border-eb-black">
        <div className="text-eb-micro uppercase tracking-widest text-eb-pop font-bold mb-2">
          For dealers
        </div>
        <h1 className="text-eb-hero text-eb-black leading-tight">
          Sell before <span className="text-eb-pop">sunrise.</span>
        </h1>
        <p className="text-eb-body text-eb-text leading-relaxed mt-4">
          Imagine showing up to the flea market knowing you{"\u2019"}ve
          already made four sales. Early Bird is a tool built by LA flea
          market dealers, for dealers, to get a head start on the show.
        </p>
      </section>

      {/* Benefits */}
      <section className="px-5 pt-6 pb-2">
        <div className="space-y-0">
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
              className={`py-4 ${i > 0 ? "border-t border-eb-border" : ""}`}
            >
              <div className="text-eb-body font-bold text-eb-black">
                {item.title}
              </div>
              <div className="text-eb-caption text-eb-muted mt-1 leading-relaxed">
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cost */}
      <section className="px-5 pt-6 pb-8 border-t-2 border-eb-black">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted font-bold mb-1">
          Free
        </div>
        <h3 className="text-eb-title font-bold text-eb-black mt-1">
          No fees, no commissions.
        </h3>
        <p className="text-eb-caption text-eb-muted mt-2 leading-relaxed">
          We{"\u2019"}re dealers too. We built Early Bird to help dealers
          make more money at flea markets. It{"\u2019"}s free now and for
          the foreseeable future while we grow.
        </p>
      </section>

      {/* CTA */}
      <section className="px-5 pt-6 pb-10 border-t border-eb-border">
        <div className="text-eb-micro uppercase tracking-widest text-eb-muted font-bold mb-2">
          Ready to join?
        </div>
        <p className="text-eb-caption text-eb-muted leading-relaxed mb-5">
          Early Bird is invite-only while we grow. Tell us a little about
          your booth and we{"\u2019"}ll get you onboarded.
        </p>
        <a
          href="mailto:hi@earlybird.la?subject=Listing%20on%20Early%20Bird&body=Hi%20Early%20Bird%2C%0A%0AI%27d%20like%20to%20list%20on%20Early%20Bird.%20Here%27s%20a%20bit%20about%20me%3A%0A%0A-%20My%20business%3A%20%0A-%20Markets%20I%20sell%20at%3A%20%0A-%20Instagram%3A%20%0A-%20Phone%3A%20%0A%0AThanks"
          className="eb-btn text-center block"
        >
          Email us
        </a>
      </section>

      {/* Footer — brand, contact, legal */}
      <footer className="px-5 py-8 border-t border-eb-border">
        <div className="text-eb-meta font-bold text-eb-black uppercase tracking-wider">
          Early Bird
        </div>
        <div className="text-eb-micro text-eb-muted mt-1">Los Angeles, CA</div>
        <div className="flex flex-wrap gap-4 mt-3">
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
        <div className="flex flex-wrap gap-4 mt-4">
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="text-eb-micro text-eb-muted underline"
          >
            Sign in
          </button>
          <a href="/terms" className="text-eb-micro text-eb-muted underline">
            Terms
          </a>
          <a href="/privacy" className="text-eb-micro text-eb-muted underline">
            Privacy
          </a>
        </div>
      </footer>

      <SignupDrawer
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
      />
    </>
  );
}

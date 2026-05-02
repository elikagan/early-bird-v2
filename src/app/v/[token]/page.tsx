"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

function VerifyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const isDealerSignup = searchParams.get("dealer") === "1";
  const [error, setError] = useState<string | null>(() => {
    // Validate token presence synchronously (avoids setState-in-effect lint error)
    if (!token) return "No token provided";
    return null;
  });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    async function verify() {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) return;
        if (!res.ok) {
          setError("This link has expired or already been used.");
          return;
        }

        const data = await res.json();
        // Store token in localStorage as backup (cookie is primary)
        try { localStorage.setItem("eb_token", data.session_token); } catch {}

        let dest = "/home";
        // Highest priority: explicit `?to=` query param. Used by the
        // inquiry confirmation SMS so the buyer lands back on the item
        // they were looking at. Must start with "/" to prevent an
        // open-redirect from a doctored SMS link.
        const explicitTo = searchParams.get("to");
        if (explicitTo && explicitTo.startsWith("/")) {
          dest = explicitTo;
        } else if (data.inquiry_confirmed_item_id) {
          // Anon inquiry verified: drop them back on the item they
          // were looking at, with a flag the item page reads to show
          // the "inquiry sent" drawer state.
          dest = `/item/${data.inquiry_confirmed_item_id}?sent=1`;
        } else if (data.phone_changed) {
          dest = "/account";
        } else if (data.pending_invite_code) {
          // Admin invited this phone as a dealer but they signed in
          // via the front door instead of tapping the invite SMS.
          // Route them to the invite page to finish dealer setup so
          // they don't land as a plain buyer.
          dest = `/invite/${data.pending_invite_code}`;
        } else if (data.user.needs_onboarding) {
          dest = isDealerSignup ? "/onboarding?dealer=1" : "/onboarding";
        } else {
          const returnTo = localStorage.getItem("eb_return_to");
          if (returnTo && returnTo.startsWith("/")) {
            dest = returnTo;
            localStorage.removeItem("eb_return_to");
          }
        }
        // replace() instead of href=: don't leave /v/[token] in the
        // browser history. Otherwise back button lands on the verify
        // page, it tries to re-verify an already-used token, and the
        // user gets an error — the "weird login loop".
        window.location.replace(dest);
      } catch {
        if (!cancelled) setError("Something went wrong. Please try again.");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [token, isDealerSignup]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-eb-title tracking-widest text-eb-black mb-2">
          EARLY BIRD
        </div>
        <p className="text-eb-body text-eb-muted text-center mb-6">{error}</p>
        <button
          className="eb-btn"
          onClick={() => (window.location.href = "/")}
        >
          BACK TO SIGN IN
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <span className="text-eb-body text-eb-muted">Signing you in…</span>
    </div>
  );
}

export default function VerifyShortPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center">
          <span className="text-eb-body text-eb-muted">Signing you in…</span>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

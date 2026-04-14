"use client";

import { useEffect, useState } from "react";

export default function VerifyPage() {
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ? null : "No token provided";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
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
        localStorage.setItem("eb_token", data.session_token);

        let dest = "/home";
        if (data.user.needs_onboarding) {
          dest = "/onboarding";
        } else {
          const returnTo = localStorage.getItem("eb_return_to");
          if (returnTo && returnTo.startsWith("/")) {
            dest = returnTo;
            localStorage.removeItem("eb_return_to");
          }
        }
        window.location.href = dest;
      } catch {
        if (!cancelled) setError("Something went wrong. Please try again.");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, []);

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

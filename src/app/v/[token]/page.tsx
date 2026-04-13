"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function VerifyShortPage() {
  const params = useParams();
  const token = params.token as string;
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
        localStorage.setItem("eb_token", data.session_token);

        const dest = data.user.needs_onboarding ? "/onboarding" : "/home";
        window.location.href = dest;
      } catch {
        if (!cancelled) setError("Something went wrong. Please try again.");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [token]);

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

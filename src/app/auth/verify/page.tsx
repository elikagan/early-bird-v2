"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          setError("This link has expired or already been used.");
          return;
        }

        const data = await res.json();
        login(data.session_token, data.user);

        if (data.user.needs_onboarding) {
          router.replace("/onboarding");
        } else {
          router.replace("/home");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    }

    verify();
  }, [token, login, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-eb-title tracking-widest text-eb-black mb-2">
          EARLY BIRD
        </div>
        <p className="text-eb-body text-eb-muted text-center mb-6">{error}</p>
        <button className="eb-btn" onClick={() => router.push("/")}>
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

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-eb-body text-eb-muted">Loading…</span>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

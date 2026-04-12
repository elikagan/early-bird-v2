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
      <div className="max-w-md mx-auto min-h-screen bg-base-100 flex flex-col items-center justify-center px-6">
        <div className="text-xl font-bold tracking-tight mb-4">EARLY BIRD</div>
        <div className="text-sm text-base-content/70 text-center mb-6">
          {error}
        </div>
        <button
          className="btn btn-neutral"
          onClick={() => router.push("/")}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-base-100 flex flex-col items-center justify-center">
      <span className="loading loading-spinner loading-md mb-4"></span>
      <div className="text-sm text-base-content/60">Signing you in…</div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto min-h-screen bg-base-100 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

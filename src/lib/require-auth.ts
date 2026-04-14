"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirects to landing page if user is not authenticated.
 * Returns { user, loading } — caller should show nothing while loading
 * or when user is null (redirect in progress).
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const stored = localStorage.getItem("eb_token");
      if (!stored) {
        router.replace("/");
      }
    }
  }, [loading, user, router]);

  return { user, loading };
}

"use client";

import { useAuth } from "@/lib/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-eb-body text-eb-muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {children}
    </div>
  );
}

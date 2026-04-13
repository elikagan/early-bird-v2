"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";

interface Application {
  id: string;
  user_id: string;
  name: string;
  business_name: string;
  instagram_handle: string | null;
  phone: string;
  status: string;
  created_at: string;
  user_display_name: string | null;
  user_avatar: string | null;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [approving, setApproving] = useState<string | null>(null);

  const loadApps = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    const res = await apiFetch(`/api/admin/applications?status=${status}`);
    if (res.ok) {
      setApps(await res.json());
    } else if (res.status === 403) {
      setError("Not authorized");
    } else {
      setError("Failed to load");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadApps(filter);
  }, [user, filter, loadApps]);

  const approve = useCallback(async (id: string) => {
    setApproving(id);
    const res = await apiFetch(`/api/admin/applications/${id}/approve`, {
      method: "POST",
    });
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id));
    }
    setApproving(null);
  }, []);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="eb-spinner" />
      </div>
    );
  }

  return (
    <>
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
        <div className="eb-sub">Admin</div>
      </header>

      {/* Filter tabs */}
      <div className="flex border-b border-eb-border">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-1 py-3 text-eb-caption font-bold uppercase tracking-wider text-center ${
              filter === s
                ? "text-eb-black border-b-2 border-eb-black"
                : "text-eb-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <main className="px-5 py-4 pb-32">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="eb-spinner" />
          </div>
        ) : error ? (
          <div className="eb-empty">
            <p>{error}</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="eb-empty">
            <div className="eb-icon">○</div>
            <p>No {filter} applications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => (
              <div
                key={app.id}
                className="border-2 border-eb-border p-4"
              >
                <div className="text-eb-body font-bold text-eb-black">
                  {app.name}
                </div>
                <div className="text-eb-meta text-eb-text mt-1">
                  {app.business_name}
                </div>
                {app.instagram_handle && (
                  <div className="text-eb-meta text-eb-muted mt-0.5">
                    @{app.instagram_handle}
                  </div>
                )}
                <div className="text-eb-meta text-eb-muted mt-0.5">
                  {formatPhone(app.phone)}
                </div>
                <div className="text-eb-micro text-eb-light mt-1">
                  Applied {new Date(app.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>

                {filter === "pending" && (
                  <button
                    onClick={() => approve(app.id)}
                    disabled={approving === app.id}
                    className="mt-3 py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider"
                  >
                    {approving === app.id
                      ? "Approving\u2026"
                      : "Approve & Send Login"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

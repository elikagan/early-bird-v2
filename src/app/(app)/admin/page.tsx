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

  // Invite link state
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

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

  const generateInvite = useCallback(async () => {
    setInviteGenerating(true);
    setInviteCopied(false);
    const res = await apiFetch("/api/admin/invite-link", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      setInviteUrl(url);
    }
    setInviteGenerating(false);
  }, []);

  const copyInvite = useCallback(() => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }, [inviteUrl]);

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

      {/* Invite link generator */}
      <section className="px-5 py-5 border-b border-eb-border">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Invite a Dealer
        </div>
        <p className="text-eb-micro text-eb-muted leading-relaxed mb-3">
          Generate a one-time link. Send it however you want — text, email, DM.
          They fill out their info and become a dealer instantly.
        </p>
        {inviteUrl ? (
          <div>
            <div className="eb-input text-eb-micro break-all mb-2 select-all">
              {inviteUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyInvite}
                className="py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider"
              >
                {inviteCopied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={() => {
                  setInviteUrl(null);
                  generateInvite();
                }}
                className="py-2 px-4 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
              >
                New Link
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generateInvite}
            disabled={inviteGenerating}
            className="py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider"
          >
            {inviteGenerating ? "Generating\u2026" : "Generate Invite Link"}
          </button>
        )}
      </section>

      {/* Filter tabs */}
      <div className="text-eb-meta uppercase tracking-widest text-eb-muted px-5 pt-5 pb-2">
        Dealer Applications
      </div>
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

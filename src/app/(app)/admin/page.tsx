"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { formatPhone, formatDate, formatPrice, heroCountdown, timeAgo } from "@/lib/format";

/* ─── Types ─── */

type Tab = "dashboard" | "markets" | "dealers" | "items" | "sms";

interface DashboardData {
  dealer_count: number;
  buyer_count: number;
  items_this_week: number;
  sold_this_week: number;
  next_market: Market | null;
  recent_actions: AdminAction[];
}

interface Market {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  drop_at: string;
  status: string;
  is_test: number;
  archived: number;
  dealer_count: number;
  item_count: number;
  created_at: string;
}

interface AdminAction {
  id: string;
  admin_phone: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Application {
  id: string;
  user_id: string;
  name: string;
  business_name: string;
  instagram_handle: string | null;
  phone: string;
  status: string;
  created_at: string;
}

/* ─── Helpers ─── */

function actionLabel(a: AdminAction): string {
  const labels: Record<string, string> = {
    create_market: "Created market",
    edit_market: "Edited market",
    archive_market: "Archived market",
    unarchive_market: "Unarchived market",
    delete_market: "Deleted market",
    create_dealer: "Created dealer",
    edit_dealer: "Edited dealer",
    deactivate_dealer: "Deactivated dealer",
    change_role: "Changed role",
    edit_item: "Edited item",
    delete_item: "Deleted item",
    send_blast: "Sent SMS blast",
  };
  const detail = a.details as Record<string, unknown> | null;
  const name = detail?.name as string | undefined;
  return (labels[a.action] || a.action) + (name ? `: ${name}` : "");
}

function marketStatus(m: Market): { label: string; color: string } {
  if (m.status === "live") return { label: "LIVE", color: "text-eb-pop" };
  const now = Date.now();
  const starts = new Date(m.starts_at).getTime();
  if (starts < now) return { label: "PAST", color: "text-eb-muted" };
  return { label: "UPCOMING", color: "text-eb-green" };
}

/* ─── Main page wrapper with Suspense ─── */

export default function AdminPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
      }
    >
      <AdminPage />
    </Suspense>
  );
}

/* ─── Admin Page ─── */

function AdminPage() {
  useRequireAuth();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get("tab") as Tab) || "dashboard";
  const setTab = (t: Tab) => router.push(`/admin?tab=${t}`);

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

      {/* Tab bar */}
      <div className="flex border-b-2 border-eb-black overflow-x-auto">
        {(["dashboard", "markets", "dealers", "items", "sms"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-w-0 py-3 text-eb-micro font-bold uppercase tracking-wider text-center whitespace-nowrap ${
              activeTab === t
                ? "text-eb-black border-b-2 border-eb-pop -mb-[2px]"
                : "text-eb-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <main className="pb-32">
        {activeTab === "dashboard" && <DashboardTab setTab={setTab} />}
        {activeTab === "markets" && <MarketsTab />}
        {activeTab === "dealers" && <DealersTab />}
        {activeTab === "items" && <ItemsTab />}
        {activeTab === "sms" && <SmsTab />}
      </main>
    </>
  );
}

/* ════════════════════════════════════════════════════
   DASHBOARD TAB
   ════════════════════════════════════════════════════ */

function DashboardTab({ setTab }: { setTab: (t: Tab) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/admin/dashboard");
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="eb-spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="eb-empty">
        <p>Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats grid */}
      <div className="eb-stats border-b border-eb-border">
        <button onClick={() => setTab("dealers")} className="eb-stat">
          <div className="eb-stat-num">{data.dealer_count}</div>
          <div className="eb-stat-label">Dealers</div>
        </button>
        <button onClick={() => setTab("dealers")} className="eb-stat">
          <div className="eb-stat-num">{data.buyer_count}</div>
          <div className="eb-stat-label">Buyers</div>
        </button>
        <button onClick={() => setTab("items")} className="eb-stat">
          <div className="eb-stat-num">{data.items_this_week}</div>
          <div className="eb-stat-label">Items / wk</div>
        </button>
        <button onClick={() => setTab("items")} className="eb-stat">
          <div className="eb-stat-num">{data.sold_this_week}</div>
          <div className="eb-stat-label">Sold / wk</div>
        </button>
      </div>

      {/* Next market */}
      {data.next_market && (
        <div className="px-5 py-4 border-b border-eb-border">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Next Market
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-eb-body font-bold text-eb-black">
                {data.next_market.name}
              </div>
              <div className="text-eb-meta text-eb-muted mt-0.5">
                {formatDate(data.next_market.starts_at)} · {data.next_market.item_count} items · {data.next_market.dealer_count} dealers
              </div>
            </div>
            <div className="text-eb-body font-bold text-eb-pop">
              {heroCountdown(data.next_market.drop_at)}
            </div>
          </div>
        </div>
      )}

      {/* Recent actions */}
      <div className="px-5 pt-4">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Recent Actions
        </div>
        {data.recent_actions.length === 0 ? (
          <p className="text-eb-caption text-eb-muted">No actions yet</p>
        ) : (
          <div className="space-y-3">
            {data.recent_actions.map((a) => (
              <div key={a.id} className="flex justify-between items-baseline">
                <div className="text-eb-caption text-eb-text">
                  {actionLabel(a)}
                </div>
                <div className="text-eb-micro text-eb-light shrink-0 ml-3">
                  {timeAgo(a.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   MARKETS TAB
   ════════════════════════════════════════════════════ */

function MarketsTab() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDrop, setFormDrop] = useState("");
  const [formTest, setFormTest] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDrop, setEditDrop] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMarkets = useCallback(async () => {
    const res = await apiFetch("/api/admin/markets");
    if (res.ok) setMarkets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  const createMarket = async () => {
    if (!formName || !formDate || !formDrop || creating) return;
    setCreating(true);
    const res = await apiFetch("/api/admin/markets", {
      method: "POST",
      body: JSON.stringify({
        name: formName,
        location: formLocation || null,
        starts_at: new Date(formDate).toISOString(),
        drop_at: new Date(formDrop).toISOString(),
        is_test: formTest,
      }),
    });
    if (res.ok) {
      setFormName("");
      setFormLocation("");
      setFormDate("");
      setFormDrop("");
      setFormTest(false);
      loadMarkets();
    }
    setCreating(false);
  };

  const startEdit = (m: Market) => {
    setEditId(m.id);
    setEditName(m.name);
    setEditLocation(m.location || "");
    setEditDate(m.starts_at.slice(0, 16));
    setEditDrop(m.drop_at.slice(0, 16));
    setEditStatus(m.status);
  };

  const saveEdit = async () => {
    if (!editId || saving) return;
    setSaving(true);
    await apiFetch(`/api/admin/markets/${editId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editName,
        location: editLocation || null,
        starts_at: new Date(editDate).toISOString(),
        drop_at: new Date(editDrop).toISOString(),
        status: editStatus,
      }),
    });
    setEditId(null);
    setSaving(false);
    loadMarkets();
  };

  const toggleArchive = async (m: Market) => {
    await apiFetch(`/api/admin/markets/${m.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: m.archived ? 0 : 1 }),
    });
    loadMarkets();
  };

  const deleteMarket = async (m: Market) => {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    const res = await apiFetch(`/api/admin/markets/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
    loadMarkets();
  };

  const active = markets.filter((m) => !m.archived);
  const archived = markets.filter((m) => m.archived);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="eb-spinner" />
      </div>
    );
  }

  return (
    <>
      {/* Create form */}
      <div className="px-5 py-4 border-b border-eb-border">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Create Market
        </div>
        <div className="space-y-2">
          <input
            className="eb-input"
            placeholder="Market name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <input
            className="eb-input"
            placeholder="Location (optional)"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-eb-micro text-eb-muted block mb-1">Market date</label>
              <input
                type="datetime-local"
                className="eb-input text-eb-caption"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-eb-micro text-eb-muted block mb-1">Drop time</label>
              <input
                type="datetime-local"
                className="eb-input text-eb-caption"
                value={formDrop}
                onChange={(e) => setFormDrop(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              className="eb-check"
              checked={formTest}
              onChange={(e) => setFormTest(e.target.checked)}
            />
            <span className="text-eb-caption text-eb-muted">Test market</span>
          </label>
          <button
            onClick={createMarket}
            disabled={creating || !formName || !formDate || !formDrop}
            className="eb-btn"
          >
            {creating ? "CREATING\u2026" : "CREATE MARKET"}
          </button>
        </div>
      </div>

      {/* Active markets */}
      <div className="px-5 pt-4">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Markets ({active.length})
        </div>
        {active.length === 0 ? (
          <div className="eb-empty">
            <p>No active markets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((m) => {
              const st = marketStatus(m);
              const isEditing = editId === m.id;

              return (
                <div key={m.id} className="border-2 border-eb-border p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        className="eb-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <input
                        className="eb-input"
                        placeholder="Location"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="datetime-local"
                          className="eb-input text-eb-caption"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                        <input
                          type="datetime-local"
                          className="eb-input text-eb-caption"
                          value={editDrop}
                          onChange={(e) => setEditDrop(e.target.value)}
                        />
                      </div>
                      <select
                        className="eb-input text-eb-caption"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="closed">Closed</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={saving} className="eb-btn flex-1">
                          {saving ? "SAVING\u2026" : "SAVE"}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="flex-1 py-2 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-eb-body font-bold text-eb-black">
                              {m.name}
                            </span>
                            {m.is_test === 1 && (
                              <span className="text-eb-micro font-bold uppercase px-1 border border-eb-muted text-eb-muted">
                                TEST
                              </span>
                            )}
                          </div>
                          <div className="text-eb-meta text-eb-muted mt-0.5">
                            {formatDate(m.starts_at)}
                            {m.location && ` · ${m.location}`}
                          </div>
                        </div>
                        <span className={`text-eb-micro font-bold uppercase tracking-wider ${st.color}`}>
                          {st.label}
                        </span>
                      </div>

                      <div className="flex gap-4 mt-2 text-eb-micro text-eb-muted">
                        <span>{m.item_count} items</span>
                        <span>{m.dealer_count} dealers</span>
                        {m.drop_at && (
                          <span>Drop: {formatDate(m.drop_at)}</span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => startEdit(m)}
                          className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleArchive(m)}
                          className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => deleteMarket(m)}
                          className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-red"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived markets */}
      {archived.length > 0 && (
        <div className="px-5 pt-6">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3 flex items-center gap-1"
          >
            Archived ({archived.length}) {showArchived ? "\u25B4" : "\u25BE"}
          </button>
          {showArchived && (
            <div className="space-y-3 opacity-60">
              {archived.map((m) => (
                <div key={m.id} className="border-2 border-eb-border p-4">
                  <div className="text-eb-body font-bold text-eb-muted">
                    {m.name}
                  </div>
                  <div className="text-eb-meta text-eb-light mt-0.5">
                    {formatDate(m.starts_at)} · {m.item_count} items
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => toggleArchive(m)}
                      className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
                    >
                      Unarchive
                    </button>
                    <button
                      onClick={() => deleteMarket(m)}
                      className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-red"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════
   DEALERS TAB (stub — Session 2)
   ════════════════════════════════════════════════════ */

function DealersTab() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [approving, setApproving] = useState<string | null>(null);

  // Invite link
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const loadApps = useCallback(async (status: string) => {
    setLoading(true);
    const res = await apiFetch(`/api/admin/applications?status=${status}`);
    if (res.ok) setApps(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApps(appFilter);
  }, [appFilter, loadApps]);

  const approve = async (id: string) => {
    setApproving(id);
    const res = await apiFetch(`/api/admin/applications/${id}/approve`, { method: "POST" });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
    setApproving(null);
  };

  const generateInvite = async () => {
    setInviteGenerating(true);
    setInviteCopied(false);
    const res = await apiFetch("/api/admin/invite-link", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      setInviteUrl(url);
    }
    setInviteGenerating(false);
  };

  return (
    <>
      {/* Invite link generator */}
      <div className="px-5 py-4 border-b border-eb-border">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
          Invite a Dealer
        </div>
        <p className="text-eb-micro text-eb-muted leading-relaxed mb-3">
          Generate a one-time link. Send it however you want — text, email, DM.
        </p>
        {inviteUrl ? (
          <div>
            <div className="eb-input text-eb-micro break-all mb-2 select-all">
              {inviteUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                }}
                className="py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider"
              >
                {inviteCopied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={() => { setInviteUrl(null); generateInvite(); }}
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
      </div>

      {/* Application review */}
      <div className="text-eb-meta uppercase tracking-widest text-eb-muted px-5 pt-4 pb-2">
        Dealer Applications
      </div>
      <div className="flex border-b border-eb-border">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setAppFilter(s)}
            className={`flex-1 py-3 text-eb-micro font-bold uppercase tracking-wider text-center ${
              appFilter === s
                ? "text-eb-black border-b-2 border-eb-black"
                : "text-eb-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="eb-spinner" />
          </div>
        ) : apps.length === 0 ? (
          <div className="eb-empty">
            <p>No {appFilter} applications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <div key={app.id} className="border-2 border-eb-border p-4">
                <div className="text-eb-body font-bold text-eb-black">{app.name}</div>
                <div className="text-eb-meta text-eb-text mt-1">{app.business_name}</div>
                {app.instagram_handle && (
                  <div className="text-eb-meta text-eb-muted mt-0.5">@{app.instagram_handle}</div>
                )}
                <div className="text-eb-meta text-eb-muted mt-0.5">{formatPhone(app.phone)}</div>
                <div className="text-eb-micro text-eb-light mt-1">
                  Applied {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                {appFilter === "pending" && (
                  <button
                    onClick={() => approve(app.id)}
                    disabled={approving === app.id}
                    className="mt-3 py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider"
                  >
                    {approving === app.id ? "Approving\u2026" : "Approve & Send Login"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   ITEMS TAB (stub — Session 2)
   ════════════════════════════════════════════════════ */

function ItemsTab() {
  return (
    <div className="eb-empty">
      <div className="eb-icon">{"\u2727"}</div>
      <p>Items management coming in Session 2</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SMS TAB (stub — Session 3)
   ════════════════════════════════════════════════════ */

function SmsTab() {
  return (
    <div className="eb-empty">
      <div className="eb-icon">{"\u2709"}</div>
      <p>SMS blasts coming in Session 3</p>
    </div>
  );
}

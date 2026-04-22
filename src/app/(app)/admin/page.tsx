"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { formatPhone, formatDate, formatPrice, heroCountdown, timeAgo } from "@/lib/format";
import { Masthead } from "@/components/masthead";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { SHOWS } from "@/lib/shows";

/* ─── Types ─── */

type Tab = "dashboard" | "markets" | "dealers" | "items" | "blast" | "sms" | "health";

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

interface AdminItem {
  id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  market_id: string;
  dealer_name: string;
  dealer_display_name: string | null;
  dealer_id: string;
  user_id: string;
  market_name: string;
  photo_url: string | null;
  thumb_url: string | null;
  fav_count: number;
  inquiry_count: number;
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
      <Masthead right={null} />

      {/* Tab bar */}
      <div className="flex border-b-2 border-eb-black overflow-x-auto">
        {(["dashboard", "markets", "dealers", "items", "blast", "sms", "health"] as Tab[]).map((t) => (
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
        {activeTab === "blast" && <BlastTab />}
        {activeTab === "sms" && <SmsTab />}
        {activeTab === "health" && <HealthTab />}
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
      {/* Stats grid — arrow on each label tells the admin the tile is
          clickable (navigates to the corresponding tab). */}
      <div className="eb-stats border-b border-eb-border">
        <button
          onClick={() => setTab("dealers")}
          className="eb-stat active:bg-eb-border/30"
        >
          <div className="eb-stat-num">{data.dealer_count}</div>
          <div className="eb-stat-label">Dealers {"\u2192"}</div>
        </button>
        <button
          onClick={() => setTab("dealers")}
          className="eb-stat active:bg-eb-border/30"
        >
          <div className="eb-stat-num">{data.buyer_count}</div>
          <div className="eb-stat-label">Buyers {"\u2192"}</div>
        </button>
        <button
          onClick={() => setTab("items")}
          className="eb-stat active:bg-eb-border/30"
        >
          <div className="eb-stat-num">{data.items_this_week}</div>
          <div className="eb-stat-label">Items / wk {"\u2192"}</div>
        </button>
        <button
          onClick={() => setTab("items")}
          className="eb-stat active:bg-eb-border/30"
        >
          <div className="eb-stat-num">{data.sold_this_week}</div>
          <div className="eb-stat-label">Sold / wk {"\u2192"}</div>
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
                <div className="text-eb-micro text-eb-muted shrink-0 ml-3">
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

// Single-shot "copy the ad / social share URL" button for a market.
// Lives inline in the market row actions so the admin doesn't have to
// hunt for a different screen. Uses window.origin at click time so it
// works on both earlybird.la and any preview deploy.
function CopyShareLink({ marketId }: { marketId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/early/${marketId}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Fallback if clipboard API is denied — surface the URL so the
          // admin can copy it manually.
          window.prompt("Copy this link:", url);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-black text-eb-black bg-white"
    >
      {copied ? "\u2713 Copied" : "Copy Share Link"}
    </button>
  );
}

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

  const loadMarkets = async () => {
    const res = await apiFetch("/api/admin/markets");
    if (res.ok) setMarkets(await res.json());
  };

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/markets");
      if (res.ok) setMarkets(await res.json());
      setLoading(false);
    })();
  }, []);

  const [createError, setCreateError] = useState<string | null>(null);

  const createMarket = async () => {
    setCreateError(null);
    if (creating) return;
    if (!formName.trim()) {
      setCreateError("Market name is required");
      return;
    }
    if (!formDate) {
      setCreateError("Market date is required");
      return;
    }
    if (!formDrop) {
      setCreateError("Listings-open date is required");
      return;
    }
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
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateError(data.error || "Failed to create market");
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

  const [pendingDeleteMarket, setPendingDeleteMarket] = useState<Market | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);

  const confirmDeleteMarket = async () => {
    const m = pendingDeleteMarket;
    if (!m) return;
    setPendingDeleteMarket(null);
    const res = await apiFetch(`/api/admin/markets/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMarketError(data.error || "Failed to delete market");
      setTimeout(() => setMarketError(null), 4000);
    }
    loadMarkets();
  };

  const deleteMarket = (m: Market) => {
    setPendingDeleteMarket(m);
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
          {createError && (
            <p className="text-eb-meta text-eb-red" role="alert">
              {createError}
            </p>
          )}
          <button
            onClick={createMarket}
            disabled={creating}
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

                      <div className="flex gap-2 mt-3 flex-wrap">
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
                        <CopyShareLink marketId={m.id} />
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
                  <div className="text-eb-meta text-eb-muted mt-0.5">
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

      {marketError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-eb-red text-white px-4 py-2 text-eb-caption z-40 shadow-lg">
          {marketError}
        </div>
      )}

      <ConfirmDrawer
        open={!!pendingDeleteMarket}
        title={`Delete ${pendingDeleteMarket?.name ?? "market"}?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteMarket}
        onCancel={() => setPendingDeleteMarket(null)}
      />
    </>
  );
}

/* ════════════════════════════════════════════════════
   DEALERS TAB
   ════════════════════════════════════════════════════ */

interface AdminUser {
  id: string;
  phone: string;
  display_name: string | null;
  avatar_url: string | null;
  is_dealer: number;
  created_at: string;
  dealer_id: string | null;
  business_name: string | null;
  instagram_handle: string | null;
  item_count: number;
  market_subscriptions?: string[];
}

function DealersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"users" | "applications" | "invite">("users");

  // Create user form
  const [createPhone, setCreatePhone] = useState("");
  const [createName, setCreateName] = useState("");
  const [createBiz, setCreateBiz] = useState("");
  const [createRole, setCreateRole] = useState<"buyer" | "dealer">("dealer");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // User detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<(AdminUser & { items: AdminItem[]; actions: AdminAction[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Applications
  const [apps, setApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appFilter, setAppFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [approving, setApproving] = useState<string | null>(null);

  // Invite link
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [invitePhoneSent, setInvitePhoneSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await apiFetch(`/api/admin/dealers${params}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (section === "users") {
      void (async () => {
        setLoading(true);
        const params = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await apiFetch(`/api/admin/dealers${params}`);
        if (res.ok) setUsers(await res.json());
        setLoading(false);
      })();
    }
  }, [section, search]);

  useEffect(() => {
    if (section === "applications") {
      void (async () => {
        setAppsLoading(true);
        const res = await apiFetch(`/api/admin/applications?status=${appFilter}`);
        if (res.ok) setApps(await res.json());
        setAppsLoading(false);
      })();
    }
  }, [section, appFilter]);

  const createUser = async () => {
    if (!createPhone || creating) return;
    setCreating(true);
    setCreateMsg("");
    const res = await apiFetch("/api/admin/dealers", {
      method: "POST",
      body: JSON.stringify({
        phone: createPhone,
        display_name: createName || null,
        role: createRole,
        business_name: createBiz || null,
      }),
    });
    if (res.ok) {
      setCreatePhone("");
      setCreateName("");
      setCreateBiz("");
      setCreateMsg("Created!");
      loadUsers();
    } else {
      const data = await res.json();
      setCreateMsg(data.error || "Failed");
    }
    setCreating(false);
  };

  const expandUser = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setDetailLoading(true);
    setEditingName(false);
    const res = await apiFetch(`/api/admin/dealers/${id}`);
    if (res.ok) setDetailData(await res.json());
    setDetailLoading(false);
  };

  const saveUserName = async () => {
    if (!expandedId || savingEdit) return;
    setSavingEdit(true);
    await apiFetch(`/api/admin/dealers/${expandedId}`, {
      method: "PATCH",
      body: JSON.stringify({ display_name: editName }),
    });
    setSavingEdit(false);
    setEditingName(false);
    loadUsers();
    expandUser(expandedId);
  };

  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newDealer: number } | null>(null);

  const confirmRoleChange = async () => {
    const req = pendingRoleChange;
    if (!req) return;
    setPendingRoleChange(null);
    await apiFetch(`/api/admin/dealers/${req.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_dealer: req.newDealer }),
    });
    loadUsers();
    if (expandedId === req.userId) expandUser(req.userId);
  };

  const changeRole = (userId: string, newDealer: number) => {
    setPendingRoleChange({ userId, newDealer });
  };

  const approve = async (id: string) => {
    setApproving(id);
    const res = await apiFetch(`/api/admin/applications/${id}/approve`, { method: "POST" });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
    setApproving(null);
  };

  const generateInvite = async (phoneInput?: string) => {
    setInviteGenerating(true);
    setInviteCopied(false);
    setInviteError(null);
    const body: Record<string, unknown> = {};
    if (phoneInput) body.phone = phoneInput;
    const res = await apiFetch("/api/admin/invite-link", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { url } = await res.json();
      setInviteUrl(url);
      setInvitePhoneSent(!!phoneInput);
    } else {
      const data = await res.json().catch(() => ({}));
      setInviteError(data.error || "Couldn't create invite");
    }
    setInviteGenerating(false);
  };

  return (
    <>
      {/* Sub-nav */}
      <div className="flex border-b border-eb-border">
        {(["users", "applications", "invite"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 py-3 text-eb-micro font-bold uppercase tracking-wider text-center ${
              section === s ? "text-eb-black border-b-2 border-eb-black" : "text-eb-muted"
            }`}
          >
            {s === "users" ? "All Users" : s === "applications" ? "Applications" : "Invite"}
          </button>
        ))}
      </div>

      {section === "users" && (
        <>
          {/* Create user form */}
          <div className="px-5 py-4 border-b border-eb-border">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
              Create User
            </div>
            <div className="space-y-2">
              <input
                type="tel"
                inputMode="tel"
                className="eb-input"
                placeholder="Phone number"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
              />
              <input
                className="eb-input"
                placeholder="Name (optional)"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateRole("dealer")}
                  className={`flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider border-2 ${
                    createRole === "dealer" ? "border-eb-black text-eb-black" : "border-eb-border text-eb-muted"
                  }`}
                >
                  Dealer
                </button>
                <button
                  onClick={() => setCreateRole("buyer")}
                  className={`flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider border-2 ${
                    createRole === "buyer" ? "border-eb-black text-eb-black" : "border-eb-border text-eb-muted"
                  }`}
                >
                  Buyer
                </button>
              </div>
              {createRole === "dealer" && (
                <input
                  className="eb-input"
                  placeholder="Business name"
                  value={createBiz}
                  onChange={(e) => setCreateBiz(e.target.value)}
                />
              )}
              <button onClick={createUser} disabled={creating || !createPhone} className="eb-btn">
                {creating ? "CREATING\u2026" : "CREATE USER"}
              </button>
              {createMsg && (
                <div className={`text-eb-caption ${createMsg === "Created!" ? "text-eb-green" : "text-eb-red"}`}>
                  {createMsg}
                </div>
              )}
            </div>
          </div>

          {/* Search + list */}
          <div className="px-5 pt-4">
            <input
              className="eb-input mb-3"
              placeholder="Search by name, phone, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
            />
            <button onClick={loadUsers} className="text-eb-micro text-eb-pop font-bold mb-3 block">
              Search
            </button>
          </div>

          <div className="px-5 pb-4">
            {loading ? (
              <div className="flex justify-center py-8"><span className="eb-spinner" /></div>
            ) : users.length === 0 ? (
              <div className="eb-empty"><p>No users found</p></div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="border-2 border-eb-border">
                    <button onClick={() => expandUser(u.id)} className="w-full text-left p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-eb-caption font-bold text-eb-black">
                            {u.display_name || "No name"}
                          </span>
                          {u.business_name && (
                            <span className="text-eb-micro text-eb-muted ml-2">{u.business_name}</span>
                          )}
                        </div>
                        <span className={`text-eb-micro font-bold uppercase px-1.5 py-0.5 ${
                          u.is_dealer ? "text-eb-pop bg-eb-pop-light" : "text-eb-muted bg-eb-cream"
                        }`}>
                          {u.is_dealer ? "Dealer" : "Buyer"}
                        </span>
                      </div>
                      <div className="text-eb-micro text-eb-muted mt-1">
                        {formatPhone(u.phone)}
                        {u.is_dealer ? ` · ${Number(u.item_count)} items` : ""}
                      </div>
                    </button>

                    {expandedId === u.id && (
                      <div className="border-t border-eb-border p-3">
                        {detailLoading ? (
                          <div className="flex justify-center py-4"><span className="eb-spinner" /></div>
                        ) : detailData ? (
                          <>
                            {/* Quick actions */}
                            <div className="flex gap-2 mb-3">
                              {!editingName ? (
                                <button
                                  onClick={() => { setEditingName(true); setEditName(detailData.display_name || ""); }}
                                  className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
                                >
                                  Edit Name
                                </button>
                              ) : (
                                <div className="flex gap-1 flex-1">
                                  <input
                                    className="eb-input text-eb-caption flex-1"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                  />
                                  <button onClick={saveUserName} disabled={savingEdit} className="py-1.5 px-3 text-eb-micro font-bold bg-eb-black text-white uppercase">
                                    {savingEdit ? "\u2026" : "Save"}
                                  </button>
                                  <button onClick={() => setEditingName(false)} className="py-1.5 px-3 text-eb-micro font-bold border-2 border-eb-border text-eb-muted uppercase">
                                    X
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={() => changeRole(u.id, u.is_dealer ? 0 : 1)}
                                className="py-1.5 px-3 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
                              >
                                {u.is_dealer ? "\u2192 Buyer" : "\u2192 Dealer"}
                              </button>
                            </div>

                            {/* Info */}
                            <div className="space-y-1 text-eb-micro text-eb-muted mb-3">
                              <div>Phone: {formatPhone(detailData.phone)}</div>
                              {detailData.instagram_handle && <div>IG: @{detailData.instagram_handle}</div>}
                              <div>Joined: {formatDate(detailData.created_at)}</div>
                            </div>

                            {/* Subscriptions (dealers only) */}
                            {u.is_dealer === 1 && (
                              <div className="mb-3">
                                <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                                  Shows
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {SHOWS.map((show) => {
                                    const subs: string[] =
                                      detailData.market_subscriptions || [];
                                    const on = subs.includes(show);
                                    return (
                                      <button
                                        key={show}
                                        type="button"
                                        onClick={async () => {
                                          const next = on
                                            ? subs.filter((s) => s !== show)
                                            : [...subs, show];
                                          // Optimistic: patch detailData inline
                                          setDetailData({
                                            ...detailData,
                                            market_subscriptions: next,
                                          });
                                          await apiFetch(
                                            `/api/admin/dealers/${u.id}`,
                                            {
                                              method: "PATCH",
                                              body: JSON.stringify({
                                                market_subscriptions: next,
                                              }),
                                            }
                                          );
                                        }}
                                        className={`py-1.5 px-2 text-eb-micro font-bold uppercase tracking-wider text-left border-2 ${
                                          on
                                            ? "border-eb-black bg-eb-black text-white"
                                            : "border-eb-border text-eb-muted"
                                        }`}
                                      >
                                        {show}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Items */}
                            {detailData.items && detailData.items.length > 0 && (
                              <div>
                                <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                                  Items ({detailData.items.length})
                                </div>
                                {detailData.items.slice(0, 10).map((item: AdminItem) => (
                                  <div key={item.id} className="flex gap-2 py-1.5 border-t border-eb-border">
                                    {item.photo_url ? (
                                      <Image src={item.thumb_url || item.photo_url} alt="" width={56} height={56} sizes="32px" className="w-8 h-8 object-cover object-top shrink-0" />
                                    ) : (
                                      <div className="w-8 h-8 bg-eb-border shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-eb-micro font-bold text-eb-black truncate">
                                        {item.title || "Untitled"}
                                      </div>
                                      <div className="text-eb-micro text-eb-muted">
                                        {formatPrice(item.price)} · {item.status}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            {detailData.actions && detailData.actions.length > 0 && (
                              <div className="mt-3">
                                <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                                  Admin History
                                </div>
                                {detailData.actions.map((a: AdminAction) => (
                                  <div key={a.id} className="flex justify-between py-1 text-eb-micro text-eb-muted">
                                    <span>{actionLabel(a)}</span>
                                    <span className="text-eb-muted">{timeAgo(a.created_at)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {section === "applications" && (
        <>
          <div className="flex border-b border-eb-border">
            {(["pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setAppFilter(s)}
                className={`flex-1 py-3 text-eb-micro font-bold uppercase tracking-wider text-center ${
                  appFilter === s ? "text-eb-black border-b-2 border-eb-black" : "text-eb-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="px-5 py-4">
            {appsLoading ? (
              <div className="flex justify-center py-8"><span className="eb-spinner" /></div>
            ) : apps.length === 0 ? (
              <div className="eb-empty"><p>No {appFilter} applications</p></div>
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
                    <div className="text-eb-micro text-eb-muted mt-1">
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
      )}

      {section === "invite" && (
        <div className="px-5 py-4">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Invite a Dealer
          </div>
          <p className="text-eb-micro text-eb-muted leading-relaxed mb-3">
            Enter the dealer&apos;s phone number. They get an SMS with the
            invite link and land directly in their booth after entering
            their name and business. Leave phone blank to generate a
            bare link you share manually.
          </p>

          {inviteUrl ? (
            <div>
              <div className="text-eb-micro text-eb-green font-bold uppercase tracking-wider mb-2">
                {invitePhoneSent ? "\u2713 Invite text sent" : "\u2713 Link ready"}
              </div>
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
                  onClick={() => {
                    setInviteUrl(null);
                    setInvitePhone("");
                    setInvitePhoneSent(false);
                  }}
                  className="py-2 px-4 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
                >
                  New Invite
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="tel"
                inputMode="tel"
                className="eb-input"
                placeholder="(213) 555-0134"
                value={invitePhone}
                onChange={(e) =>
                  // Leave plenty of room for formatted pastes like
                  // "+1 (323) 508-1158" — 17 chars — plus any extra
                  // whitespace the contact card might include.
                  setInvitePhone(
                    e.target.value.replace(/[^\d()\-\s+.]/g, "").slice(0, 32)
                  )
                }
              />
              {inviteError && (
                <p className="text-eb-meta text-eb-red">{inviteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => generateInvite(invitePhone || undefined)}
                  disabled={inviteGenerating}
                  className="py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider"
                >
                  {inviteGenerating
                    ? "Sending\u2026"
                    : invitePhone
                      ? "Send Invite"
                      : "Generate Link Only"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDrawer
        open={!!pendingRoleChange}
        title={
          pendingRoleChange?.newDealer
            ? "Promote to dealer?"
            : "Demote to buyer?"
        }
        message={
          pendingRoleChange?.newDealer
            ? "They'll get access to /sell and be able to post items."
            : "They'll lose access to /sell and any items they posted will still exist but they can't manage them."
        }
        confirmLabel={pendingRoleChange?.newDealer ? "Promote" : "Demote"}
        destructive={!pendingRoleChange?.newDealer}
        onConfirm={confirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />
    </>
  );
}

/* ════════════════════════════════════════════════════
   ITEMS TAB
   ════════════════════════════════════════════════════ */

interface AdminItemDetail extends AdminItem {
  description: string | null;
  original_price: number | null;
  price_firm: number;
  dealer_phone: string;
  dealer_user_id: string;
  fav_count: number;
  photos: { id: string; url: string; position: number }[];
  inquiries: { id: string; buyer_name: string; buyer_phone: string; message: string; status: string; created_at: string }[];
  actions: AdminAction[];
}

function ItemsTab() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMarket, setFilterMarket] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminItemDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMarket) params.set("market_id", filterMarket);
    if (filterStatus) params.set("status", filterStatus);
    const res = await apiFetch(`/api/admin/items?${params}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMarket) params.set("market_id", filterMarket);
      if (filterStatus) params.set("status", filterStatus);
      const res = await apiFetch(`/api/admin/items?${params}`);
      if (res.ok) setItems(await res.json());
      setLoading(false);
    })();
  }, [filterMarket, filterStatus]);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/admin/markets");
      if (res.ok) setMarkets(await res.json());
    })();
  }, []);

  const expandItem = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    const res = await apiFetch(`/api/admin/items/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  };

  const quickStatus = async (id: string, status: string) => {
    await apiFetch(`/api/admin/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    loadItems();
  };

  const [pendingDeleteItem, setPendingDeleteItem] = useState<string | null>(null);

  const confirmDeleteItem = async () => {
    const id = pendingDeleteItem;
    if (!id) return;
    setPendingDeleteItem(null);
    await apiFetch(`/api/admin/items/${id}`, { method: "DELETE" });
    setExpandedId(null);
    loadItems();
  };

  const deleteItem = (id: string) => {
    setPendingDeleteItem(id);
  };

  return (
    <>
      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-eb-border flex gap-2">
        <select
          className="eb-input text-eb-caption flex-1"
          value={filterMarket}
          onChange={(e) => setFilterMarket(e.target.value)}
        >
          <option value="">All markets</option>
          {markets.filter((m) => !m.archived).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          className="eb-input text-eb-caption flex-1"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All status</option>
          <option value="live">Live</option>
          <option value="hold">Hold</option>
          <option value="sold">Sold</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="eb-spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="eb-empty">
            <p>No items match filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border-2 border-eb-border">
                <button
                  onClick={() => expandItem(item.id)}
                  className="w-full text-left p-3 flex gap-3"
                >
                  {item.photo_url ? (
                    <Image src={item.thumb_url || item.photo_url} alt="" width={112} height={112} sizes="56px" className="w-14 h-14 object-cover object-top shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-eb-border shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start">
                      <div className="text-eb-caption font-bold text-eb-black truncate">
                        {item.title || "Untitled"}
                      </div>
                      <span className={`text-eb-micro font-bold uppercase ml-2 shrink-0 ${
                        item.status === "live" ? "text-eb-green"
                          : item.status === "hold" ? "text-eb-pop"
                          : item.status === "sold" ? "text-eb-muted"
                          : "text-eb-red"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-eb-body font-bold text-eb-black">
                      {formatPrice(item.price)}
                    </div>
                    <div className="text-eb-micro text-eb-muted mt-0.5 truncate">
                      {item.dealer_display_name || item.dealer_name} · {item.market_name}
                    </div>
                  </div>
                </button>

                {/* Quick status buttons */}
                <div className="flex border-t border-eb-border">
                  {["live", "hold", "sold"].map((s) => (
                    <button
                      key={s}
                      onClick={() => quickStatus(item.id, s)}
                      disabled={item.status === s}
                      className={`flex-1 py-2 text-eb-micro font-bold uppercase tracking-wider ${
                        item.status === s ? "text-eb-black bg-eb-cream" : "text-eb-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Expanded detail */}
                {expandedId === item.id && (
                  <div className="border-t border-eb-border p-3">
                    {detailLoading ? (
                      <div className="flex justify-center py-4">
                        <span className="eb-spinner" />
                      </div>
                    ) : detail ? (
                      <>
                        {/* Photos */}
                        {detail.photos.length > 0 && (
                          <div className="flex gap-1 overflow-x-auto mb-3">
                            {detail.photos.map((p) => (
                              <Image key={p.id} src={p.url} alt="" width={160} height={160} sizes="80px" className="w-20 h-20 object-cover object-top shrink-0" />
                            ))}
                          </div>
                        )}

                        {detail.description && (
                          <p className="text-eb-caption text-eb-text mb-3">{detail.description}</p>
                        )}

                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="py-2 border border-eb-border">
                            <div className="text-eb-body font-bold">{Number(detail.fav_count)}</div>
                            <div className="text-eb-micro text-eb-muted">Favs</div>
                          </div>
                          <div className="py-2 border border-eb-border">
                            <div className="text-eb-body font-bold">{detail.inquiries.length}</div>
                            <div className="text-eb-micro text-eb-muted">Inquiries</div>
                          </div>
                          <div className="py-2 border border-eb-border">
                            <div className="text-eb-body font-bold">{detail.price_firm ? "Firm" : "OBO"}</div>
                            <div className="text-eb-micro text-eb-muted">Price</div>
                          </div>
                        </div>

                        {/* Dealer info */}
                        <div className="text-eb-micro text-eb-muted mb-1">
                          Dealer: {detail.dealer_display_name || detail.dealer_name} · {formatPhone(detail.dealer_phone)}
                        </div>

                        {/* Inquiries */}
                        {detail.inquiries.length > 0 && (
                          <div className="mt-3">
                            <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                              Inquiries
                            </div>
                            {detail.inquiries.map((inq) => (
                              <div key={inq.id} className="py-2 border-t border-eb-border">
                                <div className="flex justify-between">
                                  <span className="text-eb-caption font-bold text-eb-black">
                                    {inq.buyer_name || "Unknown"}
                                  </span>
                                  <span className={`text-eb-micro font-bold uppercase ${
                                    inq.status === "open" ? "text-eb-green"
                                      : inq.status === "held" ? "text-eb-pop"
                                      : "text-eb-muted"
                                  }`}>
                                    {inq.status}
                                  </span>
                                </div>
                                <div className="text-eb-micro text-eb-muted">
                                  {formatPhone(inq.buyer_phone)}
                                </div>
                                {inq.message && (
                                  <div className="text-eb-caption text-eb-text mt-1">
                                    {"\u201C"}{inq.message}{"\u201D"}
                                  </div>
                                )}
                                <div className="text-eb-micro text-eb-muted mt-0.5">
                                  {timeAgo(inq.created_at)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="mt-3 py-2 px-4 text-eb-micro font-bold uppercase tracking-wider border-2 border-eb-border text-eb-red"
                        >
                          Delete Item
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDrawer
        open={!!pendingDeleteItem}
        title="Soft-delete this item?"
        message="The item will be hidden from listings. You can restore it from the item detail page."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteItem}
        onCancel={() => setPendingDeleteItem(null)}
      />
    </>
  );
}

/* ════════════════════════════════════════════════════
   SMS TAB
   ════════════════════════════════════════════════════ */

interface SmsBlast {
  id: string;
  market_id: string | null;
  market_name: string | null;
  audience: string;
  message: string;
  sent_count: number;
  fail_count: number;
  total_count: number;
  errors: { phone: string; error: string }[] | null;
  created_at: string;
}

function SmsTab() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [blasts, setBlasts] = useState<SmsBlast[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose form
  const [market, setMarket] = useState("");
  const [audience, setAudience] = useState<"all" | "buyers" | "dealers">("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [audienceCounts, setAudienceCounts] = useState<Record<string, number>>({});
  const [smsError, setSmsError] = useState<string | null>(null);

  const loadCounts = useCallback(async (marketId: string) => {
    const audiences = ["all", "buyers", "dealers"] as const;
    const results = await Promise.all(
      audiences.map(async (a) => {
        const params = new URLSearchParams({ audience: a });
        if (marketId) params.set("market_id", marketId);
        const res = await apiFetch(`/api/admin/sms-blast-preview?${params}`);
        if (res.ok) {
          const data = await res.json();
          return [a, data.count] as const;
        }
        return [a, 0] as const;
      })
    );
    setAudienceCounts(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    (async () => {
      const [mRes, bRes] = await Promise.all([
        apiFetch("/api/admin/markets"),
        apiFetch("/api/admin/sms-blasts"),
      ]);
      if (mRes.ok) setMarkets(await mRes.json());
      if (bRes.ok) setBlasts(await bRes.json());
      setLoading(false);
      await loadCounts("");
    })();
  }, [loadCounts]);

  // Reload counts when market changes
  useEffect(() => {
    loadCounts(market);
  }, [market, loadCounts]);

  const sendBlast = async () => {
    if (sending) return;
    setSending(true);
    setSendResult(null);
    const res = await apiFetch("/api/admin/sms-blast", {
      method: "POST",
      body: JSON.stringify({
        audience,
        message,
        market_id: market || null,
      }),
    });
    if (res.ok) {
      const result = await res.json();
      setSendResult(result);
      setMessage("");
      setConfirming(false);
      setSmsError(null);
      const bRes = await apiFetch("/api/admin/sms-blasts");
      if (bRes.ok) setBlasts(await bRes.json());
      loadCounts(market);
    } else {
      const data = await res.json().catch(() => ({}));
      setSendResult(null);
      setSmsError(data.error || "Failed to send blast");
      setTimeout(() => setSmsError(null), 5000);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="eb-spinner" />
      </div>
    );
  }

  return (
    <>
      {/* Compose */}
      <div className="px-5 py-4 border-b border-eb-border">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Send SMS Blast
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-eb-micro text-eb-muted block mb-1">Market (optional)</label>
            <select
              className="eb-input text-eb-caption"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              <option value="">General (no market)</option>
              {markets.filter((m) => !m.archived).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-eb-micro text-eb-muted block mb-1">Audience</label>
            <div className="flex gap-2">
              {(["all", "buyers", "dealers"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider border-2 ${
                    audience === a ? "border-eb-black text-eb-black" : "border-eb-border text-eb-muted"
                  }`}
                >
                  {a}{audienceCounts[a] != null ? ` (${audienceCounts[a]})` : ""}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-eb-micro text-eb-muted block mb-1">
              Message ({message.length} chars)
            </label>
            <textarea
              className="eb-input min-h-[100px] resize-y"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Send */}
          <button
            onClick={() => setConfirming(true)}
            disabled={!message.trim() || sending}
            className="eb-btn"
          >
            Send
          </button>

          {/* Confirmation step */}
          {confirming && (
            <div className="py-3 px-4 border-2 border-eb-pop bg-eb-pop-light">
              <div className="text-eb-caption font-bold text-eb-pop mb-2">
                Send to {audienceCounts[audience] ?? 0} people?
              </div>
              <div className="text-eb-micro text-eb-text mb-3 break-words">
                {message.slice(0, 120)}{message.length > 120 ? "\u2026" : ""}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBlast}
                  disabled={sending}
                  className="flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider bg-eb-pop text-white"
                >
                  {sending ? "Sending\u2026" : "Confirm Send"}
                </button>
              </div>
            </div>
          )}

          {/* Send result */}
          {sendResult && (
            <div className={`text-eb-caption py-2 px-3 border ${
              sendResult.failed > 0 ? "border-eb-red text-eb-red bg-red-50" : "border-eb-green text-eb-green bg-green-50"
            }`}>
              Sent {sendResult.sent}/{sendResult.total}
              {sendResult.failed > 0 && ` (${sendResult.failed} failed)`}
            </div>
          )}
        </div>
      </div>

      {/* Blast history */}
      <div className="px-5 pt-4">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Blast History
        </div>
        {blasts.length === 0 ? (
          <div className="eb-empty">
            <p>No blasts sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blasts.map((b) => (
              <div key={b.id} className="border-2 border-eb-border p-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-center">
                    <span className="text-eb-micro font-bold uppercase px-1.5 py-0.5 bg-eb-cream text-eb-muted">
                      {b.audience}
                    </span>
                    {b.market_name && (
                      <span className="text-eb-micro text-eb-muted">{b.market_name}</span>
                    )}
                  </div>
                  <span className="text-eb-micro text-eb-muted">{timeAgo(b.created_at)}</span>
                </div>
                <div className="text-eb-caption text-eb-text mt-2 break-words">
                  {b.message.length > 120 ? b.message.slice(0, 120) + "\u2026" : b.message}
                </div>
                <div className={`text-eb-micro font-bold mt-2 ${
                  Number(b.fail_count) > 0 ? "text-eb-red" : "text-eb-green"
                }`}>
                  {b.sent_count}/{b.total_count} sent
                  {Number(b.fail_count) > 0 && ` · ${b.fail_count} failed`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {smsError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-eb-red text-white px-4 py-2 text-eb-caption z-40 shadow-lg">
          {smsError}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════
   HEALTH TAB
   ════════════════════════════════════════════════════ */
interface HealthData {
  now: string;
  status: {
    db: { ok: boolean; latency_ms: number };
    ops_cron: { created_at: string; message: string } | null;
    stuck_markets: Array<{ id: string; name: string; starts_at: string }>;
  };
  counts_24h: {
    sms_sent?: number;
    sms_failed?: number;
    sms_retried?: number;
    ops_alerts?: number;
    errors?: number;
  };
  business: {
    new_users_24h?: number;
    inquiries_24h?: number;
    items_24h?: number;
    total_users?: number;
    total_dealers?: number;
    live_items?: number;
    upcoming_markets?: number;
    live_markets?: number;
  };
  recent_events: Array<{
    id: string;
    event_type: string;
    severity: "info" | "warn" | "error";
    entity_type: string | null;
    entity_id: string | null;
    message: string | null;
    created_at: string;
  }>;
}

function HealthTab() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [filter, setFilter] = useState<"all" | "warn" | "error">("all");

  const load = useCallback(async () => {
    const res = await apiFetch("/api/admin/health");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const probeEverything = useCallback(async () => {
    setProbing(true);
    await apiFetch("/api/admin/probe", { method: "POST" });
    await load();
    setProbing(false);
  }, [load]);

  if (loading) {
    return (
      <div className="px-5 py-12 text-center">
        <span className="eb-spinner" />
      </div>
    );
  }
  if (!data) return null;

  const events =
    filter === "all"
      ? data.recent_events
      : data.recent_events.filter((e) => e.severity === filter);

  const dbAgo = formatRelative(data.now);
  const opsAgo = data.status.ops_cron
    ? formatRelative(data.status.ops_cron.created_at)
    : null;

  // Ops cron runs every 15 min, so give it a 30-min staleness budget.
  const opsStale =
    data.status.ops_cron
      ? Date.now() - new Date(data.status.ops_cron.created_at).getTime() >
        30 * 60 * 1000
      : true;

  return (
    <section className="px-5 py-6 space-y-8">
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-eb-title font-bold uppercase tracking-wider text-eb-black">
            System status
          </h2>
          <button
            onClick={probeEverything}
            disabled={probing}
            className="text-eb-micro uppercase tracking-wider font-bold text-eb-pop"
          >
            {probing ? "Probing\u2026" : "Probe everything"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatusCard label="Database" ok={data.status.db.ok} detail={`${data.status.db.latency_ms}ms · checked ${dbAgo}`} />
          <StatusCard label="Ops cron" ok={!opsStale && !!data.status.ops_cron} detail={data.status.ops_cron ? `last ran ${opsAgo}` : "no runs logged yet"} />
          <StatusCard label="Past markets" ok={data.status.stuck_markets.length === 0} detail={data.status.stuck_markets.length === 0 ? "none" : `${data.status.stuck_markets.length} need archiving`} />
        </div>
      </div>

      <div>
        <h2 className="text-eb-title font-bold uppercase tracking-wider text-eb-black mb-3">Last 24 hours</h2>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="SMS sent" value={data.counts_24h.sms_sent ?? 0} />
          <MetricCard label="SMS failed" value={data.counts_24h.sms_failed ?? 0} bad={(data.counts_24h.sms_failed ?? 0) > 0} />
          <MetricCard label="SMS retried" value={data.counts_24h.sms_retried ?? 0} />
          <MetricCard label="Ops alerts" value={data.counts_24h.ops_alerts ?? 0} bad={(data.counts_24h.ops_alerts ?? 0) > 0} />
          <MetricCard label="Errors logged" value={data.counts_24h.errors ?? 0} bad={(data.counts_24h.errors ?? 0) > 0} />
        </div>
      </div>

      <div>
        <h2 className="text-eb-title font-bold uppercase tracking-wider text-eb-black mb-3">Business</h2>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="New users 24h" value={data.business.new_users_24h ?? 0} />
          <MetricCard label="Inquiries 24h" value={data.business.inquiries_24h ?? 0} />
          <MetricCard label="Items 24h" value={data.business.items_24h ?? 0} />
          <MetricCard label="Total users" value={data.business.total_users ?? 0} />
          <MetricCard label="Dealers" value={data.business.total_dealers ?? 0} />
          <MetricCard label="Live items" value={data.business.live_items ?? 0} />
          <MetricCard label="Upcoming markets" value={data.business.upcoming_markets ?? 0} />
          <MetricCard label="Live markets" value={data.business.live_markets ?? 0} />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-eb-title font-bold uppercase tracking-wider text-eb-black">Recent events</h2>
          <div className="flex gap-2">
            {(["all", "warn", "error"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`text-eb-micro uppercase tracking-wider font-bold px-2 py-1 ${filter === f ? "bg-eb-black text-white" : "text-eb-muted"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="border border-eb-border divide-y divide-eb-border">
          {events.length === 0 && (
            <div className="px-3 py-6 text-eb-meta text-eb-muted text-center">No events match.</div>
          )}
          {events.map((e) => (
            <div key={e.id} className={`px-3 py-2 flex gap-3 items-start ${e.severity === "error" ? "bg-eb-red/5" : e.severity === "warn" ? "bg-eb-amber/10" : ""}`}>
              <span className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${e.severity === "error" ? "bg-eb-red" : e.severity === "warn" ? "bg-eb-amber" : "bg-eb-muted"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-eb-micro font-bold tracking-wider text-eb-black truncate">{e.event_type}</span>
                  <span className="text-eb-micro text-eb-muted shrink-0 tabular-nums">{formatRelative(e.created_at)}</span>
                </div>
                {e.message && <div className="text-eb-micro text-eb-text mt-0.5 leading-snug break-words">{e.message}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className={`border-2 px-3 py-2 ${ok ? "border-eb-green" : "border-eb-red"}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-eb-green" : "bg-eb-red"}`} />
        <span className="text-eb-micro uppercase tracking-widest font-bold text-eb-black">{label}</span>
      </div>
      <div className="text-eb-micro text-eb-muted mt-1 leading-snug">{detail}</div>
    </div>
  );
}

function MetricCard({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="border border-eb-border px-3 py-2">
      <div className={`text-eb-body font-bold tabular-nums ${bad ? "text-eb-red" : "text-eb-black"}`}>{value.toLocaleString()}</div>
      <div className="text-eb-micro uppercase tracking-wider text-eb-muted mt-0.5">{label}</div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return "in the future";
  const s = Math.round(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/* ════════════════════════════════════════════════════
   DEALER BLAST TAB — personalized-link SMS to dealers
   + unredeemed invites. Every link auto-signs the
   recipient into /sell (dealers) or the invite
   redemption flow (unredeemed invites).
   ════════════════════════════════════════════════════ */

interface BlastPreview {
  total: number;
  invites: number;
  dealers: number;
  sample: {
    kind: "dealer" | "invite";
    phone_masked: string;
    name: string;
  }[];
}

const DEFAULT_BLAST_TEMPLATE =
  "Early Bird — from Eli + Dave. Downtown Modernism is this Sunday 4/26. We're starting to send buyers to the app Thursday to pre-shop, it would be amazing if you could post at least 3 pieces today (one photo, a title and a price for each is all you need to do): {link}";

function BlastTab() {
  const [preview, setPreview] = useState<BlastPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(DEFAULT_BLAST_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    test: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingBlastConfirm, setPendingBlastConfirm] = useState<{ testOnly: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/api/admin/dealer-blast/preview");
    if (res.ok) setPreview(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (testOnly: boolean) => {
    setError(null);
    if (!message.includes("{link}")) {
      setError("Message must contain {link} — that's where each dealer's personalized sign-in link will be inserted.");
      return;
    }
    setPendingBlastConfirm({ testOnly });
  };

  const doSend = async (testOnly: boolean) => {
    setPendingBlastConfirm(null);
    setSending(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/admin/dealer-blast/send", {
        method: "POST",
        body: JSON.stringify({ message, test_only: testOnly }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Send failed");
      } else {
        const data = await res.json();
        setResult({
          sent: data.sent,
          failed: data.failed,
          total: data.total,
          test: testOnly,
        });
      }
    } finally {
      setSending(false);
    }
  };

  const renderedPreview = message.replace(
    /\{link\}/g,
    "https://earlybird.la/v/abc…?to=/sell"
  );

  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
          Dealer Blast
        </div>
        <p className="text-eb-micro text-eb-muted leading-relaxed">
          One-shot SMS to dealers + unredeemed invites. Each recipient gets a
          personalized link. Signed-up dealers tap it and land directly on
          their <span className="font-bold">/sell</span> page, signed in.
          Unredeemed invites go to the onboarding flow.
        </p>
      </div>

      {loading ? (
        <div className="text-eb-caption text-eb-muted">Loading recipients…</div>
      ) : preview ? (
        <>
          <div className="border border-eb-border p-3">
            <div className="text-eb-body font-bold">
              Will send to {preview.total} dealer{preview.total === 1 ? "" : "s"}
            </div>
            <div className="text-eb-micro text-eb-muted mt-1">
              {preview.dealers} signed-up dealer
              {preview.dealers === 1 ? "" : "s"} · {preview.invites} unredeemed
              invite{preview.invites === 1 ? "" : "s"} · deduped by phone
            </div>
          </div>

          <div>
            <label className="block text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
              Message (use <span className="font-bold">{"{link}"}</span> as placeholder)
            </label>
            <textarea
              className="eb-input w-full min-h-[120px] leading-relaxed"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
            <div className="text-eb-micro text-eb-muted mt-1">
              Characters: {message.length}
            </div>
          </div>

          <div>
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
              Preview (what a dealer will see)
            </div>
            <div className="border-2 border-eb-border bg-eb-bg-soft p-3 text-eb-caption whitespace-pre-wrap break-words">
              {renderedPreview}
            </div>
          </div>

          {error && (
            <div className="text-eb-caption text-eb-red border border-eb-red p-2">
              {error}
            </div>
          )}

          {result ? (
            <div className="border-2 border-eb-green p-3">
              <div className="text-eb-body font-bold text-eb-green">
                {result.test ? "Test sent" : "Blast sent"}
              </div>
              <div className="text-eb-micro text-eb-muted mt-1">
                {result.sent} delivered · {result.failed} failed · {result.total} total
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  void load();
                }}
                className="mt-2 py-1.5 px-3 text-eb-caption font-bold border-2 border-eb-border uppercase tracking-wider"
              >
                Send another
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => send(true)}
                disabled={sending || preview.total === 0}
                className="py-2 px-4 text-eb-caption font-bold border-2 border-eb-border text-eb-black uppercase tracking-wider disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send Test to Me"}
              </button>
              <button
                onClick={() => send(false)}
                disabled={sending || preview.total === 0}
                className="py-2 px-4 text-eb-caption font-bold bg-eb-black text-white uppercase tracking-wider disabled:opacity-50"
              >
                {sending
                  ? "Sending…"
                  : `Send to ${preview.total} Dealer${preview.total === 1 ? "" : "s"}`}
              </button>
            </div>
          )}

          {preview.sample.length > 0 && (
            <details className="text-eb-micro text-eb-muted">
              <summary className="cursor-pointer">First 3 recipients (sanity check)</summary>
              <ul className="mt-1 space-y-0.5 ml-4">
                {preview.sample.map((s, i) => (
                  <li key={i}>
                    {s.kind === "dealer" ? "Dealer" : "Invite"} · {s.phone_masked} · {s.name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <div className="text-eb-caption text-eb-red">
          Failed to load recipients. Refresh to retry.
        </div>
      )}

      <ConfirmDrawer
        open={!!pendingBlastConfirm}
        title={
          pendingBlastConfirm?.testOnly
            ? "Send test to your phone?"
            : `Send to ${preview?.total ?? 0} dealers?`
        }
        message={
          pendingBlastConfirm?.testOnly
            ? "You'll get the text. Nobody else does."
            : `This texts all ${preview?.total ?? 0} dealers + unredeemed invites. Can't be undone.`
        }
        confirmLabel={pendingBlastConfirm?.testOnly ? "Send test" : "Send blast"}
        destructive={!pendingBlastConfirm?.testOnly}
        onConfirm={() => doSend(!!pendingBlastConfirm?.testOnly)}
        onCancel={() => setPendingBlastConfirm(null)}
      />
    </div>
  );
}

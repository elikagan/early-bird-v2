"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
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
      <header className="eb-masthead">
        <Link href="/home">
          <h1>EARLY BIRD</h1>
        </Link>
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

  const changeRole = async (userId: string, newDealer: number) => {
    if (!confirm(`Change this user to ${newDealer ? "dealer" : "buyer"}?`)) return;
    await apiFetch(`/api/admin/dealers/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_dealer: newDealer, business_name: newDealer ? "New Dealer" : undefined }),
    });
    loadUsers();
    if (expandedId === userId) expandUser(userId);
  };

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
    if (res.ok) { const { url } = await res.json(); setInviteUrl(url); }
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

                            {/* Items */}
                            {detailData.items && detailData.items.length > 0 && (
                              <div>
                                <div className="text-eb-micro uppercase tracking-widest text-eb-muted mb-2">
                                  Items ({detailData.items.length})
                                </div>
                                {detailData.items.slice(0, 10).map((item: AdminItem) => (
                                  <div key={item.id} className="flex gap-2 py-1.5 border-t border-eb-border">
                                    {item.photo_url ? (
                                      <Image src={item.thumb_url || item.photo_url} alt="" width={56} height={56} sizes="32px" className="w-8 h-8 object-cover shrink-0" />
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
                                    <span className="text-eb-light">{timeAgo(a.created_at)}</span>
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
      )}

      {section === "invite" && (
        <div className="px-5 py-4">
          <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
            Invite a Dealer
          </div>
          <p className="text-eb-micro text-eb-muted leading-relaxed mb-3">
            Generate a one-time link. Send it however you want — text, email, DM.
          </p>
          {inviteUrl ? (
            <div>
              <div className="eb-input text-eb-micro break-all mb-2 select-all">{inviteUrl}</div>
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
      )}
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

  const deleteItem = async (id: string) => {
    if (!confirm("Soft-delete this item?")) return;
    await apiFetch(`/api/admin/items/${id}`, { method: "DELETE" });
    setExpandedId(null);
    loadItems();
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
                    <Image src={item.thumb_url || item.photo_url} alt="" width={112} height={112} sizes="56px" className="w-14 h-14 object-cover shrink-0" />
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
                              <Image key={p.id} src={p.url} alt="" width={160} height={160} sizes="80px" className="w-20 h-20 object-cover shrink-0" />
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
                                <div className="text-eb-micro text-eb-light mt-0.5">
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
  const [preview, setPreview] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const [mRes, bRes] = await Promise.all([
        apiFetch("/api/admin/markets"),
        apiFetch("/api/admin/sms-blasts"),
      ]);
      if (mRes.ok) setMarkets(await mRes.json());
      if (bRes.ok) setBlasts(await bRes.json());
      setLoading(false);
    })();
  }, []);

  const loadPreview = async () => {
    setPreviewing(true);
    const params = new URLSearchParams({ audience });
    if (market) params.set("market_id", market);
    const res = await apiFetch(`/api/admin/sms-blast-preview?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPreview(data.count);
    }
    setPreviewing(false);
  };

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
      setPreview(null);
      // Reload blast history
      const bRes = await apiFetch("/api/admin/sms-blasts");
      if (bRes.ok) setBlasts(await bRes.json());
    } else {
      const data = await res.json();
      setSendResult({ sent: 0, failed: 0, total: 0 });
      alert(data.error || "Failed to send");
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
              onChange={(e) => { setMarket(e.target.value); setPreview(null); }}
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
                  onClick={() => { setAudience(a); setPreview(null); }}
                  className={`flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider border-2 ${
                    audience === a ? "border-eb-black text-eb-black" : "border-eb-border text-eb-muted"
                  }`}
                >
                  {a}
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

          {/* Preview + Send */}
          <div className="flex gap-2">
            <button
              onClick={loadPreview}
              disabled={previewing}
              className="flex-1 py-2 text-eb-caption font-bold uppercase tracking-wider border-2 border-eb-border text-eb-muted"
            >
              {previewing ? "Counting\u2026" : "Preview"}
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={!message.trim() || sending}
              className="flex-1 eb-btn"
            >
              Send
            </button>
          </div>

          {preview !== null && (
            <div className="text-eb-caption text-eb-text py-2 px-3 bg-eb-cream border border-eb-border">
              Will send to <span className="font-bold">{preview}</span> recipient{preview !== 1 ? "s" : ""}
            </div>
          )}

          {/* Confirmation step */}
          {confirming && (
            <div className="py-3 px-4 border-2 border-eb-pop bg-eb-pop-light">
              <div className="text-eb-caption font-bold text-eb-pop mb-2">
                Send to {preview !== null ? preview : "?"} people?
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
                  <span className="text-eb-micro text-eb-light">{timeAgo(b.created_at)}</span>
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
    </>
  );
}

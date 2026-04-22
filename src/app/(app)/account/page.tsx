"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/require-auth";
import { apiFetch } from "@/lib/api-client";
import { processImage } from "@/lib/image-processing";
import { getInitials, formatPhone } from "@/lib/format";
import { BottomNav } from "@/components/bottom-nav";
import { DealerApplyDrawer } from "@/components/dealer-apply-drawer";
import { InstagramInput } from "@/components/instagram-input";
import { Masthead } from "@/components/masthead";
import { SHOWS, type ShowName, marketReminderKey } from "@/lib/shows";

interface UserProfile {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_dealer: number;
  dealer_id: string | null;
  business_name: string | null;
  instagram_handle: string | null;
  market_follows: Array<{ market_id: string; market_name: string }>;
  notification_preferences: Array<{ key: string; enabled: number }>;
  payment_methods?: Array<{ method: string; enabled: number }>;
  market_subscriptions?: string[];
  watching_count: number;
  inquiries_count: number;
  bought_count: number;
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "venmo", label: "Venmo" },
  { key: "zelle", label: "Zelle" },
  { key: "apple_pay", label: "Apple Pay / Card" },
];

export default function AccountPage() {
  useRequireAuth();
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [bizValue, setBizValue] = useState("");
  const [bizSaving, setBizSaving] = useState(false);
  const [igValue, setIgValue] = useState("");
  const [igSaving, setIgSaving] = useState(false);

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Dealer application
  const [appStatus, setAppStatus] = useState<"none" | "pending" | "approved" | "rejected" | null>(null);
  const [showApplyDrawer, setShowApplyDrawer] = useState(false);

  const isDealer = user?.is_dealer === 1;

  const loadProfile = useCallback(async () => {
    const [profileRes, appRes] = await Promise.all([
      apiFetch("/api/users/me"),
      apiFetch("/api/dealer-applications"),
    ]);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setProfile(data);
      setNameValue(data.display_name || "");
      setBizValue(data.business_name || "");
      setIgValue(data.instagram_handle || "");
    }
    if (appRes.ok) {
      const { application } = await appRes.json();
      setAppStatus(application ? application.status : "none");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Save helpers ──

  const saveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Name can't be blank");
      return;
    }
    if (trimmed.length > 30) {
      setNameError("Max 30 characters");
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      setProfile((p) => (p ? { ...p, display_name: trimmed } : p));
      setEditingName(false);
      refreshUser();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setNameSaving(false);
    }
  }, [nameValue, refreshUser]);

  const saveField = useCallback(
    async (field: "business_name" | "instagram_handle", value: string) => {
      const setter = field === "business_name" ? setBizSaving : setIgSaving;
      setter(true);
      try {
        const res = await apiFetch("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          setProfile((p) => (p ? { ...p, [field]: value || null } : p));
        }
      } finally {
        setter(false);
      }
    },
    []
  );

  const togglePayment = useCallback(
    async (method: string) => {
      if (!profile) return;
      const current = profile.payment_methods?.find((m) => m.method === method);
      const currentEnabled = current ? current.enabled === 1 : false;
      const newEnabled = !currentEnabled;

      // Prevent unchecking all
      if (
        !newEnabled &&
        profile.payment_methods?.filter((m) => m.enabled === 1).length === 1 &&
        currentEnabled
      ) {
        return; // Can't uncheck the last one
      }

      // Optimistic update
      setProfile((p) => {
        if (!p) return p;
        const methods = (p.payment_methods || []).map((m) =>
          m.method === method ? { ...m, enabled: newEnabled ? 1 : 0 } : m
        );
        // If method wasn't in the list yet, add it
        if (!methods.find((m) => m.method === method)) {
          methods.push({ method, enabled: newEnabled ? 1 : 0 });
        }
        return { ...p, payment_methods: methods };
      });

      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          payment_methods: [{ method, enabled: newEnabled }],
        }),
      });

      // Revert on failure
      if (!res.ok) {
        setProfile((p) => {
          if (!p) return p;
          const methods = (p.payment_methods || []).map((m) =>
            m.method === method
              ? { ...m, enabled: currentEnabled ? 1 : 0 }
              : m
          );
          return { ...p, payment_methods: methods };
        });
      }
    },
    [profile]
  );

  const toggleShow = useCallback(
    async (show: ShowName) => {
      if (!profile) return;
      const current = profile.market_subscriptions || [];
      const isOn = current.includes(show);
      const next = isOn ? current.filter((s) => s !== show) : [...current, show];

      // Prevent unchecking all — must leave at least one.
      if (next.length === 0) return;

      // Optimistic update
      setProfile((p) => (p ? { ...p, market_subscriptions: next } : p));

      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ market_subscriptions: next }),
      });

      // Revert on failure
      if (!res.ok) {
        setProfile((p) => (p ? { ...p, market_subscriptions: current } : p));
      }
    },
    [profile]
  );

  const toggleNotif = useCallback(
    async (key: string) => {
      if (!profile) return;
      const current = profile.notification_preferences?.find(
        (n) => n.key === key
      );
      const currentEnabled = current ? current.enabled === 1 : false;
      const newEnabled = !currentEnabled;

      // Optimistic update
      setProfile((p) => {
        if (!p) return p;
        const prefs = (p.notification_preferences || []).map((n) =>
          n.key === key ? { ...n, enabled: newEnabled ? 1 : 0 } : n
        );
        if (!prefs.find((n) => n.key === key)) {
          prefs.push({ key, enabled: newEnabled ? 1 : 0 });
        }
        return { ...p, notification_preferences: prefs };
      });

      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          notification_preferences: [{ key, enabled: newEnabled }],
        }),
      });

      // Revert on failure
      if (!res.ok) {
        setProfile((p) => {
          if (!p) return p;
          const prefs = (p.notification_preferences || []).map((n) =>
            n.key === key
              ? { ...n, enabled: currentEnabled ? 1 : 0 }
              : n
          );
          return { ...p, notification_preferences: prefs };
        });
      }
    },
    [profile]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
        return;
      }
      setAvatarUploading(true);
      try {
        const processed = await processImage(file);
        const formData = new FormData();
        formData.append("file", processed.blob, "avatar.jpg");
        const uploadRes = await apiFetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();

        const patchRes = await apiFetch("/api/users/me", {
          method: "PATCH",
          body: JSON.stringify({ avatar_url: url }),
        });
        if (!patchRes.ok) throw new Error("Save failed");
        setProfile((p) => (p ? { ...p, avatar_url: url } : p));
        refreshUser();
      } catch {
        // Silent fail — avatar stays as initials
      } finally {
        setAvatarUploading(false);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    },
    [refreshUser]
  );

  const sendPhoneChange = useCallback(async () => {
    const digits = phoneValue.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneError("Enter a valid phone number");
      return;
    }
    setPhoneSending(true);
    setPhoneError(null);
    try {
      const res = await apiFetch("/api/auth/change-phone", {
        method: "POST",
        body: JSON.stringify({ phone: phoneValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send verification");
      }
      setPhoneSent(true);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPhoneSending(false);
    }
  }, [phoneValue]);

  // ── Derived ──

  const getPref = (key: string): boolean => {
    const p = profile?.notification_preferences?.find((n) => n.key === key);
    return p ? p.enabled === 1 : true; // default ON — matches backend shouldNotify()
  };

  const getPayment = (method: string): boolean => {
    const p = profile?.payment_methods?.find((m) => m.method === method);
    return p ? p.enabled === 1 : false;
  };

  if (loading || !profile) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <span className="eb-spinner" />
        </div>
        <BottomNav active="account" />
      </>
    );
  }

  const displayName =
    profile.display_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "User";

  // Active notification types — kept tight to features we actually
  // ship SMS for. Dealers get the new-inquiry text; buyers get the
  // price-drop text. Anything else was historical (drop_alerts,
  // drop_reminders, watcher_milestones, new_markets) and the cron
  // or feature behind it has been retired.
  const DEALER_NOTIFS = [
    {
      key: "new_inquiries",
      title: "New Inquiries",
      desc: "Text me when a buyer sends an inquiry",
    },
  ];

  const BUYER_NOTIFS = [
    {
      key: "price_drops",
      title: "Price Drops",
      desc: "Text me when watched items drop in price",
    },
  ];

  const notifItems = isDealer ? DEALER_NOTIFS : BUYER_NOTIFS;

  // Market-reminder opt-in: one notification_preferences row per show
  // (key = market_reminder_<slug>). Explicit-opt-in default so we
  // don't text someone unless they ticked the box here or elsewhere.
  const getMarketReminderPref = (show: ShowName): boolean => {
    const key = marketReminderKey(show);
    const p = profile?.notification_preferences?.find((n) => n.key === key);
    return p?.enabled === 1;
  };
  const toggleMarketReminder = useCallback(
    async (show: ShowName) => {
      const key = marketReminderKey(show);
      const current = getMarketReminderPref(show);
      const next = !current;

      // Optimistic update
      setProfile((p) => {
        if (!p) return p;
        const prefs = (p.notification_preferences || []).map((n) =>
          n.key === key ? { ...n, enabled: next ? 1 : 0 } : n
        );
        if (!prefs.find((n) => n.key === key)) {
          prefs.push({ key, enabled: next ? 1 : 0 });
        }
        return { ...p, notification_preferences: prefs };
      });

      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          notification_preferences: [{ key, enabled: next }],
        }),
      });

      if (!res.ok) {
        setProfile((p) => {
          if (!p) return p;
          const prefs = (p.notification_preferences || []).map((n) =>
            n.key === key ? { ...n, enabled: current ? 1 : 0 } : n
          );
          return { ...p, notification_preferences: prefs };
        });
      }
    },
    // profile dependency wraps the getPref closure — intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile]
  );

  return (
    <>
      <Masthead right={null} />

      {/* Hidden avatar file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadAvatar(file);
        }}
      />

      {/* Profile */}
      <section className="px-5 pt-6 pb-4">
        {!editingName ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative shrink-0"
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={96}
                  height={96}
                  sizes="48px"
                  className="eb-avatar eb-avatar-xl object-cover"
                />
              ) : (
                <span className="eb-avatar eb-avatar-xl">
                  {getInitials(displayName)}
                </span>
              )}
              {avatarUploading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-eb-black/40 rounded-full">
                  <span className="eb-spinner-sm" />
                </span>
              ) : (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-eb-black text-white rounded-full flex items-center justify-center text-eb-micro font-bold leading-none border-2 border-white/60">
                  +
                </span>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-eb-body font-bold text-eb-black">
                {displayName}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-eb-meta text-eb-muted">
                  {formatPhone(profile.phone)}
                </span>
                {!editingPhone && (
                  <button
                    onClick={() => {
                      setPhoneValue("");
                      setPhoneError(null);
                      setPhoneSent(false);
                      setEditingPhone(true);
                    }}
                    className="text-eb-micro text-eb-muted underline"
                  >
                    change
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setNameValue(profile.display_name || "");
                setEditingName(true);
                setNameError(null);
              }}
              className="text-eb-micro text-eb-muted underline"
            >
              edit
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={nameValue || "?"}
                  width={96}
                  height={96}
                  sizes="48px"
                  className="eb-avatar eb-avatar-xl object-cover shrink-0"
                />
              ) : (
                <span className="eb-avatar eb-avatar-xl shrink-0">
                  {getInitials(nameValue || "?")}
                </span>
              )}
              <input
                type="text"
                className="eb-input flex-1"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value.slice(0, 30))}
                autoFocus
                placeholder="Your name"
              />
            </div>
            {nameError && (
              <p className="text-eb-meta text-eb-red mb-2">{nameError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={saveName}
                disabled={nameSaving}
                className="eb-btn flex-1"
              >
                {nameSaving ? "Saving\u2026" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNameError(null);
                }}
                className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
            <div className="text-eb-meta text-eb-muted mt-2">
              {formatPhone(profile.phone)}
            </div>
          </div>
        )}
      </section>

      {/* Phone change form */}
      {editingPhone && (
        <section className="px-5 pb-4">
          {!phoneSent ? (
            <div className="border-2 border-eb-border p-4">
              <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-2">
                Change Phone Number
              </div>
              <p className="text-eb-micro text-eb-muted mb-3 leading-relaxed">
                We&apos;ll text a verification link to your new number.
              </p>
              <input
                type="tel"
                inputMode="tel"
                className="eb-input mb-2"
                value={phoneValue}
                onChange={(e) =>
                  setPhoneValue(e.target.value.replace(/[^\d()\-\s+.]/g, "").slice(0, 32))
                }
                placeholder="(555) 123-4567"
                autoFocus
              />
              {phoneError && (
                <p className="text-eb-meta text-eb-red mb-2">{phoneError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={sendPhoneChange}
                  disabled={phoneSending || phoneValue.replace(/\D/g, "").length < 10}
                  className="eb-btn flex-1"
                >
                  {phoneSending ? "Sending\u2026" : "Send Verification"}
                </button>
                <button
                  onClick={() => {
                    setEditingPhone(false);
                    setPhoneError(null);
                  }}
                  className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-eb-black p-4">
              <div className="text-eb-body font-bold text-eb-black mb-1">
                Check your new phone
              </div>
              <p className="text-eb-meta text-eb-muted leading-relaxed mb-3">
                We sent a verification link to {phoneValue}. Tap it to confirm
                the change.
              </p>
              <button
                onClick={() => {
                  setEditingPhone(false);
                  setPhoneSent(false);
                }}
                className="text-eb-meta text-eb-pop font-bold"
              >
                Done
              </button>
            </div>
          )}
        </section>
      )}

      {/* Dealer: Business name + Instagram */}
      {isDealer && (
        <>
          <section className="px-5 pb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Business Name
              </span>
              {bizSaving && <span className="eb-spinner-sm" />}
            </div>
            <input
              type="text"
              className="eb-input"
              value={bizValue}
              onChange={(e) => setBizValue(e.target.value.slice(0, 50))}
              onBlur={() => {
                if (bizValue.trim() !== (profile.business_name || "")) {
                  saveField("business_name", bizValue.trim());
                }
              }}
              placeholder="Your business name"
            />
          </section>
          <section className="px-5 pb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
                Instagram
              </span>
              <div className="flex items-center gap-2">
                {igSaving && <span className="eb-spinner-sm" />}
                <span className="text-eb-meta text-eb-muted">Optional</span>
              </div>
            </div>
            <InstagramInput
              value={igValue}
              onChange={setIgValue}
              onBlur={() => {
                if (igValue !== (profile.instagram_handle || "")) {
                  saveField("instagram_handle", igValue);
                }
              }}
            />
          </section>
        </>
      )}

      {/* Buyer: Stats */}
      {!isDealer && (
        <div className="eb-stats border-y border-eb-border">
          <div className="eb-stat">
            <div className="eb-stat-num">{profile.watching_count}</div>
            <div className="eb-stat-label">Watching</div>
          </div>
          <div className="eb-stat">
            <div className="eb-stat-num">{profile.inquiries_count}</div>
            <div className="eb-stat-label">Inquiries</div>
          </div>
          <div className="eb-stat">
            <div className="eb-stat-num">{profile.bought_count}</div>
            <div className="eb-stat-label">Bought</div>
          </div>
        </div>
      )}

      <div className="border-t border-eb-border mx-5" />

      {/* Dealer: Shows you sell at */}
      {isDealer && (
        <>
          <section className="px-5 py-5">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
              Shows You Sell At
            </div>
            <div className="text-eb-micro text-eb-muted mb-3 leading-relaxed max-w-[22rem]">
              We{"\u2019"}ll only text you about shows you{"\u2019"}re subscribed to.
            </div>
            {SHOWS.map((show, i) => {
              const on = profile?.market_subscriptions?.includes(show) ?? false;
              return (
                <label
                  key={show}
                  className={`flex items-center gap-3 py-3 cursor-pointer${i < SHOWS.length - 1 ? " border-b border-eb-border" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleShow(show)}
                    className="eb-check"
                  />
                  <div className="text-eb-body font-bold text-eb-black">
                    {show}
                  </div>
                </label>
              );
            })}
          </section>
          <div className="border-t border-eb-border mx-5" />
        </>
      )}

      {/* Dealer: Payment methods */}
      {isDealer && (
        <>
          <section className="px-5 py-5">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
              Payment Methods
            </div>
            <div className="text-eb-micro text-eb-muted mb-3 leading-relaxed max-w-[22rem]">
              Buyers see which methods you accept. Payment happens in person at
              the booth.
            </div>
            {PAYMENT_METHODS.map((pm, i) => (
              <label
                key={pm.key}
                className={`flex items-center gap-3 py-3 cursor-pointer${i < PAYMENT_METHODS.length - 1 ? " border-b border-eb-border" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={getPayment(pm.key)}
                  onChange={() => togglePayment(pm.key)}
                  className="eb-check"
                />
                <div className="text-eb-body font-bold text-eb-black">
                  {pm.label}
                </div>
              </label>
            ))}
          </section>
          <div className="border-t border-eb-border mx-5" />
        </>
      )}

      {/* Notifications */}
      <section className="px-5 py-5">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          Notifications
        </div>
        {notifItems.map((n, i, arr) => (
          <label
            key={n.key}
            className={`flex items-center justify-between py-3 gap-4 cursor-pointer${i < arr.length - 1 ? " border-b border-eb-border" : ""}`}
          >
            <div className="flex-1">
              <div className="text-eb-body font-bold text-eb-black">
                {n.title}
              </div>
              <div className="text-eb-meta text-eb-muted leading-tight mt-0.5">
                {n.desc}
              </div>
            </div>
            <input
              type="checkbox"
              checked={getPref(n.key)}
              onChange={() => toggleNotif(n.key)}
              className="eb-toggle"
            />
          </label>
        ))}
      </section>

      <div className="border-t border-eb-border mx-5" />

      {/* Market reminders — per-show opt-in for the pre-show SMS.
          Dealers selling at a show are auto-subscribed via their
          market subscriptions; this section is the explicit opt-in
          path everyone else gets. */}
      <section className="px-5 py-5">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-1">
          Market Reminders
        </div>
        <div className="text-eb-micro text-eb-muted mb-3 leading-relaxed max-w-[22rem]">
          Text me before each show to see what top dealers are bringing.
        </div>
        {SHOWS.map((show, i) => {
          const on = getMarketReminderPref(show);
          return (
            <label
              key={show}
              className={`flex items-center gap-3 py-3 cursor-pointer${i < SHOWS.length - 1 ? " border-b border-eb-border" : ""}`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggleMarketReminder(show)}
                className="eb-check"
              />
              <div className="text-eb-body font-bold text-eb-black">
                {show}
              </div>
            </label>
          );
        })}
      </section>

      <div className="border-t border-eb-border mx-5" />

      {/* Buyer: Become a seller */}
      {!isDealer && (
        <>
          <section className="px-5 py-5">
            <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
              Become A Seller
            </div>
            {appStatus === "pending" ? (
              <div className="bg-eb-cream border-l-2 border-eb-pop px-4 py-3">
                <div className="text-eb-caption font-bold text-eb-black uppercase tracking-wider">
                  Application under review
                </div>
                <p className="text-eb-meta text-eb-muted mt-0.5">
                  We{"\u2019"}re reviewing your application. We{"\u2019"}ll
                  text you when you{"\u2019"}re approved.
                </p>
              </div>
            ) : appStatus === "approved" ? (
              <div className="bg-eb-cream border-l-2 border-eb-green px-4 py-3">
                <div className="text-eb-caption font-bold text-eb-black uppercase tracking-wider">
                  Approved
                </div>
                <p className="text-eb-meta text-eb-muted mt-0.5">
                  You{"\u2019"}re approved! Sign out and back in to access
                  your dealer dashboard.
                </p>
              </div>
            ) : (
              <>
                <div className="text-eb-body text-eb-text leading-relaxed mb-3">
                  Selling at an upcoming LA market? List your items here for
                  free.
                </div>
                <button
                  onClick={() => setShowApplyDrawer(true)}
                  className="text-eb-caption font-bold bg-eb-black text-white px-4 py-2 tracking-wider uppercase"
                >
                  Apply to Sell
                </button>
              </>
            )}
          </section>
          <div className="border-t border-eb-border mx-5" />

          <DealerApplyDrawer
            open={showApplyDrawer}
            onClose={() => setShowApplyDrawer(false)}
            onSubmitted={() => {
              setShowApplyDrawer(false);
              setAppStatus("pending");
            }}
          />
        </>
      )}

      {/* More */}
      <section className="px-5 py-5 pb-8">
        <div className="text-eb-meta uppercase tracking-widest text-eb-muted mb-3">
          More
        </div>

        <Link
          href="/privacy"
          className="flex items-center justify-between py-3 border-b border-eb-border"
        >
          <div className="text-eb-body font-bold text-eb-black">
            Privacy Policy
          </div>
          <div className="text-eb-body text-eb-light">&rsaquo;</div>
        </Link>
        <Link
          href="/terms"
          className="flex items-center justify-between py-3 border-b border-eb-border"
        >
          <div className="text-eb-body font-bold text-eb-black">Terms</div>
          <div className="text-eb-body text-eb-light">&rsaquo;</div>
        </Link>

        {/* Sign Out with confirmation */}
        {!showSignOutConfirm ? (
          <button
            className="w-full mt-6 py-2.5 text-eb-caption font-bold border-2 border-eb-black text-eb-black uppercase tracking-wider"
            onClick={() => setShowSignOutConfirm(true)}
          >
            Sign Out
          </button>
        ) : (
          <div className="mt-6 border-2 border-eb-black p-4">
            <p className="text-eb-body font-bold text-eb-black mb-3">
              Sign out of Early Bird?
            </p>
            <div className="flex gap-2">
              <button
                onClick={logout}
                className="flex-1 py-2.5 text-eb-caption font-bold bg-eb-black text-eb-white uppercase tracking-wider"
              >
                Yes, Sign Out
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 text-eb-caption font-bold border-2 border-eb-border text-eb-muted uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="text-eb-meta text-eb-muted text-center mt-4">
          Early Bird v1.0 · LA{isDealer ? " · Dealer Account" : ""}
        </div>
      </section>

      <div className="h-16" />
      <BottomNav active="account" />
    </>
  );
}

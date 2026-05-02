"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { processImage } from "@/lib/image-processing";
import { formatPhone, getInitials } from "@/lib/format";
import { InstagramInput } from "@/components/instagram-input";
import { Masthead } from "@/components/masthead";
// (SHOWS, marketReminderKey: retired along with per-market reminder UI.)

interface Market {
  id: string;
  name: string;
  starts_at: string;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  // (followedMarkets retired with the per-market follow UI.)
  // Notification preferences captured during onboarding. `price_drops`
  // is default-on (watched-item alert — non-marketing, high value).
  // Market-reminder opt-ins are per-show (keys like
  // `market_reminder_rose_bowl`) and default-off — explicit consent.
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    price_drops: true,
  });
  const [saving, setSaving] = useState(false);
  const [isDealerSignup, setIsDealerSignup] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [dealerError, setDealerError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Detect dealer signup from query param (set by verify page from SMS link)
  useEffect(() => {
    if (searchParams.get("dealer") === "1") {
      setIsDealerSignup(true);
    }
  }, [searchParams]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const stored = localStorage.getItem("eb_token");
      if (!stored) {
        router.replace("/");
      }
    }
  }, [authLoading, user, router]);

  // Fetch available markets
  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/markets");
      if (res.ok) {
        const data = await res.json();
        setMarkets(data);
        // No default selections. Explicit opt-in only — we don't
        // auto-subscribe users to shows they didn't ask for.
      }
    }
    load();
  }, []);

  // (toggleMarket retired with the per-market follow UI.)

  const toggleNotif = (key: string) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const uploadAvatar = async (file: File) => {
    if (
      !file.type.startsWith("image/") &&
      !file.name.toLowerCase().endsWith(".heic")
    ) {
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
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: url }),
      });
      setAvatarUrl(url);
    } catch {
      // Silent fail — avatar stays as initials
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleContinue = async () => {
    if (!displayName || saving) return;
    if (isDealerSignup && (!businessName.trim() || !instagram.trim())) return;
    if (isDealerSignup && !agreedToTerms) return;
    setSaving(true);
    setDealerError(null);

    await apiFetch("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        display_name: displayName,
        // (market_follows + drop_alerts_enabled retired with the
        //  drop concept; buyer follow-markets table is gone.)
        notification_preferences: Object.entries(notifPrefs).map(
          ([key, enabled]) => ({ key, enabled })
        ),
      }),
    });

    // Submit dealer application if this is a dealer signup
    if (isDealerSignup) {
      const appRes = await apiFetch("/api/dealer-applications", {
        method: "POST",
        body: JSON.stringify({
          name: displayName.trim(),
          business_name: businessName.trim(),
          instagram_handle: instagram.trim(),
        }),
      });
      if (!appRes.ok) {
        const data = await appRes.json().catch(() => ({}));
        setDealerError(data.error || "Failed to submit application");
        setSaving(false);
        return;
      }
    }

    await refreshUser();
    setSaving(false);

    if (isDealerSignup) {
      setSubmitted(true);
    } else {
      router.replace("/home");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-eb-body text-eb-muted">Loading…</span>
      </div>
    );
  }

  // ── Dealer confirmation screen ──
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Masthead href={null} right={null} />

        <section className="px-5 pt-12 pb-6 flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-eb-hero text-eb-pop mb-4">{"\u2713"}</div>
          <h2 className="text-eb-display text-eb-black mb-2">
            Application submitted.
          </h2>
          <p className="text-eb-body text-eb-muted leading-relaxed max-w-xs">
            We{"\u2019"}re reviewing your Instagram and will text you at{" "}
            {formatPhone(user.phone)} when you{"\u2019"}re approved.
          </p>
          <p className="text-eb-caption text-eb-muted mt-4 leading-relaxed max-w-xs">
            In the meantime, you can browse items and save things to your
            watchlist as a buyer.
          </p>
        </section>

        <footer className="px-5 py-6 border-t-2 border-eb-black">
          <button
            className="eb-cta"
            onClick={() => router.replace("/home")}
          >
            START BROWSING
          </button>
        </footer>
      </div>
    );
  }

  // ── Step numbering ──
  let step = 0;
  const nextStep = () => {
    step += 1;
    return String(step).padStart(2, "0");
  };

  return (
    <div className="min-h-screen flex flex-col">
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

      <Masthead href={null} right={null} />

      {/* Intro */}
      <section className="px-5 pt-8 pb-4">
        <h2 className="text-eb-display text-eb-black">
          {isDealerSignup ? "Apply to sell." : "Get set up."}
        </h2>
        <p className="mt-2 text-eb-body text-eb-muted">
          {isDealerSignup
            ? "Fill this out and we\u2019ll review your application."
            : "Takes 30 seconds. Then you can start shopping."}
        </p>
      </section>

      {/* Your name */}
      <section className="px-5 py-5 border-t-2 border-eb-black">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-eb-body font-bold text-eb-pop">
            {nextStep()}
          </span>
          <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Your name
          </span>
        </div>
        <input
          type="text"
          placeholder="John C."
          className="eb-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-eb-meta text-eb-muted mt-1.5">
          {isDealerSignup
            ? "This is what buyers see on your listings."
            : "This is what dealers see when you message them."}
        </p>
      </section>

      {/* Phone (readonly) */}
      <section className="px-5 py-5 border-t border-eb-border">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-eb-body font-bold text-eb-pop">
            {nextStep()}
          </span>
          <div className="flex-1 flex justify-between items-center">
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Phone
            </span>
            <span className="text-eb-micro uppercase tracking-widest text-eb-green font-bold">
              VERIFIED
            </span>
          </div>
        </div>
        <input
          type="tel"
          value={formatPhone(user.phone)}
          readOnly // readOnly: phone is verified, not editable
          className="eb-input text-eb-muted"
        />
      </section>

      {/* Dealer: Photo */}
      {isDealerSignup && (
        <section className="px-5 py-5 border-t border-eb-border">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-eb-body font-bold text-eb-pop">
              {nextStep()}
            </span>
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Your photo
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative shrink-0"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName || "Photo"}
                  width={96}
                  height={96}
                  sizes="48px"
                  className="eb-avatar eb-avatar-xl object-cover"
                />
              ) : (
                <span className="eb-avatar eb-avatar-xl">
                  {displayName ? getInitials(displayName) : "+"}
                </span>
              )}
              {avatarUploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-eb-black/40 rounded-full">
                  <span className="eb-spinner-sm" />
                </span>
              )}
            </button>
            <div className="flex-1">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-eb-caption font-bold text-eb-pop uppercase tracking-wider"
              >
                {avatarUploading
                  ? "Uploading\u2026"
                  : avatarUrl
                    ? "Change photo"
                    : "Upload a photo"}
              </button>
              <p className="text-eb-meta text-eb-muted mt-0.5">
                Buyers see this on your profile.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Dealer: Business name */}
      {isDealerSignup && (
        <section className="px-5 py-5 border-t border-eb-border">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-eb-body font-bold text-eb-pop">
              {nextStep()}
            </span>
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Business name
            </span>
          </div>
          <input
            type="text"
            placeholder="Vintage Finds LA"
            className="eb-input"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value.slice(0, 60))}
          />
        </section>
      )}

      {/* Dealer: Instagram */}
      {isDealerSignup && (
        <section className="px-5 py-5 border-t border-eb-border">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-eb-body font-bold text-eb-pop">
              {nextStep()}
            </span>
            <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
              Instagram
            </span>
          </div>
          <InstagramInput
            value={instagram}
            onChange={setInstagram}
          />
          <p className="text-eb-meta text-eb-muted mt-1.5">
            We review your Instagram to verify your business.
          </p>
        </section>
      )}

      {/* Markets */}
      {/* Per-market follow checkboxes used to live here and wrote to
          buyer_market_follows with drop_alerts_enabled=true. That was
          the drop-era design. The drop cron is retired now, so those
          rows are inert. Per-show opt-in is the real feature and lives
          below in "Market Reminders". Keeping onboarding to one section
          per concept. */}

      {/* Notifications */}
      <section className="px-5 py-5 border-t border-eb-border">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-eb-body font-bold text-eb-pop">
            {nextStep()}
          </span>
          <span className="text-eb-meta uppercase tracking-widest text-eb-muted">
            Notifications
          </span>
        </div>
        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 p-3 border-2 cursor-pointer ${
              notifPrefs.price_drops
                ? "border-eb-black bg-eb-white"
                : "border-eb-border"
            }`}
          >
            <input
              type="checkbox"
              checked={!!notifPrefs.price_drops}
              onChange={() => toggleNotif("price_drops")}
              className="eb-check mt-0.5"
            />
            <div className="flex-1">
              <div className="text-eb-body font-bold">Price drops</div>
              <div className="text-eb-meta text-eb-muted mt-0.5">
                Text me when something I{"\u2019"}m watching gets cheaper.
              </div>
            </div>
          </label>
        </div>

        {/* (Per-market reminder opt-in retired with the drop concept.) */}
      </section>

      {/* Dealer: Terms */}
      {isDealerSignup && (
        <section className="px-5 py-5 border-t border-eb-border">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={() => setAgreedToTerms(!agreedToTerms)}
              className="eb-check mt-0.5"
            />
            <span className="text-eb-body text-eb-muted">
              I agree to the Early Bird{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-bold text-eb-black underline"
              >
                Terms of Service
              </Link>
            </span>
          </label>
        </section>
      )}

      {/* Continue */}
      <footer className="px-5 py-6 mt-auto border-t-2 border-eb-black">
        {dealerError && (
          <p className="text-eb-meta text-eb-red mb-3">{dealerError}</p>
        )}
        <button
          className="eb-cta"
          onClick={handleContinue}
          disabled={
            !displayName ||
            saving ||
            (isDealerSignup &&
              (!businessName.trim() ||
                !instagram.trim() ||
                !agreedToTerms))
          }
        >
          {saving
            ? "SAVING\u2026"
            : isDealerSignup
              ? "SUBMIT APPLICATION"
              : "LET'S GO"}
        </button>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-eb-body text-eb-muted">Loading{"\u2026"}</span>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

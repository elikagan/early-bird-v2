"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { NotFoundScreen } from "@/components/not-found-screen";
import { formatPhone } from "@/lib/format";

/**
 * Invite form. Server shell (page.tsx) has already:
 *   - Redirected anyone with a dealer account away
 *   - Validated the code
 *   - Resolved the session
 *
 * So this view only renders one of three things:
 *   - "Invite not found" screen (invalid prop)
 *   - Stripped form for signed-in buyers (initialUser present): just
 *     business name, since phone + name come from their account
 *   - Full anon signup form (initialUser null): phone + name + business
 *
 * No client-side auth wait, no /api/invite/check round-trip — the
 * server already did all that.
 */

interface Props {
  code: string;
  invalid?: boolean;
  invitePhone?: string | null;
  initialUser?: {
    phone: string;
    displayName: string | null;
  } | null;
}

export default function InviteFormView({
  code,
  invalid = false,
  invitePhone = null,
  initialUser = null,
}: Props) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState(initialUser?.displayName || "");
  const [biz, setBiz] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // error can be a plain string OR a special marker that triggers
  // the "you're already a dealer — sign in" rich rendering below.
  const [error, setError] = useState<string | null>(null);
  const [alreadyDealer, setAlreadyDealer] = useState(false);

  const isSignedIn = !!initialUser;

  const submit = useCallback(async () => {
    // Phone resolution priority:
    //   1. Admin-bound invite (server uses invite.phone)
    //   2. Signed-in session (already verified)
    //   3. User-entered (anon flow)
    let phoneToSend: string | undefined;
    if (invitePhone) {
      phoneToSend = undefined;
    } else if (initialUser?.phone) {
      phoneToSend = initialUser.phone;
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        setError("Enter a valid phone number");
        return;
      }
      phoneToSend = phone.trim();
    }
    if (!isSignedIn && !name.trim()) {
      setError("Name is required");
      return;
    }
    if (!biz.trim()) {
      setError(
        "Enter your business name (or your own name if you sell as yourself)"
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setAlreadyDealer(false);
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          phone: phoneToSend,
          name: (name || initialUser?.displayName || "").trim(),
          business_name: biz.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg: string = data.error || "Something went wrong";
        if (msg.toLowerCase().includes("already a dealer")) {
          setAlreadyDealer(true);
        } else {
          throw new Error(msg);
        }
        setSubmitting(false);
        return;
      }
      // Redeem set the session cookie. Full-page navigation so
      // AuthProvider remounts and refreshUser() picks up the new
      // cookie — otherwise /sell's useRequireAuth sees stale state.
      window.location.href = "/sell";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }, [code, phone, invitePhone, initialUser, isSignedIn, name, biz]);

  if (invalid) {
    return (
      <div className="min-h-screen bg-eb-bg flex flex-col">
        <header className="py-6 text-center">
          <div className="text-eb-title tracking-widest text-eb-black">
            EARLY BIRD
          </div>
        </header>
        <main className="px-5 flex-1 max-w-md mx-auto w-full">
          <NotFoundScreen
            title="Invite not found"
            message="This invite link has expired, already been used, or doesn’t exist. Contact the person who sent it to get a new one."
            action={{ label: "Go to Early Bird", href: "/" }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eb-bg flex flex-col">
      <header className="py-6 text-center">
        <div className="text-eb-title tracking-widest text-eb-black">
          EARLY BIRD
        </div>
      </header>

      <main className="px-5 flex-1 max-w-md mx-auto w-full">
        <h1 className="text-eb-body font-bold text-eb-black uppercase tracking-wider mb-1">
          {isSignedIn ? "Set up your booth" : "You’re Invited"}
        </h1>
        <p className="text-eb-meta text-eb-muted leading-relaxed mb-6">
          {isSignedIn
            ? "We’ve got your name and phone. Just need a business name and you’re live."
            : "Set up your seller account on Early Bird — the marketplace for LA flea market dealers."}
        </p>

        <div className="space-y-4">
          {/* Phone — three branches: admin-bound, session, or input. */}
          {invitePhone ? (
            <div>
              <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                Phone Number
              </label>
              <div className="eb-input flex items-center bg-eb-border/30 text-eb-text cursor-not-allowed select-none">
                {formatPhone(invitePhone)}
              </div>
              <p className="text-eb-micro text-eb-muted mt-1">
                This is the number your admin added for you.
              </p>
            </div>
          ) : initialUser ? (
            <div>
              <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                Phone Number
              </label>
              <div className="eb-input flex items-center bg-eb-border/30 text-eb-text cursor-not-allowed select-none">
                {formatPhone(initialUser.phone)}
              </div>
              <p className="text-eb-micro text-eb-muted mt-1">
                The phone on your Early Bird account.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                className="eb-input"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value
                      .replace(/[^\d()\-\s+.]/g, "")
                      .slice(0, 32)
                  )
                }
                placeholder="(555) 123-4567"
                autoFocus
              />
            </div>
          )}

          {/* Name — only ask if anon. Signed-in users have a display
              name on their account; we'll forward it as-is. */}
          {!isSignedIn && (
            <div>
              <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
                Your Name
              </label>
              <input
                type="text"
                className="eb-input"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                placeholder="Jane Doe"
                autoFocus={!!invitePhone}
              />
            </div>
          )}

          <div>
            <label className="text-eb-micro text-eb-muted uppercase tracking-widest block mb-1">
              Business or Your Name
            </label>
            <input
              type="text"
              className="eb-input"
              value={biz}
              onChange={(e) => setBiz(e.target.value.slice(0, 60))}
              placeholder="Vintage Finds LA, or Jane Doe"
              autoFocus={isSignedIn}
            />
          </div>

          {alreadyDealer && (
            <p className="text-eb-meta text-eb-text" role="alert">
              You’re already a dealer.{" "}
              <Link
                href="/"
                className="text-eb-pop font-bold underline"
              >
                Sign in
              </Link>{" "}
              to access your booth.
            </p>
          )}
          {error && !alreadyDealer && (
            <p className="text-eb-meta text-eb-red">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="eb-btn w-full"
          >
            {submitting ? "Setting up…" : "Get Started"}
          </button>

          <p className="text-eb-micro font-readable text-eb-muted text-center leading-relaxed">
            You’ll land on your booth for the next show.
          </p>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SignupDrawer } from "./signup-drawer";

/**
 * Small "Sign in" affordance for signed-out users on public pages
 * (item detail, dealer booth, buy feed, privacy/terms). Renders nothing
 * when the user is signed in.
 *
 * Drop into a masthead right slot:
 *   <header className="eb-masthead">
 *     <div className="flex justify-between items-center">
 *       <Link href="/"><h1>EARLY BIRD</h1></Link>
 *       <SignInLink />
 *     </div>
 *   </header>
 *
 * Opens the shared SignupDrawer — the same one signed-in flows use.
 * There is no separate "sign up" vs "sign in": it's one phone-to-SMS flow.
 */
export function SignInLink() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading || user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-eb-meta uppercase tracking-widest text-eb-muted"
      >
        Sign in {"\u2192"}
      </button>
      <SignupDrawer
        open={open}
        onClose={() => setOpen(false)}
        headline="Sign in"
        subtext="Enter your phone number to get a sign-in link. No passwords, no codes."
      />
    </>
  );
}

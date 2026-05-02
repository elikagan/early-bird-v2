"use client";

import Link from "next/link";
import { SignInLink } from "./sign-in-link";

interface MastheadProps {
  /**
   * Link destination for the h1. Defaults to "/".
   * Pass `null` for pages where the logo should not link
   * (home itself, onboarding).
   */
  href?: string | null;
  /**
   * Right-slot content. Defaults to `<SignInLink />` which
   * renders "Sign in →" for signed-out users and nothing
   * for signed-in users. Pass `null` to hide, or a custom
   * ReactNode (e.g., the landing page buyer/dealer toggle).
   */
  right?: React.ReactNode;
}

/**
 * Shared masthead used on every page that shows the EARLY BIRD header.
 * Replaces ~16 inline `<header className="eb-masthead">` blocks.
 *
 * Usage:
 *   <Masthead />                       — default: links to /, shows SignInLink
 *   <Masthead href={null} />           — no link (home page, onboarding)
 *   <Masthead right={null} />          — no right content
 *   <Masthead right={<MyToggle />} />  — custom right slot
 */
export function Masthead({ href = "/", right }: MastheadProps) {
  const rightContent = right === undefined ? <SignInLink /> : right;

  const title = <h1>EARLY BIRD</h1>;
  const heading = href ? <Link href={href}>{title}</Link> : title;

  return (
    <header className="eb-masthead">
      {rightContent !== null ? (
        <div className="flex justify-between items-center">
          {heading}
          {rightContent}
        </div>
      ) : (
        heading
      )}
    </header>
  );
}

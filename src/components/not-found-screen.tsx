"use client";

import Link from "next/link";

interface NotFoundAction {
  label: string;
  href: string;
}

interface NotFoundScreenProps {
  title?: string;
  message: string;
  action?: NotFoundAction;
  secondaryAction?: NotFoundAction;
}

/**
 * Full-page "this isn't available" screen.
 *
 * Intentionally avoids the term "404" — we tell the user what happened
 * in plain language and give them at least one path forward. Callers
 * render this inside a page shell (masthead above, bottom nav below)
 * so the user can always navigate out.
 */
export function NotFoundScreen({
  title = "This page isn\u2019t available",
  message,
  action,
  secondaryAction,
}: NotFoundScreenProps) {
  return (
    <section className="px-5 pt-16 pb-20 flex flex-col items-center text-center">
      <div className="text-eb-hero text-eb-muted mb-6 leading-none">
        {"\u2205"}
      </div>
      <h1 className="text-eb-display text-eb-black mb-3 max-w-xs leading-tight">
        {title}
      </h1>
      <p className="text-eb-body text-eb-muted leading-relaxed max-w-xs mb-8">
        {message}
      </p>
      {action && (
        <Link
          href={action.href}
          className="text-eb-caption font-bold text-eb-pop uppercase tracking-wider underline"
        >
          {action.label}
        </Link>
      )}
      {secondaryAction && (
        <Link
          href={secondaryAction.href}
          className="text-eb-caption font-bold text-eb-muted uppercase tracking-wider mt-4"
        >
          {secondaryAction.label}
        </Link>
      )}
    </section>
  );
}

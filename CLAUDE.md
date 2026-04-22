# CLAUDE.md — Early Bird

## Start here

1. **`EB_DESIGN.md`** — source of truth for how the product is supposed to work. Read this before making any product decision or writing any user-facing copy. If code doesn't match this doc, the code is wrong.
2. **`KNOWN_DEBT.md`** — running list of gaps between `EB_DESIGN.md` and what's actually shipped. Reference this before assuming something works; your fix might already be on the debt list.
3. **`QA_FINDINGS.md`** — per-chunk audit log with severity-tagged items + fix commits. Historical record of what's been cleaned up.

Everything else at the repo root with `*.ARCHIVED.md` in the name is old planning that no longer reflects shipped code. Don't read it. If a task requires historical context, ask the user.

## Tech stack

- Next.js (App Router)
- Tailwind CSS (no DaisyUI)
- Supabase Postgres
- SMS: Pingram (`PINGRAM_API_KEY`) with a console stub for local dev
- Error tracking: Sentry (`SENTRY_AUTH_TOKEN`)
- Typography: JetBrains Mono (`font-sans`, default) + Inter (`font-readable`, for long-form reading copy)

## Hard rules

1. **No inline styles.** Use design system classes (`eb-*`) and Tailwind utilities. Pre-commit hook rejects `style=""`.
2. **No hardcoded hex colors in components.** Use tokens from `tailwind.config.js`.
3. **Touch targets ≥ 44px** on anything tappable (Apple HIG).
4. **Reread EB_DESIGN.md before writing user-facing copy.** Product language matters; do not translate briefs literally.
5. **Admin surfaces are never exposed to non-admins.** Server-side gate (`isAdmin(user.phone)`) + client-side layout gate.
6. **Dealer surfaces are never exposed to non-dealers.** Server routes check `user.dealer_id`; `src/app/(app)/sell/layout.tsx` 404s non-dealers.
7. **Every destructive action requires a styled confirm drawer.** Never use the browser's `confirm()` or `alert()` — they're banned in admin, same rule everywhere.
8. **Every drawer locks body scroll while open.** Use `useBodyScrollLock(open)` from `@/lib/use-body-scroll-lock`.
9. **Every SMS text goes through a `compose*()` function** in `src/lib/sms-templates.ts`. Never inline a string literal into `sendSMSWithLog()`.
10. **Commit after every completed unit.** One logical change per commit. Reference the finding number from `QA_FINDINGS.md` in the message when applicable.

## Server commands

```bash
npm run dev     # Start dev server
npm run build   # Production build (used by the pre-commit typecheck hook)
npm run lint    # Lint check
```

## Dev helpers

- `scripts/eb-query.mjs` — service-role Supabase CLI. Supports `list`, `list-invites`, `find-by-phone`, `delete-user`, more. Reads `.env.local`.
- `/api/auth/dev-login` — dev-only endpoint that mints a test admin/dealer/buyer session without SMS. Hard-gated to non-production.
- `TEST_ADMIN_PHONE = "+15550000003"` (see `src/lib/admin.ts`) — test admin phone for the QA review tool. Only treated as admin in non-production.

## Key file map

- Pages: `src/app/**/page.tsx`
- Shared UI components: `src/components/`
- Shared helpers: `src/lib/`
- DB helpers + RPC wrapper: `src/lib/db.ts`
- Auth: `src/lib/auth.ts` (session + cookie domain), `src/lib/admin.ts` (admin check)
- SMS: `src/lib/sms.ts` (provider + retry + logging), `src/lib/sms-templates.ts` (all compose functions)
- Market list (hardcoded shows): `src/lib/shows.ts`
- Migrations: `supabase/migrations/*.sql`

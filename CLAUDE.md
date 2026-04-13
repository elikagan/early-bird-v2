# CLAUDE.md — Early Bird

Read `EB_DESIGN.md` before doing anything. It is the source of truth for product decisions. Read `DESIGN_SYSTEM.md` for all visual/styling decisions. Read `RESKIN_PLAN.md` for the current session's scope. Do NOT read `REVISION_LOG.md` unless explicitly told to.

## Tech Stack

- Next.js (App Router)
- Tailwind CSS (no DaisyUI — removed during reskin)
- Supabase Postgres (migrated from Turso)
- Monospace font globally (JetBrains Mono)
- SMS: Pingram API (falls back to console stub without PINGRAM_API_KEY)

## Rules

1. **No inline styles.** Never write `style=""` on any element. The pre-commit hook will reject it. Use design system classes (`eb-*`) and Tailwind utilities only.
2. **Design system is law.** All colors, font sizes, and spacing come from `DESIGN_SYSTEM.md` tokens. No hardcoded hex values. No arbitrary Tailwind values like `text-[14px]` — use the defined scale.
3. **One job per session.** Each session has a single phase or task. Do not bleed into other phases. Read `RESKIN_PLAN.md` for your session's scope.
4. **Commit after every completed unit.** A unit is one screen, one route, or one feature. Commit and push immediately. Do not batch.
5. **Never read REVISION_LOG.md.** It exceeds the token limit and is not needed for any session. If a task requires revision history, ask the user to provide the specific entry.
6. **Rollback tag:** `pre-reskin` — everything before the visual redesign lives here.

## Build Phases

- **Phase 1 — Wireframes:** Static HTML pages with hardcoded dummy data. No JS logic. No data fetching. One file per screen/state.
- **Phase 2 — Backend:** Database schema, API routes, seed data. No frontend changes.
- **Phase 3 — Wiring:** Connect wireframes to API. Replace dummy data with real fetches. Do not change classes or add elements.
- **Phase 4 — Polish:** Loading/empty/error states, transitions, edge cases. Still no inline styles.

## Communication Model

There is no in-app messaging. Buyer taps "I'm Interested," writes a short message, and the app sends a single SMS/email to the dealer with the buyer's name, phone number, and message. After that, the app is out of the loop. Do not build chat, inboxes, threads, or real-time messaging.

**Carve-out — per-inquiry transactional receipts.** The "out of the loop" rule has one narrow exception. When the dealer taps Hold or Sell on a specific inquiry card in the Inquiry Log on `item-detail-dealer-own.html`, the app sends one transactional SMS to the affected buyer(s): the winning buyer gets a "Sold! …" or "first dibs" receipt; the other inquirers get a "sold to another buyer" receipt. These are one-way after-the-fact receipts — same category as a Shopify order confirmation. They do NOT open a thread, do NOT accept replies, and do NOT create an inbox. This is the only place the app sends an outbound message after the original inquiry handoff. Full spec in `EB_DESIGN.md` → Communication: One-Touch Inquiry Handoff → Per-Inquiry Transactional Receipts (Carve-Out). Confirm-drawer wireframe: `public/wireframes/item-detail-dealer-own-confirm.html`.

## Item Detail Has 3 States (Not 4)

1. **Buyer view** — photos, price, dealer info, "I'm Interested" button with compose drawer
2. **Dealer own item** — full detail, edit, status controls, inquiry log (read-only list of buyer inquiries)
3. **Dealer browsing** — same as buyer view

## Navigation

```
Buyers:  Buy · Watching | Account
Dealers: Buy · Watching | Sell | Account
```

## Font

Everything is monospace. The Tailwind config overrides `fontFamily.sans` to `JetBrains Mono`. No per-component font decisions.

## QA Checklist (Run Before Every Commit)

- [ ] `grep -r 'style="' src/` returns nothing
- [ ] No hardcoded color values, font sizes, or spacing outside Tailwind config
- [ ] Every visible element uses a design system class (`eb-*`) or Tailwind utility
- [ ] Screen matches the design mockups (https://eb-designs.vercel.app)
- [ ] No files outside the current phase were modified

## Design System Reference

- **Tokens:** `tailwind.config.js` (`eb` color palette + `eb-*` fontSize scale)
- **Component classes:** `globals.css` (`eb-masthead`, `eb-grid`, `eb-cta`, etc.)
- **Visual reference:** `public/design-system.html` (all tokens + components rendered)
- **Design mockups:** https://eb-designs.vercel.app (source in `/tmp/eb-designs/`)

## Server Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # Lint check
```

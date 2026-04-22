# Reskin Plan — Early Bird v2

Turning the "Classifieds" design direction into the real app. Multi-session plan with clear boundaries.

**Rollback:** `git checkout pre-reskin` restores everything before the reskin started.
**Design reference:** https://eb-designs.vercel.app (5 mockup pages)
**Design system:** `DESIGN_SYSTEM.md` in this repo

---

## Session Overview

| # | Name | Scope | Verify |
|---|------|-------|--------|
| R1 | Foundation | Tailwind tokens, globals.css, strip DaisyUI, reference page | `npm run build` passes, `/design-system.html` shows all tokens/components |
| R2 | Shell + Auth | Root layout, app layout, bottom nav, landing, verify, onboarding | Auth flow works with new styling: sign in → verify → onboarding → home |
| R3 | Buy Flow | Home (buyer), buy feed, item detail (buyer + dealer browsing) | Browse markets → feed → item detail, all styled |
| R4 | Watching + Sell | Watching page, sell/booth, add item, item detail (dealer own) | Dealer manages booth, buyer watches items, hold/sell works |
| R5 | Account + Empty States | Account (buyer + dealer), all 9 empty states, loading/error states | Every screen, every state rendered correctly |
| R6 | QA | Full walkthrough on 375–430px, fix everything | Ship it |

---

## R1 — Foundation

**Goal:** Design system lives in the codebase. Every token, every component class, no DaisyUI.

### Tasks
1. Update `tailwind.config.js`:
   - Add `eb` color palette (all 13 tokens from DESIGN_SYSTEM.md)
   - Add fontSize scale (`hero`, `display`, `title`, `body`, `caption`, `meta`, `micro`)
   - Remove DaisyUI plugin
2. Update `globals.css`:
   - Add CSS custom properties in `:root` (same tokens, for any non-Tailwind CSS)
   - Add `@layer components` with reusable classes:
     - `.eb-masthead`, `.eb-section`, `.eb-drop-bar`
     - `.eb-grid`, `.eb-grid-card`
     - `.eb-tag-firm`, `.eb-tag-drop`, `.eb-tag-new`
     - `.eb-dot`, `.eb-dot-green`, `.eb-dot-amber`, `.eb-dot-red`
     - `.eb-bnav`, `.eb-cta`, `.eb-input`, `.eb-btn`
     - `.eb-empty`, `.eb-sold`
3. Uninstall DaisyUI: `npm uninstall daisyui`
4. Create `public/design-system.html` — visual reference page showing:
   - Color swatches
   - Type scale
   - Every component with all states
5. Update `CLAUDE.md` rules:
   - Replace "DaisyUI classes" references with "design system classes"
   - Update tech stack (remove DaisyUI, add design system reference)

### Verify
- `npm run build` passes with zero DaisyUI references
- `localhost:3000/design-system.html` renders the full reference
- No visual regression yet (screens will look broken — that's expected)

### Handoff
- Link: `localhost:3000/design-system.html` (or deploy if needed)
- Prompt: see bottom of this file

---

## R2 — Shell + Auth

**Goal:** The outer shell and auth flow look right. First screens a user sees.

### Files to Touch
- `src/app/layout.tsx` — body classes, font loading
- `src/app/(app)/layout.tsx` — app shell wrapper
- `src/components/bottom-nav.tsx` — reskin with eb classes
- `src/app/page.tsx` — landing (sign-in)
- `src/app/auth/verify/page.tsx` — magic link verify
- `src/app/onboarding/page.tsx` — selfie + name + market picker

### Design References
- `c-landing.html` — landing page mockup
- Wireframes: `landing-buyer.html`, `landing-dealer.html`, `onboarding.html`

### Verify
- Full auth flow: landing → enter phone → get SMS → verify → onboarding → home
- Bottom nav renders correctly on all post-login pages
- Mobile viewport (375–430px) looks right

---

## R3 — Buy Flow

**Goal:** The core buyer experience is styled.

### Files to Touch
- `src/app/(app)/home/page.tsx` — market list with countdowns
- `src/app/(app)/buy/page.tsx` — 2-col item grid
- `src/app/(app)/item/[id]/page.tsx` — item detail (buyer view + dealer browsing)

### Design References
- `c-feed.html` — buy feed mockup (2-col grid)
- `c-item.html` — item detail mockup
- `c-market.html` — market detail mockup (for home page market cards)
- Wireframes: `buy-feed.html`, `item-detail-buyer.html`, `home-buyer.html`

### Verify
- Home → tap market → feed with photos → tap item → detail with CTA
- Tags render (FIRM, price drop, NEW)
- Dealer faces show in grid and detail
- Countdown timers work

---

## R4 — Watching + Sell

**Goal:** Both sides of the marketplace styled.

### Files to Touch
- `src/app/(app)/watching/page.tsx` — favorited/inquired items
- `src/app/(app)/sell/page.tsx` — dealer booth dashboard
- `src/app/(app)/sell/add/page.tsx` — add item form
- `src/app/(app)/item/[id]/page.tsx` — item detail (dealer own view, if not already)

### Design References
- `c-watching.html` — watching page mockup (2-col grid with status)
- Wireframes: `watching.html`, `sell-booth-active.html`, `sell-add-item.html`, `item-detail-dealer-own.html`

### Verify
- Watching: status dots (on hold/interested/sold), sold state greyscale
- Sell: countdown, item list, inquiry count badges
- Add item: photo upload grid, form fields, firm toggle
- Dealer own item: inquiry cards, hold/sell buttons

---

## R5 — Account + Empty States

**Goal:** Every remaining screen and state.

### Files to Touch
- `src/app/(app)/account/page.tsx` — buyer + dealer views
- All empty state rendering (conditionals already exist in page components)
- Loading states (skeletons or simple spinners)
- Error states

### Design References
- Wireframes: `account-buyer.html`, `account-dealer.html`, all `*-empty.html` variants
- Empty state component from `c-watching.html` mockup (icon + text + link pattern)

### Verify
- Account buyer: profile, preferences, market follows
- Account dealer: business info, payment methods, Instagram
- Every empty state: buy feed empty, watching empty, home empty, sell empty, account empty
- Seed a fresh DB and walk through the empty → populated flow

---

## R6 — QA

**Goal:** Ship it.

### Tasks
1. Full walkthrough as buyer (new account → browse → favorite → inquire)
2. Full walkthrough as dealer (new account → set up booth → add items → manage inquiries)
3. Test on 375px and 430px viewports
4. Check every state: loading, empty, error, sold, held, price drop, firm
5. Grep for any remaining DaisyUI classes, hardcoded colors, inline styles
6. Fix everything
7. Final deploy to earlybird.la

### Verify
- Zero DaisyUI references in codebase
- Zero inline styles
- Zero hardcoded color values outside Tailwind config
- Every screen matches design system
- Live on earlybird.la

---

## Session Prompts

### R1 Prompt
```
Early Bird v2 reskin — Session R1 (Foundation).

Read DESIGN_SYSTEM.md and RESKIN_PLAN.md (section R1). The goal: get all design tokens into tailwind.config.js, strip DaisyUI, add component classes to globals.css, and build a visual reference page at public/design-system.html.

Rollback tag: pre-reskin
Design mockups: https://eb-designs.vercel.app (source in /tmp/eb-designs/)
```

### R2 Prompt
```
Early Bird v2 reskin — Session R2 (Shell + Auth).

Read DESIGN_SYSTEM.md and RESKIN_PLAN.md (section R2). The goal: reskin the outer shell (layouts, bottom nav) and auth flow (landing, verify, onboarding) using the design system from R1.

Design mockups: https://eb-designs.vercel.app/c-landing.html
Previous session: R1 (foundation — tokens, component classes, DaisyUI removed)
```

### R3 Prompt
```
Early Bird v2 reskin — Session R3 (Buy Flow).

Read DESIGN_SYSTEM.md and RESKIN_PLAN.md (section R3). The goal: reskin home (buyer), buy feed (2-col grid), and item detail (buyer + dealer browsing views).

Design mockups: https://eb-designs.vercel.app (c-feed.html, c-item.html, c-market.html)
Previous sessions: R1 (tokens), R2 (shell + auth styled)
```

### R4 Prompt
```
Early Bird v2 reskin — Session R4 (Watching + Sell).

Read DESIGN_SYSTEM.md and RESKIN_PLAN.md (section R4). The goal: reskin watching page, sell/booth dashboard, add item form, and dealer-own item detail.

Design mockups: https://eb-designs.vercel.app/c-watching.html
Previous sessions: R1–R3 (tokens, shell, buy flow all styled)
```

### R5 Prompt
```
Early Bird v2 reskin — Session R5 (Account + Empty States).

Read DESIGN_SYSTEM.md and RESKIN_PLAN.md (section R5). The goal: reskin account pages (buyer + dealer) and all empty/loading/error states.

Previous sessions: R1–R4 (everything except account + empty states)
```

### R6 Prompt
```
Early Bird v2 reskin — Session R6 (QA).

Read DESIGN_SYSTEM.md and RESKIN_PLAN.md (section R6). The goal: full QA pass. Walk through every flow, every state, every viewport. Fix everything. Ship it.

Previous sessions: R1–R5 (all screens reskinned)
```

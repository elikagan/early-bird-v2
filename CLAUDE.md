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

## Quality Enforcement

Three layers. All three must pass before deploying.

### Layer 1: Pre-commit hook (automatic)
Blocks commits that contain: inline styles, console.log, dead links (href="#"), unexplained readOnly, TypeScript errors. You cannot skip this.

### Layer 2: QA gate script (run before every deploy)
```bash
bash scripts/qa-gate.sh
```
Checks: build, lint, dead links, console.log, TODO/FIXME, buttons without handlers, links without href, unexplained readOnly, bare fetch without error handling, images without alt text. Errors block deploy. Warnings must be reviewed.

### Layer 3: Production checklist (answer before declaring a feature done)
For every feature you build, answer YES to all of these or document why it doesn't apply:

**Input & Data**
- [ ] Every user input has validation (type, length, format) with a visible error message
- [ ] Every form has submit-disabled state while saving
- [ ] Every form has double-submit protection
- [ ] Price inputs use inputmode="numeric" and validate positive values
- [ ] Phone inputs use inputmode="tel"
- [ ] File inputs validate type and size with clear error on rejection

**Loading & Errors**
- [ ] Every async action shows a loading indicator (spinner, disabled button, skeleton)
- [ ] Every fetch/API call has an error path the user can see and recover from
- [ ] Network failure doesn't leave the UI in a broken state
- [ ] Optimistic updates revert on failure

**Mobile & Real-World**
- [ ] All touch targets are 44px minimum
- [ ] Tested on iPhone Safari (not just desktop Chrome)
- [ ] Works on slow network (what happens if upload takes 30 seconds?)
- [ ] Images from iPhone cameras work (HEIC format, EXIF orientation, 4-12MB files)
- [ ] No hover-only interactions (everything works with tap)

**Completeness**
- [ ] No placeholder text, dummy data, or "coming soon" UI in production
- [ ] No buttons/links that don't do anything
- [ ] No readOnly inputs without a reason
- [ ] No console.log or debug code
- [ ] Feature works end-to-end: create → read → update → delete (where applicable)
- [ ] What happens if two users do conflicting things at the same time?

**After building, run:**
```bash
bash scripts/qa-gate.sh && vercel --prod --yes
```

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

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

# CLAUDE.md — Early Bird

Read `EB_DESIGN.md` before doing anything. It is the source of truth for this project.

## Tech Stack

- Next.js (App Router)
- DaisyUI + Tailwind CSS
- SQLite via Turso
- Monospace font globally (JetBrains Mono)

## Rules

1. **No inline styles.** Never write `style=""` on any element. The pre-commit hook will reject it. Use DaisyUI classes and Tailwind utilities only.
2. **No new HTML elements beyond the wireframe.** If a screen was built in Phase 1, do not add elements that aren't already there. If something is missing, ask — don't invent.
3. **No class name changes.** Do not rename, remove, or override DaisyUI classes from the wireframes unless explicitly told to.
4. **One job per session.** Each session has a single phase or task. Do not bleed into other phases. If the task is "build API routes," do not touch frontend files.
5. **Commit after every completed unit.** A unit is one screen, one route, or one feature. Commit and push immediately. Do not batch.

## Build Phases

- **Phase 1 — Wireframes:** Static HTML pages with DaisyUI classes and hardcoded dummy data. No JS logic. No data fetching. One file per screen/state.
- **Phase 2 — Backend:** Database schema, API routes, seed data. No frontend changes.
- **Phase 3 — Wiring:** Connect wireframes to API. Replace dummy data with real fetches. Do not change classes or add elements.
- **Phase 4 — Polish:** Loading/empty/error states, transitions, edge cases. Still no inline styles.

## Communication Model

There is no in-app messaging. Buyer taps "I'm Interested," writes a short message, and the app sends a single SMS/email to the dealer with the buyer's name, phone number, and message. After that, the app is out of the loop. Do not build chat, inboxes, threads, or real-time messaging.

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
- [ ] No hardcoded color values, font sizes, or spacing outside Tailwind/DaisyUI
- [ ] Every visible element uses a DaisyUI class or Tailwind utility
- [ ] Screen still matches the Phase 1 wireframe visually
- [ ] No files outside the current phase were modified

## Session 1 Setup (Do This First)

1. Initialize Next.js project with App Router
2. Install and configure Tailwind + DaisyUI
3. Configure `tailwind.config.js` with JetBrains Mono as the global font
4. Install `@libsql/client` (Turso)
5. Install the pre-commit hook:
   ```bash
   cp pre-commit .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```
6. Verify the hook works: create a test file with `style=""`, try to commit, confirm it's blocked, then delete the test file
7. `npm run dev` should show a blank page with monospace font and DaisyUI working
8. Commit and push

## Server Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # Lint check
```

# Next session: perf task E + the auth-layout boomerang

## What landed this session (2026-04-22 PM)

Pushed one commit per task. A through D are the PERF_FIX_PLAN tasks;
the four /buy, /home, /early, /d commits are task F (the "audit
`use client` across the app" task in the plan).

1. `bc72ce8` — **A.** `×` close glyphs bumped from 15px → 24px; the two
   item-page confirm drawers got real 44×44 hit zones (they had none).
2. `4b9845d` — **B.** `useBodyScrollLock` no longer sets `position:fixed`
   on body; switched to `overflow:hidden` + `overscroll-behavior:none`
   on `<html>`. Also removed the orphan `.eb-scroll-lock` CSS rule.
3. `39a1469` — **C.** `/api/items/[id]` GET is now public + cacheable
   (`cachedJson`, s-maxage=60). Per-user bits moved to a new
   `/api/items/[id]/me` route. The item page loader fetches both in
   parallel.
4. `98988f2` — **D.** `/item/[id]/page.tsx` is now a ~80-line async
   Server Component. Everything interactive moved to
   `./item-view.tsx` (client). Item data ships in the RSC payload.
5. `b9a8474` — **F./buy.** Same Server Component shell pattern. Also
   added an optional `initialPage` param to `useInfiniteItems` so the
   hook can seed from server data and skip the first client fetch.
6. `de438d9` — **F./home.** Markets list + featured-market's first
   page of items fetched server-side. Dealer-application banner and
   signed-out redirect stay client-side.
7. `b6a3b84` — **F./early/[marketId].** Same pattern; per-visitor
   shuffle still happens client-side on pages 2+, first page ships in
   DB order so SSR + hydration match.
8. `87ff2ab` — **F./d/[id].** Five previously-waterfalled fetches
   collapsed into one server Promise.all.

Every push triggers Vercel auto-deploy on EB_V2.

## Still to do

### E. QA perf chunk (30 min)
Add Chunk G to `QA_CHECKLIST.md` per `PERF_FIX_PLAN.md` §E. Cache header
audits (curl `x-vercel-cache: HIT` on `/api/items`, `/api/markets`,
`/api/items/[id]` second hits), mobile TTI targets, interaction
latency, bundle-size caps. Acceptance: `scripts/qa-status.mjs` picks
up the new chunk automatically since it reads all checkboxes.

### The auth-layout boomerang — the real next perf win
`src/app/(app)/layout.tsx` is a client layout that returns
`<Loading…>` while `useAuth().loading` is true. Every Server Component
shell we just built (D + F) still renders a blank "Loading…"
placeholder on first paint because this layout short-circuits above
the children. The item HTML is in the RSC payload; the user just
can't see it until hydration resolves auth.

Unwinding this gate is the real remaining perf win. Options:
1. **Server-resolve auth.** Read the session cookie in a root layout
   that's a Server Component. Pass `user` down to an AuthProvider that
   initializes with it rather than fetching on mount. Needs care around
   dynamic rendering and cookie handling, but standard Next 13+ pattern.
2. **Pages don't wait for auth.** Remove the layout's `if (loading)`
   gate entirely. Individual pages that need auth state (anything that
   renders auth-gated UI) deal with their own loading UX. Smaller
   change but scattered.

I'd go with (1). It's the right long-term shape and it undoes most of
the perceived perf hit from the client layout.

### Verified at session close (2026-04-22 PM)

- `curl -I https://earlybird.la/api/items/yzTXt1HI3vhalive` second hit:
  `x-vercel-cache: HIT`, TTFB **143ms** (down from 400-800ms baseline).
  Not <50ms but dominated by network RTT from my location to Vercel
  edge; real users see less. **C acceptance met.**
- `curl -s https://earlybird.la/item/yzTXt1HI3vhalive` initial HTML
  contains item title ("Nagel Candelabrum") and dealer ("lisa cliff
  collection") in the RSC payload. **D acceptance met** (for the
  view-source check — the visible "Loading…" is the layout limitation
  in the "Known issues" section below).

### Still untested

- [ ] Real iPhone: tap `I'M INTERESTED` on `/item/<id>` — drawer
      tappable within 300ms. **I could not test on a real iPhone; this
      is the B acceptance check the plan calls out explicitly. Ask Eli
      to confirm in person on his phone.**
- [ ] Mobile Lighthouse on `/item/<id>` after all of A-D landed —
      should be ≥20 Perf points higher than baseline per plan §D.

## Known issues + gotchas opened by this session

1. **`(app)/layout.tsx` short-circuits on auth loading.** It's
   `"use client"` and returns `<Loading…>` while `useAuth().loading`
   is true. Task D puts the item HTML in the RSC payload, but the
   client layout still blanks the page until hydration resolves auth.
   The perf gain is real (no post-hydrate fetch), but first paint
   still shows "Loading…". Fixing the layout is part of F / a dedicated
   cleanup.
2. **`notFound()` returns HTTP 200 for non-existent items.** Same root
   cause: the client layout wraps the server page, Next's 404 status
   propagation gets swallowed. The 404 page body does render. UX is
   fine; SEO/bots see a 200 on dead URLs.
3. **Pre-D behavior: bad item IDs redirected `/buy`. Post-D: they show
   a 404 page.** Arguably better UX for humans; call this out to Eli
   if it matters.
4. **View-count now increments on every view, including the dealer's
   own self-views.** The old is-owner gate required `getSession()`,
   which killed the edge cache. Acceptable rounding error per
   `PERF_FIX_PLAN.md`. If it matters later, move the increment to a
   `POST /api/items/[id]/view` endpoint the client calls after mount.

## Memory flags to update

- `feedback_eb_v2_no_deploy.md` (11 days old) is now **stale**. EB_V2
  has a Vercel project (`vercel.json`, `.vercel/` in repo) and a live
  domain at `earlybird.la`. The "git push IS the deploy" phrasing is
  still accurate — but the "do not run `npm run build`" rule needs an
  amendment: locally validating with `next build` before pushing a
  big change (like Task D) prevents a broken prod deploy. Build passes
  now — I ran it before pushing D.

## Rollback

Every commit is atomic per task. `git revert <sha>` on any of A–D
takes just that task back without touching the others. D is the
biggest; if something breaks it that isn't caught by the local build,
revert and the item page is back to the client-fetch version.

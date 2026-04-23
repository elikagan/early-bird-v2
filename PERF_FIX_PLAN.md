# Performance Fix Plan

## Why this document exists

Eli reported 3-5s page loads, a 3-second frozen inquiry drawer, and 5-second
"back to listings" hangs. Investigation on 2026-04-22 uncovered three
architectural shortcuts that compounded:

1. Every page is `"use client"` — data fetches are a waterfall *after*
   hydration, not co-located with HTML.
2. Auth cookies are read inside cacheable GET routes via `getSession()`.
   Next.js marks any such route as dynamic and disables Vercel's edge
   cache. Hot endpoints MISS on every request.
3. QA never measured perf — only UI correctness. Regressions piled up
   invisibly.

This plan walks through the full fix. Tasks are ordered by user-visible
impact. Each task is a self-contained unit: scope, files touched, diff
shape, acceptance criteria, commit message.

## Measured baseline (2026-04-22, prod)

| Resource | TTFB | Vercel cache | Note |
|---|---|---|---|
| `/item/[id]` HTML | ~290ms | MISS | Dynamic — `getSession` in layout |
| `/api/items/[id]` | 400-800ms | MISS | No cache headers; calls `getSession` |
| `/api/items?market_id=...` | 400-600ms | MISS | Has `s-maxage=60` but ignored because `getSession` is called |
| Biggest 3 JS chunks | — | — | 227KB + 141KB + 112KB = **~480KB** |
| Total JS for item page | — | — | **~700KB** |

Waterfall on the item page, mobile LTE: HTML (~300ms) → JS download
(~2-4s) → hydrate → API fetch (~500ms) → render → image load. Total
**~4-6 seconds before interactive**.

## Task inventory

### A. Enlarge the × close glyph (5 min, near-zero risk)

**Problem.** Close buttons have a 44×44 hit zone from an earlier fix, but
the × character inside renders at body-text size (~15px), so it looks
tiny on mobile. Eli described it as "6px tall."

**Files.**
- `src/app/(app)/item/[id]/page.tsx` — line 1611 (inquiry drawer close)
- `src/app/(app)/sell/add/page.tsx` — line 295 (check which drawer)
- `src/components/signup-drawer.tsx` — audit for × close
- `src/components/dealer-apply-drawer.tsx` — audit for × close
- `src/components/confirm-drawer.tsx` — audit for × close

**Diff shape.** On every close button that currently uses
`text-eb-body`, change text class to `text-2xl` (24px) or `text-3xl`
(30px). Keep the 44×44 hit zone. Don't touch `aria-label`.

**Acceptance.**
- Load `https://earlybird.la/item/<id>`, tap "I'M INTERESTED".
- The × glyph is visibly at least as tall as the heading text next to it.
- Tap anywhere in the 44×44 top-right region closes the drawer.

**Commit.** `Inquiry drawer + other drawers: enlarge × glyph to match 44px hit zone`

---

### B. Replace body-scroll-lock with html-overflow approach (20 min, moderate risk)

**Problem.** `src/lib/use-body-scroll-lock.ts` sets `position: fixed` on
the document body and `top: -scrollY`. On iOS Safari with a tall
scrolled page this triggers a full paint-layer shift that blocks the
main thread for 1-3 seconds. Taps on any interactive element inside the
newly-mounted drawer (options, X, drag handle) don't register until the
shift completes. Feels like "the drawer is frozen for 3 seconds."

**Files.**
- `src/lib/use-body-scroll-lock.ts` — replace body-position-fixed with
  html-overflow-hidden
- Test surface: every drawer in the app uses this hook
  - Inquiry drawer (`item/[id]/page.tsx`)
  - Signup drawer
  - Dealer apply drawer
  - Confirm drawer (delete, walk-up sold, etc.)
  - Edit mode photo pickers

**Diff shape.** Rewrite the hook:

```ts
let lockCount = 0;
let savedHtmlOverflow = "";
let savedHtmlOverscroll = "";

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    if (lockCount === 0) {
      const html = document.documentElement;
      savedHtmlOverflow = html.style.overflow;
      savedHtmlOverscroll = html.style.overscrollBehavior;
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0) {
        const html = document.documentElement;
        html.style.overflow = savedHtmlOverflow;
        html.style.overscrollBehavior = savedHtmlOverscroll;
      }
    };
  }, [locked]);
}
```

No `position: fixed`, no scroll-save/restore. The browser keeps body
scroll position naturally because we're not moving it.

**Risk.** On some iOS versions, `overflow: hidden` on `<html>` doesn't
fully prevent rubber-band scrolling of the document. Mitigation:
`overscroll-behavior: none` handles most of it. If rubber-band still
occurs, add `touch-action: none` on body while locked.

**Acceptance.**
- Open inquiry drawer on prod, on a real iPhone, after scrolling to the
  item CTA at the bottom of the page.
- Drawer is tappable within **<300ms**. No 3-second frozen period.
- Close drawer → page is scrolled to the same position as before open.
- Repeat with signup drawer, delete confirm drawer, walk-up sold drawer.

**Commit.** `use-body-scroll-lock: drop position:fixed (kills iOS tap freeze)`

---

### C. Split `/api/items/[id]` into cacheable + personalized (45 min, moderate risk)

**Problem.** The item detail API calls `getSession(request)` so the
route is marked dynamic and Vercel never caches it. But 80% of the
payload (item row, photos, market, dealer payment methods) is the same
for every viewer. Only `is_favorited` and `my_inquiry_status` are
per-user.

**Files.**
- `src/app/api/items/[id]/route.ts` — remove `getSession` from GET; drop
  favorited/inquiry status from response; add `cachedJson` wrapper
- `src/app/api/items/[id]/me/route.ts` — new; returns `{is_favorited,
  favorite_id, my_inquiry_status}` for the current user
- `src/app/(app)/item/[id]/page.tsx` — data loader change: fire both
  endpoints in parallel with `Promise.all`

**Diff shape.**

1. `src/app/api/items/[id]/route.ts` GET:
   - Delete `const user = await getSession(request)`
   - Delete the `user ? favRes / myInqRes : Promise.resolve({rows:[]})`
     branches in the Promise.all
   - Delete the `if (user)` block that attaches `is_favorited` /
     `my_inquiry_status` to the response
   - Change final `return json(item)` to `return cachedJson(item)`
   - Keep the view_count increment (still server-side, no cache impact)
   - Note: `isOwner` check is no longer possible here. Move view-count
     increment to a POST on a new `/api/items/[id]/view` endpoint that
     the client calls, OR always increment (acceptable since it was
     already fire-and-forget).

2. `src/app/api/items/[id]/me/route.ts` (new):
   ```ts
   export async function GET(request, { params }) {
     const { id } = await params;
     const user = await getSession(request);
     if (!user) return json({});

     const [favRes, myInqRes] = await Promise.all([
       db.execute({ sql: `SELECT id FROM favorites WHERE buyer_id=? AND item_id=?`, args: [user.id, id] }),
       db.execute({ sql: `SELECT status FROM inquiries WHERE buyer_id=? AND item_id=? ORDER BY created_at DESC LIMIT 1`, args: [user.id, id] }),
     ]);

     return json({
       is_favorited: favRes.rows.length > 0,
       favorite_id: favRes.rows[0]?.id ?? null,
       my_inquiry_status: myInqRes.rows[0]?.status ?? null,
     });
   }
   ```

3. `src/app/(app)/item/[id]/page.tsx` data loader:
   ```ts
   useEffect(() => {
     if (!id) return;
     async function load() {
       const [itemRes, meRes] = await Promise.all([
         apiFetch(`/api/items/${id}`),
         user ? apiFetch(`/api/items/${id}/me`) : Promise.resolve(null),
       ]);
       if (!itemRes.ok) { router.replace("/buy"); return; }
       const itemData = await itemRes.json();
       const meData = meRes?.ok ? await meRes.json() : {};
       setItem({ ...itemData, ...meData });
       setIsFav(!!meData.is_favorited);
       setFavId(meData.favorite_id ?? null);
       setLoading(false);
     }
     load();
   }, [id, user, router]);
   ```

**Acceptance.**
- `curl -I https://earlybird.la/api/items/<id>` on second call shows
  `x-vercel-cache: HIT` and cold TTFB on first, <50ms TTFB on hit.
- Signed-in user sees correct heart state on item page.
- Signed-in user sees correct "Already inquired" CTA state.
- Anon user sees item page normally (no 401 on the `/me` call because
  the page doesn't fire it for anons).

**Commit.** `Split /api/items/[id] into cacheable public + per-user /me`

---

### D. Convert `/item/[id]/page.tsx` shell to a Server Component (2-3 hrs, high risk)

**Problem.** The item page is 1907 lines of `"use client"`. On
navigation, the browser waits for JS → hydration → data fetch → render.
Total ~4-6s on mobile. A Server Component shell can fetch the public
item payload server-side and ship it with the HTML, collapsing three of
those four steps.

**Files.**
- `src/app/(app)/item/[id]/page.tsx` — convert to async Server
  Component; reduce to ~40 lines (auth check, fetch, render
  `<ItemView>`)
- `src/app/(app)/item/[id]/item-view.tsx` — new; everything currently in
  page.tsx becomes this, minus the server-doable fetch. Keeps
  `"use client"`.

**Diff shape.**

1. New `page.tsx` (Server Component):
   ```tsx
   import db from "@/lib/db";
   import { notFound } from "next/navigation";
   import ItemView from "./item-view";

   export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;

     const result = await db.execute({
       sql: `/* same query as the current /api/items/[id] public half */`,
       args: [id],
     });
     if (result.rows.length === 0) notFound();
     const item = result.rows[0] as Record<string, unknown>;

     const [photos, market, methods] = await Promise.all([/* same 3 queries */]);

     return <ItemView initialItem={{ ...item, photos, market, dealer_payment_methods: methods }} />;
   }
   ```

2. New `item-view.tsx` (Client Component):
   - `"use client"` at top
   - Takes `initialItem` as prop
   - `useState` seeds with `initialItem`, skips the "loading" branch
     entirely on first render
   - Still fires `/api/items/[id]/me` for per-user bits on mount
   - All existing interactive code (drawer, carousel, edit mode, etc.)
     moves here unchanged

**Risk.** Big file move. Easy to break imports, `useParams` usage
(doesn't exist server-side; `params` is a prop now), `useSearchParams`
(still works in the client child). Needs a full smoke test against:
- Anon view — sees item, photos, inquiry drawer
- Signed-in buyer — sees correct heart + "Already inquired" state
- Dealer owner — sees edit + status controls + inquiries list
- Sold item — sees sold state
- Held item — sees hold badge
- Deleted item — 404s via `notFound()`

**Acceptance.**
- `curl -s https://earlybird.la/item/<id>` returns HTML that contains
  the item title and price (view-source). Previously it only had the
  loading spinner.
- Mobile Lighthouse score on `/item/<id>` improves by ≥20 points on
  Performance.
- All smoke-test cases above still work.

**Commit.** `Item page: convert shell to Server Component — kills the CSR waterfall`

---

### E. Add a Perf QA chunk to `QA_CHECKLIST.md` (30 min, low risk)

**Problem.** The current QA process doesn't measure performance. This
class of regression would not be caught by existing checks.

**Files.**
- `QA_CHECKLIST.md` — add new chunk G or similar

**Content.**
```markdown
## Chunk G: Performance (must pass before any release)

### Cache header audits
- [ ] `curl -I https://earlybird.la/api/items?market_id=<id>` on 2nd
      hit shows `x-vercel-cache: HIT` → evidence: paste header dump
- [ ] `curl -I https://earlybird.la/api/markets` on 2nd hit: HIT → paste
- [ ] `curl -I https://earlybird.la/api/items/<id>` on 2nd hit: HIT →
      paste

### Mobile load timing (real iPhone, LTE-throttled DevTools, cold cache)
- [ ] `/` — TTI < 2.0s → evidence: Lighthouse report
- [ ] `/home` — TTI < 2.5s → evidence
- [ ] `/item/<id>` — TTI < 2.5s → evidence
- [ ] `/buy?market=<id>` — TTI < 3.0s (depends on item count) → evidence

### Interaction latency
- [ ] Inquiry drawer opens in <300ms on iPhone after tap → evidence:
      video or "checked on <device>"
- [ ] "Back to listings" navigation feels instant (no spinner >500ms) →
      evidence

### Bundle size per route
- [ ] No route's first-load JS exceeds 300KB (run `npm run build` and
      check the size column) → evidence: build output paste
```

**Acceptance.** `QA_CHECKLIST.md` has the chunk. `scripts/qa-status.mjs`
picks it up automatically (reads all checkboxes). No future release
passes QA with a perf regression.

**Commit.** `QA: add perf chunk with cache-header, TTI, bundle-size gates`

---

### F. Audit `"use client"` across the app (2-3 hrs, moderate risk)

**Problem.** Every page is `"use client"`. Most can be split into a
Server Component shell + a Client Component for the interactive region.
Same waterfall-elimination benefit as task D, applied to the other hot
pages.

**Files to audit (in priority order).**
- `src/app/(app)/buy/page.tsx` — can fetch market + first-page items on
  server; client part is the infinite scroll + favorites
- `src/app/(app)/home/page.tsx` — read file to assess
- `src/app/early/[marketId]/page.tsx` — same shape as /buy
- `src/app/(app)/d/[id]/page.tsx` — dealer profile, should be mostly
  static
- `src/app/(app)/dealer/page.tsx` — similar

**Files to leave alone.**
- `/sell`, `/sell/add`, `/account`, `/watching`, `/admin/*` — heavily
  interactive, keep as client.

**Approach.** For each candidate:
1. Extract the data-fetching `useEffect` into a server-side fetch in the
   page file.
2. Create a sibling `*-view.tsx` client component that takes
   `initialItems` / `initialMarket` as props.
3. Move all interactive code (hooks, handlers) into the view component.
4. Keep the shell page file minimal.

**Acceptance.**
- `grep -rn '"use client"' src/app/(app)/buy src/app/(app)/home
  src/app/early` shows only the `-view.tsx` files flagged as client.
- Each converted page returns full item data in the initial HTML
  (verify via view-source).
- Lighthouse mobile Perf score >= 80 on each.

**Commit.** One commit per page converted (~5 commits).

---

## Execution order and session budget

| Session | Tasks | Rough time |
|---|---|---|
| This session (2026-04-22) | A, B, C | ~70 min |
| Next session | D | 2-3 hrs |
| Session after | E, F | 3-4 hrs |

D and F combined is too big for one session unless context is huge.
Split D (item page) from F (other pages) so the next session can ship D
to prod and validate before starting F.

## Rollback

Every commit is atomic per task. If B breaks a drawer in an unexpected
way, `git revert <sha>` and the site is back to pre-fix state — which
was bad but working. Same for C and D. No task depends on prior tasks
landing; they're independent improvements.

## Success criteria (post all 6 tasks)

- `/item/<id>` Lighthouse mobile Perf: **>= 80** (from unmeasured/bad
  baseline)
- `/api/items/<id>` 2nd-hit TTFB: **<50ms** (from 400-800ms)
- Inquiry drawer open-to-tap latency on iPhone: **<300ms** (from
  1000-3000ms)
- "Back to listings" perceived load: **<1s** on LTE (from 3-5s)
- QA_CHECKLIST.md has a measurable perf gate that catches regressions

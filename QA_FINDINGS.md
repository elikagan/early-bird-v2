# QA_FINDINGS.md — Early Bird

Running log of QA findings. Each item: `[category/severity] title — detail + proposed fix`.

- **Categories:** `function` / `copy` / `design` / `plumbing`
- **Severity:** `blocker` (ship-stopper) · `major` (fix before next meaningful use) · `minor` (fix soon) · `polish` (nice-to-have)

---

## Chunk 1 — Auth + Inquiry (2026-04-22)

### Major

- **[function/major] Sign-up drawer uses native `alert()` for phone errors.** When the user types a bad phone, `src/components/signup-drawer.tsx:49` calls `alert(result.reason)` — a browser system dialog. Unstyled, blocks the page, feels broken. **Fix:** add an inline error state under the input, same pattern as the inquiry drawer (`anonError`).

- **[function/major] Sign-up drawer silently swallows rate-limit errors.** `signup-drawer.tsx:57–61` only branches on `res.ok`. If `/api/auth/start` returns 429 ("Too many sign-in attempts. Try again in an hour."), the UI silently flips the button back to "SIGN IN" with no explanation — user thinks nothing happened and tries again. **Fix:** parse the response error and show it inline.

- **[function/major] `/api/auth/start` doesn't normalize the phone.** `src/app/api/auth/start/route.ts:42–50` writes the phone exactly as received. The signup drawer normalizes client-side, but any other caller (admin tool, future surface) could bypass → duplicate user rows, split rate-limits, split magic-link histories. **Fix:** call `normalizeUSPhone` at the top of the route and reject on failure.

- **[copy/major] Dealer approval SMS uses the "invite" template.** Already in `KNOWN_DEBT.md`. An applicant who applied and was approved gets "You've been invited to sell on Early Bird" — wrong framing. Ratified approval copy: *"Early Bird: Welcome aboard. You're approved to sell. Tap here to set up your booth: [link]"*. **Fix:** new `composeDealerApproval(url)` template, wire into `/api/admin/applications/[id]/approve`.

### Minor

- **[function/minor] Anonymous inquiry: no dedup before the buyer confirmation SMS.** `src/app/api/inquiries/route.ts` anon path always mints a fresh token and sends a confirmation SMS, even if the buyer already has an open inquiry on the same item. The verify route does eventually dedupe the inquiry row, but the confirmation SMS already went out. Minor SMS waste + mild annoyance. **Fix:** if an open inquiry already exists for this phone+item, skip the token mint and return a friendly "you already inquired" state.

- **[function/minor] Inquiry message has no max-length check.** Client has no counter, server has no cap. A 5,000-char message breaks SMS formatting (dealer sees truncation). **Fix:** cap at ~500 chars server-side with a clear error; mirror with a char counter in the drawer.

- **[plumbing/minor] `/auth/verify?token=…` page is orphaned legacy.** `src/app/auth/verify/page.tsx` is an older pre-`/v/[token]` flow with no support for inquiry-confirm, early-access, dealer-invite, or phone-change branches. Nothing in the current code links here. **Fix:** grep once more for stale SMS links that point to it, then delete the folder.

- **[copy/minor] `composeMagicLink` SMS is extremely bare.** `"Early Bird\n\n{url}"` — a first-time recipient might not instantly recognize this as the sign-in link. **Fix:** one-word add → `"Early Bird sign-in link:\n\n{url}"` or similar. Small, low-risk.

- **[plumbing/minor] `composeSoldReceipt` has 3 unused legacy args.** `_boothNumber`, `_marketName`, `_marketDate`. Simplify signature + all callers.

- **[plumbing/minor] Phantom SMS templates stay in the file.** Already in `KNOWN_DEBT.md`: `composeHoldReceipt`, `composeLostReceipt`, `composeDropAlert` — defined but never called. **Fix:** delete from `src/lib/sms-templates.ts`.

### Polish

- **[design/polish] Sign-up drawer has no close X button.** Only dismisses via backdrop tap. Add a small X top-right so the dismiss is obvious.

- **[copy/polish] Sign-up drawer headline is "SIGN IN" for new + returning users.** Comment in the code notes the backend doesn't distinguish, but a new visitor might hesitate. Consider "GET YOUR LINK" or "SIGN IN / SIGN UP."

- **[plumbing/polish] `/invite/[code]` duplicates `formatPhone` logic.** `src/app/invite/[code]/page.tsx:10–20` hand-rolls phone formatting; shared helper exists in `@/lib/format`. Delete the local version.

- **[copy/polish] `/invite/[code]` requires "Business name."** Some dealers are individuals. Either make the label more forgiving ("Business or your name") or make the field optional.

---

## Chunk 2 — Buyer Surfaces (2026-04-22)

Surfaces audited: `/`, `/home`, `/buy`, `/item/[id]` (inquiry UX), `/watching`, `/account`, `/onboarding`, `/early/[marketId]`, `/d/[id]`.

### Major

- **[copy/major] `/home` (signed-in buyer) still has hardcoded "Open now" eyebrow.** Same bug I fixed on `/` is duplicated here. `src/app/(app)/home/page.tsx:159`. **Fix:** use the new `marketEyebrow()` helper from `@/lib/format` so signed-in users see "Pre-shopping now" when the market is more than a day away.

- **[copy/major] Market hero eyebrow is inconsistent across surfaces.** Three different voices for the same concept:
  - `/` → "Pre-shopping now · 4.26 · DOWNTOWN LA" (just fixed)
  - `/home` → "Open now · …" (broken, finding above)
  - `/buy?market=[id]` → no eyebrow at all, just date + location
  - `/early/[marketId]` → "Pre-shop online via Early Bird" (wordier, different tone)
  - `/d/[id]` → likely similar inconsistency (not fully read)
  **Fix:** all five use the same eyebrow shape via `marketEyebrow()`. Consistency matters more than clever copy.

- **[design/major] Heart button hit area is 32 × 32 px** — under Apple's 44 × 44 HIG recommendation. `globals.css:159-164` defines `.eb-grid-card .eb-fav` at 32px. On a 2-column grid card, the tap target is too small for reliable thumb use. **Fix:** bump to 40px with 4–6px inner padding, or enlarge the tap area with padding without visually bloating the icon.

- **[copy/major] `/watching` logged-out CTA says "Sign up →"** while the app's consistent language is "Sign in." `src/app/(app)/watching/page.tsx:87`. Creates false expectation of a separate sign-up flow. **Fix:** change to "Sign in →" for consistency.

### Minor

- **[plumbing/minor] `daysUntilLabel` is duplicated** byte-for-byte in `src/app/page.tsx:42–55` and `src/app/(app)/home/page.tsx:45–58`. **Fix:** move to `@/lib/format` and import from both.

- **[function/minor] `/onboarding` silently follows the first 2 markets by default.** Line 74–76: `data.slice(0, 2).forEach((m) => initial.add(m.id))`. A brand-new buyer who just wants to browse ends up subscribed to two specific shows without explicit consent. **Fix:** start with zero selected, require the user to tap the ones they want.

- **[function/minor] `/account` phone-change "Done" button doesn't reset state cleanly.** When the user hits "Done" on the sent-state banner, `setPhoneSent(false)` but `phoneValue` stays populated. If they reopen the form they see the previous phone. **Fix:** reset `phoneValue` along with `phoneSent`.

- **[design/minor] `/account` sign-out uses an inline confirm** where every other confirm in the app uses a bottom drawer (`src/app/(app)/account/page.tsx:920`). Breaks pattern consistency. **Fix:** either move to a drawer to match, or standardize the whole app to inline confirms (pick one).

- **[copy/minor] `/onboarding` heading says "Follow markets" for buyers but "Markets you sell at" for dealers** — same checkbox UI, two different framings. "Follow" is the right word for buyers but it's a soft term that new users may not grok. **Fix:** say "Shows I want updates about" (buyer) and "Shows I sell at" (dealer) — plain English, parallel structure.

- **[design/minor] `/onboarding` has no avatar upload for BUYER signup** — only dealers get the photo step. Not necessarily a bug, but a buyer can't set an avatar until they navigate to `/account` later. **Fix:** either add an optional avatar step for buyers too, or accept the current behavior but make it clearer in `/account` that you can upload.

- **[copy/minor] `/watching` empty-state says "Tap the heart on any item to save it here."** but anon visitors don't see hearts on grid cards in `/buy` (they're gated on `user &&`). A cold visitor won't see where to tap. **Fix:** empty copy could acknowledge this: "Sign in, then tap the heart on any item to save it here."

### Polish

- **[design/polish] Market grid card is re-implemented 5 times** (`/`, `/home`, `/buy`, `/watching`, `/early`, `/d/[id]` — 6 actually). Same `eb-grid-card` classes, slightly different rendering per page. Ripe for a shared `<ItemGridCard>` component. Reduces drift and makes consistent behavior (hit areas, hover states) trivial.

- **[design/polish] `/account` small inline buttons ("edit", "change")** are plain text links inside the profile row. Hit area likely well under 44px. **Fix:** add padding so the tappable area is real; keep the visual text-only treatment.

- **[copy/polish] `/onboarding` primary CTA "START SHOPPING"** feels like retail yelling. More Early-Bird-voice would be "Let's go" or "I'm in." Minor, and "START SHOPPING" is fine.

- **[plumbing/polish] `/onboarding` buyer doesn't include Instagram or photo, but dealer signup does — shared component could handle both modes.** Not urgent; the explicit conditionals read fine today.

### Good things I want to note (so we don't regress)

- `/early/[marketId]` and `/d/[id]`: both publicly accessible (the "open question" about SMS gating was a false alarm — there's no gate; the /api/early-access/start flow is a separate optional path, not a blocker). Anon favoriting via localStorage works cleanly. Seeded shuffle keeps page render stable across refreshes.
- `/account` optimistic updates with rollback on failure (payment methods, notification toggles, market subscriptions) — this is the right pattern. Preserve it.
- `/account` phone change has a proper "Check your new phone" acknowledgment state — good.
- Sign-out requires explicit confirmation — good.
- Empty states exist on `/watching`, `/buy`, `/early`, `/home` (between-shows). No blank dead screens.

---

## Chunk 3 — Dealer Surfaces (2026-04-22)

Surfaces audited: `/sell`, `/sell/add`, `/item/[id]` (dealer-owner view), `/invite/[code]`, `DealerApplyDrawer`, dealer side of `/account` (covered in Chunk 2).

### Major

- **[function/major] `/sell` grid "Mark Sold" is instant — no confirmation, no buyer picker.** `src/app/(app)/sell/page.tsx:507–515` calls `updateItemStatus(id, "sold")` with no `sold_to`. If the item has an inquirer, the winning buyer never gets their "Sold to you" text because the server only fires SMS when `sold_to` is specified. The /item/[id] dealer view has proper drawers (`confirmInquiry`, `confirmWalkupSold`) for exactly this decision. **Fix:** from /sell grid, Mark Sold should navigate to /item/[id] (status picker there) rather than patching in place. Same for Hold — destructive changes deserve confirmation.

- **[function/major] "Share your booth" displayed URL doesn't match the URL that gets copied.** `src/app/(app)/sell/page.tsx:394–410`: the box shows `earlybird.la/d/{dealer_id}` but `navigator.clipboard.writeText()` copies `/d/{dealer_id}?market={market_id}`. Dealers think they're copying the short URL they see. **Fix:** either show the full URL with the market param, or share the short URL and resolve the market server-side when visited.

- **[design/major] /sell/add photo remove "X" button is 24 × 24px.** Same class of hit-area bug as the heart button I fixed in Chunk 2. `src/app/(app)/sell/add/page.tsx:271–276`. **Fix:** bump to 44px; keep the X glyph small visually with invisible padding around it.

- **[function/major] `updateItemStatus` on /sell grid has no loading state.** A double-tap during slow network fires two PATCH requests. **Fix:** disable buttons while an update is in flight; ideally combined with the "navigate to detail page" fix above.

### Minor

- **[copy/minor] DealerApplyDrawer + /invite/[code] still say "Business Name" in the label.** I fixed this for /invite already but DealerApplyDrawer (`src/components/dealer-apply-drawer.tsx:87`) also needs the same "Business or Your Name" treatment. Some applicants sell as themselves.

- **[design/minor] DealerApplyDrawer has no close X button** — only dismisses via backdrop tap. Same pattern I fixed in signup-drawer should apply here for consistency.

- **[function/minor] DealerApplyDrawer requires Instagram.** `submit` disabled if `!ig.trim()`. Fine for vetting, but some dealers don't have IG. **Fix:** make it optional with a note like "link any shop you have (Instagram, personal site, etc.)" OR surface "no IG? reach out to Eli" fallback.

- **[function/minor] Booth editor strips all non-alphanumeric characters.** "A-12" → "A12", "B/4" → "B4". Real booths use dashes and slashes. **Fix:** allow `-` and `/` in the character filter.

- **[function/minor] Booth editor save is optimistically applied with no error recovery.** If POST fails, the UI keeps showing the typed value but the server has the old one. **Fix:** on failure, revert `boothNumber` and show an inline error; match the pattern used in /account's optimistic toggles.

- **[design/minor] Redundant Add Listing buttons.** `/sell` has both a top bar link and a FAB. Pick one — FAB alone is more thumb-reachable on mobile.

### Polish

- **[copy/polish] `/sell` "Your booth at" prefix reads awkwardly** when combined with the business name: "Klassik booth at Rose Bowl Flea Market" is fine but "Sometimes Modern Vintage booth at Downtown Modernism" is a tongue-twister. **Fix:** just say "Your booth · {market}" or drop the "at" prepositional flow.

- **[function/polish] `/sell` has no sort or filter.** Plan mentioned "sort by market or status." Today items appear by creation order only. Not urgent for 10 active dealers.

- **[design/polish] `/sell` grid cards don't show a photo count** when an item has multiple. Not critical; dealers know what they uploaded.

- **[function/polish] `/sell/add` back button uses `router.back()`** — lands nowhere if the user arrived via a direct URL. Could be a `Link` to `/sell` instead. Edge case.

- **[plumbing/polish] `/sell/add` form has no confirmation before navigating away with unsaved data.** A user who accidentally taps Back after filling out title/price/photos loses the draft. Low priority since our current user base is engaged.

### Good things to preserve

- `/item/[id]` dealer view has proper `confirmInquiry` and `confirmWalkupSold` drawers — destructive-action confirmation is there and explains what happens (SMS to buyer, deal is between buyer and dealer, no undo). Preserve this shape; the /sell grid fix above should route dealers into these drawers.
- `/sell` pre-subscription banner for legacy dealers who redeemed before subscriptions existed — nice backfill UX, tells them to pick their shows without breaking their flow.
- `/sell` stats row (listed, views, watchers, inquiries) gives dealers signal without being overwhelming.
- Show switcher drawer is clean and handles "current" + disabled-closed states explicitly.
- /sell/add photo upload is parallel (non-blocking), shows per-photo status (processing / uploading / done / error), and caps at 5.

---

## Chunk 4 — Admin Tools (2026-04-22)

Surfaces audited: /admin Dashboard, Markets, Dealers, Items, Blast (new), SMS (generic), Health tabs.

### Major

- **[design/major] Admin uses native `confirm()` for destructive actions.** Browser-default dialog — unstyled, looks broken, inconsistent with the rest of the app. Places:
  - `:414` delete market
  - `:812` change user role
  - `:1326` delete item
  - `:2019` send dealer blast *(from the blast tool I built — have to fix my own)*
  Meanwhile SmsTab (generic blast) uses a proper inline styled confirm — we have the pattern, just not applied consistently.

- **[design/major] Admin uses native `alert()` for error states.**
  - `:418` market delete failure
  - `:1608` SMS blast failure
  Should be inline error text or drawer, never the browser alert box.

- **[function/major] `dealer_preshop_enabled` toggle in Markets edit form does nothing.** Known debt — admin checks/unchecks, it saves to the database, but no backend code reads the column. Misleading; admin thinks they're controlling something. Remove the toggle until it's either wired up or the column is dropped (Chunk 6).

- **[function/major] Create Market form fails silently.** If the admin leaves a required field blank, the Create button does nothing. If the POST fails server-side, nothing is shown. Add visible validation + error message.

### Minor

- **[design/minor] Dashboard stat cards are clickable but don't look it.** They render with the same `.eb-stat` class as the read-only stats on `/sell` and `/account`. No hover / affordance hint. Add a subtle "tap-to-view" affordance (cursor, underline, or chevron).

- **[function/minor] Dealer change-role auto-sets `business_name: "New Dealer"` when promoting a buyer to dealer.** Placeholder text the admin has to edit after. Better: leave it blank and prompt the admin to enter a real name before save.

- **[copy/minor] Admin "Sign-in" → dealer conversion flow** needs "Business or Your Name" wording like /invite/[code] now has. Check after the role promotion works.

### Polish

- **[plumbing/polish] admin/page.tsx is ~2000 lines.** Candidate for a future split into per-tab files. Not urgent; the file reads cleanly.

- **[function/polish] Dashboard Recent Actions has no filter / pagination.** Shows the last N; older actions inaccessible. Edge case.

- **[function/polish] Health tab polls every 30s.** Fine for low-traffic admin.

### Good to not regress

- HealthTab layout (System status, Last 24h, Business, Recent events) — clean.
- MarketsTab CopyShareLink falls back to `window.prompt` if the clipboard API is denied — solid defensive pattern.
- All admin API routes properly gated by `isAdmin(user.phone)` (verified earlier).
- The new Blast tab (personalized-link dealer blast) and the old SMS tab (generic broadcast) serve different use cases — keeping both is correct.

---

## Chunk A — Admin QA walk (2026-04-22, real visual audit)

Walked all 7 admin tabs at 375×812 and 1280×800. Screenshots + accessibility snapshots captured in `qa-evidence/admin/`. DB stat counts verified (exact match — 19 dealers / 9 buyers / 50 items-this-week / 0 sold-this-week).

### Blocker

- **[design/blocker] Admin tab bar overflows on mobile.** On every tab: the 7 pill labels (DASHBOARD / MARKETS / DEALERS / ITEMS / BLAST / SMS / HEALTH) run past the 375px viewport edge and visibly COLLIDE. The first word of tab 2 ("MARKETS") overlaps into "DASHBOARD" → renders as "DASHBOARDARKETS". Every admin screen starts with this broken-looking header. This is the #1 reason Eli said admin "looks fucking terrible."
  - **Fix:** tab bar needs horizontal overflow-scroll OR a responsive mobile treatment (hamburger menu / bottom-sheet picker / collapse into a dropdown under a single "ADMIN · {current}" label).

### Major

- **[design/major] Admin is mobile-width-only on desktop.** The admin shell renders in a ~430px column centered on a 1280px desktop, wasting ~70% of horizontal space. Desktop admin (managing dealers, markets, items, blasts at scale) deserves desktop layout: wider tables, sidebar nav, multi-column forms. Every admin tab inherits this constraint.

- **[copy/major] Dashboard "Recent Actions" shows raw event type strings** (`send_dealer_blast`, `send_blast`) instead of human-readable labels. No admin name, no market context, no counts. Should read like `Eli sent dealer blast to 29 — Downtown Modernism`.

- **[design/major] Dashboard stat labels wrap awkwardly.** "ITEMS / WK →" breaks to two lines on both mobile and desktop, orphaning the arrow. Caused by the arrow fix in `5393100` pushing the label past the container's tight width. Either tighten label ("ITEMS/WK →"), shorten arrow to "›", or widen the stat card.

- **[function/major] Admin Items tab has inline LIVE / HOLD / SOLD status buttons that bypass the proper flows.** Same anti-pattern I removed from `/sell` grid in commit `443e157` — admin can tap "SOLD" directly on a row, setting `status='sold'` with no `sold_to`, so the winning buyer never gets the "sold to you" text and no confirmation prevents accidents. Should route to `/admin/items/[id]` (or `/item/[id]`) where the proper confirm drawer lives.

- **[function/major] Admin UI lacks an "admin mode" indicator.** The only cue you're in /admin is the tab bar itself. An admin taking screenshots / screen-sharing has no visual confirmation of elevated role. Add a small `ADMIN` chip near the logo or a distinct masthead color.

### Minor

- **[plumbing/minor] `/api/auth/dev-login` creates test users in the production DB.** Because local dev points `.env.local` at prod Supabase, the dev-login endpoint (even though prod-gated) inserts "Test Admin", "Test Buyer", "Test Dealer" rows into prod every time a QA session runs. Fixed by the cookie-setting commit `87bc50a` — but the data-leak concern remains. Either prefix test user IDs with `_qa_` for easy cleanup, or require a separate dev DB.

### Good, preserve

- Blast tab layout is actually clean — clear summary, editable copy, preview, two-button send flow.
- SMS tab blast history is a nice touch, shows past sends with sent/fail counts inline.
- Health tab cards (System status / Last 24h / Business) are well-organized.
- Stats on dashboard are accurate vs DB — `qa-evidence/admin/dashboard-counts.json` confirms exact match.

### Not walked in this session (deferred — either blocked or repetitive of patterns above)

- Markets tab: create market → verify DB write, edit existing market, archive/unarchive, delete with confirm (ConfirmDrawer confirmed installed in commit `11e48be`).
- Dealers tab: search, expand row, edit business name, toggle verified, approve application, invite link flow.
- Pending-blast review page: insert test row + walk.
- Admin API gating: hit /api/admin/* with no session / non-admin session.

These are ticked as "needs walk" — the patterns above (mobile-width, no `md:` responsive, tab overflow) will recur on each of them and the fixes are shell-level, not per-tab. Once the shell is fixed, walking these becomes faster.

---

## Chunks C + D — Buyer and Anon walks (2026-04-22)

### Dealer chunk (only /account bug worth noting)

- **[function/major] `/account` throws a React hook-order violation at runtime.** `toggleMarketReminder` was declared via `useCallback` AFTER an `if (loading || !profile) return <spinner/>` early return — first render (profile null) skipped the hook, second render added it, React logged "change in the order of Hooks." **Fixed in commit `98b409b`.** Caught only by opening the page; static code reading missed it.

### Buyer (/home, /buy, /watching, /onboarding)

- **[function/major] Onboarding has TWO redundant market-reminder sections.** The first ("Shows I want updates about") renders `/api/markets` entries as checkboxes — which includes full market names like "Palm Springs Vintage Market" and "PCC Flea", not the canonical SHOWS list. Ticking them writes `market_follows` rows with `drop_alerts_enabled=true`, but the drop cron is retired (deleted in an earlier chunk), so these follows don't do anything. The second section ("Market Reminders") below is the real per-show opt-in using `notification_preferences.market_reminder_<slug>`. **Fix:** remove the first section, OR repurpose it to write to the per-show notification_preferences.

- **[copy/minor] PCC Flea shows up in onboarding's shows list** but isn't in `src/lib/shows.ts` SHOWS const. That means dealer reminders for PCC Flea won't find recipients via `dealer_market_subscriptions`, and buyer reminders won't have a `market_reminder_pcc_flea` key. Either add PCC Flea to SHOWS, or drop the PCC Flea market from active rotation until the SHOWS list is updated.

- `/home` (buyer): clean render, no bugs visible. My Chunk 2 `marketEyebrow` + `daysUntilLabel` fixes landed correctly.
- `/buy?market=<id>`: clean render, 44px heart buttons present with outline/filled states.
- `/watching` (empty state): "Nothing watched yet. Browse items, then tap the heart..." — my Chunk 2 copy fix landed.

### Anon (/, /early/[id], /d/[id], /dealer)

- **[design/minor] Heart inconsistency between /buy (anon) and /early/[id] (anon).** `/early/[marketId]` shows hearts to logged-out visitors and stores favorites in localStorage (anon-favorites.ts). `/buy?market=<id>` gates hearts behind `user &&` so anon visitors can't heart items there. **Fix:** either enable anon hearts on /buy with the same localStorage fallback, or hide hearts on /early for anon for consistency. The first option seems more user-friendly given anon browsing is encouraged.

- `/` (landing): eyebrow updated to "PRE-SHOPPING NOW · 4.26 · DOWNTOWN LA", looks clean. Shows items, coming-up list, About + FAQ.
- `/early/[marketId]`: renders cleanly, hearts with anon-favorites localStorage working, masthead shows "SIGN IN →".
- `/d/[id]` (dealer share): renders cleanly, shows dealer business_name as hero, their items + "ALSO AT THIS SHOW" section.
- `/dealer` (seller splash): clean marketing page. "FOR DEALERS" eyebrow, "Sell before sunrise." tagline, feature list.

# QA_PLAN.md — Early Bird

Drafted 2026-04-22. Not yet approved. Do not execute any chunk without Eli's explicit sign-off.

---

## Method

I audit as a professional — a senior designer + engineer who understands the product. Not a checklist runner. The test for every surface is: **does this serve the user in a way that advances what Early Bird is trying to do?** (pre-shopping tool for LA flea market dealers and buyers → connect them quickly, get out of the way).

For each surface I walk through with these eyes:

### 1. Does it make sense?
- Is it obvious what this screen is for within 2 seconds of landing?
- Does the copy explain the "why" where the user would ask one, and stay out of the way where they wouldn't?
- Is there jargon ("subscribe", "authenticate", "audience") where plain English would do?
- Is every piece of copy true and consistent with the product model? (no more "customers arriving Thursday" — if I'd grounded in EB_DESIGN.md I wouldn't have written that)
- Does the copy sound like a real person (Eli + Dave's voice) or like a SaaS robot?

### 2. Is it easy to use?
- Does the screen follow patterns people already know? (standard back button top-left, primary CTA bottom or fixed, sign-in = tap a link in a text)
- Is the primary action obvious? Is there exactly one primary CTA per screen?
- Are inputs the right type on mobile? (`inputmode="tel"` for phone, `inputmode="numeric"` for price, `type="email"` where applicable)
- Can the user recover from mistakes — back, edit, undo?
- Destructive actions (delete, archive, send blast) have a real confirm step — not a single tap.

### 3. Does it look good?
- **Typography:** JetBrains Mono (brand) and Inter (`font-readable`, for long-form). Audit where each is applied, flag stray system fonts / Helvetica / serif leaks, inconsistent weight/size hierarchy, same thing styled two ways on two pages.
- **Spacing + rhythm:** consistent vertical rhythm, visual groups hold together (related fields live together, spacing says so), no cramped rows, no lonely elements floating mid-screen.
- **Alignment + grid:** everything lines up to the same grid; no one element off by 3px.
- **Color:** only tokens from `tailwind.config.js` (`eb-*` palette). No stray hex values.
- **Legibility:** body text ≥ 15px, line-height generous enough to read comfortably, contrast passes WCAG AA.
- **Visual consistency:** "card" means one thing across the app. Buttons look like each other. Pills look like each other. If two pages disagree about what "selected" looks like, that's a bug.

### 4. Does it actually work?
- **Interactive elements:** every tap lands. Touch targets ≥ 44px on mobile per Apple HIG. Links look like links, buttons look like buttons — don't style a button to look like a link or vice versa unless deliberate.
- **Feedback:** every action gets visible feedback (loading spinner, success toast, state change). No silent successes or silent failures.
- **States for every screen:** loading state, empty state, error state, success state. No blank screens. No "nothing happened" after a tap.
- **Real device check:** iPhone Safari render, not just Chrome desktop dev-tools. Keyboard-aware drawer positioning, bottom-nav gestures, tap delays, scroll lock in modals.
- **Forms:** inline validation on the field, error messages near the field, disabled/loading submit button, no double-submit, the form remembers what you typed if it errors.
- **Honesty:** if an action needs an admin to approve it, say so. If an item is held or sold, show that. Never pretend something succeeded if it didn't.

### 5. Does it hold up under stress?
- Break it on purpose: empty inputs, too-long inputs, bad images, network failures, double-clicks, refresh mid-action, going back in the middle, hitting the URL directly without setup.
- Edge cases from real data: no items in a market, no markets at all, deleted item id, expired magic link, already-used token, banned phone, blocked number.
- First-time user: can someone land on `/` cold and figure out what Early Bird is and what to do next?

### 6. Is the plumbing clean?
- **Gates:** admin routes 404 for non-admins; dealer routes 404 for non-dealers; signed-in-only routes redirect anon to sign-in.
- **DB:** right rows written, right status, SMS event logged with the right `entity_id`.
- **Dead code + TODOs:** catch any leftover stubs, `console.log`, placeholder text, links to nowhere.

---

Every finding goes into `QA_FINDINGS.md` with:
- **Category:** `function` / `copy` / `design` / `plumbing`
- **Severity:** `blocker` (ship-stopper) / `major` (fix before next meaningful use) / `minor` (fix soon, not urgent) / `polish` (nice-to-have)
- **Repro:** exact steps
- **Proposed fix:** specific, minimal

Nothing gets "fixed while I'm in there." Fixes come after you've seen the list and approved them.

---

## Chunks (priority order)

### Chunk 1 — Auth + Inquiry (most critical)
If either of these is broken, the whole product is broken.

- Sign-in by phone → magic link → session → home page
- Sign-out → cookie + localStorage cleared, /account redirects
- Anonymous inquiry from /item/[id]: enter name + phone → verify SMS → dealer gets texted → redirect to item w/ confirmation
- Signed-in inquiry: immediate dealer SMS, no verify step
- Edge: double-submit, expired token, already-used token, bad phone format, wrong phone on confirm, refresh during verify
- DB check: correct rows written in `auth_tokens`, `sessions`, `inquiries`, `favorites`; SMS events logged

### Chunk 2 — Buyer browse surfaces
Verify every page an anonymous or signed-in buyer might see.

- `/` anon: featured market, 8 items, upcoming markets list, FAQ, sign-in drawer
- `/home` signed-in buyer: same shape + personalized
- `/buy?market=[id]`: market-specific grid, scroll, pagination if any
- `/item/[id]`: photo carousel, price, dealer name, "I'm Interested" button
- `/watching`: favorites list, heart toggles, empty state
- `/account` (buyer): name edit, phone change flow, market opt-ins per show, sign-out
- `/onboarding` first-time: name + SMS consent + per-show subscriptions
- `/early/[marketId]` + `/d/[id]`: the ad-share pre-shop links (OPEN QUESTION about intended behavior — will investigate before testing)
- Edge: unknown market id, deleted item id, item marked sold, market status=upcoming/live/closed

### Chunk 3 — Dealer surfaces
Every dealer-only page and the item lifecycle.

- `/sell`: list by market + status, booth-number setter, market switcher, sort
- `/sell/add`: upload 1–5 photos (incl. iPhone HEIC), title/price/description, price-firm toggle, market selection
- `/item/[id]` dealer view: full edit (title/price/description), photo reorder/replace, status picker (live/hold/sold/deleted), sold-to-buyer picker, inquiry log read-only view
- `/account` (dealer): business name, Instagram handle, payment method checkboxes, SMS opt-out for new inquiries, phone change
- Item lifecycle: post → receive inquiry → mark held → mark sold to a specific buyer (verify they get "congrats" SMS) → lower price (verify watchers get one-time drop SMS)
- Dealer application flow from `/home` as a plain buyer
- Invite redemption via `/invite/[code]` (cold invite) and verify end-to-end
- Edge: save with no photos, delete in-use item, duplicate booth number, sold_to a user that hasn't inquired

### Chunk 4 — Admin tools full tour
Every admin tab, including the new blast tool.

- Dashboard: stat cards are accurate (cross-check against DB), recent actions feed
- Markets: create / edit / archive / status flip / is_test, dealer count + item count accuracy
- Dealers: search / edit / verified flag / payment methods edit, application approval fires approval SMS (currently uses invite template — P2 to fix)
- Items: filter by market + status, admin-edit any item, soft-delete
- Blast: preview count, edit copy, Send Test to Me, Send to N (don't actually fire; verify UI shape + SMS log)
- SMS (generic): old blast UI, market-specific dealer/buyer targeting
- Health: SMS success rate, last cron heartbeat, DB probe latency
- Edge: non-admin tries `/admin/*` via URL (should 404 — just verified this shape)

### Chunk 5 — SMS templates + send paths
Audit every text that can leave the system.

- For each of the 8 allowed texts (per EB_DESIGN.md #4): trace the send path in code, verify copy exactly, verify the gate (only admin can send; only owner's action triggers; etc.)
- Flag phantom templates (`composeHoldReceipt`, `composeLostReceipt` — unused; in KNOWN_DEBT)
- Verify dealer approval uses invite template (wrong per EB_DESIGN commitment #4 item 7 — P2 in debt)
- Verify NO market reminders are currently going out (expected — commitment #4 items 5+6 not built)
- Verify NO `sms.inquiry.lost` events are being written (dead event type)
- Verify SMS retry + backoff works (simulate Pingram failure — temporary stub)

### Chunk 6 — Crons + cleanup
Verify the two real crons and strip the dead one.

- `/api/cron/ops-check` every 15 min: verify last N heartbeats exist in `system_events`; verify alert threshold logic against synthesized bad data
- `/api/cron/prune-events` weekly Sunday 4am UTC: verify it ran last Sunday; verify it actually deletes old rows
- `/api/cron/drop-markets`: confirm it's not in `vercel.json` schedule anymore, then delete the file + `composeDropAlert`
- Drop-era column cleanup (`markets.drop_notified_at`, `markets.dealer_preshop_enabled`, `items.held_for`): write a migration to drop them
- Stale docs: `RESKIN_PLAN.md`, `PHASE_1_REVIEW_NOTES.md`, `REVISION_LOG.md` — review and archive if done
- `CLAUDE.md` references: update to point at current `EB_DESIGN.md` and note archived files
- `qa-comments.json` + `/api/qa-comments`: decide — keep with a dev-only gate, or remove

---

## Time estimate

Rough, per chunk, assuming no blockers:

| Chunk | Scope | Est. |
| --- | --- | --- |
| 1 — Auth + Inquiry | Core flows, 2 roles, all copy + dialogs | 60–90 min |
| 2 — Buyer surfaces | 8 routes + edges + full copy/design pass | 90–120 min |
| 3 — Dealer surfaces | 5 routes + item lifecycle + copy/design | 90–120 min |
| 4 — Admin tools | 7 tabs + copy/design | 60–90 min |
| 5 — SMS audit | 8 templates exact wording + retry logic | 45–60 min |
| 6 — Crons + cleanup | Verify 2 crons, delete dead | 30–45 min |

**Total:** ~6–9 hours of audit work including copy + design passes. Fixes are additional.

---

## Execution model

1. You pick a chunk (or say "all" in the listed order).
2. I audit it fully. I do NOT fix along the way — findings go into `QA_FINDINGS.md`.
3. I come back with the findings for that chunk: short list, severity-tagged, each with a repro + proposed fix.
4. You approve fixes per item (or batch). I fix in a separate commit per item (or per coherent batch).
5. Re-verify the fix, then move to the next chunk.

No chunk bleeds into the next. No "while I'm in there" scope creep.

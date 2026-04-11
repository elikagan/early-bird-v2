# Early Bird — Product Design Document

## What This Is

This is the definitive reference for what Early Bird is, who it's for, how it works, and why. This document supersedes all previous plans, roadmaps, and partial specs.

> **Currently in Phase 1 revision.** Wireframes are built and under review. Sessions must follow the "Phase 1 Revision Workflow" section further down (one screen per session, no batching). Read that section + `PHASE_1_REVIEW_NOTES.md` + the ONE target wireframe file — nothing else. The rules in that section override default behavior.

---

## The Idea

Every weekend across Los Angeles, thousands of people wake up before dawn to go treasure hunting at flea markets. They arrive in the dark with flashlights, scanning dealer tables as they're being set up, hoping to find the one piece that makes the trip worth it. The best stuff goes fast. If you're not early, you're too late.

Dealers, meanwhile, load trucks the night before, drive out at 4am, set up tables in the cold, and hope the right buyers show up. They have no way to signal what they're bringing. Buyers have no way to know what's coming. The entire marketplace runs on luck and timing.

**Early Bird fixes this.** The evening before a market, dealers post photos and prices of what they're bringing. Buyers shop the drop from their couch, favorite the pieces they want, and reach out to dealers directly — before the crowd arrives.

The name is literal: the early bird gets the worm. But now "early" means the night before, not 4am.

---

## Who It's For

### Buyers
Design professionals, antique dealers, collectors, interior designers, DIY enthusiasts in LA. People who love flea markets but hate the uncertainty. They want to shop the drop before committing to a 6am alarm. They shop on their phone, save things they like, and reach out to dealers directly.

A buyer only buys. They don't also sell. Their experience is: browse, favorite, inquire, buy.

### Dealers
Independent vendors who work the LA flea market circuit. They bring furniture, vintage clothing, art, lighting, ceramics — curated inventory, not junk. They set up in the same booth at the same markets month after month. They know their regulars by name.

A dealer is also a buyer. They browse other dealers' tables, buy pieces for their own collection or resale. So a dealer's app has both a buying experience and a selling experience, and the nav reflects this.

---

## The Market Model

### Events Are Recurring
A "market" is a recurring event — "Downtown Modernism," "PCC Flea," "Rose Bowl." Each happens on a regular schedule. The market name includes its date: "Downtown Modernism · Apr 26."

### Two Dates Matter
1. **The drop** — when inventory goes live in the app. Usually the evening before the market. Buyers can start browsing. All countdown timers reference the drop, not the market date.
2. **The market** — the actual event day when buyers show up in person.

### Booths Are Semi-Persistent
Dealers typically have the same booth number at the same market every time. But assignments can change, so the system tracks booth per market instance. A dealer sets up once per market (location + payment preferences), and those settings carry forward unless changed.

### The Synchronized Drop
At drop time, all inventory for that market becomes visible simultaneously. A synchronized reveal that creates a rush of browsing activity — like a product drop in streetwear culture. Countdown timers build anticipation.

---

## FOMO Is a Feature

Flea markets are inherently scarce. Things sell once. Early Bird makes this scarcity visible:

- Countdown timers to the drop (with seconds ticking)
- "X buyers are shopping" when the market is live
- Real-time price drops (struck-through old price)
- Sold items stay visible (grayed out) — you can see what you missed
- Avatars everywhere — every dealer and buyer has a face, attaching a person to every transaction

---

## Visual Identity

### Monospace Everything
Early Bird uses a monospace typeface throughout the entire app — headings, body, labels, badges, everything. The effect is intentional: it looks like a bulletin board, a classified ad, a Craigslist post. DIY, not corporate. The vibe says "this was made by people who go to flea markets," not "this was made by a startup."

DaisyUI's `fontFamily` override in `tailwind.config.js` sets the global font stack to a mono family (e.g. `JetBrains Mono`, `IBM Plex Mono`, `Space Mono`, or `Roboto Mono` — pick one and commit). No sans-serif fallbacks in the UI. The mono type does the heavy lifting for brand identity so the rest of the design can stay simple.

---

## Navigation

```
Buy · Watching | Sell | Account
```

Buyers see: Buy, Watching, Account (3 tabs).
Dealers see: Buy, Watching, Sell, Account (4 tabs).

Buy and Watching are grouped on the left (the buying experience). Sell and Account on the right. A subtle divider separates the groups.

Post-login flow: landing → magic link → onboarding → **home lobby** → tabs. Each role has its own home lobby (one for buyers, one for dealers — see The Screens below). The Early Bird logo in every post-login screen's header routes to the role-specific home lobby, not to the first tab. The buyer's logo routes to the home-buyer lobby; the dealer's logo routes to the home-dealer lobby.

---

## The Screens

### Pre-Auth

**Landing (Buyer):** Markets list with countdown to each drop. Phone input. Magic link via SMS — no passwords, no OTP codes.

**Landing (Dealer):** Dealer-specific value prop and sign-up. Same magic link flow.

**Onboarding:** Selfie capture + display name + follow markets + notification preferences. Context for what's happening ("Get set up to shop the drop").

### Home Lobby (Buyer)

Post-login home base for buyers. Shows the markets the buyer follows with live drop countdowns, a short FAQ section, and a drop-alert opt-in toggle. The Early Bird logo in every buyer-side screen routes here — not to the Buy tab. This is the buyer's "home base" inside the app, sitting above the Buy/Watching/Account tabs in the post-login flow.

### Home Lobby (Dealer)

Post-login home base for dealers. Shows the upcoming markets the dealer is selling at, with a live drop countdown for each, a "set up your booth" CTA on the next market, and a short "how the drop works" explainer that persuades dealers to set up in advance (the earlier a booth is set up, the longer the items sit in front of buyers before the drop). The Early Bird logo in every dealer-side screen routes here — not to the Sell tab. This is the dealer's "home base" inside the app, sitting above the Buy/Watching/Sell/Account tabs in the post-login flow. Market switching happens here too — the dealer picks which market to set up for from this lobby instead of from a separate market-picker screen.

### Buy Tab (Feed)

Scrollable grid of item cards. Each card shows photo, dealer avatar, favorite button, price, title, dealer name, and status if held/sold. "I'm Interested" button on every card.

No filters in v1. The buyer is shopping a single market drop and the grid is the whole drop. There is no SAVED toggle here — favorited items live in the Watching tab. Dealer and category filters return when a market grows past what's browsable in one scroll.

### Watching Tab

Items in the current market that the buyer has favorited or inquired about. Scoped to one market at a time — switching markets switches the Watching list. Watching is the unified saved-and-inquired view; there is no separate SAVED filter in Buy.

Each row shows: thumbnail, price, status, item title, dealer name, heart icon if favorited, inquiry indicator if messaged, and a struck-through old price if the price was lowered. Sorted by most recent activity.

Tap any item → opens item detail.

### Item Detail — 3 States

The most important screen. Transforms based on who's looking.

**State 1 — Buyer view:** Full photos, price, dealer info, dealer avatar and name. "I'm Interested" button opens a compose drawer: short text input (one or two sentences), send button. On send, the app delivers an SMS or email to the dealer with the buyer's first name, last initial, phone number, and their message. Example notification: *"John C. at (301) 498-3811 says: 'Love the mid-century credenza — is the veneer in good shape?' Contact him directly to make the deal."* After this, the app is out of the loop. All further communication happens directly between buyer and dealer via call or text. The item in the buyer's Watching tab shows an "Inquiry Sent" indicator.

**State 2 — Dealer, own item:** Seller viewing their own item. Full detail + edit button + status controls (Live/Hold/Sold). Market context shown ("Listed in Downtown Modernism · Apr 26"). If buyers have inquired, an inquiry list appears below: each entry shows buyer avatar, first name + last initial, phone number, their message, and timestamp. This is a log, not a conversation — there's nothing to reply to in-app. The dealer just calls or texts the buyer directly.

**State 3 — Dealer, browsing:** Dealer viewing another dealer's item. Same as State 1 — they're a buyer in this context.

### Sell Tab (Dealer's Booth)

**Setup:** First time for this market. Booth number plus a checkbox list of accepted payment methods (Cash, Venmo, Zelle, Apple Pay, Card). The app never stores payment handles — buyers pay the dealer directly at the booth after the dealer confirms the sale, which prevents pre-sale payments while a dealer is still deciding. Settings persist across markets.

**Active booth:** Item list with status, prices, inquiry counts, action buttons. Countdown to drop. After drop: "Market is live."

**Add Item:** Context shows which market you're adding to. Photo grid with drag-reorder, first photo is main photo. Title, description, price, "Price Firm" toggle. Post button disabled until photo + price filled.

**Market Picker:** Switch between upcoming markets. Shows both event date and drop countdown for each.

### Account

Buyer: name, avatar, preferences. Dealer: adds business name, accepted payment methods (checkboxes only — no stored handles), booth settings.

---

## Communication: One-Touch Inquiry Handoff

All communication is a one-way handoff from the app to the real world.

When a buyer taps "I'm Interested," they write a short message (a sentence or two). The app delivers a single notification to the dealer — via SMS or email — containing the buyer's first name, last initial, phone number, and their message. After this handoff, the app is out of the loop. All further communication happens directly between buyer and dealer via call or text.

The app captures one structured data point per inquiry (who, what, when, message) for analytics, but does not maintain a messaging thread, inbox, or chat history.

**What this eliminates:** Real-time messaging infrastructure, read receipts, notification systems, conversation threading, moderation, abuse tooling, in-app inbox. The entire communication layer is a single database write and one outbound notification.

**Why this works:** Flea market people already communicate by text and phone call. They don't want another inbox. They want to know someone's interested and how to reach them. That's it.

### Per-Inquiry Transactional Receipts (Carve-Out)

The one-way handoff rule above has one narrow exception: when the dealer acts on a specific inquiry in the Inquiry Log (taps Hold or Sell on an inquiry card), the app sends a single transactional SMS to the affected buyer(s). This is a one-way, after-the-fact receipt — not messaging. It does not open a thread, does not accept replies, and does not create an inbox. Same category as a Shopify order confirmation. `CLAUDE.md`'s Communication Model rule ("after the handoff, the app is out of the loop") needs a matching carve-out when this gets built.

**Per-inquiry actions:**

- **Hold for [buyer]** — Dealer taps Hold on Jon C.'s inquiry card. Item is committed to Jon as first dibs. Jon gets: *"Early Bird: Marcus is holding Walnut Credenza for you. First dibs at Booth 42, Downtown Modernism, Sat Apr 26."*
- **Sell to [buyer]** — Dealer taps Sell on Jon C.'s inquiry card. Item is sold to Jon; listing closes. Jon gets: *"Early Bird: Sold! Walnut Credenza is yours. See Marcus at Booth 42, Downtown Modernism, Sat Apr 26. Bring payment."* Other inquirers get: *"Early Bird: Walnut Credenza sold to another buyer. Keep an eye on Marcus's booth for more drops."*

**Governance rule (per-inquiry ↔ global status):**

1. **Per-inquiry actions set the global item status.** Tapping Hold on Jon's inquiry flips the global status tab to HOLD and attributes the hold to Jon. Tapping Sell on Jon's inquiry flips it to SOLD and attributes the sale to Jon.
2. **Changing the global status while a per-inquiry commitment is active requires confirmation.** If the item is held-for-Jon and the dealer taps the global LIVE tab (or the global SOLD tab, or Hold/Sell on a different inquiry), a bottom drawer opens: *"This item is currently on hold for Jon C. Setting it back to LIVE will release the hold and notify Jon. Continue?"* Same pattern for overriding a Sell commitment. Bottom drawer, not modal (T12).
3. **Global HOLD and SOLD tabs remain tappable as walk-up fallbacks.** The walk-up case (someone shows up at the booth and pays cash without ever inquiring through the app) has no per-inquiry card to tap — the dealer taps the global SOLD tab directly. Confirm drawer: *"Mark sold without a specific buyer? This is for walk-up sales. The 3 inquirers will be notified it sold to another buyer."* Tapping the global HOLD tab directly is a "pause listing" action with no specific buyer attached.
4. **Single source of truth.** Item status is the canonical state. Per-inquiry buttons are a shortcut that writes to that state and records which inquiry triggered it. The inquiries table needs a `status` field (`open | held | sold | lost`) so Phase 2 can track which row was the winner and which rows lost.

**Walk-up case is common.** Most sales at a physical market are walk-ups, not pre-market inquiries. The global SOLD tab is the canonical path for walk-ups. The per-inquiry Sell button is the canonical path for pre-market inquiry wins.

---

## Price Drop Notifications

The marketplace flywheel.

1. Buyer favorites a $250 lamp
2. Market day, 2pm, it hasn't sold
3. Dealer lowers price to $180
4. App prompts: "Notify 5 watchers?"
5. SMS to all watchers: "Price drop! Brass Desk Lamp is now $180 (was $250)"
6. Watching tab shows the new price with the old price struck through
7. Buyer taps, sends inquiry, dealer calls them, deal happens

**Why this matters:** Dynamic pricing at flea markets is currently just haggling. The ability to proactively signal interested buyers creates a conversion loop that doesn't exist anywhere else: browse → favorite → price drops → notification → inquiry → deal.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js** (App Router) | File-based routing maps cleanly to the tab/screen structure. Server components for feed, client components for interactions. API routes colocated. |
| UI | **DaisyUI + Tailwind CSS** | Pre-built component classes (`btn`, `card`, `badge`, `avatar`, `countdown`, `modal`, `drawer`) match nearly every element in this design doc. No temptation to write inline styles when `btn btn-primary` already exists. Tailwind handles one-off spacing/layout. |
| Database | **SQLite via Turso** | Embedded DB simplicity with edge replication. One file in dev, managed service in prod. Perfect for a marketplace with straightforward relational data (markets, dealers, items, inquiries, favorites). |
| Auth | **Magic link via SMS** | No passwords. Phone number is the identity. Matches the audience — these are phone-first people. |
| Hosting | **Vercel** | Native Next.js support. Edge functions for API routes. Preview deploys for every branch. |
| Notifications | **Twilio or similar** | Outbound SMS only — inquiry handoffs and price drop alerts. No inbound processing needed. |

### Monospace Font Setup
In `tailwind.config.js`, override the default font family globally:
```js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
    },
  },
}
```
This makes every element in the app monospace by default. No per-component font decisions.

---

## Build Plan

The build is separated into phases with a strict rule: **wireframes before logic, logic before wiring.** Each phase has one job and a clear definition of done. This prevents the failure pattern where AI coding tools produce functional but visually broken code by conflating design and logic in the same step.

### Pre-Build: Guard Rails
Before writing any application code:
1. **Pre-commit hook** — a shell script that greps for `style="` and rejects the commit if found. Inline styles physically cannot enter the repo.
2. **CLAUDE.md** — project rules file that Claude Code reads on every session. Contains: "Do not add inline styles. Do not change DaisyUI class names. Do not add HTML elements that aren't in the wireframe."

### Phase 1: Wireframes (1 session + revision pass)
Build every screen as static HTML using only DaisyUI classes. No JavaScript. No server. No data fetching. One file per screen/state:

- `landing-buyer.html`
- `landing-dealer.html`
- `onboarding.html`
- `home-buyer.html`
- `home-dealer.html`
- `buy-feed.html`
- `watching.html`
- `item-detail-buyer.html` (State 1)
- `item-detail-dealer-own.html` (State 2)
- `item-detail-dealer-browsing.html` (State 3)
- `sell-booth-setup.html`
- `sell-booth-active.html`
- `sell-add-item.html`
- `sell-market-picker.html`
- `account-buyer.html`
- `account-dealer.html`

Dummy data hardcoded. Review visually in a browser. These files become the **source of truth** — Claude Code's only job in later phases is to make them functional without changing their structure.

**Definition of done:** Every screen renders correctly in a mobile viewport with DaisyUI classes only. No `style=""` attributes anywhere. Screenshots reviewed and approved.

**Current status:** Initial wireframes built. Review feedback captured in `PHASE_1_REVIEW_NOTES.md`. Revision pass follows the "Phase 1 Revision Workflow" section below — one screen per session.

### Phase 2: Backend (1 session)
All API routes, data models, database setup. Pure logic, no UI.

- Database schema: markets, dealers, items, inquiries, favorites, users
- API routes: items (CRUD), markets, favorites, inquiries, auth (magic link)
- Seed data for development
- No frontend changes in this session

**Definition of done:** Every API route returns correct JSON. Tested with curl or a REST client.

### Phase 3: Wire Frontend to Backend (1–2 sessions)
Screen by screen, replace hardcoded dummy data with real data fetching. The instruction for each screen is always the same shape:

*"Here is the wireframe for [screen]. Make it functional. Pull data from [endpoint]. Do not change any class names. Do not add any inline styles. Do not add any HTML elements that aren't already in the wireframe."*

**Definition of done:** Every screen renders real data. No visual regressions from the wireframe. No `style=""` attributes.

### Phase 4: Polish (1–2 sessions)
Edge cases, loading states, error states, empty states, transitions, responsive tweaks. Still no inline styles — everything uses DaisyUI classes and Tailwind utilities.

**Total estimate:** 5–8 Claude Code sessions, plus the Phase 1 revision pass below.

---

## Phase 1 Revision Workflow (Active)

**Status:** Phase 1 wireframes were built. The user reviewed all 14 in the scratch review tool at `public/review.html` and filed notes in `PHASE_1_REVIEW_NOTES.md` at the repo root. An initial batch-revision attempt was rolled back: that attempt tried to process 13 screen revisions + 3 new screens + 1 deletion + EB_DESIGN fold-in + review tool update + QA sweep inside a single session, and the accumulated context errors produced output that didn't match the review notes on multiple screens. All 20 commits in that range were hard-reset out of `main`'s history.

**The new rule:** one session handles exactly one checklist item below. No batching. No "while I'm here" edits to other screens. End the session the moment the single item is committed and pushed. The next checklist item gets a fresh Claude Code session with a clean context window.

### Session protocol

1. Read `CLAUDE.md` (global rules — no inline styles, etc.).
2. Read this section of `EB_DESIGN.md` — not the whole file. The rest of `EB_DESIGN.md` is already reflected in the wireframe you're about to edit.
3. Read `PHASE_1_REVIEW_NOTES.md` in two parts:
   a. The full "Cross-cutting themes" section (T1–T12) — short, canonical, applies to every screen. This is the hidden half of every screen's spec.
   b. Only the per-screen section for the current checklist item (for example, `## 04. buy-feed`). Do not read any other per-screen sections.
4. Read `public/wireframes/{current-screen}.html` — the one target file, nothing else.
5. Apply the changes the notes ask for, one note at a time.
6. Commit with a HEREDOC message. Title format: `Revise {screen}: {1-line summary}`. Body must list each addressed note by number (e.g., "addresses 01.1, 01.2, 01.3, 01.4"). Any note not addressed gets an explicit line explaining why.
7. Push.
8. Update the checklist below: flip the checkbox, add a one-line session log entry at the bottom.
9. End the session. The next item is a separate session.

**Things the session must NOT do:**
- Read other wireframe files while revising the current one. Cross-screen context pollution was the root cause of the first batch's failure.
- Batch multiple checklist items into one session.
- Pre-plan revisions for other screens "while the context is fresh."
- Touch `public/review.html` unless the current task explicitly changes the `WIREFRAMES` array (only the delete and create tasks do).
- Rewrite `EB_DESIGN.md` beyond the specific section a review note explicitly asks to update.

### Special cases

- **"Remove this page"** (applies to `sell-market-picker`, notes 12.1–12.2): the session deletes the wireframe file, removes the entry from the `WIREFRAMES` array in `public/review.html`, updates the sidebar count (`Wireframes (N)`), updates the progress counter default (`1 / N`), updates the clear-all confirm copy, updates this checklist, commits, ends.
- **"We need a new screen"** (notes 04.3 and 09.2 propose `home-buyer` and `home-dealer`): the session revising the source screen (`buy-feed`, `sell-booth-setup`) does NOT build the new screen in that session. The new screen is its own checklist item and gets its own dedicated session with its own clean context window.
- **"Split into two states"** (note 06.4 splits `item-detail-buyer` into a clean buyer-view state and an inquiry-drawer state): the session handling the split creates both files in one commit because they are tightly coupled. This is the only permitted exception to the one-screen-per-session rule, and it is explicitly flagged in the checklist.
- **"Update the plan"** (notes that ask for changes to `EB_DESIGN.md` — e.g., note 03.7 asks for a buyer-onboarding preferences note; note 09.4 asks for a payment-handles policy note): these are inline edits made in the same commit that revises the wireframe. Only touch the specific `EB_DESIGN.md` section the note explicitly references.

### Checklist

Existing screens (revise in place):
- [x] 01. landing-buyer
- [x] 02. landing-dealer
- [x] 03. onboarding (note 03.7 also asks for an `EB_DESIGN.md` update about buyer-onboarding preferences — handle inline)
- [x] 04. buy-feed (note 04.3 proposes new screen `home-buyer` — do NOT build it in this session; it is a separate checklist item below)
- [x] 05. watching
- [x] 06. item-detail-buyer → SPLIT into clean state + inquiry-drawer state (both files in one session — this is the only exception to the one-screen rule)
- [x] 07. item-detail-dealer-own
- [x] 08. item-detail-dealer-browsing
- [x] 09. sell-booth-setup (note 09.2 proposes new screen `home-dealer` — do NOT build it in this session; note 09.4 asks for an `EB_DESIGN.md` policy update about payment handles — handle inline)
- [x] 10. sell-booth-active
- [ ] 11. sell-add-item
- [ ] 13. account-buyer
- [ ] 14. account-dealer

Deletions:
- [ ] 12. sell-market-picker (notes 12.1–12.2 explicitly remove this page)

New screens (each is a dedicated session):
- [ ] home-buyer (from note 04.3 — buyer's logged-in lobby with markets list, countdown, FAQ, drop-alert opt-in)
- [ ] home-dealer (from note 09.2 — dealer's logged-in lobby with upcoming markets and set-up-booth CTA)

Follow-up revisions (each is a dedicated session):
- [ ] 07. item-detail-dealer-own — per-inquiry Hold/Sell buttons + transactional SMS receipts + confirm-drawer state. Adds Hold/Sell actions to each inquiry card in the Inquiry Log; taps open a confirm drawer (new file `item-detail-dealer-own-confirm.html`, same split pattern as 06 → 06-inquiry). On confirm, app sends a one-way transactional SMS (winner gets "sold to you" or "first dibs"; losers get "sold to another buyer"). Governance rule for per-inquiry ↔ global status coupling is specced in `## Communication: One-Touch Inquiry Handoff` → `### Per-Inquiry Transactional Receipts (Carve-Out)`. This session must: (a) add Hold/Sell buttons to each inquiry card in `item-detail-dealer-own.html`; (b) create `item-detail-dealer-own-confirm.html` as the confirm drawer state (bottom sheet, raw Tailwind, T12 rules — not a DaisyUI modal); (c) add the new file to `public/review.html` WIREFRAMES; (d) amend `CLAUDE.md`'s Communication Model section with a carve-out for transactional receipts. Phase 2 must add `status` field to `inquiries` table (`open | held | sold | lost`).

Note: `item-detail-buyer-inquiry` is NOT a separate checklist item. It is the split-off state created within the `item-detail-buyer` session (row 06 above).

### Session log

- 2026-04-10 — 01. landing-buyer — restructured above-fold to lead with sign-in form, added top-right "Dealer? →" link, added FAQ + About sections, replaced footer `border-t` with `bg-base-200` panel treatment (T10), swapped hero copy to "Shop the drop" framing (T7).
- 2026-04-10 — 02. landing-dealer — restructured above-fold to lead with sign-in form, added top-right "Buyer? →" link, hero/cards/FAQ/About all hammer free-to-use + no-cut + direct-transaction, added "Dealers shop too" value prop card + FAQ item acknowledging dealer-as-buyer, replaced footer `border-t` with `bg-base-200` panel (T10), swapped "pre-market your booth" for "Sell the drop. Sell before sunrise." framing (T7).
- 2026-04-10 — 03. onboarding — dropped Welcome/Step-1-of-1/Heads-up clutter, swapped Upload Photo for Take Selfie, made display name free-form, added Follow Markets + Notifications sections, fixed verified pill (outline + padding, T2/T3), replaced footer `border-t` with `bg-base-200` panel (T10), swapped "Get set up to pre-buy" for "Get set up to shop the drop" (T7); also fixed EB_DESIGN.md "The Idea", "Who It's For" buyer line, and "Onboarding" bullet inline (T7 + 03.6).
- 2026-04-10 — 04. buy-feed — enlarged dealer avatars (w-6→w-10), wired EARLY BIRD logo to `home-buyer.html` (T8), replaced footer `border-t` with `bg-base-200` panel (T10); also added Navigation post-login flow + new Home Lobby (Buyer) screen + `home-buyer.html` to Phase 1 file list in EB_DESIGN.md (04.3/T8). HELD/SOLD T2/T3 restyle reverted same day to stay consistent with un-revised screens — T2/T3 will be re-applied across all screens together.
- 2026-04-10 — design decision (cross-screen) — buy feed has no filters in v1: removed entire filter bar from `buy-feed.html` (ALL/SAVED toggle + Dealer + Category dropdowns); SAVED is redundant because Watching is the saved-and-inquired view. Watching tab is scoped to the current market only — removed cross-market Folk Art Weather Vane item from `watching.html` and updated count from 8 to 7. Spec updated: Buy Tab and Watching Tab sections in EB_DESIGN.md rewritten. Note: `watching.html` still pending its full 05 revision pass (header/market context).
- 2026-04-10 — partial 05. watching + cross-screen nav update — wired EARLY BIRD logo on `watching.html` to `home-buyer.html` (T8), replaced "Watching / 7 items you care about" header with eyebrow + market context line ("Downtown Modernism · Apr 26") so the screen tells you which market it's scoped to; bottom-nav Watching link now shows the count "Watching (7)" across all 12 screens with a bottom nav (buyer + dealer); `account-buyer.html` Watching stat updated 8 → 7 to match. Full 05 revision still queued for its own session.
- 2026-04-10 — sell-add-item — removed Category form field (and the 10-option select) since v1 captures no category data and offers no category filter. Open Question 1 (Categories) marked deferred to v2 in EB_DESIGN.md.
- 2026-04-10 — 05. watching — completed revision pass: hearts neutralized (text-error → text-base-content, 05.4 canonical), inquiry-sent rows now show the actual buyer message inline (05.2), bottom nav switched to bg-base-200 panel (T10). Deferred 05.1/05.3 (T2/T3 on PRICE DROP/HELD/SOLD) to a cross-screen pass. Flagged buy-feed.html as also needing red→neutral hearts.
- 2026-04-10 — 06. item-detail-buyer SPLIT — clean buyer-view state revised in place; inquiry compose extracted into new item-detail-buyer-inquiry.html as a raw Tailwind bottom drawer with backdrop + drag handle (NOT DaisyUI modal, T12). Applied T1/T4/T5/T7/T8/T10 + neutralized hearts. Added new file to review.html WIREFRAMES (count N → N+1). Deferred T2/T3 on badges to cross-screen pass.
- 2026-04-10 — new cross-cutting theme T13 added to PHASE_1_REVIEW_NOTES.md — Market status indicator: replace the green "LIVE" text pill with a lightning-bolt circle, and add a calendar circle for upcoming (not-yet-live) markets. Deferred to a cross-screen pass. Current instances flagged across 7 wireframes (buy-feed, item-detail-buyer, item-detail-buyer-inquiry, item-detail-dealer-browsing, sell-market-picker, sell-add-item, sell-booth-active).
- 2026-04-10 — 07. item-detail-dealer-own — added helper line under LIVE/HOLD/SOLD tabs clarifying that the dealer should mark SOLD the moment the item actually sells (07.3 copy-clarity); switched bottom nav from `bg-base-100 border-t border-base-300` to `bg-base-200` panel (T10). T4 back affordance (07.1) already addressed in 6363d2c via overlaid `← Back` text button on hero. T5 header label (07.4) N/A — no header bar exists on this screen. T8 logo routing (07.5) N/A — no logo element exists on this screen (edge-to-edge hero, same reasoning as 06). T1 N/A — no sticky CTA stacked above bottom nav. Deferred 07.2 and 07.3 color-half to the cross-screen T2/T3 pass; deferred T13 LIVE-pill replacement to the cross-screen pass.
- 2026-04-10 — 07. item-detail-dealer-own follow-up — pulled 07.3 color-half and the 07.2 inquiries-pill fix OUT of the T2/T3 deferral because both controls are unique to this screen (no cross-screen consistency to protect). LIVE/HOLD/SOLD selector rebuilt from `tabs tabs-boxed` (which rendered the active tab in loud primary purple) to a `join` of `btn-sm` buttons with `btn-neutral` for the active state, matching the T6 segmented-control pattern used elsewhere in the app. "3 inquiries" badge dropped entirely; count folded into the section label as "Inquiries (3)" to match the `Watching (7)` pattern in the bottom nav. 07.2 market-LIVE pill in the "Listed In" card is still deferred — that one IS cross-screen.
- 2026-04-10 — spec addition — new product concept: per-inquiry Hold/Sell buttons on each inquiry card in `item-detail-dealer-own`, with one-way transactional SMS receipts to the affected buyers. Full spec added to `## Communication: One-Touch Inquiry Handoff` → `### Per-Inquiry Transactional Receipts (Carve-Out)` including per-inquiry action behavior, SMS templates, the governance rule coupling per-inquiry actions to the global Live/Hold/Sold status (per-inquiry sets global; global change while a per-inquiry commitment is active triggers a confirm drawer), and the walk-up fallback. New follow-up checklist item added for the dedicated future session that will build it (wireframe revision + confirm-drawer split + review.html update + CLAUDE.md carve-out amendment). No wireframe changes this session.
- 2026-04-10 — 08. item-detail-dealer-browsing — T5 state labels scrubbed: `<title>` tag now reads "Brass Desk Lamp" (was "Item Detail (Dealer Browsing)"), and the `<!-- dealer browsing another dealer's item -->` code comment renamed to `<!-- Buyer-context alert -->`; bottom nav switched from `bg-base-100` to `bg-base-200` so the CTA+nav sticky block is a single unified panel (T10). "Art deco" sub-style fix N/A — no category section exists in this file. T4 back affordance already addressed in 6363d2c (overlaid `← Back` text button on hero). T8 N/A — no logo element (edge-to-edge hero, same as 06/07). T1 N/A — CTA and bottom nav already live inside a single fixed `bg-base-200` wrapper; no gap to fix. Deferred: price-drop pill T2/T3 to cross-screen pass (same call as 05/06/07); LIVE market-status pill T13 to cross-screen pass.
- 2026-04-10 — 09. sell-booth-setup — removed "Row / Area" select and "Landmark Hint" input (booth number alone); rebuilt Payment section as a 5-checkbox method list (Cash, Venmo, Zelle, Apple Pay, Card) with the Venmo @handle and Zelle phone/email inputs deleted, section retitled "Accepted Payment", and helper copy rewritten to spell out the in-person-after-confirmation policy (T11 canonical fix on this screen). T4 back affordance: tiny `btn-circle btn-ghost` `←` replaced with a labeled `← Back` text button in the header bar (form-screen variant of T4, not the hero-overlay pattern from 07/08). T10: nav switched `bg-base-100` → `bg-base-200` so the CTA+nav sticky block is a single unified panel. User feedback also addressed: "Switch" button removed from the Market card (back arrow → home-dealer covers it), "Booth Location" section header dropped (only one field — section header collapsed to "Booth Number"). EB_DESIGN.md: T11 policy rewritten in Sell Tab → Setup (line ~134) and clarified in Account → Dealer (line ~144); Tech Stack → Notifications grep-clean for handle refs; new Home Lobby (Dealer) section added to The Screens parallel to Home Lobby (Buyer); `home-dealer.html` added to Phase 1 wireframes file list (Navigation post-login flow text already covered both roles from the 04 session). New OQ7 added: dealer vetting + fraud / customer-complaint handling (the explicit no-payment-middleman stance leaves an unsolved adjacent question — needs an answer before any dealer-facing launch). T5 N/A — `<title>` tag and header text both already say "Booth Setup", no debug/state strings present. T7 N/A — grep clean, no pre-buy/preview language. T8 N/A — no EARLY BIRD logo element exists on this screen (header is back + title only); same call as 06/07/08, do not invent a logo to satisfy T8. T1 N/A — sticky CTA and bottom nav already live inside a single fixed `bg-base-200` wrapper, no gap to fix. T2/T3 N/A — no badges/pills on this screen at all. T13 N/A — no LIVE pill on this screen. The cross-screen PRICE DROP / DROPPED pill removal (commit 7976819) did not touch 09 — this screen had no PRICE DROP pill. home-dealer.html intentionally NOT built in this session (note 09.2 is its own checklist item).
- 2026-04-10 — 10. sell-booth-active — follow-up pass driven by direct user feedback after shipping the first revision: hierarchy was still flat. Cuts: (a) dropped the entire ALL/LIVE/HELD/SOLD `join` filter row — held/sold items are now ordered to the bottom of the list instead of being a filter dimension, which removes a whole row of UI without losing the affordance; (b) dropped the per-item LIVE outline badges (LIVE is the default state, default doesn't need a label — only HELD and SOLD render a state badge now); (c) dropped the per-item Edit button on every row (dealers tap into an item to edit it from the detail screen); (d) dropped the "asks" pill on Items 1 and 2 and folded the count into the watcher data line as plain text ("· 12 watchers · 3 inquiries", "· 4 watchers · 1 inquiry") with the same `text-[10px] text-base-content/60` treatment as the watcher count; (e) dropped the booth-number subtitle line in the header ("Booth 42 · Tap to switch market") because it's the dealer's own booth — they don't need to be told what booth they're at; (f) un-buttonized the market context line (was a `<button>` with switch-market intent) into a plain `<div class="flex items-center justify-between">` carrying just the market name and the LIVE pill — the switch-market affordance is owned by home-dealer per the 09 session decision; (g) `+ Add` button moved out of a filler-flex row and into a left-aligned slot (the action bar `<div>` now contains only the button). Items reordered in markup to put live items first (Walnut Credenza → Oak Rolltop Desk → Pair of Cane Chairs), then HELD (Teak Nesting Tables), then SOLD (Enamel Kitchen Table). Item dev comments preserve their dummy-data identity numbers (Item 1, 2, 3, 4, 5) — those refer to the underlying data row, not the visual position. Per-item action button counts after Edit removal: live items have 2 buttons (Hold + Drop Price for plain live; Hold + Mark Sold for live-already-dropped); held has 2 (Release + Mark Sold); sold has 0. Hold/Release toggle stays in slot 1 (was slot 2 in the previous pass) since slot 1 is now the leftmost and there's no Edit ahead of it. Header LIVE pill on the market context line is preserved per T13 (deferred). FAB (`+`) and bottom nav unchanged. The redundant `+ Add` action-bar button + `+` FAB pair is preserved — no instruction to remove either, both stay. Original first-pass revision below stays in the log because it landed and shipped (576fc84) — this is a follow-up commit on the same screen, not a redo.

- 2026-04-10 — 10. sell-booth-active (first pass, before user feedback) — slowed down per 10.5 before touching markup. Re-examined screen purpose (dealer's real-time board during a live market: temperature stats + per-item state + quick actions for walk-up sales and inquiry follow-up) and concluded the visual-noise complaint was driven by per-item LIVE/HELD/SOLD/asks badges all using filled DaisyUI semantic colors (`badge-success`, `badge-warning`, `badge-neutral`) which collectively washed out the actual button-level hierarchy. T6 (10.1): filter row rebuilt — `tabs tabs-boxed` with four `<a role="tab">` children replaced with a `join` of four `btn-sm join-item` buttons (active = `btn-neutral`, inactive = `btn-outline`), matching the height of the neighboring `+ Add` `btn-sm` and using the same primitive 07's status selector landed on. T2/T3 (10.2): per-item LIVE/HELD/SOLD badges and "asks" badges all collapsed to `badge badge-outline` (dropped `badge-sm`, `badge-success`/`badge-warning`/`badge-neutral`, `font-bold`, the colored dot span on LIVE badges, and the `gap-1` that the dot needed) — 7 outline badges total. The header market-switcher LIVE pill at line 47 is intentionally NOT touched: that one is a market status indicator and is governed by T13, which is explicitly deferred to a cross-screen pass and explicitly forbidden inside a single-screen revision session. 10.3 (merge Hold/Release): structurally already a single slot per row (no item shows both Hold and Release), but the toggle's screen position was inconsistent — it sat in slot 3 on Items 1 & 4 and slot 2 on Items 2 & 5. Reordered Items 1 & 4 buttons to put Hold in slot 2, so the toggle slot is now positionally consistent across all rows that have it (Item 1: Edit · Hold · Drop Price; Item 2: Edit · Release · Mark Sold; Item 4: Edit · Hold · Drop Price; Item 5: Edit · Hold · Mark Sold). 10.4 (drop the DROPPED pill): already handled cross-screen in 7976819 — confirmed via grep that the only remaining `dropped` reference is the `<!-- Item 5 - Live, price dropped -->` HTML comment, which 7976819's commit body explicitly preserved as describing the underlying data state. T10 (10.6, canonical source on this screen): bottom nav switched from `bg-base-100 border-t border-base-300` to `bg-base-200`, matching the panel treatment 04/05/06/07/08/09 all converged on. T7 (10.7) N/A: grepped `pre-buy|preview|pre-market` (case-insensitive), zero matches on this screen. T8 (10.8): EARLY BIRD logo wrapped in `<a href="home-dealer.html">` (file doesn't exist yet — `home-dealer` is its own checklist item, link will resolve once that session ships). T1 N/A — no stacked sticky CTA bar above the bottom nav on this screen; the FAB is a separately positioned `bottom-20` button, not part of a sticky CTA stack, so there is no gap-glitch to fix. T4 N/A — this is a top-level Sell-tab landing screen with no back button at all. T13 deferred — see header LIVE pill note above. Items NOT touched per the rules: stats block, header market switcher, FAB, Mark Sold action availability per item state (preserved as the wireframe specced — Items 1/4 have Drop Price not Mark Sold; Item 5 has Mark Sold not Drop Price; that state-aware variation is intentional spec, not an inconsistency to fix).
- 2026-04-10 — 10. sell-booth-active third pass — direct user feedback on the HELD row after the follow-up landed: "it's crazy to have the 'held' thing above the title and the button to signify something as 'held' is below ... Merge those things into one design component ... have them below ... pockmarked." Strategic restructuring of state indication on Items 2 (HELD) and 3 (SOLD): standalone state badges above the title DELETED on both rows; the state signal is merged with the state-toggle action into a single component in the button row below the title. Item 2 (Teak Nesting Tables, HELD): `<div class="flex items-center gap-2 mb-1"><div class="badge badge-outline">HELD</div></div>` above title REMOVED; `btn btn-xs btn-outline` "Release" in the action row REPLACED with `btn btn-xs btn-neutral` labeled "HELD" — the filled `btn-neutral` treatment carries the active-state signal that the outline badge used to carry, the label identifies the state, and the element is still tappable to toggle off (same Release interaction semantically, no functional loss). Second slot stays `btn btn-xs btn-outline` "Mark Sold". Item 3 (Enamel Kitchen Table, SOLD): `<div class="flex items-center gap-2 mb-1"><div class="badge badge-outline">SOLD</div></div>` above title REMOVED; a new `<div class="flex gap-2 mt-2">` slot is added below the price/data line containing a single `btn btn-xs btn-neutral` with HTML `disabled` attribute labeled "SOLD" — this places the SOLD indicator in the same vertical slot as HELD's component for visual parallelism across rows, and `disabled` signals terminal state (not a toggle, no action to take). Live items (1, 4, 5) intentionally carry NO state badge and keep their existing outline-button pairs — default state doesn't need a label, and the outline-vs-filled treatment now reads as "special state = filled neutral" vs "live state = outline actions only." Emerging row-layout rule: the LEFTMOST button in the action row is the row's primary state control — live rows = `Hold` (outline, tap to hold), HELD rows = `HELD` (filled neutral, tap to release), SOLD rows = `SOLD` (filled neutral disabled, terminal). Secondary actions (Drop Price, Mark Sold) sit to the right; SOLD rows omit the secondary action slot entirely. First-pass and follow-up pass rationale unchanged. T1/T4/T5/T6/T7/T8/T10/T13 all unchanged from the follow-up pass — this third pass touches only the badge→button merge on rows 2 and 3. CLAUDE.md "no new HTML elements" interpretation: the SOLD button-row addition is a relocation/transformation of the existing SOLD state signal from above the title to below it — the text "SOLD" and the semantic payload are unchanged, the rule protects against inventing new functionality/sections and this is a design restructuring within the row's existing footprint. No inline styles introduced. No class renames outside the two targeted changes. `grep badge-outline` on the file returns zero after this pass (was 2 before).

---

## Open Questions

1. **Categories:** Deferred to v2. v1 captures no category data on items and offers no category filter on the buy feed. Revisit when a single market drop grows past what's browsable in one scroll.
2. **Payment:** Does the app handle payment or just coordinate? (Currently assumes Venmo/Zelle/cash directly.)
3. **Shipping:** Local pickup only, or support shipping?
4. **Scale:** 200 dealers, 5,000 items — algorithmic feed or chronological?
5. **Font choice:** JetBrains Mono, IBM Plex Mono, Space Mono, or Roboto Mono?
6. **Edit button on item-detail-dealer-own:** Currently the hero photo has an overlaid "Edit" button top-right, but what it routes to is unspecced. Options: (a) reuse `sell-add-item.html` as a unified add/edit form populated with existing values; (b) build a separate `item-detail-dealer-edit.html` screen; (c) make fields inline-editable in place on the dealer-own view. Decision needed before Phase 2 wiring.
7. **Dealer vetting + fraud/complaint handling:** T11 deliberately keeps the app out of the payment flow so we're not in the middle of bad transactions, but dealers can still ghost, misrepresent items, or scam buyers in person. We need (a) a vetting policy for which dealers we let onto the platform — application form, reference check, trial market, manual approval? — and (b) a complaint flow for when a dealer doesn't deliver: who reviews disputes, when do we deactivate a dealer, how do we communicate that to affected buyers? This is a "we don't want to do customer support for failed transactions" problem, and the answer probably starts with strict gatekeeping at signup. Decision needed before any dealer-facing launch.

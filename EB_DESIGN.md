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

Post-login home base for dealers. Shows the upcoming markets the dealer is selling at, with a live drop countdown for each, a "set up your booth" CTA on the next market, and a short "how the drop works" explainer that persuades dealers to set up in advance (the earlier a booth is set up, the longer the items sit in front of buyers before the drop). The Early Bird logo in every dealer-side screen routes here — not to the Sell tab. This is the dealer's "home base" inside the app, sitting above the Buy/Watching/Sell/Account tabs in the post-login flow. Market switching also happens here — the dealer picks which market to set up for from this lobby.

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
- [x] 11. sell-add-item
- [x] 13. account-buyer
- [x] 14. account-dealer

Deletions:
- [x] 12. sell-market-picker (notes 12.1–12.2 explicitly remove this page)

New screens (each is a dedicated session):
- [x] home-buyer (from note 04.3 — buyer's logged-in lobby with markets list, countdown, FAQ, drop-alert opt-in)
- [x] home-dealer (from note 09.2 — dealer's logged-in lobby with upcoming markets and set-up-booth CTA)

Follow-up revisions (each is a dedicated session):
- [ ] 07. item-detail-dealer-own — per-inquiry Hold/Sell buttons + transactional SMS receipts + confirm-drawer state. Adds Hold/Sell actions to each inquiry card in the Inquiry Log; taps open a confirm drawer (new file `item-detail-dealer-own-confirm.html`, same split pattern as 06 → 06-inquiry). On confirm, app sends a one-way transactional SMS (winner gets "sold to you" or "first dibs"; losers get "sold to another buyer"). Governance rule for per-inquiry ↔ global status coupling is specced in `## Communication: One-Touch Inquiry Handoff` → `### Per-Inquiry Transactional Receipts (Carve-Out)`. This session must: (a) add Hold/Sell buttons to each inquiry card in `item-detail-dealer-own.html`; (b) create `item-detail-dealer-own-confirm.html` as the confirm drawer state (bottom sheet, raw Tailwind, T12 rules — not a DaisyUI modal); (c) add the new file to `public/review.html` WIREFRAMES; (d) amend `CLAUDE.md`'s Communication Model section with a carve-out for transactional receipts. Phase 2 must add `status` field to `inquiries` table (`open | held | sold | lost`).
- [ ] Dealer profile: Instagram link — dealer needs to be able to add an Instagram handle to their profile so buyers can tap through to see more of the dealer's inventory and aesthetic. Most likely home is `account-dealer.html` (persistent profile data, not per-market — same surface as display name and verified status), though the field could also be collected during dealer onboarding. Field is optional. Display side: surface the link wherever the dealer name/avatar appears for buyers — `item-detail-buyer` hero is the priority placement; possibly also the dealer avatar overlay on `buy-feed` cards. Open question to resolve before Phase 2: store as `@handle` only (we render the URL), or store the full URL? Phase 2 must add an optional `instagram` field to the `dealers` table when this lands.
- [ ] Empty states (cross-screen pass) — every screen with a list or grid needs an explicit empty state for the zero-data case. Surfaced during the 10. sell-booth-active card-grid promotion: both the list view and the card grid assumed a populated booth with no fallback for "you haven't listed anything yet." Priority targets: `sell-booth-active` ("no listings in this market yet — tap + Add Listing"); `watching` ("you're not watching anything in this market yet"); `buy-feed` ("no items in this market yet — check back soon"); `home-buyer` and `home-dealer` when they're built ("no upcoming markets"); `item-detail-dealer-own` Inquiry Log ("no inquiries yet"); any account-screen list (watched dealers, order history, etc.). Pattern to establish in this session: centered copy + optional CTA, no illustration placeholder (stay quiet — T2 outline-down restraint applies, empty states should feel like calm prose, not loud "PLEASE LIST SOMETHING!!!" prompts). Should be its own dedicated session and touch every screen at once for consistency. Each screen gets either a new file (e.g., `sell-booth-active-empty.html`) or a sibling documented state — TBD in the session. Also update `public/review.html` to link the empty-state variants once they exist.
- [ ] Account-screen footer redesign — surfaced during the 13. account-buyer revision pass (2026-04-11): the footer block (`Help & Support` / `Privacy Policy` / `Terms` link stack + divider + `Sign Out` `text-error` button + `Early Bird v1.0 · LA` version line) reads as ghastly. Specific issues: (a) `link link-hover` treatment renders as flat black mono caps with no visible link affordance until hover, on mobile there's no hover so the rows look like static text; (b) the `text-error` red on Sign Out is loud against the otherwise color-down screen and clashes with T2's outline-everywhere principle (Sign Out is destructive but probably doesn't need fill-red treatment — outline + a confirm step on tap is the typical pattern); (c) the divider + free-floating button + version-line stack has no rhythm — vertical spacing is uneven, the elements don't feel like a coherent footer block; (d) the version line uses `text-[10px] text-base-content/40` arbitrary size that doesn't match any other typographic primitive on the screen. Likely also applies to `account-dealer.html` if it carries the same footer structure (don't peek inside the 13 session; verify when this follow-up runs). The fix is open-ended — could be a tighter card-style footer, could collapse the legal links into a single "Legal" expand row, could move Sign Out into a settings sub-section. TODO comment left in `account-buyer.html` above the `<!-- Footer links -->` section so the next session can find it. Should be its own dedicated session, touch both account screens at once for consistency.

Note: `item-detail-buyer-inquiry` is NOT a separate checklist item. It is the split-off state created within the `item-detail-buyer` session (row 06 above).

Revision history moved to REVISION_LOG.md to reduce context size.

---

## Open Questions

1. **Categories:** Deferred to v2. v1 captures no category data on items and offers no category filter on the buy feed. Revisit when a single market drop grows past what's browsable in one scroll.
2. **Payment:** Does the app handle payment or just coordinate? (Currently assumes Venmo/Zelle/cash directly.)
3. **Shipping:** Local pickup only, or support shipping?
4. **Scale:** 200 dealers, 5,000 items — algorithmic feed or chronological?
5. **Font choice:** JetBrains Mono, IBM Plex Mono, Space Mono, or Roboto Mono?
6. **Edit button on item-detail-dealer-own:** Currently the hero photo has an overlaid "Edit" button top-right, but what it routes to is unspecced. Options: (a) reuse `sell-add-item.html` as a unified add/edit form populated with existing values; (b) build a separate `item-detail-dealer-edit.html` screen; (c) make fields inline-editable in place on the dealer-own view. Decision needed before Phase 2 wiring.
7. **Dealer vetting + fraud/complaint handling:** T11 deliberately keeps the app out of the payment flow so we're not in the middle of bad transactions, but dealers can still ghost, misrepresent items, or scam buyers in person. We need (a) a vetting policy for which dealers we let onto the platform — application form, reference check, trial market, manual approval? — and (b) a complaint flow for when a dealer doesn't deliver: who reviews disputes, when do we deactivate a dealer, how do we communicate that to affected buyers? This is a "we don't want to do customer support for failed transactions" problem, and the answer probably starts with strict gatekeeping at signup. Decision needed before any dealer-facing launch.

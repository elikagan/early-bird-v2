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
- PRICE DROP badges that appear in real-time
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

---

## The Screens

### Pre-Auth

**Landing (Buyer):** Markets list with countdown to each drop. Phone input. Magic link via SMS — no passwords, no OTP codes.

**Landing (Dealer):** Dealer-specific value prop and sign-up. Same magic link flow.

**Onboarding:** Selfie capture + display name + follow markets + notification preferences. Context for what's happening ("Get set up to shop the drop").

### Buy Tab (Feed)

Scrollable grid of item cards. Each card shows photo, dealer avatar, favorite button, price, title, dealer name, and status if held/sold. "I'm Interested" button on every card.

Toggle between ALL and SAVED. Filter by dealer (searchable autocomplete — simple dropdown won't scale to 100+ dealers) and category.

### Watching Tab

Items the buyer has favorited or inquired about. One unified view of "items I care about."

Each row shows: thumbnail, price, status, item title, dealer name, heart icon if favorited, inquiry indicator if messaged, PRICE DROP badge if price lowered with old price struck through. Sorted by most recent activity.

Tap any item → opens item detail.

### Item Detail — 3 States

The most important screen. Transforms based on who's looking.

**State 1 — Buyer view:** Full photos, price, dealer info, dealer avatar and name. "I'm Interested" button opens a compose drawer: short text input (one or two sentences), send button. On send, the app delivers an SMS or email to the dealer with the buyer's first name, last initial, phone number, and their message. Example notification: *"John C. at (301) 498-3811 says: 'Love the mid-century credenza — is the veneer in good shape?' Contact him directly to make the deal."* After this, the app is out of the loop. All further communication happens directly between buyer and dealer via call or text. The item in the buyer's Watching tab shows an "Inquiry Sent" indicator.

**State 2 — Dealer, own item:** Seller viewing their own item. Full detail + edit button + status controls (Live/Hold/Sold). Market context shown ("Listed in Downtown Modernism · Apr 26"). If buyers have inquired, an inquiry list appears below: each entry shows buyer avatar, first name + last initial, phone number, their message, and timestamp. This is a log, not a conversation — there's nothing to reply to in-app. The dealer just calls or texts the buyer directly.

**State 3 — Dealer, browsing:** Dealer viewing another dealer's item. Same as State 1 — they're a buyer in this context.

### Sell Tab (Dealer's Booth)

**Setup:** First time for this market. Booth location, payment preferences (Venmo/Zelle/Cash — inline on this page, not buried in Account). Persists across markets.

**Active booth:** Item list with status, prices, inquiry counts, action buttons. Countdown to drop. After drop: "Market is live."

**Add Item:** Context shows which market you're adding to. Photo grid with drag-reorder, first photo is main photo. Title, description, price, "Price Firm" toggle. Post button disabled until photo + price filled.

**Market Picker:** Switch between upcoming markets. Shows both event date and drop countdown for each.

### Account

Buyer: name, avatar, preferences. Dealer: adds business name, payment methods, booth settings.

---

## Communication: One-Touch Inquiry Handoff

All communication is a one-way handoff from the app to the real world.

When a buyer taps "I'm Interested," they write a short message (a sentence or two). The app delivers a single notification to the dealer — via SMS or email — containing the buyer's first name, last initial, phone number, and their message. After this handoff, the app is out of the loop. All further communication happens directly between buyer and dealer via call or text.

The app captures one structured data point per inquiry (who, what, when, message) for analytics, but does not maintain a messaging thread, inbox, or chat history.

**What this eliminates:** Real-time messaging infrastructure, read receipts, notification systems, conversation threading, moderation, abuse tooling, in-app inbox. The entire communication layer is a single database write and one outbound notification.

**Why this works:** Flea market people already communicate by text and phone call. They don't want another inbox. They want to know someone's interested and how to reach them. That's it.

---

## Price Drop Notifications

The marketplace flywheel.

1. Buyer favorites a $250 lamp
2. Market day, 2pm, it hasn't sold
3. Dealer lowers price to $180
4. App prompts: "Notify 5 watchers?"
5. SMS to all watchers: "Price drop! Brass Desk Lamp is now $180 (was $250)"
6. Watching tab shows PRICE DROP badge, old price struck through
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
- [ ] 03. onboarding (note 03.7 also asks for an `EB_DESIGN.md` update about buyer-onboarding preferences — handle inline)
- [ ] 04. buy-feed (note 04.3 proposes new screen `home-buyer` — do NOT build it in this session; it is a separate checklist item below)
- [ ] 05. watching
- [ ] 06. item-detail-buyer → SPLIT into clean state + inquiry-drawer state (both files in one session — this is the only exception to the one-screen rule)
- [ ] 07. item-detail-dealer-own
- [ ] 08. item-detail-dealer-browsing
- [ ] 09. sell-booth-setup (note 09.2 proposes new screen `home-dealer` — do NOT build it in this session; note 09.4 asks for an `EB_DESIGN.md` policy update about payment handles — handle inline)
- [ ] 10. sell-booth-active
- [ ] 11. sell-add-item
- [ ] 13. account-buyer
- [ ] 14. account-dealer

Deletions:
- [ ] 12. sell-market-picker (notes 12.1–12.2 explicitly remove this page)

New screens (each is a dedicated session):
- [ ] home-buyer (from note 04.3 — buyer's logged-in lobby with markets list, countdown, FAQ, drop-alert opt-in)
- [ ] home-dealer (from note 09.2 — dealer's logged-in lobby with upcoming markets and set-up-booth CTA)

Note: `item-detail-buyer-inquiry` is NOT a separate checklist item. It is the split-off state created within the `item-detail-buyer` session (row 06 above).

### Session log

- 2026-04-10 — 01. landing-buyer — restructured above-fold to lead with sign-in form, added top-right "Dealer? →" link, added FAQ + About sections, replaced footer `border-t` with `bg-base-200` panel treatment (T10), swapped hero copy to "Shop the drop" framing (T7).
- 2026-04-10 — 02. landing-dealer — restructured above-fold to lead with sign-in form, added top-right "Buyer? →" link, hero/cards/FAQ/About all hammer free-to-use + no-cut + direct-transaction, added "Dealers shop too" value prop card + FAQ item acknowledging dealer-as-buyer, replaced footer `border-t` with `bg-base-200` panel (T10), swapped "pre-market your booth" for "Sell the drop. Sell before sunrise." framing (T7).

---

## Open Questions

1. **Categories:** What product categories for filtering?
2. **Payment:** Does the app handle payment or just coordinate? (Currently assumes Venmo/Zelle/cash directly.)
3. **Shipping:** Local pickup only, or support shipping?
4. **Scale:** 200 dealers, 5,000 items — algorithmic feed or chronological?
5. **Font choice:** JetBrains Mono, IBM Plex Mono, Space Mono, or Roboto Mono?

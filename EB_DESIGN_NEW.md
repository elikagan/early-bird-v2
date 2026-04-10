# Early Bird — Product Design Document

## What This Is

This is the definitive reference for what Early Bird is, who it's for, how it works, and why. This document supersedes all previous plans, roadmaps, and partial specs.

---

## The Idea

Every weekend across Los Angeles, thousands of people wake up before dawn to go treasure hunting at flea markets. They arrive in the dark with flashlights, scanning dealer tables as they're being set up, hoping to find the one piece that makes the trip worth it. The best stuff goes fast. If you're not early, you're too late.

Dealers, meanwhile, load trucks the night before, drive out at 4am, set up tables in the cold, and hope the right buyers show up. They have no way to signal what they're bringing. Buyers have no way to know what's coming. The entire marketplace runs on luck and timing.

**Early Bird fixes this.** The evening before a market, dealers post photos and prices of what they're bringing. Buyers browse from their couch, favorite the pieces they want, and reach out to dealers directly — before the market even opens.

The name is literal: the early bird gets the worm. But now "early" means the night before, not 4am.

---

## Who It's For

### Buyers
Design professionals, antique dealers, collectors, interior designers, DIY enthusiasts in LA. People who love flea markets but hate the uncertainty. They want to see what's available before committing to a 6am alarm. They browse on their phone, save things they like, and reach out to dealers directly.

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

**Onboarding:** Avatar upload + display name. Context for what's happening ("Get set up to pre-buy").

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

### Phase 1: Wireframes (1 session)
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

**Total estimate:** 5–8 Claude Code sessions.

---

## Open Questions

1. **Categories:** What product categories for filtering?
2. **Payment:** Does the app handle payment or just coordinate? (Currently assumes Venmo/Zelle/cash directly.)
3. **Shipping:** Local pickup only, or support shipping?
4. **Scale:** 200 dealers, 5,000 items — algorithmic feed or chronological?
5. **Font choice:** JetBrains Mono, IBM Plex Mono, Space Mono, or Roboto Mono?

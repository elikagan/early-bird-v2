# EB_DESIGN.md — How Early Bird Works

Plain-English description of how the shipped product is supposed to work. Originally written 2026-04-22, rewritten 2026-05-01 around the persistent-booth model. Ratified by Eli [DATE PENDING].

This doc is INTENT only. Gaps between this doc and the code live in `KNOWN_DEBT.md`, not here. If code doesn't match this doc, the code is wrong.

---

## What Early Bird is

Early Bird is a marketplace for LA-area flea market dealers and buyers. Dealers list items in their own catalog and signal which upcoming shows (Rose Bowl, Long Beach, Palm Springs, Topanga Vintage, etc.) they'll be selling at. Buyers browse the whole live catalog, can filter to "items by dealers attending this market," tap "I'm Interested" on anything they want, and get connected directly with the dealer. The deal happens in person at the market. Early Bird is never in the transaction.

Live at earlybird.la.

---

## The booth model (the central mental model)

Items belong to dealers, not markets. A dealer's catalog is persistent — it doesn't reset when a show ends. Each week the dealer is asked, on `/sell`, "Are you selling at [next market] this Sunday?" Saying yes attaches them to that market via `booth_settings`. Saying no records the decline.

When a dealer says yes, ALL of their live items are reachable to buyers under that market's filter — there's no per-item "include this in this show" toggle. The dealer's whole booth is at the show, or nothing is.

Buyers see the next upcoming non-archived market as the "featured" market, transitioning every Monday at 12:01 PT. The home page promo grid shows only items by dealers attending that market. The full `/buy` catalog is always reachable too.

---

## Who uses it

Early Bird has three kinds of accounts:

- **Buyers** — the default. Sign in with a magic link. Browse the catalog (filtered or unfiltered), watch items, and inquire on items.
- **Dealers** — can do everything a buyer can, plus post items, manage their catalog, answer the weekly attendance prompt, and see who's inquired. You become a dealer by applying through the site and being approved by an admin.
- **Admins** — run the site. Eli and Dave, currently. Admins approve dealer applications, create and edit markets, send blast texts to dealers, invite new dealers, and watch site health.

**Anonymous visitors** (not signed in) can also browse items and markets, and can start an inquiry. They'll be asked to confirm their phone with a text before the dealer is notified.

---

## The commitments (rules we don't break)

These are the lines we don't cross. Anything in the code that breaks one of these is a bug.

### 1. Items are publicly browsable.
Anyone can see items on the site without signing in. No countdown, no drop gate, no "register to see items."

### 2. Early Bird is never the payment middleman.
No in-app payments. No stored credit cards, Venmo handles, or bank info. Dealers check boxes for the methods they accept (cash, Venmo, Zelle, Apple Pay, card). Buyer pays the dealer in person at the market.

### 3. Communication is native SMS, never in-app chat.
When an inquiry happens, the dealer gets a text with the buyer's name, phone, and message. They text back from their phone. No inboxes, no threads, no replies inside Early Bird.

### 4. Early Bird only sends texts that earn their place. Don't spam.
This is the complete list of texts Early Bird is allowed to send. Anything not on this list, we don't send. No welcome texts. No "we miss you." No "check out our new feature." No marketing.

**Internal ops texts (admin-only, never go to a user):** a new dealer application notifies the admin phones (`ADMIN_PHONES`) so we can review quickly; the ops-check cron texts admins when SMS delivery degrades; a scheduled blast texts admins when it's queued and ready to review. These never reach a buyer or dealer.

**Group A — sent automatically, triggered by a specific person's action:**
1. **Magic link** — for sign-in, for confirming an anonymous inquiry, and for verifying a phone-number change on an existing account. All three are the same concept: tap a link we texted you to prove it's you.
2. **Inquiry notification to the dealer** — buyer's name, phone, item, and message. Fires when a buyer taps "I'm Interested."
3. **Sold-to-you receipt** — when a dealer marks an item sold to a specific buyer, that buyer gets one text. The losing inquirers get nothing.
4. **Price-drop alert** — when a dealer lowers the price on an item, people who favorited that item get ONE text the first time the price drops. No further texts on later drops.
5. **Dealer approval text** — when an admin approves a dealer application, the applicant gets one text.
6. **Dealer invite text** — when an admin sends a cold invite to a phone number, that phone gets one text with a signup link.

**Group B — requires Eli's approval before sending (see commitment #9):**

7. **Pre-show reminder for buyers** — before a market, buyers who opted in to that market get one reminder text. (Intent — opt-in plumbing exists, scheduled send is **not yet built**; see `KNOWN_DEBT.md`.)
8. **Pre-show nudge for dealers** — before a market, dealers who haven't yet answered the weekly attendance prompt get one nudge. (Intent — **not yet built**.)
9. **Ad-hoc dealer blast** — admin-composed outreach to dealers (e.g., "Rose Bowl is Sunday, post 4 items today").

### 5. Sign-in is magic links only.
User enters their phone, gets a text with a link, taps the link, they're in. No passwords. No 6-digit codes to type.

Sessions last ten years on the device. This is intentional — we don't want to log people out. If Dave Harker or anyone is getting logged out, it's a bug.

### 6. Verify before we text the dealer.
If an anonymous buyer submits an inquiry, we text the buyer first with a confirmation link. Only after they tap the link (proving they own the phone) do we create the inquiry and text the dealer. Signed-in buyers skip this step — their phone is already verified.

### 7. Pre-show buyer reminders are per-show opt-in.
A buyer who wants Rose Bowl reminders opts in to Rose Bowl. Topanga Vintage is a separate opt-in. There's no all-or-nothing "remind me about every market." (Plumbing is in `notification_preferences`; the scheduled send is not yet built.)

### 8. Dealer attendance is the weekly /sell prompt.
A dealer's "I'll be at Rose Bowl Sunday" answer comes from the prompt at the top of `/sell`, not from a separate subscription list. Saying yes records a `booth_settings` row with `declined=false`. Saying no records `declined=true`. The next week's featured market generates a fresh prompt.

If a dealer answered yes for last month's Rose Bowl, the prompt pre-fills their booth number from that prior answer — they don't have to retype it.

### 9. No mass text goes out without Eli pressing the button.
Any text that fans out to a list of people (pre-show reminders, dealer blasts) is always human-approved before it sends.

How it works:
1. The system texts Eli (currently +13104985138) with a link.
2. Eli opens the link and sees: the exact copy that will go out, and how many people will receive it.
3. Eli presses **Send**.
4. Only then do the texts fire.

If Eli doesn't press send, nothing goes out. Scheduled jobs never auto-blast — they only notify Eli that a blast is ready to review.

The automatic texts in Group A (magic links, inquiry notifications, sold receipts, price drops, dealer approvals, dealer invites) are triggered by a specific person's action and don't need this gate. The human-approval gate applies only to scheduled or admin-composed blasts (Group B).

---

## The main flows

### Sign-in
Phone → text a magic link → they tap it → signed in.

### Browse the catalog
The home page leads with the featured market — its name, when it is, and a promo grid of items by dealers attending it. Below that, a full live-item rail (catalog at large) and a "Coming Up" rail of other future markets. `/buy` is the same catalog with a filter chip rail at the top so you can narrow to a specific market's attending-dealer items.

### Inquiry from an anonymous buyer
1. Buyer taps "I'm Interested" on an item.
2. Drawer asks for name, phone, and message.
3. Buyer submits. We text THE BUYER a confirmation link. The dealer is **not** texted yet.
4. Buyer taps the confirmation link.
5. We create the inquiry, text the dealer with buyer's contact + message, sign the buyer in, and return them to the item page with a "sent" confirmation.

### Inquiry from a signed-in buyer
1. Buyer taps "I'm Interested."
2. Drawer asks for a message.
3. Buyer submits. Inquiry created immediately, dealer texted.

### Dealer answers the weekly attendance prompt
1. Dealer opens `/sell`. The next featured market sits at the top with an "I'm in" / "Not this one" prompt.
2. "I'm in" saves a non-declined `booth_settings` row (with the prior booth number pre-filled if they have one). Their entire live catalog is now visible under that market's filter.
3. "Not this one" saves a declined row. Their items stay reachable in the unfiltered catalog but are excluded from the market filter.
4. Either answer collapses the prompt for the rest of the week. Next Monday at 12:01 PT it generates a new prompt for whatever market is now featured.

### Dealer adds an item
1. Dealer taps the FAB or "Add a new item" button on `/sell`.
2. Photo, title, description, price, price_firm. No market picker — items live in the dealer's catalog independent of which markets they attend.
3. Submit. The item is live immediately.

### Dealer marks item sold to a specific buyer
- Item status → sold.
- Winning buyer gets a "congrats, dealer marked this sold to you" text.
- Other inquirers get nothing.
- The sold item moves into the collapsed "Sold (N)" archive section at the bottom of `/sell`, out of the dealer's working grid.

### Dealer marks item on hold
- Item status → held. No texts.

### Dealer lowers price
- If this is the first price drop on this item, watchers get one "price dropped" text.
- Later drops on the same item are silent.

### Admin approves a dealer application
- Application status → approved, dealer account activated.
- Applicant gets an approval text with a link to set up their booth.

### Admin invites a new dealer (cold outreach)
- Admin enters a phone number in `/admin`.
- That phone gets an invite text with a signup link.

### Pre-show reminders (intended, not fully built — see KNOWN_DEBT)
- A scheduled job runs some time before each market.
- Instead of blasting, the job texts Eli with a link to review.
- Eli opens the link, sees the copy + the recipient count for buyers and for dealers, and presses Send for each list (or edits the copy first).
- Only after Eli sends do the reminders go out.

---

## What the admin does

- Approves or rejects dealer applications.
- Creates and edits markets. (drop_at column still exists in the DB but is defunct — `starts_at` is the only date that matters.)
- Edits dealer profiles (verified flag, payment methods, business name, Instagram handle).
- Sends manual blast texts to dealers via the approve-and-send flow in commitment #9.
- Reviews and approves scheduled blasts (pre-show reminders) before they go out — when those scheduled sends are built.
- Generates dealer invite links and texts them to new dealers.
- Monitors health (text-sending rates, cron status).

---

## What Early Bird deliberately DOES NOT do

- **No in-app chat or messaging.** Ever.
- **No in-app payments.** No processing, no stored payment info.
- **No drop countdown or scheduled item reveal.** If an item is posted, it's visible.
- **No items pinned to a single market.** Items belong to dealers; dealers attend markets. The same item can be at Rose Bowl in May and Topanga Vintage in June without being re-listed.
- **No reviews, ratings, or stars for dealers or buyers.**
- **No shipping logistics.** In-person at the market, period.
- **No price negotiation UI.** Buyers can write an offer into their inquiry message, but the app has no "haggle" interface.
- **No reply / inbox / DMs between dealer and buyer inside the app.**
- **No welcome text on sign-up.**
- **No marketing or re-engagement texts** ("we miss you," "check out what's new," etc.).

---

## Where things live (notes for Claude, not Eli)

- App code: `src/app/`
- Core logic: `src/lib/`
- DB schema: `supabase/migrations/`
- Featured market + booth helpers: `src/lib/markets.ts`
- Market name list: `src/lib/shows.ts`
- SMS templates: `src/lib/sms-templates.ts`
- Cron routes: `src/app/api/cron/*`, scheduled in `vercel.json`
- Dev helper: `scripts/eb-query.mjs` (service-role Supabase)
- SMS provider: Pingram (`PINGRAM_API_KEY`)
- Error tracking: Sentry (`SENTRY_AUTH_TOKEN`)

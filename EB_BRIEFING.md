# Early Bird — Briefing

A self-contained description of Early Bird for briefing a fresh Claude (or ChatGPT, or any collaborator) without prior context. Drop this whole file into a new conversation alongside your question.

---

## What it is, in one paragraph

Early Bird is a web app at **earlybird.la** that lets Los Angeles flea market dealers post their inventory online before the show, so buyers can browse, save things they like, and message dealers — then meet up at the market to do the deal in person. Early Bird never touches the money or the goods. It's a discovery and matchmaking layer; the actual sale is between two humans at the booth.

It's a small indie operation. Two founders (Eli Kagan and Dave Harker), both LA flea market dealers themselves, building the product they wished existed.

---

## The market it serves

Early Bird is built for the LA / Southern California flea-market scene. The shows that matter most:

- **Rose Bowl Flea Market** — Pasadena, second Sunday of every month. Huge — hundreds of dealers, thousands of shoppers.
- **Long Beach Antique Market** — Long Beach, third Sunday. Also huge.
- **Topanga Vintage Market** — Topanga, fourth Sunday. Smaller, more curated.
- **Palm Springs Vintage Market** — occasional, seasonal.

The pain Early Bird solves:

- **For buyers:** these markets start at 5am for serious shoppers. By 9am the best stuff is gone. You don't know who's bringing what until you're physically walking the show. Most people just don't make it.
- **For dealers:** the first 2 hours are a haggling crush. Setup is rushed. The good stuff sometimes doesn't make it out of the truck before someone else's neighbor is selling something similar three booths down.
- **For both:** there's no pre-show way to see what's coming, no way to lock in interest before the show, no way for buyers to find a specific dealer.

Early Bird turns the days before the show into a browsable preview. Buyers can save items, message dealers, and even commit to a piece before the show opens. Dealers know what's in demand before they pack the truck.

---

## Who uses it

Three account types:

### Buyers
Anyone who shops LA flea markets. Browse the catalog (filterable by upcoming show), tap a heart to save items, tap "I'm interested" on anything to message the dealer directly. They get the dealer's phone over SMS; the dealer gets theirs. From there it's a normal text conversation.

### Dealers
Vintage / antique / vintage-fashion / collectibles dealers who sell at the LA shows. Apply through the site (admin reviews their Instagram and approves manually — keeps quality up). Dealers post items, manage their catalog, see who's saved or inquired on what, and answer a weekly prompt: *"Are you selling at Rose Bowl this Sunday?"* Saying yes attaches their whole catalog to that show under the buyer-side filter.

Dealers run the whole transaction by SMS and meet the buyer in person at the market. Early Bird records the sale (so the item shows as sold), but doesn't process payment.

### Admins
Just Eli and Dave. Approve dealer applications, create markets, send manual SMS blasts to dealers ("Rose Bowl is Sunday — post your items!"), invite new dealers, watch site health.

---

## The core mental model: the booth

This is the thing to understand. Items don't belong to markets — they belong to dealers. A dealer's catalog is persistent. The same chair is at Rose Bowl in May and Topanga in June, without being re-listed.

Each week the dealer is asked, on /sell, *"Are you selling at [next market] this Sunday?"* They tap **I'm in** or **Not this one**. That answer attaches them (or doesn't) to the market via something we internally call `booth_settings`. When they say yes, their entire live catalog becomes filterable under that show. When they say no, their items stay in the catalog but don't show up under that show's filter.

Buyers browse two ways:
- **Show me everything everyone is selling** — the full live catalog at /buy.
- **Show me what's at Rose Bowl this Sunday** — same catalog, filtered to dealers attending that show.

The home page (/) leads with the next upcoming market and a promo grid of items by dealers attending it. Below that, a "Coming Up" rail of other future shows.

The mental model is "dealer with a booth that travels," not "show with items pinned to it." This is a recent (May 2026) shift — the original design was the opposite.

---

## The core flows

### Browsing as a buyer
Land on /. See **Rose Bowl Flea Market · Sunday May 10 · 12 dealers selling**, a 2-up grid of 8 promo items, a "Browse Rose Bowl →" button, and a Coming Up list of future shows. Tap an item, see full details + the dealer's name, business, payment methods. Tap the heart to save. Tap "I'm interested" to message the dealer.

### Saving / watching
The Watching tab (heart icon in bottom nav) is the buyer's saved items. If a dealer drops the price on something a buyer is watching, the buyer gets ONE text the first time the price drops on that item. (Not on every subsequent drop — just the first.)

### Sending an inquiry
Anonymous (signed-out) buyer:
1. Taps "I'm interested" on an item.
2. Drawer asks for name, phone, message.
3. We text the **buyer** a confirmation link first. The dealer is NOT notified yet.
4. Buyer taps the link, proving they own the phone.
5. Now we create the inquiry, text the dealer with the buyer's contact + message, and sign the buyer in.

Signed-in buyer skips steps 3-4: their phone is already verified.

The dealer texts the buyer back from their phone. Whole conversation happens in their normal text app. Early Bird is out of the loop after the introduction.

### Selling as a dealer
- /sell shows: a weekly attendance prompt for the next market, trailing-7-day stats (Listed / Views / Watchers / Inquiries), a Share-your-booth link to give buyers, an "Add a new item" button, and the live items grid. Sold items collapse into a "Sold (N)" archive at the bottom.
- Adding an item: photo, title, optional description, price, "price firm?" checkbox. No market picker — items just live in the dealer's catalog.
- Inquiries: when a buyer messages, the dealer gets a text with the buyer's name, phone, and message. They text back. When the deal is done, the dealer marks the item sold to that buyer in /sell. The winning buyer gets a "congrats, X marked this sold to you" text. Losers get nothing — no rejection text.

### Sign-in
Phone number → text with a magic link → tap the link → signed in. No passwords, no 6-digit codes. Sessions last 10 years on device — we don't want to log people out.

---

## What Early Bird deliberately DOES NOT do

These are not gaps. They're rules:

- **No in-app chat.** Communication is native SMS. When a buyer messages a dealer, both parties get each other's phone number and text directly. No inboxes, no threads, no DMs inside Early Bird.
- **No in-app payments.** No stored credit cards, Venmo handles, bank info. Dealers check boxes for the methods they accept (cash, Venmo, Zelle, Apple Pay/card). The buyer pays the dealer in person at the market.
- **No drop countdown / scheduled item reveal.** If an item is posted, it's visible. No "unlocks at 8am Friday" mechanics.
- **No items pinned to a single market.** Items belong to dealers; dealers attend markets.
- **No reviews or ratings.** Not for dealers, not for buyers.
- **No shipping.** In-person at the market, period. Nothing else.
- **No price negotiation UI.** Buyers can write an offer in the inquiry message, but there's no "haggle" interface.
- **No reply / inbox / DMs between dealer and buyer inside the app.**
- **No welcome text on signup.**
- **No marketing or re-engagement texts.** "We miss you," "check out what's new" — none of that.

The list of texts Early Bird is allowed to send is short and earned:

1. Magic link (sign-in / inquiry confirmation / phone-change verification)
2. Inquiry notification to the dealer
3. Sold-to-you receipt to the winning buyer
4. Price-drop alert to watchers (once per item, ever)
5. Dealer approval confirmation
6. Dealer cold-invite from admin
7. Pre-show reminder for buyers (per-show opt-in — built but not actively sending yet)
8. Pre-show nudge for dealers (intent — not built yet)
9. Ad-hoc admin blast (Eli composes, gets a review screen, presses Send)

That's the whole list. Anything not on that list, we don't send.

---

## How it makes money

Right now: it doesn't. It's free. No fees, no commissions, no paid tiers. The founders are dealers themselves and are funding it through a combo of "we'd want this anyway" and "we'll figure out the model later." The cost to run it is small (Vercel + Supabase + SMS).

Long-term thoughts that have come up but aren't decided: a small monthly subscription for dealers, a featured-listing fee, a "promote this item" boost, a payment-processing layer (which would break the deliberate-don't list above). All open.

---

## Communication style and brand

- **Aesthetic:** clean, editorial, magazine-y. JetBrains Mono for headlines and stats; Inter for long-form reading. Mostly black and white with a single accent color (warm orange, `#D64000`). Borders, not shadows. Typography over decoration.
- **Voice:** short sentences. Dealer-first. Plain English. No marketing fluff. "Confirm you're selling there and post 3 items by Thursday" — not "Maximize your visibility this weekend!"
- **Don't say:** "drop," "pre-shop," "exclusive access," "limited time," "today only." That language is retired.
- **Do say:** "browse," "selling," "this week," "confirm you're in."
- **Mobile first.** Most users are on iPhones. Touch targets ≥ 44px.

---

## Where things stand today (May 2026)

- Live at earlybird.la, ~30 dealers approved (rough number — Eli to confirm).
- Recent big shift: the booth model. Items used to be pinned to a specific market with a "drop time." That whole concept is gone. Now items belong to dealers persistently and dealers attend markets weekly.
- Recent surface-level changes: home page promo grid is strict (only items by dealers attending the next market), /sell stats are trailing-7-day, sold items collapse into an archive section, /home and / are merged so / is the canonical home for everyone.
- Pre-show reminder cron jobs (commitments 7 + 8 above) are intent, not built.
- The admin SMS blast review-and-send flow exists. Buyer + dealer scheduled reminders don't yet.

---

## The tech stack (in case it matters for your suggestion)

Next.js 16 (App Router), Supabase Postgres, Tailwind, Vercel hosting. Pingram for SMS (paid plan, supports inbound). Sentry for errors. The whole thing is one repo, no microservices, no mobile app — it's a mobile web app the dealers add to their iPhone home screen. Photos go through Supabase Storage with a CDN cache.

The codebase is small enough that one person can hold it in their head. ~50 routes total.

---

## Examples of things to ask Claude about

A few prompts that work well with this brief:

- *"How should we onboard a new dealer to make sure they post inventory in the first week?"*
- *"What would a clean Instagram ad creative for buyers look like — give me 3 directions."*
- *"How might we surface 'most-watched items at the upcoming show' without being shouty?"*
- *"What's the cleanest way to design the per-show buyer reminder, given commitment 9 (Eli must press send)?"*
- *"Critique our 'no in-app chat' rule. What are we losing? When would we revisit it?"*
- *"Suggest a copy rewrite for the dealer landing page (/dealer)."*
- *"How could we measure whether Early Bird actually drives more sales for a dealer at a given show?"*
- *"What's a low-effort way to A/B test pricing-firm vs. price-firm display?"*

For visual / UI questions, screenshot the page and paste it in alongside this brief — Claude can give better feedback with an image than with code.

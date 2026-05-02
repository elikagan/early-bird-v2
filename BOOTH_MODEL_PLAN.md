# Persistent Booth Model — Plan (revised)

## Why we're doing this

The site was built around a "drop" model — items lived inside a specific upcoming market, the page counted down to that market, and after the market passed items vanished from the feed. That model was wrong for the audience we're actually serving (pros buying from pros) and wrong for how dealers think about their inventory.

Real model: a dealer has stuff. The stuff is always there. Sometimes a dealer is at a flea market (Rose Bowl this Sunday, Long Beach next month) and a buyer who's planning to be there can filter the catalog to "people who'll be at Rose Bowl." Otherwise, the catalog is just the catalog.

The site needs to mirror that.

## The locked decisions

These are all answered. Spec, not suggestions.

1. **Items belong to dealers, not markets.** Items have no concept of "which show they're at." They exist, they're owned by a dealer, they're live or sold or held.
2. **Markets are a property of the dealer**, recorded in the existing `booth_settings` table. A row says "this dealer is at this market with this booth number" (or, with the new column, "this dealer declined this market").
3. **All-in attendance.** When a dealer says "yes I'm at Rose Bowl," all their live items are discoverable to a buyer who filters to Rose Bowl. No per-item market opt-in/out.
4. **Buyer view = catalog with filters.** Default home page is every live item, with the upcoming featured market as editorial framing. Market is one filter chip among many that will eventually exist (category, era, color).
5. **Items by non-attending dealers still appear** on the home page, mixed in below items by attending dealers. Home is a discovery feed, not a strict filter. Strict filtering is `/buy?market=X` and the future filter chip.
6. **Dealer market management** is a weekly time-aware prompt at the top of `/sell`, not a settings page.
7. **Prompt fires for every dealer**, every week, about the featured market. Quick to answer (yes + booth, or no), then collapses.
8. **Toggle pre-fills from past behavior.** If the dealer had a booth at the last Rose Bowl, this Rose Bowl's toggle starts in the ON state. They confirm with one tap. New dealers / first-timers get OFF default.
9. **Featured market** = next upcoming non-archived market. There's always one as long as any future market exists. The transition happens at Monday 12:01 AM PT — the just-finished Sunday market drops out, the next one becomes the feature even if it's weeks away.
10. **Item detail page** shows the dealer's featured-market booth (e.g. "Lisa Cliff Collection — at Rose Bowl 5.10, Booth 503") only if the dealer is attending the featured market. Otherwise no market line at all.
11. **Migration of existing items.** All 78 items currently tagged with Downtown Modernism get the tag cleared. They become persistent inventory of their owning dealer. Nothing is deleted.
12. **`/home` and `/` merge** into a single page. Same content for signed-out and signed-in; sign-in adds hearts and inquired-badges.
13. **Bottom-nav "Buy"** stays — same label, same position, points at the catalog (`/`).
14. **The "Share your booth" link** for dealers changes from `/early/<market-id>` (per-event, dies after the show) to `/d/<dealer-id>` (their persistent profile, lives forever).
15. **The drop-alerts plumbing dies entirely.** That includes the `buyer_market_follows` table, the `buyer_market_early_access` table, the `auth_tokens.market_id` column, the early-access magic-link branch in `/api/auth/verify`, the default `drop_alerts` notification preference set at sign-up, the `early_access_market_ids` field returned by `/api/auth/me`. Manual admin blast tool (the `/admin → SMS` page) is unaffected and stays.
16. **The `dealer_market_subscriptions` table dies too.** The "shows I usually sell at" data is no longer needed — past `booth_settings` history powers the toggle pre-fill instead.

## Schema changes

| Change | Detail |
|---|---|
| `items.market_id` | Make nullable. NULL all existing rows in the migration. |
| `booth_settings.declined` | New `boolean NOT NULL DEFAULT false` column. Lets us record "no" answers to the weekly prompt so we don't re-ask. A row with `declined=true` and `booth_number=null` means the dealer answered "no thanks" for that market. |
| `buyer_market_follows` | Drop the table. |
| `buyer_market_early_access` | Drop the table. |
| `dealer_market_subscriptions` | Drop the table. |
| `auth_tokens.market_id` | Drop the column. |
| `markets`, `dealers`, `users`, `items` (other than market_id), `inquiries`, `favorites` | No change. |

One migration file applies all of the above. The dropped tables don't have outbound foreign keys we care about preserving.

## Code paths to rewrite

### Read paths

| Path | Today | After |
|---|---|---|
| `GET /api/items?market_id=X` | `WHERE i.market_id = ?` | `WHERE i.dealer_id IN (SELECT dealer_id FROM booth_settings WHERE market_id = ? AND declined = false)` |
| `GET /api/items/[id]` | Joins items.market for the "available at" line | Drops the item-level market join. Computes dealer's featured-market booth separately and returns it as a separate field. |
| `POST /api/items` (create) | Requires `market_id` | Drops the requirement. Items belong to a dealer, no market needed. |
| `PATCH /api/items/[id]` (`getReceiptContext`) | Joins markets via `i.market_id` to build the sold-SMS receipt | Drop the market join. The receipt only uses dealer name + item title anyway. |
| `/` and `/home` server pages | Fetch items for one specific market | Fetch all live items + the featured market separately; sort with attending-dealer items first, others below. |
| `/buy?market=X` | Strict filter via items.market_id | Strict filter via the new booth_settings join. |
| `/early/[marketId]` (share link) | Strict filter via items.market_id | Same query, new join. |
| `/d/[id]` (dealer profile) | Items at one specific market | Dealer's full live catalog. Show their featured-market booth on the page if they're attending it. |
| `/sell` (dealer page) | Items the dealer has at the current selected market | Full catalog, no market filter, plus the weekly prompt at top. |
| `/sell/add` | Form requires picking a market | Form drops the market field entirely. |
| Admin items list | Filters by market_id | Same join change as buyer side. |
| Admin dashboard "Next Market" hero | Uses `heroCountdown()` | Show the date instead of a countdown. |

### Auth + user paths

| Path | Change |
|---|---|
| `/api/auth/start` | Stop setting the `drop_alerts` notification preference at sign-up. |
| `/api/auth/verify` | Remove the early-access branch entirely. |
| `/api/auth/me` | Stop returning `early_access_market_ids`. |
| `/api/users/me` GET | Stop returning `buyer_market_follows`, stop returning `dealer_market_subscriptions`. |
| `/api/users/me` PATCH | Remove the follow-markets and shows-subscription update sections. |
| `src/lib/auth.ts` `getInitialUser()` | Stop joining `buyer_market_early_access`. |

### Helpers in `src/lib/format.ts` to retire or rewrite

- `heroCountdown()` — gone (drop concept).
- `marketEyebrow()` — currently returns "Pre-shopping now" / "Open now." Replace with something neutral, or remove and use plain text on the page.
- `daysUntilLabel()` — currently returns "Opens in 3 days." Replace with the simple date ("Sun, May 10") or rephrase to drop the "Opens" framing.

## UX changes

### Buyer side

**Home page (`/`)** — visual identity stays close to today. Behavioral differences:
- Editorial lead = the featured market.
- Item grid = ALL live items, sorted with attending-dealer items first, others below.
- Each card shows the dealer name + booth number when the dealer is at the featured market; just the dealer name otherwise.
- "Coming up" rail = future markets other than the featured one.
- Drop-era copy retires: no countdown timer, no "PRE-SHOPPING NOW," no "before doors open" framing. Replacement copy I'll propose during implementation.

**`/buy?market=X`** — strict filter. Header "Items at Rose Bowl," grid below. No editorial framing.

**Item detail page** — same layout as today minus the item-level "Available at" section. The dealer card grows a single line: "At Rose Bowl 5.10, Booth 503" — only when the dealer is attending the featured market. Otherwise no line.

### Dealer side

**`/sell`** — single-list view of the dealer's full catalog. No market context, no market switcher.

At the top of the page, a card appears every week asking about the featured market: "Are you selling at [Market Name] [day]?" Two answers: "Yes — booth #" (input next to it), or "Not this one." Toggle pre-fills from past `booth_settings` history — if the dealer had a booth at the last Rose Bowl, this Rose Bowl's prompt comes in with the toggle ON and their previous booth number filled in. They confirm with one tap. After they answer, card collapses to a small confirmation badge for the rest of the week.

After Monday 12:01 PT the prompt rotates to the next featured market (with a fresh pre-fill from history).

**Item-row badge on `/sell`** — when the dealer is attending the featured market, every live-item card gets a small "📍 [market name]" tag.

**`/sell/add`** — drops the market picker. Just title, photo(s), price, description. Item joins the dealer's catalog.

**"Share your booth" link** — moves from `/early/<market-id>` to `/d/<dealer-id>`.

### Surfaces that don't change

- Watching tab (favorites). Items still exist, list still works.
- Inquiry drawer + inquiry SMS flow.
- Account page (other than removing the buyer "follow markets" toggle UI).
- Bottom nav (other than `Buy` link target).
- Admin → SMS blast tool. Stays exactly as-is.

## Featured-market logic

```
featured_market = SELECT * FROM markets
  WHERE archived = 0
    AND starts_at >= start_of_current_week
  ORDER BY starts_at ASC
  LIMIT 1

start_of_current_week = most recent Monday 00:01 America/Los_Angeles
```

Computed once per page render. No cron needed; the cutoff naturally advances as time passes.

## Toggle pre-fill logic

When showing the weekly prompt to a dealer for featured market `M`:

1. Find the last past market `M_prev` whose `name` matches `M.name` (e.g. "Rose Bowl Flea Market") — the previous instance of the same recurring show.
2. Look up `booth_settings` for (this dealer, `M_prev`).
3. If a row exists and `declined = false` → toggle pre-fills ON, booth_number pre-fills from that row.
4. If a row exists and `declined = true` → toggle pre-fills OFF.
5. If no row exists → toggle pre-fills OFF.

A dealer's actual answer to the prompt creates a `booth_settings` row for the featured market (with their booth number, or with `declined = true`). Future prompts for the same show name read this history.

## Order of operations

1. Schema migration: nullable `items.market_id` + NULL existing rows + `booth_settings.declined` column + drop the three obsolete tables + drop `auth_tokens.market_id`.
2. Auth + user endpoints: rip out drop-alerts and early-access plumbing.
3. `/api/items` GET + POST: new join, drop market_id requirement, simplify `getReceiptContext`.
4. `/api/items/[id]` GET: stop including item-level market.
5. New helper `featuredMarket()` in `src/lib/markets.ts`.
6. New helper for the toggle pre-fill query.
7. Server-component pages (`/`, `/home`, `/buy`, `/early/[marketId]`, `/item/[id]`, `/d/[id]`, `/sell`): rewrite read paths.
8. `<MarketAttendancePrompt>` component for top of `/sell`.
9. `/sell/add`: drop market picker.
10. `/sell` "Share your booth" link change.
11. `/account` page: remove the buyer "follow markets" toggle UI.
12. Admin items list query change. Admin dashboard countdown removal.
13. Copy retirement pass: replace "Pre-shopping now" / "OPENS IN X DAYS" / drop framing across the site. I'll propose phrases as I go.
14. Smoke-test matrix: anon catalog view, signed-in buyer with hearts, dealer with prompt-pending, dealer who's pre-filled ON, dealer who's pre-filled OFF, market filter `/buy?market=X`, dealer share link `/d/<id>`, archived market `/buy?market=oldmarket` (empty state), Watching tab still works.
15. Merge `/home` into `/`. Update bottom-nav `Buy` link target.
16. Update docs: `EB_DESIGN.md` rewritten around the new model. `KNOWN_DEBT.md` cleaned of obsolete items.

## What I'm NOT doing in this work

- Per-item market opt-out ("show this item only at certain shows").
- Multiple filter chips beyond market (category, era, etc.).
- Recurring auto-attendance ("I do every Rose Bowl" auto-set without prompting).
- Buyer segmentation by interest. Future blasts go to all buyers.
- Pingram delivery-receipt UI changes. That work shipped separately and is unaffected.

## Downstream impact audit

Every place market_id flows in the system today, what happens to it after the migration. This is the section that exists because the first cut of the plan didn't have it, and Eli's actual bug — `/sell` and Watching pages stuck on Downtown Modernism after archive — was exactly the kind of thing that fell through the gap.

### URL query params (`?market=...`)

These pages currently read `?market=X` from the URL. Most of them persist that param across navigation (linking from one to another carries the param along). After migration:

| Page | Today | After |
|---|---|---|
| `/sell` | Reads `?market=` and falls back to "first live market" if missing — this is the bug Eli hit, archive of DM left dealers stuck on it | Ignores `?market=` entirely. Always shows the dealer's full catalog. |
| `/sell/add` | Requires `?market=` (used for the "adding to X market" header and POST body) | Ignores `?market=`. Title/photos/price only. |
| `/buy` | Strict-filter view for `?market=X` | Same shape. If the market is archived → empty state with link back to `/`. |
| `/d/[id]?market=X` | Filters dealer profile to one market | Ignores `?market=`. Shows full dealer catalog. |
| `/early/[marketId]` | Strict filter | Same shape, archived → empty state. |
| `/feedback?market=X` | Per-market feedback form | Unchanged — feedback is genuinely per-market. |
| Magic-link `?to=/buy?market=X` | Verifies token then redirects | Unchanged — the destination still resolves. |
| Admin `?market=X` filter on items list | Filters admin items list | Same idea, new join. |

**Cleanup pass:** every internal link that today appends `?market=...` should stop doing it. I'll grep `&market=` and `?market=` across the codebase as the last step of the implementation.

### Database rows that go stale

| Where | Today | Migration handling |
|---|---|---|
| `items.market_id` | Each item points at one market | Migration NULLs the column on every row. Future inserts don't set it. |
| `booth_settings` | Per (dealer × market) booth_number | Stays. New `declined` column. Past rows for archived markets are inert. |
| `buyer_market_follows` | Buyer-follows-market with `drop_alerts_enabled` | Table dropped. |
| `buyer_market_early_access` | Granted early-access rows | Table dropped. |
| `dealer_market_subscriptions` | "Shows I usually do" | Table dropped. |
| `auth_tokens.market_id` | Used by early-access flow | Column dropped. |
| `notification_preferences` rows with `key='drop_alerts'` | Set at sign-up under the old model | Migration deletes those rows (the key is meaningless). |
| `feedback` rows with `market_id` | Per-market feedback | Stay. Genuinely per-market. |
| `sms_blasts` rows with `market_id` | Historical record of past blasts | Stay. Historical. |
| `items.last_price_alerted`, `items.original_price` | Per-item price-tracking | Unaffected. |
| Past `admin_actions` rows referencing markets | Audit log | Unaffected. Historical. |

### API response shapes that change

These endpoints today return market info nested in their payload. Consumers (client pages) need to be updated in lockstep:

| Endpoint | Field today | Field after |
|---|---|---|
| `GET /api/items` | Each item has `market_id` | Each item has no market field. Featured-market booth is computed separately when the page needs it. |
| `GET /api/items/[id]` | `item.market = {...}` | Removed. Replaced with `item.dealer_featured_booth = {...} \| null`. |
| `GET /api/favorites` | Each row has `market_id` + `market_name` (joined via `JOIN markets m ON m.id = i.market_id`) | Drop the join. Watching tab card no longer shows market info. |
| `GET /api/auth/me` | Returns `early_access_market_ids` | Field removed. |
| `GET /api/users/me` | Returns `buyer_market_follows`, `dealer_market_subscriptions` | Both fields removed. |

### In-flight client state

| Surface | What it has | Migration handling |
|---|---|---|
| Watching tab `FavItem` interface | `market_name`, `market_id` | Drop those fields from the type + render. |
| `/sell` page state | `marketId` from `?market=`, current `market` object, market switcher list | All dropped. |
| `/sell/add` state | `marketId` from URL, `market` object | Dropped. |
| Item detail (`item-view.tsx`) state | `item.market`, `item.dealer_payment_methods` (a separate thing) | `item.market` removed. Featured-market booth surfaced as a separate prop. |
| `/d/[id]` (dealer profile) state | `?market=X` filter, market header copy | Drop the filter; page is dealer-scoped not market-scoped. |
| Anonymous shuffle seed in sessionStorage keyed per market | Used by `/early/[marketId]` for stable shuffle | Stays — `/early` still per-market. |

### Internal links across pages

Each page below currently constructs links that include `?market=`. Each one needs review:

- `/home` and `/` "Browse all X items" CTA → `/buy?market=<featured>` — keep, this is the strict-filter destination.
- `/home` and `/` "Coming Up" rail rows → `/buy?market=<m.id>` — keep.
- Item card `Link href={...}` → `/item/<id>` (no market) — already correct.
- `/sell` page's "Add a new item" buttons → `/sell/add?market=<current>` — drop the `?market=`.
- `/sell` page's "Show switcher" drawer → `/sell?market=<m.id>` — drop the entire drawer.
- `/sell` page's "Share your booth" link → `/d/<dealer>?market=<m>` — change to `/d/<dealer>` only.
- Item detail back-button → `/sell?market=<...>` for owner, `/buy?market=<...>` for buyer — drop the `?market=`.
- Item detail dealer card link → `/d/<id>?market=<...>&from=item` — drop `?market=`.

### External links in already-sent SMS

These can't be changed, but they need to keep resolving:

- `/v/<token>?to=/sell` — verifies, redirects to `/sell`. Works.
- `/v/<token>?to=/buy?market=<id>` — verifies, redirects to strict-filter view. Works (empty state if market archived).
- `/v/<token>?to=/early/<id>` — verifies, redirects. Works (empty state if archived).
- `/v/<token>` (early-access) — the early-access flow is being deleted. Tokens minted before this change but not redeemed yet would no-op gracefully. Need to check `/api/auth/verify` doesn't crash on the missing branch.

### `/api/markets` and the `markets` table

- `markets.drop_at` becomes meaningless data. Keep the column for one release as a safety net (avoid breaking inserts in the admin form), but stop reading it. Drop in a follow-up migration.
- `/api/markets` GET returns markets ordered by `drop_at ASC`. Re-order by `starts_at ASC`.
- `markets.archived` stays — it's how we hide past or cancelled markets.
- `markets.is_test` stays — admin testing flag.
- `markets.dealer_count` and `item_count` — currently subqueries on items.market_id and booth_settings.market_id. Item count's definition changes: "items by dealers attending this market" rather than "items at this market." Will likely produce different numbers.

### Cron jobs

- `ops-check`: unaffected.
- `prune-events`: unaffected.
- `schedule-blasts`: schedules pending dealer/buyer blasts for review. Blasts are still per-market (audience = "dealers at this market," "buyers at large"). Unaffected.

### The `/api/auth/dev-login` endpoint

Creates a test item with `market_id` set. After migration, market_id is nullable, so this is harmless. But the test-data factory should be updated to not bother setting it.

### Onboarding flow

Reviewed `/onboarding` and `/v/[token]`. The early-access redirect branch in `/v/[token]` (line 54-57) reads `data.early_access_market_id` and redirects to `/buy?market=...`. Since `early_access_market_id` no longer exists in the auth/me response, this branch becomes unreachable dead code. Remove it.

### The `/account` page

Has a "follow markets" toggle UI for buyers. Drop it. The underlying `buyer_market_follows` table is gone.

### EB_DESIGN.md

The canonical product spec is written almost entirely around the drop model. The whole doc needs a rewrite. Sections that go: pre-drop access, drop alerts, the buyer "follow markets" commitment, the early-access link flow, the per-market home framing. Sections that stay: SMS-native communication, no in-app chat, payment-middleman policy, no OTP codes. New sections to add: persistent dealer profile, the catalog model, the weekly attendance prompt, market filter as one filter among many.

### KNOWN_DEBT.md

Items P1 about "market reminders for buyers / dealers not built" become obsolete. The whole "scheduled mass texts" commitment shifts shape — manual blasts are the answer for now, not cron-scheduled per-market reminders.

## Risks + edge cases

- **Mix-in sort** for the home page — placeholder algorithm: attending-dealer items first by newest, then non-attending by newest. Iterate after seeing it live.
- **Existing share links** — anyone who saved `/buy?market=H8siHnv5aFjc-thg` (Downtown Modernism, archived) lands on a strict-filter view that's now empty. Empty state with a link back to home.
- **Dealer share links to past markets** — `/early/H8siHnv5aFjc-thg` same story. Empty state. (Note: under the new model the dealer's share link is `/d/<id>`, not `/early/<market-id>`, so any future shared link doesn't have this problem.)
- **Items in someone's Watching list from before the migration** — they were favorited when items had a market. They still work — items still exist.
- **Inquiries in flight when the migration runs** — unaffected. Inquiries reference items, items still exist.
- **A dealer with no past booth history** — first-time dealer sees every weekly prompt with toggle OFF. They explicitly opt in. No false positives.
- **A dealer who used to do Rose Bowl but stopped** — last Rose Bowl they declined → next prompt pre-fills OFF. Correct.
- **Two markets with the same name in the same week** — shouldn't happen. If it does, featured-market query picks the earliest by `starts_at`. The other doesn't get a prompt.

## Estimate

One real focused work session, possibly two if the copy retirement turns into a longer back-and-forth. Each commit is scoped to one phase from the order-of-operations list, so you can review as it lands rather than at the end.

---

## Sign-off

If this matches what you're picturing, reply "go" or "approved." Edits welcome before I touch code.

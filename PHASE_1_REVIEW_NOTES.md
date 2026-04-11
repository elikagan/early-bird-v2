# Early Bird — Phase 1 Wireframe Review

Working spec derived from the Phase 1 wireframe review. Not an export — this is a rewritten, deduped, cross-referenced directive list used to drive revision sessions.

---

## About this document

Two parts:

1. **Cross-cutting themes (T1–T12)** — issues that apply to several screens, extracted once so a session working on a single screen doesn't miss something that was first named on a different screen. Each theme carries its own rule, rationale, and applicability list.
2. **Per-screen directives (01–14)** — one section per screen, written as a bulleted list of actionable changes. Each section ends with a list of the cross-cutting themes that also apply to that screen.

**A session revising a screen MUST read:**
- The full "Cross-cutting themes" section (it's short and it's the hidden half of the spec)
- Its one target screen's per-screen section

Do not read other screens' per-screen sections — cross-screen context pollution is the failure mode the workflow is designed to prevent.

---

## Cross-cutting themes — quick index

- **T1** — Pinned bottom CTA: no below-fold, no gap glitch
- **T2** — Color down: outline badges, muted status chips
- **T3** — Pill/badge padding: breathing room for mono text
- **T4** — Back and close affordances: not tiny icon buttons
- **T5** — Remove visible debug/state labels from headers
- **T6** — Filter row heights must match across controls
- **T7** — Kill "pre-buy" / "preview" language
- **T8** — Home pages for both roles; logo routes to home
- **T9** — Account screens edit in place (no modal edit)
- **T10** — Sticky footer: no "line-above" indicator style
- **T11** — No stored payment handles (methods-only, not accounts)
- **T12** — No pop-ups/modals on mobile (use drawers)
- **T13** — Market status indicator: lightning-bolt circle for LIVE, calendar circle for upcoming

---

## Cross-cutting themes — detail

### T1. Pinned bottom CTA — no below-fold, no gap showing scroll underneath

- **Rule:** The sticky bottom area (primary CTA and/or bottom nav) must be a single fixed container flush to the viewport edge. If a CTA and a bottom nav are stacked, they live inside the same fixed wrapper — no gap between them where page content can scroll through. On landing pages, the CTA is above the fold, not below it.
- **Why it matters:** On landing pages, a CTA below the fold defeats the whole point of the landing page. The gap-glitch on `sell-add-item` is the specific visual bug where page content shows between the sticky CTA and the sticky nav — that was flagged on one screen but it's a structural issue that can appear anywhere the pattern repeats.
- **Applies to:** every screen with a sticky bottom element (essentially every screen in the app).

### T2. Color down the app — outline badges and muted status chips

- **Rule:** Badges and pills are outline/muted by default. Reserve fill color for true alerting states (market LIVE is the only one endorsed so far). Price drops, inquiry counts, status labels, category tags, dealer indicators, "verified" marks, dropped-price markers — all outline, not filled.
- **Why it matters:** Everything on screen competes for attention. Green verified pills, red price-drop pills, yellow held pills, green live pills — it's all screaming at the same volume. There's no hierarchy.
- **Applies to:** every badge/pill in the app.

### T3. Pill/badge padding — monospace text needs breathing room

- **Rule:** Default `badge badge-sm` is too tight for monospace text. Use explicit padding (`px-2 py-2` or similar) and ensure vertical centering. A badge should feel like a considered chip, not a crammed tag.
- **Applies to:** every badge/pill in the app.

### T4. Back and close affordances — not tiny icon buttons

- **Rule:** No small circular ghost buttons for back/close in page chrome. Prefer a text row like `← Back` under the header or a clearly-sized labeled button. The X on drawers/sheets needs a real tap target.
- **Applies to:** every screen with a back button or close button — item detail screens, drawers, booth setup, add-item, any sheet.

### T5. Remove visible debug/state labels from headers

- **Rule:** Header shows the object name or the real screen title, nothing else. No `State 1`, no `buyer view`, no `dealer own state 2` — those are internal role labels left behind as dev crutches. They don't belong in the wireframe or in prod.
- **Applies to:** every wireframe with a state/role label in its header. Primarily the item detail screens; grep for `State N` and role-name labels in headers before committing any screen.

### T6. Filter row heights must match across controls

- **Rule:** When a filter row mixes a segmented control with other buttons or selects, every element in the row must be the same height. `tabs tabs-boxed` is the wrong primitive — it renders at a different height than `btn-sm` neighbors. Use a `join` of `btn-sm` buttons for segmented controls so heights match.
- **Applies to:** every screen with a filter row that has mixed control types. Specifically called out for `buy-feed` and `sell-booth-active`; check all other filter rows while revising.

### T7. Kill "pre-buy" / "preview" language — the app is shopping, not previewing

- **Rule:** The app is a marketplace, not a viewer. Buyers SHOP. Dealers SELL. The transaction happens before the crowd arrives at the physical market, but it IS a real transaction. Correct framing: "shop the drop", "shop before the crowd", "sell before sunrise", "the drop". Wrong framing: "pre-buy", "preview", "early preview", anything implying the app is just a catalog.
- **Requires an `EB_DESIGN.md` update.** The first session that encounters this theme should fix the relevant `EB_DESIGN.md` sections in the same commit. Probable targets: "The Idea" (line ~9), "Who It's For" (buyer line), "Onboarding" bullet under The Screens. Grep `pre-buy`, `preview`, `pre-market` across the repo.
- **Applies to:** every screen with copy referencing the buying experience. Also the `EB_DESIGN.md` sections listed above.

### T8. Home pages for both roles; logo routes to home, not to a tab

- **Rule:** Post-login flow is: landing → magic link → onboarding → **home lobby** → tabs. The home lobby is a new logged-in lobby screen (one for each role) that sits above Buy/Watching/Sell/Account. It shows markets, countdowns, FAQ, and drop-alert opt-in. Every post-login screen's header logo routes to the home lobby (not to the first tab).
- **Requires two new wireframes** — `home-buyer.html` and `home-dealer.html`. Each is its own dedicated session (separate checklist items in the workflow). Do NOT build them inside the `buy-feed` or `sell-booth-setup` revision sessions.
- **Requires an `EB_DESIGN.md` update** to the flow / navigation section, plus adding the two home screens to The Screens list.
- **Applies to:** every post-login screen's header (the logo becomes an anchor to the home lobby). Excludes pre-auth screens (`landing-buyer`, `landing-dealer`) and the linear onboarding flow. Also requires the two new wireframes.

### T9. Account screens edit in place — no modal Edit screens

- **Rule:** Account screens have no "Edit" button and no modal edit screen. Profile fields are inline-editable inputs that look like plain text until focused (`input input-ghost` pattern). Name, business name, phone (readonly/verified), payment methods, markets — all edit-in-place on the main account screen.
- **Applies to:** `account-buyer`, `account-dealer`.

### T10. Sticky footer / bottom nav — the "line-above" indicator style is wrong

- **Rule:** The current `border-t` line above the sticky bottom nav is inconsistent with the broader design system. Needs a different separator treatment — the replacement isn't prescribed, but it should NOT be a hard 1px line-above. Possible directions: solid panel background with no rule, soft inset shadow, or drop the separator entirely if the background contrast is enough.
- **This theme requires design judgment.** Don't just delete the border and call it done. Think about what replaces it and why.
- **Applies to:** every screen with a sticky bottom nav (essentially every screen after login). This explicitly applies everywhere, not only to the screen it was first noticed on.

### T11. No stored payment handles — accept-methods only, not accounts

- **Rule:** The app never stores `@venmo`, `@zelle`, phone numbers for payment, or any other payment handle. Dealers check boxes for which methods they accept: Cash, Venmo, Zelle, Apple Pay, Card. Buyers pay the dealer however the dealer instructs at the booth, AFTER the dealer confirms the sale. Preventing pre-sale payments is an explicit product requirement — we don't want to be in the middle of a buyer sending money before the dealer approves the sale.
- **Requires an `EB_DESIGN.md` update.** The first session that encounters this theme should fix the relevant `EB_DESIGN.md` sections in the same commit. Probable targets: "Sell Tab (Dealer's Booth) → Setup" (line ~122), "Account → Dealer" (line ~132), Tech Stack > Notifications. The current design doc says "Venmo/Zelle/Cash — inline on this page" which implies stored handles.
- **Applies to:** `sell-booth-setup`, `account-dealer`. Also the `EB_DESIGN.md` sections.

### T12. No pop-ups/modals on mobile — use drawers (bottom sheets)

- **Rule:** Any interaction that would be a modal becomes a drawer (bottom sheet) instead. DaisyUI `modal modal-bottom` is STILL a modal — the spec is to use a raw Tailwind fixed-position container with drag handle, rounded top corners, and a thin top border. Not the DaisyUI modal primitive.
- **Applies to:** any modal in the app. Primary instance is the `item-detail-buyer` inquiry compose. Also applies to any future confirm/edit sheets. Account screens should edit in place (see T9), not use drawers either.

### T13. Market status indicator — lightning-bolt circle for LIVE, calendar circle for upcoming

- **Rule:** The current green "LIVE" text pill (`badge badge-success gap-1` with the "LIVE" text label) gets replaced with a circle containing a lightning-bolt icon. Markets that are not currently live (upcoming drops) get a circle containing a calendar icon. The indicator is a compact, icon-only chip — no text label inside.
- **Why it matters:** The text pill is loud, wordy, and blends in with other badges in a row. A shape + icon is instantly readable, scales to every density (feed row, item detail header, market card), and cleanly separates "live now" from "scheduled" without repeating the word LIVE in every card. It also complements T2 (color-down) — the LIVE circle can stay colored since it's the only alerting state endorsed, while the upcoming circle is outline/muted.
- **Scope notes:**
    - Deferred to a cross-screen pass — do NOT apply this inside a single-screen revision session.
    - Applies to the "LIVE" pill wherever it currently appears. Not to the LIVE tab label inside `sell-booth-active`'s status tabs (that's a different control — tab copy, not a status indicator).
    - Icon choice is open — lightning bolt and calendar could be a heroicon, a material icon, or inline SVG; the decision belongs to the session that executes this pass.
- **Applies to:** every screen with a market status indicator. Current instances (as of 2026-04-10): `buy-feed.html`, `item-detail-buyer.html`, `item-detail-buyer-inquiry.html`, `item-detail-dealer-browsing.html`, `sell-market-picker.html`, `sell-add-item.html`, `sell-booth-active.html` (multiple inside). Grep `badge-success` across `public/wireframes/` before the pass to catch any additions.

---

## Per-screen directives

### 01. landing-buyer

- Phone input and primary CTA must be above the fold. The whole point of this page is to convert a cold visitor into a signed-in user, and they can't do that if the sign-in control is below the scroll line.
- The "Get started" area is unclear. This page has two jobs: (a) explain what Early Bird is in one or two lines, and (b) get the visitor to sign in. Both must be obvious in the first viewport.
- Add FAQ and About sections at the bottom of the page.
- Add a "Dealer? Click here" link in the top-right corner for dealers who land on the wrong page.

_Cross-cutting themes that also apply: T1, T7, T10._
_T8 does NOT apply: this is a pre-auth page, the logo doesn't need to route to a home lobby yet._

---

### 02. landing-dealer

- Same pinned-CTA rule as landing-buyer — CTA above the fold.
- The copy must make two things clear: (a) Early Bird is free to use, and (b) the dealer transacts directly with the buyer. We don't take a cut.
- Add FAQ and About sections at the bottom of the page (parallel to landing-buyer).
- Acknowledge that dealers are also buyers. At minimum, copy that mentions both roles; ideally a visible way for a dealer to flip into the buyer experience.

_Cross-cutting themes that also apply: T1, T7, T10._
_T8 does NOT apply: pre-auth page._

---

### 03. onboarding

- The current layout is busy and clunky. Reduce the number of competing elements and tighten the visual hierarchy.
- Replace the file-upload-with-size-limit with a direct "Take a selfie" camera capture. The photo exists for one reason — dealer recognition at the booth — so don't over-engineer it.
- Display name is free-form. Whatever the user types is what the dealer sees (e.g., "John C.", "John Chen", or even an emoji). Enforce a character limit if the UI breaks, but don't impose a format.
- The "heads up" message isn't useful on this screen. Either move it somewhere more relevant (possibly the home lobby) or drop it.
- Buyer onboarding is missing steps that belong here: subscribing to specific flea markets and setting notification preferences. Add these steps to the flow and update `EB_DESIGN.md` to list them.
- The "pre-buy" / "preview" framing surfaces in this screen's copy. Rewrite to shopping framing (see T7) and update `EB_DESIGN.md` at the same time — this is the first session that encounters T7, so it's the session that fixes the design doc.
- The verified pill is tight and the green is too loud. Add padding (T3) and drop the color (T2).

_Cross-cutting themes that also apply: T1, T2, T3, T7, T10._

---

### 04. buy-feed

- Dealer avatars are too small. Make them larger and more legible.
- The ALL/SAVED segmented control and the Dealer/Category selector are fighting each other. The segmented control uses a different primitive (`tabs tabs-boxed`) at a different height than its row neighbors. Rebuild the filter row so every control is the same height — use a `join` of `btn-sm` buttons for the segmented control (see T6).
- **This screen is NOT the buyer's home.** The buyer's true home is a logged-in lobby page that shows upcoming markets with countdowns, FAQ content, and a drop-alert opt-in. The correct flow is: landing → magic link → onboarding → **home-buyer lobby** → buy-feed (tab). The Early Bird logo in every post-login screen's header must route to the home-buyer lobby, not to buy-feed.
- A new `home-buyer.html` wireframe needs to be built — in a **separate session**, not inside the buy-feed revision. It's a separate checklist item in the workflow. `EB_DESIGN.md` flow diagrams and The Screens list must also be updated (handle the doc update inside the buy-feed revision session since this is where the need was named).
- Kill any "pre-buy" / "preview" framing in the feed header or filter copy (see T7).
- If a filter modal exists on this screen, it must be a bottom drawer, not a DaisyUI modal (see T12).

_Cross-cutting themes that also apply: T1, T2, T3, T4, T6, T7, T8, T10, T12._

---

### 05. watching

- The red price-drop pill is wrong two ways: the color is far too loud (see T2), and the internal vertical alignment is off because the pill is under-padded (see T3).
- "Inquiry sent" status on a watched item should show the actual message the buyer sent, not just the label. There's room for it in the card.
- Replace "8 items you care about" with "Watching 8 items". The current copy is over-styled for what it needs to convey.
- Favorite hearts are black, not red. This applies anywhere hearts appear (including `buy-feed`).
- The Early Bird logo in this screen's header routes to the home-buyer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T8, T10._

---

### 06. item-detail-buyer

- The inquiry compose is a **bottom drawer**, not a modal. Any modal on mobile is wrong (see T12). Implement with a raw Tailwind fixed-position container, drag handle, rounded top corners, and a thin top border — NOT DaisyUI's `modal modal-bottom`.
- The current wireframe only shows the drawer-open state; there's no clean item-detail state to review. Split this wireframe into two files: `item-detail-buyer.html` (clean state, no drawer) and `item-detail-buyer-inquiry.html` (drawer open). **This is the only permitted exception to the one-screen-per-session rule** — both files are built in a single session.
- The header text reads "buyer view" — that's a dev-only role label. Replace with the item name (see T5).
- The X close button on the drawer is a tiny icon button. Give it a real tap target (see T4).
- This screen's copy leaked "preview" framing, which is wrong — Early Bird is a marketplace, not a catalog. Fix the copy here and update `EB_DESIGN.md` (see T7).
- The Early Bird logo in this screen's header routes to the home-buyer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T4, T5, T7, T8, T10, T12._

---

### 07. item-detail-dealer-own

- The back arrow is stylistically wrong and too small. Replace the tiny icon button with a `← Back` text row or a clearly sized labeled button. This is the canonical source of the T4 rule.
- The LIVE pill and the "3 inquiries" pill are clashing. Both should be outline/muted (see T2).
- The LIVE / HOLD / SOLD selector feels out of place and the color is too loud. Drop the saturation so the selector fits the rest of the palette. The copy should also make it clearer that the dealer should mark an item SOLD when it actually sells — rename the option or add a helper line.
- The header text reads "dealer own state 2" — a dev-only state label. Replace with the item name (see T5).
- The Early Bird logo in this screen's header routes to the home-dealer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T4, T5, T8, T10._

---

### 08. item-detail-dealer-browsing

- The price-drop pill on this screen has the same problems as on `watching` — outline it and fix the padding (see T2, T3).
- The "art deco" sub-style in the category area isn't justified by anything on screen or in the design doc. Drop the sub-style and keep the top-level category (e.g., "Lighting") only.
- Check this screen's header for a leftover `State N` or role-name label. Screens 06 and 07 both had debug labels in their headers; this third item-detail state almost certainly has one too. If present, replace with the item name (see T5).
- The back/close affordance on this screen follows the same rule as 07 — no tiny icon buttons (see T4).
- The Early Bird logo in this screen's header routes to the home-dealer lobby (see T8). A dealer browsing someone else's item is still on the dealer side of the app.

_Cross-cutting themes that also apply: T1, T2, T3, T4, T5, T8, T10._

---

### 09. sell-booth-setup

- The back arrow on this screen has the same problem as 07 — no tiny icon button (see T4). This is explicitly the same fix.
- **This screen is NOT the dealer's home.** Dealer flow is landing → magic link → onboarding → **home-dealer lobby** → sell-booth-setup (when the dealer picks a specific market to set up for). The home-dealer lobby shows upcoming markets, explains how the drop works, and persuades dealers to set up in advance. The Early Bird logo in every dealer-side screen's header routes to the home-dealer lobby.
- A new `home-dealer.html` wireframe needs to be built — in a **separate session**, not inside the sell-booth-setup revision. It's a separate checklist item in the workflow. `EB_DESIGN.md` flow diagrams and The Screens list must also be updated (handle the doc update inside the sell-booth-setup revision session since this is where the need was named).
- Remove "row / area" and the landmark-hint input. Booth number alone is sufficient.
- **Remove the payment-handle fields** (Venmo handle, Zelle handle, phone-for-payment). The dealer selects which methods they accept via checkboxes: Cash, Venmo, Zelle, Apple Pay, Card. Buyers pay the dealer directly at the booth, AFTER the dealer confirms the sale. This prevents pre-sale payments, which is an explicit product requirement — we don't want to be in the middle of a buyer paying before a dealer confirms the sale. `EB_DESIGN.md` must be updated in the same session to remove language that implies stored handles (see T11).

_Cross-cutting themes that also apply: T1, T2, T3, T4, T8, T10, T11._

---

### 10. sell-booth-active

- The ALL/LIVE/HELD/SOLD picker is the wrong primitive at the wrong height — same issue as the `buy-feed` filter row. Rebuild using a `join` of `btn-sm` buttons so every control in the row matches (see T6).
- The pills and buttons on this screen have no hierarchy. Everything is screaming at the same volume. Drop colors down to outline/muted by default and reserve fill color for true alerting states (see T2).
- Merge the Hold and Release buttons into a single action that flips its label based on state. Don't show both.
- Drop the "dropped" pill entirely. The crossed-out price communicates a price drop on its own.
- **Slow down on this screen.** The issues above are symptoms of not thinking this screen through carefully the first time. Before making changes, re-examine what this screen is for and what hierarchy it needs.
- The sticky footer on this screen uses a hard `border-t` line above the bottom nav. This is the canonical source of T10. The line-above treatment is wrong **everywhere in the app**, not just here — the fix must land on every sticky-footer screen.
- Kill any "pre-buy" / "preview" framing in empty-state copy or helper text (see T7).
- The Early Bird logo in this screen's header routes to the home-dealer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T4, T6, T7, T8, T10._

---

### 11. sell-add-item

- There's a visible gap between the "live instantly" line (sticky CTA area) and the bottom nav, where page content scrolls through. **This is a structural bug, not a visual tweak.** The sticky CTA and the bottom nav must live inside a single fixed container with no gap between them. This is a canonical T1 symptom — fix the pattern wherever it appears, not just the symptom on this screen.
- The "live instantly" copy is only correct AFTER the drop. Before the drop, the copy should say something like "Your item goes live when the market drops at [time]". This is market-state-aware copy — show it as a note/annotation in the wireframe; actual wiring belongs to Phase 3.
- Remove the "no haggling at booth" label. It's not something this form needs to communicate.
- Only picture, category, and title should be required fields. Everything else is optional.
- Kill any "pre-buy" / "preview" framing in form copy or hint text (see T7).
- The Early Bird logo in this screen's header routes to the home-dealer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T4, T7, T8, T10._

---

### 12. sell-market-picker

**This page is deleted.** Most dealers won't be focused on a market two weeks out. The home-dealer lobby (T8) absorbs the market-selection function.

Deletion checklist (for the session that processes this item):

1. Delete `public/wireframes/sell-market-picker.html`.
2. Remove `'sell-market-picker'` from the `WIREFRAMES` array in `public/review.html`.
3. Update the sidebar count: `Wireframes (N)`.
4. Update the progress counter default: `1 / N`.
5. Update the clear-all confirm copy: `Clear ALL notes across all N wireframes`.
6. Update `EB_DESIGN.md` The Screens list to drop the Market Picker bullet.
7. Commit, push, end session.

_No cross-cutting themes apply — the page is gone._

---

### 13. account-buyer

- **Remove the Edit button entirely.** There is no separate Edit screen. Profile fields are inline-editable directly on this page using the `input input-ghost` pattern (looks like plain text until focused). This is the canonical source of the T9 rule.
- The "markets you follow" feature is good. The "follow more" affordance is unclear — rename or restyle so it's obviously "add another market to follow".
- "Become a dealer" is unclear copy. What does it actually do? Tie it to the dealer-apply flow and rewrite the copy to match. (See OQ3 below.)
- The market pills have almost no padding and camelCase market names look odd in the monospace font. Add padding (see T3) and use consistent casing for market names anywhere they appear.
- The Early Bird logo in this screen's header routes to the home-buyer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T8, T9, T10._

---

### 14. account-dealer

- **Same edit-in-place rule as account-buyer:** no Edit button, no modal edit screen. Business name and every other field is inline-editable directly on this page (see T9).
- **Remove the Venmo and Zelle handle fields entirely** (see T11). Same rule as `sell-booth-setup`: methods checkboxes, not stored handles.
- Drop the metrics / stats cards. They don't belong on the account screen.
- **Open product question:** should booth defaults be per-market rather than global? Flag for design decision — don't make the call inside the revision session. (See OQ4 below.)
- The Early Bird logo in this screen's header routes to the home-dealer lobby (see T8).

_Cross-cutting themes that also apply: T1, T2, T3, T8, T9, T10, T11._

---

## Follow-ups from later sessions

Items that surfaced after a screen was already shipped, where a single rule (often captured in a feedback memory) implies a re-pass on a sister screen. Each one is its own dedicated session — do not bundle.

- **FU1 — `home-buyer` hero hierarchy re-pass.** The home-dealer session corrected my mental model of the market/drop relationship: markets are the events (Rose Bowl Flea, Downtown Modernism — the headline noun), drops are the timing detail for when each market's inventory goes live the night before. `home-buyer.html` was built before that correction landed and uses "Drops in 29d 6h" framing in its hero alongside the LIVE NOW state — needs a pass to confirm the market name is the h1 hero and any drop-countdown framing sits as a supporting widget beneath the market identity, not as the headline. See `feedback_eb_no_drop_branding.md` (v3) for the rule. Separate session; no bundling with other revisions.

---

## Open product questions

These are questions raised during review that need a design decision before the relevant screen can be finalized. Do not try to answer them inside a revision session — flag them in the commit message, leave the current behavior alone, and surface them for a decision.

- **OQ1 — Pre-drop vs. post-drop copy on `sell-add-item`.** Before the drop: "Your item goes live when the market drops at [time]". After the drop: "Live instantly". The wireframe should show this conditionally (as a note), but the actual wiring is Phase 3 work.
- **OQ2 — What does "Follow More" actually do on `account-buyer`?** Discover new markets? Search? Open a drawer? Might just need a rename/restyle.
- **OQ3 — What does "Become A Dealer" actually do on `account-buyer`?** Is there an approval workflow? A quick-review step has been mentioned elsewhere — the button copy needs to match whatever the answer is.
- **OQ4 — Should booth defaults on `account-dealer` be per-market rather than global?** The question is real but the answer requires design thought about dealer workflows across multiple markets.

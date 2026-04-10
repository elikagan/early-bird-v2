# Early Bird — Phase 1 Wireframe Review Notes

Exported from public/review.html (scratch tool, not part of app).

---

## About this document

Two parts:

1. **Cross-cutting themes (T1–T12)** — issues the reviewer called out on one or two screens that actually apply to several. Extracted here so a session working on a single screen doesn't miss an issue that was first named somewhere else.
2. **Per-screen notes (01–14)** — the reviewer's verbatim notes, one section per screen. Each section ends with a "Themes that apply here" line pointing back to the cross-cutting themes that also affect that screen.

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

---

## Cross-cutting themes — detail

### T1. Pinned bottom CTA — no below-fold, no gap showing scroll underneath

- **Source notes:** 01.1, 02.1, 11.1
- **Rule:** The sticky bottom area (primary CTA and/or bottom nav) must be a single fixed container flush to the viewport edge. If a CTA and a bottom nav are stacked, they are inside the same fixed wrapper — there is no gap between them where page content can scroll through. On landing pages, the CTA is above the fold, not below it.
- **Why the reviewer cares:** On landing pages, the CTA being below the fold defeats the whole point of the landing page. The gap-glitch on `sell-add-item` is the specific visual bug where page content shows between the sticky CTA and the sticky nav — the reviewer flagged it only on that screen but it's actually a structural issue that could appear anywhere the pattern repeats.
- **Applies to:** every screen with a sticky bottom element. That's essentially every screen in the app.

### T2. Color down the app — outline badges and muted status chips

- **Source notes:** 03.5, 05.1, 07.2, 10.2, 10.4
- **Rule:** Badges and pills are outline/muted by default. Reserve fill color for true alerting states (market LIVE is the only one the reviewer has endorsed so far). Price drops, inquiry counts, status labels, category tags, dealer indicators, "verified" marks, dropped-price markers — all outline, not filled.
- **Why the reviewer cares:** Everything on screen competes for attention. Green verified pills, red price-drop pills, yellow held pills, green live pills — it's all screaming at the same volume. There's no hierarchy.
- **Applies to:** every badge/pill in the app.

### T3. Pill/badge padding — monospace text needs breathing room

- **Source notes:** 03.5 ("pretty naive looking"), 05.1 ("internal vertical alignment issues"), 13.4 ("pills with almost not padding. i'ts an odd look")
- **Rule:** Default `badge badge-sm` is too tight for monospace text. Use explicit padding (`px-2 py-2` or similar) and ensure vertical centering. A badge should feel like a considered chip, not a crammed tag.
- **Applies to:** every badge/pill in the app.

### T4. Back and close affordances — not tiny icon buttons

- **Source notes:** 06.3 ("I find that X very small"), 07.1 ("I hate the style of the back arrow and its too small"), 09.1 ("top arrow note from earlier applies here")
- **Rule:** No small circular ghost buttons for back/close in page chrome. Prefer a text row like `← Back` under the header or a clearly-sized labeled button. The X on drawers/sheets needs a real tap target.
- **Applies to:** every screen with a back button or close button — item detail screens, drawers, booth setup, add-item, any sheet.

### T5. Remove visible debug/state labels from headers

- **Source notes:** 06.5 ("the 'buyer view' at the top seems inadvertant on your part. It should just say [object name]"), 07.4 ("Why does it say 'dealer own state 2' at the top. probably should say the object name?")
- **Rule:** Header shows the object name or the real screen title, nothing else. No `State 1`, no `buyer view`, no `dealer own state 2` — those are internal role labels I left behind as dev crutches. They don't belong in the wireframe or in prod.
- **Applies to:** every wireframe with a state/role label in its header. Primarily the item detail screens; grep for `State N` and role-name labels in headers before committing.

### T6. Filter row heights must match across controls

- **Source notes:** 04.2 (buy-feed: ALL/SAVED "totally out of place. it's also a different height than the other elements in the row"), 10.1 (sell-booth-active: ALL/LIVE/HELD/SOLD picker "totally out of place. Wrong heigt for the row as well")
- **Rule:** When a filter row mixes a segmented control with other buttons or selects, every element in the row must be the same height. `tabs tabs-boxed` is the wrong primitive — it renders at a different height than `btn-sm` neighbors. Use a `join` of `btn-sm` buttons for segmented controls so heights match.
- **Applies to:** every screen with a filter row that has mixed control types. Specifically called out for `buy-feed` and `sell-booth-active`; check all other filter rows while revising.

### T7. Kill "pre-buy" / "preview" language — the app is shopping, not previewing

- **Source notes:** 03.3 ("you're a bit confused about the 'pre-buy' thing. They are not just prebuying. They are shopping on this app but paying the dealer directly"), 06.2 ("dealers aren't just previewing in this app. The value of the app is allowing them to buy before the market opens. I want you to take make a note in the .md files that fixes whatever the source of this confusion is")
- **Rule:** The app is a marketplace, not a viewer. Buyers SHOP. Dealers SELL. The transaction happens before the crowd arrives at the physical market, but it IS a real transaction. Correct framing: "shop the drop", "shop before the crowd", "sell before sunrise", "the drop". Wrong framing: "pre-buy", "preview", "early preview", anything implying the app is just a catalog.
- **Requires an `EB_DESIGN.md` update.** The first session that encounters this theme should fix the relevant `EB_DESIGN.md` sections in the same commit. Probable targets: "The Idea" (line ~9), "Who It's For" (buyer line), "Onboarding" bullet under The Screens. Grep `pre-buy`, `preview`, `pre-market` across the repo.
- **Applies to:** every screen with copy referencing the buying experience. Also the `EB_DESIGN.md` sections listed above.

### T8. Home pages for both roles; logo routes to home, not to a tab

- **Source notes:** 04.3 (buyer: "that page with the markets on it is really their home page. And if they click on the early bird logo that's where they should go"), 09.2 (dealer: "i'm thinking they would come to a 'logged in' view of the landing page that shows the upcoming markets")
- **Rule:** Post-login flow is: landing → magic link → onboarding → **home lobby** → tabs. The home lobby is a new logged-in lobby screen (one for each role) that sits above Buy/Watching/Sell/Account. It shows markets, countdowns, FAQ, and drop-alert opt-in. Every screen's header logo routes to the home lobby (not to the first tab).
- **Requires two new wireframes** — `home-buyer.html` and `home-dealer.html`. Each is its own dedicated session (separate checklist items in the workflow). Do NOT build them inside the `buy-feed` or `sell-booth-setup` revision sessions.
- **Requires an `EB_DESIGN.md` update** to the flow / navigation section, plus adding the two home screens to The Screens list.
- **Applies to:** every post-login screen's header (the logo becomes an anchor to the home lobby). Excludes pre-auth screens (`landing-buyer`, `landing-dealer`) and the linear onboarding flow. Also requires the two new wireframes.

### T9. Account screens edit in place — no modal Edit screens

- **Source notes:** 13.1 ("i don't see a screen for 'EDIT'. maybe everything should be editable directly on this page"), 14.1 ("similar note to the buyers account page"), 14.3 ("the business name is editable right here? Maybe everything should be editable right here?")
- **Rule:** Account screens have no "Edit" button and no modal edit screen. Profile fields are inline-editable inputs that look like plain text until focused (`input input-ghost` pattern). Name, business name, phone (readonly/verified), payment methods, markets — all edit-in-place on the main account screen.
- **Applies to:** `account-buyer`, `account-dealer`.

### T10. Sticky footer / bottom nav — the "line-above" indicator style is wrong

- **Source notes:** 10.6 (with explicit "this applies everywhere")
- **Rule:** The current `border-t` line above the sticky bottom nav is inconsistent with the broader design system. Needs a different separator treatment — the reviewer hasn't prescribed the replacement, but it should NOT be a hard 1px line-above. Possible directions: solid panel background with no rule, soft inset shadow, or drop the separator entirely if the background contrast is enough.
- **This theme requires design judgment.** Don't just delete the border and call it done. Think about what replaces it and why.
- **Applies to:** every screen with a sticky bottom nav (essentially every screen after login). Reviewer explicitly said "this applies everywhere" — do not pretend it only applies to `sell-booth-active`.

### T11. No stored payment handles — accept-methods only, not accounts

- **Source notes:** 09.4 ("remove the payment account info. This is more about the dealer telling customer what they accept... if the customer can see the payment account they might send a payment before dealer approves sale and it might create a messy situation that i don't wanna be in the middle of"), 14.2 ("definitely remove the venmo and zell account info")
- **Rule:** The app never stores `@venmo`, `@zelle`, phone numbers for payment, or any other payment handle. Dealers check boxes for which methods they accept: Cash, Venmo, Zelle, Apple Pay, Card. Buyers pay the dealer however the dealer instructs at the booth, AFTER the dealer confirms the sale. Preventing pre-sale payments is an explicit product requirement (the "messy situation" the reviewer won't be in the middle of).
- **Requires an `EB_DESIGN.md` update.** The first session that encounters this theme should fix the relevant `EB_DESIGN.md` sections in the same commit. Probable targets: "Sell Tab (Dealer's Booth) → Setup" (line ~122), "Account → Dealer" (line ~132), Tech Stack > Notifications. The current design doc says "Venmo/Zelle/Cash — inline on this page" which implies stored handles.
- **Applies to:** `sell-booth-setup`, `account-dealer`. Also the `EB_DESIGN.md` sections.

### T12. No pop-ups/modals on mobile — use drawers (bottom sheets)

- **Source notes:** 06.1 ("I hate pop ups in mobile. Make this a drawer slides up from the bottom.")
- **Rule:** Any interaction that would be a modal becomes a drawer (bottom sheet) instead. DaisyUI `modal modal-bottom` is STILL a modal — the spec is to use a raw Tailwind fixed-position container with drag handle, rounded top corners, and a thin top border. Not the DaisyUI modal primitive.
- **Applies to:** any modal in the app. Primary instance is the `item-detail-buyer` inquiry compose. Also applies to any future confirm/edit sheets. Account screens should edit in place (see T9), not use drawers either.

---

## Per-screen notes

### 01. landing-buyer

1. The phone number and cta needs to be glued to the bottom of the display, it can't be below the fold.
2. The "Get started" piece needs more clarity. This page has two goals - explain what this is to the user and get them to log in.
3. Needs an FAQ and About at the bottom
4. Needs a "Dealer, Click Here" button on the top right.

**Themes that apply here:** T1 (source of rule), T7 (marketing copy on this page must not use "pre-buy" / "preview" framing — the landing page is the first place the buyer encounters the product positioning, so the words matter most here), T10 (sticky footer — applies everywhere). T8 does NOT apply: this is a pre-auth page, the logo doesn't need to route to the home lobby yet.

---

### 02. landing-dealer

1. Similar not as on the buyer page. Need the CTA pinned to bottom of display. can't be below the fold.
2. Make sure it's clear that they do the deal directly. Its free. we don't take a cut.
3. Add FAQ and About. Section.
4. Remember dealers are also buyers. probably should mention.

**Themes that apply here:** T1 (note 02.1 is an explicit cross-reference — "similar not" means "similar note" to 01.1), T7 (same as 01: marketing copy must not use "pre-buy" / "preview" framing; dealers are SELLING before the crowd, not previewing), T10. T8 does NOT apply: pre-auth page. Note 02.4 is a reminder that the dealer landing page should acknowledge dealers are also buyers (role switcher to buyer experience, or copy mentioning both sides).

---

### 03. onboarding

1. This is the first page that looks a bit busy and clunky.
2. This upload and size limit is insane. It should just be "take a selfie" to continue. We need this so that the dealers will recognize you.
3.I think you're a bit confused about the "pre-buy" thing. They are not just prebuying. They are shopping on this app but paying the dealer directly. They are shopping the good stuff.
4. Display name can be whatever they put it. If they put John C. then dealer sees John C. If they put John Chen then dealer see John chen. if theres a length issue in the UI we can truncate or limit characters or something.
5.I feel like the verified pill styling is a bit tight. No padding so it's pretty naive looking. I also think that green color is just too much.
6. I'm not sure the "heads up" message is useful here. Might be good on another screen.
7. On the buyers account section it seems like there are a bunch of options that would make sense here. like subscribe to these flea markets. various settings. Make a note in the .md that the buyers onboarding should have those things.

**Themes that apply here:** T1 (any sticky bottom element), T2 (source: 03.5 green verified pill), T3 (source: 03.5 padding), T7 (source: 03.3 "pre-buy" confusion — this theme also requires an `EB_DESIGN.md` update; the first session that encounters it makes the fix inline), T10. Note 03.4 is a product requirement for flexible display names. Note 03.7 is a request to update `EB_DESIGN.md` with buyer onboarding preferences — handle inline in the onboarding revision session.

---

### 04. buy-feed

1. dealer avatars feel small.
2. All/Saved and Dealer Category are fighting eachother. The all/saved styling looks totally out of place. it's also a different height than the other elements in the row.
3. So this screen seems sort of like the main screen the buyer sees when he logs in, but i don't think you're thinking carefully about this. The buyer is going to come to the landing page and put in there number. They will get a magic link. It takes them to the onboarding. Once they get through that they come here... unless the drop hasn't happened. We need a landing page that looks kind of like the landing-buyer that has the markets and countdowns and FAQ. And a probably the next market should be expanding bigger than the others. And in big letters it should say something like: You will be texted when the stuff drops. Maybe it'll be a checkbox thing. But my point is that that page with the markets on it is really their home page. And if they click on the early bird logo that's where they should go i would think. Please fix the .md file so it understands the correct flow. and build this page and include it in this wireframe reviewer.

**Themes that apply here:** T1 (bottom nav), T2 (favorite hearts, dealer badges, status pills on cards), T3 (pill padding throughout the feed), T4 (any back/close on filter modals), T6 (source: 04.2 filter row), T7 (feed headers and any marketing copy on this screen must not use "pre-buy" / "preview" framing — this is the main shopping surface, the language here must read as shopping), T8 (source: 04.3 proposes home-buyer — do NOT build it in the buy-feed revision session; it's a separate checklist item; logo in this screen's header should anchor to the future home-buyer page), T10 (sticky nav), T12 (if a filter modal exists, it must be a drawer, not a DaisyUI modal). Note 04.3 also requires an `EB_DESIGN.md` flow-map update — handle inline in the buy-feed revision session.

---

### 05. watching

1. red price drop pill has internal vertical alignment issues. we've discussed this elsewhere. i also don't think such a pwerfull color is appropriate for a price drop.
2. instead of just saying "inquiry sent" why not actually show the message. We're not hurting for vertical space here.
3. the "8 items you care about" title is a bit much. How about "Watching 8 items"
4. I think the hearts should be black.

**Themes that apply here:** T1, T2 (source: 05.1 price drop color — this is a canonical source of T2 — and 05.4 asks for hearts to be black, which is part of the same color-down rule), T3 (source: 05.1 vertical alignment padding), T8 (logo in this screen's header routes to the future home-buyer lobby), T10. Note: 05.1's "we've discussed this elsewhere" references prior conversation — T3 captures the padding conversation; T2 captures the color conversation. Note 05.4 (hearts black) also applies to `buy-feed` wherever hearts appear.

---

### 06. item-detail-buyer

1. I hate pop ups in mobile. Make this a drawer slides up from the bottom.
2. I want to make it clear because some of the content in these screens seems to indicate that you are confused that the dealers aren't just previewing in this app. The value of the app is allowing them to buy before the market opens. I want you to take make a note in the .md files that fixes whatever the source of this confusion is.
3. I find that X very small.
4. This is supposed to be the buyer view of the item detail but i think you've make a mistake and not build a view of this page without the send inquiry pop up. This seems like a mistake that came from the .md file. I believe we need to make another screen so i can review. this.
5. Also the "buyer view" at the top seems inadvertant on your part. It should just say [object name]

**Themes that apply here:** T1, T2, T3, T4 (source: 06.3 X too small), T5 (source: 06.5 "buyer view" debug label), T7 (source: 06.2 preview confusion — this theme also requires an `EB_DESIGN.md` update), T8 (logo in this screen's header routes to the future home-buyer lobby), T10, T12 (source: 06.1 — canonical anti-modal rule). Note 06.4 requires splitting the wireframe into two files: a clean buyer-view state + an inquiry-drawer state. This is the one permitted exception to the one-screen-per-session rule: the split happens in a single session.

---

### 07. item-detail-dealer-own

1. I hate the style of the back arrow and its too small
2. I feel like the live pill and the 3 inquiries pills are clashing.
3. THe live / hold / sold selector feels like it doesn't fit. color is crazy. Also maybe it could be clearer that the dealer should mark sold when it's sold.
4. Why does it say "dealer own state 2" at the top. probably should say the object name?

**Themes that apply here:** T1, T2 (source: 07.2 pill clashing, 07.3 selector "color is crazy"), T3, T4 (source: 07.1 — canonical back arrow rule), T5 (source: 07.4 debug label), T8 (logo in this screen's header routes to the future home-dealer lobby — this is the dealer's own item detail, so dealer-side nav), T10. Note 07.3 also has a copy hint: make it clearer that the dealer should mark SOLD when something sells (probably: rename the selector option or add a helper line).

---

### 08. item-detail-dealer-browsing

1.i've given the price drop pill note elsewhere.
2. i don't understand where the "art deco" comes from.

**Themes that apply here:** T1, T2 (explicit cross-ref: note 08.1 points to 05.1, which is a T2/T3 source), T3, T4 (back/close), T5 (grep this screen for a debug label — this is the third item-detail state, and 06 + 07 both had leftover `State N` / role-name labels in their headers, so this one almost certainly does too), T8 (logo in this screen's header routes to the future home-dealer lobby — this is the dealer browsing someone else's item, so dealer-side nav), T10. Note 08.2 is a content bug: the "art deco" substyle appeared without justification in the wireframe — just drop the substyle, keep the category (probably "Lighting" or similar).

---

### 09. sell-booth-setup

1. top arrow note from earlier applies here
2. so i think we have some site organization issues here similar to what we had on the buyer side. Let's track the dealers path. When they first arrive at the site they are on the dealer landing page. They put in their number and get a magic link which they follow. I gather your thinking they would come here. And i'm thinking they would come to a "logged in" view of the landing page that shows the upcoming markets and they set up their booth for the event of their choice. and there should certainly be language that explains how the drop works and persuades them to get setup and do this. Please fix the .md file so it understands the correct flow. and build this page and include it in this wireframe reviewer.
3. Remove "row / area" and landmark hint. Booth number is fine.
4. I wanna remove the payment account info. This is more about the dealer telling customer what they accept. update the .md accordingly. The reason im doing this is that if the customer can see the payment account they might send a payment before dealer approves sale and it might create a messy situation that i don't wanna be in the middle of.
5.

**Themes that apply here:** T1, T2, T3, T4 (note 09.1 is an explicit cross-reference to 07.1 — "top arrow note from earlier applies here"), T8 (source: 09.2 proposes home-dealer — do NOT build it in the sell-booth-setup revision session; it's a separate checklist item), T10, T11 (source: 09.4 payment handles — this theme also requires an `EB_DESIGN.md` update). Note 09.2 also requires an `EB_DESIGN.md` flow-map update. Note 09.5 is blank in the original (just "5." with no content) — nothing to action.

---

### 10. sell-booth-active

1. The all/live/held/sold pickeer feels totally out of place. Wrong heigt for the row as well....
2. The design of all the pills and buttons has no hierachy. Everything is sort of screaming at once.
3. Don't you think its a waste to have BOTH the release button and the hold button? shouldn't those be sort of joined into one design element?
4. I think the "dropped" pill is unnecessary. The crossed out price is sufficient.
5. Per my last few comments i think you should really work on thinking this page through.
6. Also i think you can do better with the styling of the footer. And this applies everywhere. I don't think the line-above indicator style feels consistent with the design system.

**Themes that apply here:** T1, T2 (sources: 10.2 "no hierachy", 10.4 dropped pill), T3, T4, T6 (source: 10.1 filter row picker), T7 (any "pre-buy" / "preview" framing in booth-active copy — e.g. empty-state text, add-item hint copy — must be corrected to shopping/selling framing), T8 (logo in this screen's header routes to the future home-dealer lobby), T10 (SOURCE — and the reviewer explicitly wrote "this applies everywhere", meaning the T10 fix must land on every sticky-footer screen, not just this one). Note 10.3: merge Hold/Release into a single button that flips label based on state. Note 10.5 is a meta instruction: slow down on this screen — the reviewer thinks it wasn't thought through carefully enough the first time.

---

### 11. sell-add-item

1. Theres like a gap right below "live instantly" line where we can see the content scrolling below which is a glitch.
2. This item is only "live instantly" if the seller posts it after the drop, right?
3. Remove "no haggling at booth"
4. I think only the picture, cat and title should be required
5

**Themes that apply here:** T1 (source: 11.1 — the gap glitch is a canonical T1 symptom; fix the structural sticky-footer pattern, not just the symptom), T2, T3, T4 (any header back/cancel), T7 (the add-item copy is dealer-facing framing for how the marketplace works — "live instantly", "goes live when the market drops", etc. — make sure none of it leaks "pre-buy" / "preview" language), T8 (logo in this screen's header routes to the future home-dealer lobby — even though this is a form screen reached from booth-active, the logo nav rule still applies), T10. Note 11.2 is a conditional-copy product requirement: the "live instantly" confirmation only appears when an item is posted AFTER the drop. Before the drop, the copy should say something like "Your item goes live when the market drops at [time]". Note 11.5 is blank in the original — nothing to action.

---

### 12. sell-market-picker

1. i don't really see the point of this page. Most dealers won't be focused on the market in two weeks. in other notes i've made the case for a logged in dealer landing page that has the other markets and they can navigate via that page.
2. Please update the .md and remove this and also remove it here in the wireframe review.

**Themes that apply here:** N/A — this page is deleted. Handled as the "Remove this page" special case in the workflow. The session that processes this item: (a) deletes `public/wireframes/sell-market-picker.html`, (b) removes `'sell-market-picker'` from the `WIREFRAMES` array in `public/review.html`, (c) updates the sidebar count `Wireframes (N)`, (d) updates the progress counter default `1 / N`, (e) updates the clear-all confirm copy `Clear ALL notes across all N wireframes`, (f) updates the `EB_DESIGN.md` "The Screens" list to drop the Market Picker bullet, (g) commits, (h) pushes, (i) ends. The home-dealer screen (T8) absorbs the market-picker function.

---

### 13. account-buyer

1. i don't see a screen for "EDIT". maybe everything should be editable directly on this page..
2. i like the markets you follow feature. I don't understand what "follow more" woudl do.
3. What does become a dealer do?
4. I don't like the way the pills with the marketplaces look. especially the "follow more" something about camel case and this font and pills with almost not padding. i'ts an odd look.

**Themes that apply here:** T1 (bottom nav), T2 (market pills), T3 (source: 13.4 padding), T8 (logo in this screen's header routes to the future home-buyer lobby), T9 (source: 13.1 — canonical edit-in-place rule), T10. Note 13.2: "follow more" is unclear copy — reviewer likes the markets-you-follow feature but doesn't understand what the affordance does. Probably rename/restyle so it's obviously "add another market to follow". Note 13.3: "become a dealer" is unclear — what does it actually do? Tie to the dealer-apply flow and clarify the copy. Note 13.4 also calls out camelCase being weird in the monospace font — anywhere market names appear, check the casing.

---

### 14. account-dealer

1. similar note to the buyers account page. Seems like a bunch of things that could be on an oboarding page... but i guess we make the dealer onboarding super streamlined so maybe we shouldn't over complicate.

2. But definitely remove the venmo and zell account info.
3. I don't understand where the edit button takes you. it seems like the business name is editable right here? Maybe everything should be editable right here?

4. so the booth defaults need to be broken down by markets they sell at, right? And its not

5. I don't really see the point of the metrics

**Themes that apply here:** T1, T2, T3, T8 (logo in this screen's header routes to the future home-dealer lobby), T9 (sources: 14.1 implicit cross-ref to 13.1, 14.3 explicit "everything should be editable right here"), T10, T11 (source: 14.2 "definitely remove the venmo and zell account info"). Note 14.4 is an open product question: should booth defaults be per-market rather than global? (The sentence "And its not" is truncated in the original — reviewer started a thought and didn't finish it. Treat as a flag for a design decision, not a directive.) Note 14.5: drop the stats cards entirely — reviewer doesn't see the point of the metrics on the account screen.

---

## Open product questions surfaced by review

These are notes that aren't really revisions — they're questions the reviewer raised that need a decision before the relevant screen can be finalized.

- **OQ1 (note 11.2):** Conditional copy for add-item confirmation. Before the drop: "Your item goes live when the market drops at [time]". After the drop: "Live instantly". Needs market-state awareness in the wireframe (probably shown as a note, not actually wired).
- **OQ2 (note 13.2):** What does "Follow More" actually do on the account-buyer markets list? Discover new markets? Search? Open a modal? (Follow-up: might just be a rename/restyle.)
- **OQ3 (note 13.3):** What does "Become A Dealer" actually do? Is there an approval workflow? (The reviewer has separately mentioned a quick-review step, but the copy on the button needs to match whatever the answer is.)
- **OQ4 (note 14.4):** Should booth defaults on account-dealer be per-market rather than global? The reviewer started this thought and didn't finish the sentence, but the question itself is real and affects the account-dealer screen design.

Do not try to answer these questions inside the wireframe revision sessions. Flag them in the commit message, leave the current behavior alone, and surface them to the reviewer for a decision.

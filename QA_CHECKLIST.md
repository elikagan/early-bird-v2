# QA_CHECKLIST.md — Early Bird

Every box gets ticked only with concrete evidence saved to disk. The evidence directive is the part after the `→` on each line:

- `screenshot: path` — preview_screenshot description saved to a `.txt` under `qa-evidence/`
- `snapshot: path` — preview_snapshot (accessibility tree) saved to a `.txt` under `qa-evidence/`
- `db-query: path` — `.json` under `qa-evidence/` with the query + result
- `event-log: path` — `.json` with the relevant `system_events` rows
- `log: path` — any other `.txt` log from the walk

Ticked items that don't declare an evidence type are "manual" checks — don't tick one unless you've actually done it.

Two scripts enforce this:
- `node scripts/qa-status.mjs [filter]` — counts unticked, exits non-zero if any.
- `node scripts/qa-verify-evidence.mjs` — checks declared evidence files exist and are non-empty.

No PR with "QA done" should land while either script exits non-zero.

---

## Chunk A — Admin (as admin)

### Dashboard tab

- [ ] Dashboard renders on mobile (375×812) → screenshot: qa-evidence/admin/dashboard-mobile.txt
- [ ] Dashboard renders on desktop (1280×800) → screenshot: qa-evidence/admin/dashboard-desktop.txt
- [ ] Dashboard snapshot: all 4 stat cards present with arrows → snapshot: qa-evidence/admin/dashboard-snapshot.txt
- [ ] Stat counts match DB (dealers, buyers, items/wk, sold/wk) → db-query: qa-evidence/admin/dashboard-counts.json
- [ ] Tap "Dealers →" stat → Dealers tab loads → snapshot: qa-evidence/admin/dashboard-click-dealers.txt
- [ ] Tap "Items / wk →" stat → Items tab loads → snapshot: qa-evidence/admin/dashboard-click-items.txt
- [ ] Next Market section shows featured market + countdown → snapshot: qa-evidence/admin/dashboard-next-market.txt
- [ ] Recent Actions list renders → snapshot: qa-evidence/admin/dashboard-recent-actions.txt

### Markets tab

- [ ] Markets tab renders mobile → screenshot: qa-evidence/admin/markets-mobile.txt
- [ ] Markets tab renders desktop → screenshot: qa-evidence/admin/markets-desktop.txt
- [ ] Create Market with blank name → inline "Market name is required" error shows → snapshot: qa-evidence/admin/markets-create-empty-error.txt
- [ ] Create Market with valid data → market appears in list → snapshot: qa-evidence/admin/markets-create-success.txt + db-query: qa-evidence/admin/markets-create-row.json
- [ ] Edit market → form populates with current values → snapshot: qa-evidence/admin/markets-edit-form.txt
- [ ] Edit market save → updated fields reflect in list → snapshot: qa-evidence/admin/markets-edit-after.txt
- [ ] Copy Share Link button → navigator.clipboard contains /early/<id> URL → log: qa-evidence/admin/markets-copy-share.txt
- [ ] Archive market → moves to archived section → snapshot: qa-evidence/admin/markets-archive.txt
- [ ] Unarchive market → moves back to active → snapshot: qa-evidence/admin/markets-unarchive.txt
- [ ] Delete market → ConfirmDrawer opens with correct market name → snapshot: qa-evidence/admin/markets-delete-confirm.txt
- [ ] Delete market confirm → row removed from list → db-query: qa-evidence/admin/markets-delete-verify.json
- [ ] Delete market error path (market has items) → red toast shows → snapshot: qa-evidence/admin/markets-delete-error.txt

### Dealers tab

- [ ] Dealers tab renders mobile → screenshot: qa-evidence/admin/dealers-mobile.txt
- [ ] Dealers tab renders desktop → screenshot: qa-evidence/admin/dealers-desktop.txt
- [ ] Search dealer by name → filters list → snapshot: qa-evidence/admin/dealers-search.txt
- [ ] Search dealer by phone → filters list → snapshot: qa-evidence/admin/dealers-search-phone.txt
- [ ] Expand dealer row → detail loads with items + inquiries → snapshot: qa-evidence/admin/dealers-expand.txt
- [ ] Edit dealer business name → saves → db-query: qa-evidence/admin/dealers-edit-biz.json
- [ ] Toggle verified flag → saves → db-query: qa-evidence/admin/dealers-verified.json
- [ ] Change role buyer→dealer → ConfirmDrawer opens → snapshot: qa-evidence/admin/dealers-promote-confirm.txt
- [ ] Change role dealer→buyer → ConfirmDrawer opens → snapshot: qa-evidence/admin/dealers-demote-confirm.txt
- [ ] Approve pending application → creates dealer row + sends approval SMS → db-query: qa-evidence/admin/dealers-approve.json + event-log: qa-evidence/admin/dealers-approve-sms.json
- [ ] Invite link with phone → SMS sent to phone → event-log: qa-evidence/admin/dealers-invite-sms.json
- [ ] Invite link without phone → URL shown, Copy button works → snapshot: qa-evidence/admin/dealers-invite-nophone.txt

### Items tab

- [ ] Items tab renders mobile → screenshot: qa-evidence/admin/items-mobile.txt
- [ ] Items tab renders desktop → screenshot: qa-evidence/admin/items-desktop.txt
- [ ] Filter by market → list narrows → snapshot: qa-evidence/admin/items-filter-market.txt
- [ ] Filter by status → list narrows → snapshot: qa-evidence/admin/items-filter-status.txt
- [ ] Expand item row → detail loads (title, price, photos, inquiries) → snapshot: qa-evidence/admin/items-expand.txt
- [ ] Change item status live→hold → saves → db-query: qa-evidence/admin/items-status-change.json
- [ ] Soft-delete item → ConfirmDrawer opens → snapshot: qa-evidence/admin/items-delete-confirm.txt
- [ ] Soft-delete confirm → item status="deleted" → db-query: qa-evidence/admin/items-delete-verify.json

### Blast tab (dealer blast tool)

- [ ] Blast tab renders mobile → screenshot: qa-evidence/admin/blast-mobile.txt
- [ ] Blast tab renders desktop → screenshot: qa-evidence/admin/blast-desktop.txt
- [ ] Recipient count matches UNION(invites, dealers) deduped → db-query: qa-evidence/admin/blast-count.json
- [ ] Default template pre-populates correctly → snapshot: qa-evidence/admin/blast-default-copy.txt
- [ ] Preview renders with sample link → snapshot: qa-evidence/admin/blast-preview.txt
- [ ] Message without {link} → inline error on send → snapshot: qa-evidence/admin/blast-no-link-error.txt
- [ ] Send Test to Me → ConfirmDrawer opens → snapshot: qa-evidence/admin/blast-test-confirm.txt
- [ ] Send Test to Me confirm → sends only to admin phone, DB row created → event-log: qa-evidence/admin/blast-test-event.json
- [ ] Send to N Dealers → ConfirmDrawer opens with red destructive button → snapshot: qa-evidence/admin/blast-send-confirm.txt

### SMS tab (generic audience blast)

- [ ] SMS tab renders mobile → screenshot: qa-evidence/admin/sms-mobile.txt
- [ ] SMS tab renders desktop → screenshot: qa-evidence/admin/sms-desktop.txt
- [ ] Audience count updates when market changes → snapshot: qa-evidence/admin/sms-audience-count.txt
- [ ] Confirming dialog shows correct count + message before send → snapshot: qa-evidence/admin/sms-confirm.txt
- [ ] Blast history list renders → snapshot: qa-evidence/admin/sms-history.txt
- [ ] Error path (bad audience) → red toast instead of alert() → snapshot: qa-evidence/admin/sms-error.txt

### Health tab

- [ ] Health tab renders mobile → screenshot: qa-evidence/admin/health-mobile.txt
- [ ] Health tab renders desktop → screenshot: qa-evidence/admin/health-desktop.txt
- [ ] DB status card shows OK + latency → snapshot: qa-evidence/admin/health-db.txt
- [ ] Ops cron status card shows "last ran Xm ago" → snapshot: qa-evidence/admin/health-cron.txt
- [ ] SMS 24h metrics render → snapshot: qa-evidence/admin/health-sms-metrics.txt
- [ ] Business metrics render → snapshot: qa-evidence/admin/health-business.txt
- [ ] Recent events filter (all/warn/error) narrows list → snapshot: qa-evidence/admin/health-filter.txt
- [ ] "Probe everything" button fires /api/admin/probe → event-log: qa-evidence/admin/health-probe.json

### Pending-blast review page

- [ ] Inserts a test scheduled_blasts row + walks the review page → snapshot: qa-evidence/admin/pending-blast-review.txt
- [ ] Edit copy → PATCH fires, saved-tick appears → snapshot: qa-evidence/admin/pending-blast-edit.txt
- [ ] Send button disabled when recipient_count === 0 → snapshot: qa-evidence/admin/pending-blast-zero-recipients.txt
- [ ] Send button fires POST → sent_at populates → db-query: qa-evidence/admin/pending-blast-sent.json
- [ ] Already-sent blast shows summary instead of form → snapshot: qa-evidence/admin/pending-blast-already-sent.txt

### Admin gating

- [ ] /admin as non-authed user → 404 (NotFoundScreen) → snapshot: qa-evidence/admin/gate-noauth.txt
- [ ] /admin as non-admin signed-in user → 404 → snapshot: qa-evidence/admin/gate-nonadmin.txt
- [ ] /admin as admin signed-in → page renders → snapshot: qa-evidence/admin/gate-admin-ok.txt
- [ ] Every admin API route returns 401 without session → log: qa-evidence/admin/api-gate-noauth.txt
- [ ] Every admin API route returns 403 with non-admin session → log: qa-evidence/admin/api-gate-nonadmin.txt

---

## Chunk B — Dealer signed-in

### /sell

- [ ] /sell renders mobile as dealer → screenshot: qa-evidence/dealer/sell-mobile.txt
- [ ] /sell renders desktop as dealer → screenshot: qa-evidence/dealer/sell-desktop.txt
- [ ] Stats row (listed / views / watchers / inquiries) renders → snapshot: qa-evidence/dealer/sell-stats.txt
- [ ] Booth editor → allows letters, digits, dash, slash → snapshot: qa-evidence/dealer/sell-booth-input.txt
- [ ] Booth editor save success → number updates → db-query: qa-evidence/dealer/sell-booth-save.json
- [ ] Booth editor save failure → reverts + shows inline error → snapshot: qa-evidence/dealer/sell-booth-error.txt
- [ ] Show switcher → lists all non-closed markets, current marked → snapshot: qa-evidence/dealer/sell-switcher.txt
- [ ] Show switcher navigate → /sell?market=<new-id> loads → snapshot: qa-evidence/dealer/sell-switcher-nav.txt
- [ ] Share-your-booth displayed URL matches what clipboard receives → log: qa-evidence/dealer/sell-share-url.txt
- [ ] Item grid card tap → navigates to /item/[id] → snapshot: qa-evidence/dealer/sell-card-tap.txt
- [ ] Item grid empty state (new dealer) → shows "Add your first listing" → snapshot: qa-evidence/dealer/sell-empty.txt
- [ ] FAB + button navigates to /sell/add?market=<id> → snapshot: qa-evidence/dealer/sell-fab.txt
- [ ] Pre-subscription banner shows for dealers with empty subscriptions → snapshot: qa-evidence/dealer/sell-banner.txt

### /sell/add

- [ ] /sell/add renders mobile → screenshot: qa-evidence/dealer/add-mobile.txt
- [ ] /sell/add renders desktop → screenshot: qa-evidence/dealer/add-desktop.txt
- [ ] Photo upload (single image) → preview + uploading state + done state → snapshot: qa-evidence/dealer/add-photo-upload.txt
- [ ] Photo X button → 44px hit area, removes photo → snapshot: qa-evidence/dealer/add-photo-remove.txt
- [ ] Submit with no title → button disabled → snapshot: qa-evidence/dealer/add-no-title.txt
- [ ] Submit with no price → button disabled → snapshot: qa-evidence/dealer/add-no-price.txt
- [ ] Submit with no photos → button disabled → snapshot: qa-evidence/dealer/add-no-photos.txt
- [ ] Submit valid item → redirects to /sell?market=<id>, row in DB → db-query: qa-evidence/dealer/add-submit.json
- [ ] Back button → navigates to /sell?market=<id> (Link not router.back) → snapshot: qa-evidence/dealer/add-back.txt

### /item/[id] dealer-owner view

- [ ] Renders owner-only controls (edit, status, inquiry log) → snapshot: qa-evidence/dealer/item-owner.txt
- [ ] Edit title → saves, reflects on page → db-query: qa-evidence/dealer/item-edit-title.json
- [ ] Lower price → opens confirm → sends price-drop SMS to watchers → event-log: qa-evidence/dealer/item-price-drop.json
- [ ] Status picker hold → ConfirmDrawer opens → status updates → db-query: qa-evidence/dealer/item-hold.json
- [ ] Status picker sold (no buyer) → confirmWalkupSold drawer opens → db-query: qa-evidence/dealer/item-walkup-sold.json
- [ ] Status picker sold to inquirer → confirmInquiry drawer opens → buyer gets SMS → event-log: qa-evidence/dealer/item-sold-inquirer.json
- [ ] Sold item shows buyer → sold_to_name renders → snapshot: qa-evidence/dealer/item-sold-view.txt
- [ ] Delete item → confirm drawer → status="deleted" → db-query: qa-evidence/dealer/item-delete.json

### /invite/[code]

- [ ] Invalid code → shows "Invite not found" → snapshot: qa-evidence/dealer/invite-invalid.txt
- [ ] Pre-bound phone invite → phone field readonly → snapshot: qa-evidence/dealer/invite-prebound.txt
- [ ] Legacy invite (no phone bound) → phone input editable → snapshot: qa-evidence/dealer/invite-legacy.txt
- [ ] Submit without name → inline error → snapshot: qa-evidence/dealer/invite-no-name.txt
- [ ] Submit without business/your name → inline error → snapshot: qa-evidence/dealer/invite-no-biz.txt
- [ ] Submit without selecting a show → inline error → snapshot: qa-evidence/dealer/invite-no-shows.txt
- [ ] Submit valid → redeems, redirects to /sell → db-query: qa-evidence/dealer/invite-redeem.json

### /account (dealer)

- [ ] Renders dealer-specific fields (business name, IG, payment methods) → snapshot: qa-evidence/dealer/account-mobile.txt
- [ ] Business name save → db-query: qa-evidence/dealer/account-biz.json
- [ ] Payment method toggle → db-query: qa-evidence/dealer/account-payment.json
- [ ] Shows-you-sell-at toggle → db-query: qa-evidence/dealer/account-shows.json
- [ ] Notification toggle new_inquiries → db-query: qa-evidence/dealer/account-notif.json
- [ ] Edit/Change text buttons have 44px+ hit area → snapshot: qa-evidence/dealer/account-hit-area.txt

### Dealer gating

- [ ] /sell as non-dealer → 404 → snapshot: qa-evidence/dealer/gate-buyer.txt
- [ ] /sell/add as non-dealer → 404 → snapshot: qa-evidence/dealer/gate-buyer-add.txt

---

## Chunk C — Buyer signed-in

### /home

- [ ] /home renders mobile → screenshot: qa-evidence/buyer/home-mobile.txt
- [ ] /home renders desktop → screenshot: qa-evidence/buyer/home-desktop.txt
- [ ] Market eyebrow uses marketEyebrow() → snapshot: qa-evidence/buyer/home-eyebrow.txt
- [ ] Featured items grid (up to 8) renders → snapshot: qa-evidence/buyer/home-grid.txt
- [ ] "Browse all N items" button → /buy?market= → snapshot: qa-evidence/buyer/home-browse.txt
- [ ] Coming Up list renders with days-until labels → snapshot: qa-evidence/buyer/home-coming-up.txt
- [ ] Between-shows empty state → snapshot: qa-evidence/buyer/home-between-shows.txt

### /buy

- [ ] /buy?market=<id> renders mobile → screenshot: qa-evidence/buyer/buy-mobile.txt
- [ ] /buy?market=<id> renders desktop → screenshot: qa-evidence/buyer/buy-desktop.txt
- [ ] Unknown market id → NotFoundScreen → snapshot: qa-evidence/buyer/buy-unknown.txt
- [ ] Market header with eyebrow + date + location → snapshot: qa-evidence/buyer/buy-header.txt
- [ ] Items grid renders → snapshot: qa-evidence/buyer/buy-grid.txt
- [ ] Heart button 44px hit area → snapshot: qa-evidence/buyer/buy-heart.txt
- [ ] Tap heart → DB favorite row created → db-query: qa-evidence/buyer/buy-fav-add.json
- [ ] Tap heart again → favorite deleted → db-query: qa-evidence/buyer/buy-fav-remove.json

### /watching

- [ ] /watching renders mobile → screenshot: qa-evidence/buyer/watching-mobile.txt
- [ ] Empty state copy: "Browse items, then tap the heart..." → snapshot: qa-evidence/buyer/watching-empty.txt
- [ ] With favorites → shows items with status badges → snapshot: qa-evidence/buyer/watching-full.txt
- [ ] Unfavorite from card → removes from list → db-query: qa-evidence/buyer/watching-unfav.json
- [ ] Sold item status → "Sold to another buyer" (when not me) → snapshot: qa-evidence/buyer/watching-sold-other.txt

### /item/[id] buyer view

- [ ] Renders photo carousel, price, dealer info → snapshot: qa-evidence/buyer/item-buyer.txt
- [ ] "I'm Interested" button opens inquiry drawer → snapshot: qa-evidence/buyer/item-inquiry-drawer.txt
- [ ] Inquiry preset buttons present (buy/discuss/price/custom) → snapshot: qa-evidence/buyer/item-inquiry-presets.txt
- [ ] Submit inquiry as signed-in → inquiry row created → db-query: qa-evidence/buyer/item-inquiry-auth.json
- [ ] Already-inquired state shows "Inquiry sent" → snapshot: qa-evidence/buyer/item-inquiry-already.txt

### /account (buyer)

- [ ] Renders buyer-specific (no business name/payment) → snapshot: qa-evidence/buyer/account-buyer-mobile.txt
- [ ] Stats row (watching / inquiries / bought) → snapshot: qa-evidence/buyer/account-stats.txt
- [ ] Name edit + save → db-query: qa-evidence/buyer/account-name.json
- [ ] Phone change flow → sends verification SMS → event-log: qa-evidence/buyer/account-phone-change.json
- [ ] Market reminder toggle per show → db-query: qa-evidence/buyer/account-market-reminder.json
- [ ] Sign-out confirm inline → clicking Yes clears cookie + localStorage → log: qa-evidence/buyer/account-signout.txt
- [ ] "Apply to Sell" drawer opens → includes close X + optional IG field → snapshot: qa-evidence/buyer/account-apply-drawer.txt

### /onboarding

- [ ] Buyer flow renders → snapshot: qa-evidence/buyer/onboarding-buyer.txt
- [ ] Dealer flow renders (with ?dealer=1) → snapshot: qa-evidence/buyer/onboarding-dealer.txt
- [ ] Markets section starts unchecked (no auto-subscribe) → snapshot: qa-evidence/buyer/onboarding-no-default.txt
- [ ] Complete buyer flow → redirects to /home, prefs saved → db-query: qa-evidence/buyer/onboarding-complete.json
- [ ] CTA text "LET'S GO" (not START SHOPPING) → snapshot: qa-evidence/buyer/onboarding-cta.txt

---

## Chunk D — Anon

- [ ] / renders mobile → screenshot: qa-evidence/anon/home-mobile.txt
- [ ] / renders desktop → screenshot: qa-evidence/anon/home-desktop.txt
- [ ] Sign-in drawer opens from footer button → snapshot: qa-evidence/anon/signin-drawer-open.txt
- [ ] Sign-in bad phone → inline error (not alert()) → snapshot: qa-evidence/anon/signin-bad-phone.txt
- [ ] Sign-in rate-limit response → inline error shown → snapshot: qa-evidence/anon/signin-rate-limit.txt
- [ ] Sign-in close X button → drawer dismisses → snapshot: qa-evidence/anon/signin-close-x.txt
- [ ] Sign-in drawer open → body scroll locked → log: qa-evidence/anon/signin-scroll-lock.txt
- [ ] /early/[marketId] renders → snapshot: qa-evidence/anon/early-mobile.txt
- [ ] /early/ unknown market → NotFoundScreen → snapshot: qa-evidence/anon/early-unknown.txt
- [ ] /d/[id] renders with dealer header + items → snapshot: qa-evidence/anon/d-mobile.txt
- [ ] /d/ unknown id → NotFoundScreen → snapshot: qa-evidence/anon/d-unknown.txt
- [ ] /dealer (seller splash) renders → snapshot: qa-evidence/anon/dealer-splash.txt
- [ ] /terms renders → snapshot: qa-evidence/anon/terms.txt
- [ ] /privacy renders → snapshot: qa-evidence/anon/privacy.txt
- [ ] /item/[id] as anon → "I'm Interested" opens ANON form (name+phone) → snapshot: qa-evidence/anon/item-anon-form.txt
- [ ] Submit anon inquiry → buyer confirmation SMS fires → event-log: qa-evidence/anon/inquiry-buyer-sms.json
- [ ] Anon inquiry >240 chars → inline error → snapshot: qa-evidence/anon/inquiry-too-long.txt

---

## Chunk E — Core flows (end-to-end)

- [ ] Anon inquiry → tap SMS link → redirects to item with sent=1 → dealer notified → event-log: qa-evidence/flows/anon-inquiry-full.json
- [ ] Signed-in inquiry → immediate dealer SMS → event-log: qa-evidence/flows/auth-inquiry.json
- [ ] Dealer marks sold to inquirer → buyer gets SMS → event-log: qa-evidence/flows/sold-to-inquirer.json
- [ ] Dealer lowers price → watchers get SMS (once) → event-log: qa-evidence/flows/price-drop.json
- [ ] Dealer application submit → admin gets SMS → event-log: qa-evidence/flows/app-submit.json
- [ ] Admin approves → applicant gets dealer approval SMS → event-log: qa-evidence/flows/app-approved.json
- [ ] Scheduled blast cron → queues row → admin SMS sent → event-log: qa-evidence/flows/blast-cron.json
- [ ] Pending blast review → edit + send → recipients texted → event-log: qa-evidence/flows/blast-sent.json

---

## Chunk F — API gating

- [ ] Every /api/admin/* returns 401 without cookie → log: qa-evidence/api/admin-noauth.txt
- [ ] Every /api/admin/* returns 403 with non-admin cookie → log: qa-evidence/api/admin-nonadmin.txt
- [ ] /api/items POST returns 403 without dealer → log: qa-evidence/api/items-nondealer.txt
- [ ] /api/items PATCH returns 403 if not owner → log: qa-evidence/api/items-nonowner.txt
- [ ] /api/inquiries accepts anon with name+phone → log: qa-evidence/api/inquiries-anon.txt
- [ ] /api/inquiries rejects message > 240 chars → log: qa-evidence/api/inquiries-length.txt
- [ ] /api/auth/start rate-limits at 5 per hour → log: qa-evidence/api/authstart-rate.txt

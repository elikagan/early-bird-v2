# KNOWN_DEBT.md — Early Bird

Gaps between `EB_DESIGN.md` (how the product should work) and the actual shipped code. Fix or remove — don't document divergences as product behavior.

Last audited: 2026-05-01 by Claude (post booth-model migration).

**Priority key:**
- **P0** — security, data integrity, or user-facing broken
- **P1** — commitment not actually wired up, but no data loss
- **P2** — dead code / ripped-out-feature vestiges
- **P3** — docs + tooling cleanup

---

## P0 — fix now

*All P0 items resolved.*

- ~~Supabase RLS disabled on `system_events`~~ — fixed in `2f35342`.
- ~~`/admin` page loaded for any signed-in user~~ — fixed in `b453323`.
- ~~`/sell` page loaded for any signed-in user~~ — fixed in `b453323`.
- ~~`/sell` and Watching tabs stuck on archived market~~ — fixed in the booth-model migration; market is no longer the unit of selection on either page.
- ~~Admin "Cannot delete market with items" guard checked the wrong table~~ — fixed in `901a037` (now checks `booth_settings` for non-declined attendees, the real binding under the booth model).

## P1 — commitment not actually built

- **[P1] No human-approval gate for SCHEDULED mass texts.** Admin-composed blasts go through Eli (the /admin Blast tab is the approval gate) — but the scheduled reminders described in EB_DESIGN.md commitments #7 + #8 aren't wired up. The cron + the "text Eli first, he presses send" gate are missing.
- **[P1] Pre-show reminders for BUYERS are not sent.** Commitment #4 item 7 + commitment #7: opt-in saves correctly to `notification_preferences` but no scheduled job reads it and sends. When built, must route through commitment #9's "text Eli first, he presses send" gate.
- **[P1] Pre-show nudges for DEALERS are not sent.** Commitment #4 item 8: dealers who haven't yet answered the weekly /sell attendance prompt should get a nudge a few days before the market. No cron yet. Same approval-gate requirement.

## P2 — dead code and leftover bits to clean up

*Most P2 items resolved during the 2026-04-22 cleanup and the 2026-05-01 booth-model migration.*

- ~~Dealer approval used wrong template~~ — fixed.
- ~~`/api/cron/drop-markets`~~ — deleted.
- ~~`markets.drop_notified_at`, `markets.dealer_preshop_enabled`, `items.held_for`~~ — dropped.
- ~~`composeHoldReceipt`, `composeLostReceipt`, `composeDropAlert`, `composeEarlyAccess`, `/api/early-access/start`~~ — deleted.
- ~~`sms.inquiry.lost` event type~~ — gone.
- ~~Phone-change and admin-new-application inline SMS strings~~ — moved to template functions.
- ~~/auth/verify?token= legacy page~~ — deleted.
- ~~`buyer_market_follows`, `buyer_market_early_access`, `dealer_market_subscriptions`~~ — dropped in the booth-model migration (`20260501000001`).
- ~~`/api/booth` and `/api/booth/[market_id]`~~ — deleted (replaced by `/api/sell/attendance`).
- ~~Admin SMS blast default referenced archived Downtown Modernism~~ — fixed.
- ~~`/onboarding` fetched `/api/markets` but never rendered them~~ — call removed.

**Still pending:**

- **[P2] `markets.drop_at` column.** Defunct under the booth model — `starts_at` is the only date that matters. Still NOT NULL in DB; admin POST/PATCH defaults it to `starts_at` when not provided. Eventually drop the column, but it's not blocking anything.
- **[P2] `items.market_id` column.** NULL on every item now, kept nullable for legacy rows. Eventually drop, not blocking.
- **[P2] `auth_tokens.token_type='early_access'` branch in `/api/auth/verify/route.ts`.** Returns 410 Gone for any old token in the wild. Safe to leave — it's a tombstone for a retired feature, not active code.
- **[P2] `qa-comments.json` at repo root + `/api/qa-comments`.** Internal debug artifacts. Gate or remove.

## P3 — docs + tooling cleanup

- ~~`CLAUDE.md` referenced archived docs~~ — fixed.
- ~~`RESKIN_PLAN.md`, `PHASE_1_REVIEW_NOTES.md`, `REVISION_LOG.md`~~ — archived.
- ~~`EB_DESIGN.md` written around the drop concept~~ — rewritten 2026-05-01 around the persistent-booth model.

**Still pending:**

- **[P3] BOOTH_MODEL_PLAN.md in repo root.** Migration plan doc; superseded now that the migration shipped. Archive when convenient.
- **[P3] PERF_FIX_PLAN.md in repo root.** Most items done; `E` (perf QA chunk) and the `(app)/layout.tsx` server-side session resolve are still open. Rename to `PERF_DEBT.md` or fold into this file.

---

## Open questions

- **Timing of the scheduled pre-show "notify Eli" text** (commitment #9). When the buyer + dealer reminder send paths get built, Eli needs to pick a timing. Default proposal: evening before the market for buyers, 2 days before for dealers. Confirm with Eli before implementing.

## Perf-related still pending

- **[Perf] `(app)/layout.tsx` is a client layout that blanks the page on `useAuth().loading`.** All the Server Component shells we built ship data in the RSC payload, but first paint is still `<Loading…>` until the auth-me round-trip resolves. Unwinding this gate — ideally by server-resolving the session cookie in the root layout — is the next real perf win.
- **[Perf] Add perf QA chunk to `QA_CHECKLIST.md`** — pending. See `PERF_FIX_PLAN.md` §E.

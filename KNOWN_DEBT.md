# KNOWN_DEBT.md — Early Bird

Gaps between `EB_DESIGN.md` (how the product should work) and the actual shipped code. Fix or remove — don't document divergences as product behavior.

Last audited: 2026-04-22 by Claude.

**Priority key:**
- **P0** — security, data integrity, or user-facing broken
- **P1** — commitment not actually wired up, but no data loss
- **P2** — dead code / ripped-out-feature vestiges
- **P3** — docs + tooling cleanup

---

## P0 — fix now

*All P0 items resolved 2026-04-22. See commit history for details.*

- ~~Supabase RLS disabled on `system_events`~~ — fixed in `2f35342` (RLS enabled, verified).
- ~~`/admin` page loaded for any signed-in user~~ — fixed in `b453323` (server-side layout gates, non-admins get 404).
- ~~`/sell` page loaded for any signed-in user~~ — fixed in `b453323` (server-side dealer-only layout).
- ~~Dave Harker logout~~ — not a bug; incognito mode. See commit `4c7d427`.

## P1 — commitment not actually built

- **[P1] No human-approval gate for SCHEDULED mass texts.** Admin-composed blasts do go through Eli (the /admin Blast tab is the approval gate) — but the scheduled reminders described in EB_DESIGN.md commitment #9 aren't wired up at all.
- **[P1] Market reminders for BUYERS are not sent.** Commitment #4 item 7 + commitment #7: opt-in saves correctly but no scheduled job reads `notification_preferences` and sends. When built, must route through commitment #9's "text Eli first, he presses send" gate.
- **[P1] Market reminders for DEALERS are not sent.** Commitment #4 item 8 + commitment #8: dealers with items in a market should get automatic "set up your booth" text. No cron reads the subscription data yet. Same approval-gate requirement.

## P2 — dead code and leftover bits to clean up

*Most P2 items resolved 2026-04-22 during Chunks 5 + 6 cleanup.*

- ~~Dealer approval used wrong template~~ — fixed; `composeDealerApproval` now used.
- ~~`/api/cron/drop-markets`~~ — deleted.
- ~~`markets.drop_notified_at` column~~ — dropped via migration `20260422000002`.
- ~~`markets.dealer_preshop_enabled` column~~ — dropped (admin UI + column both gone).
- ~~`items.held_for` column~~ — dropped + all code references purged.
- ~~`composeHoldReceipt`, `composeLostReceipt`, `composeDropAlert`~~ — deleted.
- ~~`composeEarlyAccess` + `/api/early-access/start`~~ — deleted.
- ~~`sms.inquiry.lost` event type~~ — no references remain.
- ~~Phone-change and admin-new-application inline SMS strings~~ — moved to template functions.
- ~~/auth/verify?token= legacy page~~ — deleted (replaced by /v/[token]).

**Still pending:**

- **[P2] `/api/booth` and `/api/booth/[market_id]`** — verify nothing on `/sell` or `/sell/add` calls them, then remove.
- **[P2] `qa-comments.json` at repo root + `/api/qa-comments`** — internal debug artifacts. Gate or remove.
- **[P2] Orphaned `token_type='early_access'` branch in `/api/auth/verify/route.ts`.** Nothing creates these tokens anymore. Safe to delete along with the `buyer_market_early_access` table if we don't plan to bring back a gated pre-shop mode.

## P3 — docs + tooling cleanup

*All P3 items resolved 2026-04-22.*

- ~~`CLAUDE.md` referenced archived docs~~ — rewritten to point at current `EB_DESIGN.md`, `KNOWN_DEBT.md`, `QA_FINDINGS.md`.
- ~~`RESKIN_PLAN.md`, `PHASE_1_REVIEW_NOTES.md`, `REVISION_LOG.md`~~ — archived.
- ~~CLAUDE.md skill routing section~~ — removed (was stale).

---

## Open questions

- **Timing of the scheduled market-reminder "notify Eli" text** (commitment #9). When the buyer + dealer reminder send paths get built, Eli needs to pick a timing. Default proposal: evening before the market for buyers, 2 days before for dealers. Confirm with Eli before implementing.

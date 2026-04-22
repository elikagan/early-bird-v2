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

- **[P0] Any dealer can access admin tools.** The code checks whether someone is a dealer, but never checks whether they're actually an admin. So every approved dealer has full access to the admin dashboard, the SMS blast tool, dealer approvals, and market editing — things only Eli and Dave should be able to do. Needs a separate "admin" flag on users and a gate on every admin route. EB_DESIGN.md says admins are a distinct account type; the code doesn't enforce that. Files: `src/lib/auth.ts`, `src/app/(app)/admin/*`, every route under `src/app/api/admin/*`.

- **[P0] Supabase row-level security is off on at least one table** in project `hfvfmndjknxvhwrstkrg`. Supabase flagged `rls_disabled_in_public`. Right now the public anon key could theoretically read or write the affected table directly. Need to turn RLS on across ALL tables and add policies. (Task 1.)

- **[P0] Dave Harker (+17605868800, user_id `Bug9tDONJ09niFtE`) is being logged out repeatedly.** Not diagnosed yet. Sessions are supposed to last ten years, and the cookie is supposed to live on `.earlybird.la` so both earlybird.la and www.earlybird.la share it. The previous cookie-domain fix didn't stick. (Task 2.)

## P1 — commitment not actually built

- **[P1] No human-approval gate for mass texts exists at all.** Commitment #9 requires that every scheduled or admin-composed blast texts Eli first with a link showing the copy and recipient count, and only sends when Eli presses the button. Today there's no infrastructure for this — neither the scheduled cron half (reminders don't exist) nor the admin-composed half (blast tool doesn't exist). Task 3 will build the approval-gate shape and the dealer blast tool together.

- **[P1] Market reminders for BUYERS are not sent.** Commitment #4 item 7 and commitment #7: buyers who opt in to a show are supposed to get a reminder text before the market. The opt-in saves correctly to `notification_preferences`, but no cron or scheduled job actually reads it and sends a text. When built, this must route through the commitment #9 approval gate.

- **[P1] Market reminders for DEALERS are not sent.** Commitment #4 item 8 and commitment #8: dealers with items in a market are supposed to get an automatic "set up your booth" text before the market. The subscription/booth data exists, but there's no cron or send path that uses it. When built, this must also route through the commitment #9 approval gate.

- **[P1] `markets.dealer_preshop_enabled` toggle in the admin UI does nothing.** Admins can flip it and it saves to the database, but no backend code reads the column. Either wire it up or remove the toggle — right now it misleads the admin about what's happening.

## P2 — dead code and leftover bits to clean up

- **[P2] Dealer approval uses the wrong text template.** When an admin approves a dealer application, the system sends the dealer-invite text ("You've been invited to sell on Early Bird…"). But the applicant wasn't invited — they applied. Ratified copy for the approval text: *"Early Bird: Welcome aboard. You're approved to sell. Tap here to set up your booth: [link]"* Write it as a new template and swap it in on the approval path.

- **[P2] `/api/cron/drop-markets/route.ts`** — entire file is dead. The "drop" mechanic (scheduled timed release of markets) is retired. Not scheduled in `vercel.json` anymore. Delete the file and the `composeDropAlert` SMS template.

- **[P2] `markets.drop_notified_at` column** — only ever set by the dead drop cron above. Drop the column.

- **[P2] `markets.dealer_preshop_enabled` column** — not read by any backend code. Drop once admin UI is cleaned.

- **[P2] `items.held_for` column** — legacy from when holds were per-inquiry. Now replaced by a simple `status='held'` on the item. The code explicitly sets it to null on every status update, which is wasted work. Drop the column.

- **[P2] `composeHoldReceipt` and `composeLostReceipt`** in `src/lib/sms-templates.ts` — defined but never called. Remove.

- **[P2] `sms.inquiry.lost` event type** — no code writes it to `system_events`. Remove references.

- **[P2] `/api/booth` and `/api/booth/[market_id]` endpoints** — appear unused by the frontend. Verify nothing on `/sell` or `/sell/add` calls them, then remove.

- **[P2] `qa-comments.json` at repo root + `/api/qa-comments` route** — internal debug artifacts. Either gate behind a dev-only flag or remove.

## P3 — docs + tooling cleanup

- **[P3] `CLAUDE.md` still tells Claude to read `EB_DESIGN.md`, `DESIGN_SYSTEM.md`, and `RESKIN_PLAN.md`** as if those are live sources of truth. After this doc reset, update `CLAUDE.md` to point at the new `EB_DESIGN.md` and note the archives.

- **[P3] `RESKIN_PLAN.md` may also be stale** (last touched 2026-04-12). Review and archive if done.

- **[P3] `PHASE_1_REVIEW_NOTES.md` and `REVISION_LOG.md`** — old planning artifacts at repo root. Archive.

- **[P3] `CLAUDE.md` skill routing section** — lists skills that may not all still be relevant. Audit.

---

## Open questions (Claude to investigate before asking Eli)

- **The `/early/` URLs in the code.** There are routes like `src/app/early/[marketId]/page.tsx` and an `/api/early-access/start` endpoint. Claude to read those and figure out what they actually do today (who lands there, what they see) before asking Eli anything — Eli doesn't recognize the terminology.
- **Timing of market reminders.** Should the scheduled "notify Eli the blast is ready" text fire 2 days before the market? 1 day? Different for buyers vs dealers? Claude to propose a default (e.g., "evening before market") and ask Eli once.

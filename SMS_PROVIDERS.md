# SMS Providers — Early Bird

## Current State (April 14, 2026)

**Active provider:** Pingram (tester plan)
**Ready to switch:** Telnyx (pending 10DLC carrier approval)

SMS is used for: magic link auth, inquiry notifications, price drop alerts, hold/sold receipts, and admin blasts.

## How to Switch to Telnyx

Once the Telnyx 10DLC campaign reaches `MNO_APPROVED`:

1. Assign a phone number to the campaign (see "Telnyx Setup" below)
2. Add these to `.env.local` (and Vercel env vars):
   ```
   SMS_PROVIDER=telnyx
   TELNYX_API_KEY=<your-telnyx-api-key>
   TELNYX_FROM_NUMBER=+13105848456
   TELNYX_MESSAGING_PROFILE_ID=40019d63-2ddb-498d-88d3-c89459ca0f30
   ```
3. Deploy. Done.

To roll back to Pingram: set `SMS_PROVIDER=pingram` (or remove it, pingram is the default).

## Telnyx Account Details

| Field | Value |
|-------|-------|
| Account email | eli.kagan@gmail.com |
| Brand name | Early Bird |
| Brand TCR ID | B782AAW |
| Brand status | VERIFIED |
| Campaign TCR ID | C295A3B |
| Campaign status | TCR_ACCEPTED (awaiting MNO re-review) |
| Campaign use case | SOLE_PROPRIETOR |
| Sub-use cases | 2FA, ACCOUNT_NOTIFICATION |
| Messaging profile ID | 40019d63-2ddb-498d-88d3-c89459ca0f30 |
| Messaging profile name | Early Bird |
| Webhook URL | https://early-bird.objectlesson.workers.dev/api/sms/webhook |

### Phone Numbers

| Number | Type | Status | Campaign assigned |
|--------|------|--------|-------------------|
| +13105848456 | Local (LA 310) | Active | Not yet |
| +18337982347 | Toll-free (833) | Active | Not yet |

Use +13105848456 as the primary. It's a local LA number which matches the market.

### Assigning the Number to the Campaign

Once `MNO_APPROVED`, run:
```bash
curl -X POST "https://api.telnyx.com/v2/10dlc/campaign/4b30019d-6571-9172-f1da-8178e3282f45/phoneNumbers" \
  -H "Authorization: Bearer <your-telnyx-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumbers": ["+13105848456"]}'
```

### Campaign Messages (updated April 14, 2026)

**Opt-in (START):**
> Early Bird: You are now subscribed to marketplace alerts. Msg frequency varies. Msg&data rates may apply. Reply HELP for help, STOP to opt out. Privacy: https://earlybird.la/privacy

**Opt-out (STOP):**
> Early Bird: You have been unsubscribed. No further messages will be sent. Reply START to resubscribe.

**HELP:**
> Early Bird: Pre-market flea market classifieds. For support email eli.kagan@gmail.com or visit https://earlybird.la. Reply STOP to unsubscribe.

**Sample messages submitted to carriers:**
1. `Tap to sign in to Early Bird: https://earlybird.la/v/abc123def`
2. `Early Bird: A buyer messaged you about your $350 Walnut Credenza. View: https://earlybird.la/item/xK7mP2nQ`

## Pingram Account Details

| Field | Value |
|-------|-------|
| Plan | Tester |
| API key env var | PINGRAM_API_KEY |
| API endpoint | https://api.pingram.io/send |
| From number | Managed by Pingram (no dedicated number) |

Pingram handles 10DLC compliance on their end. No brand/campaign registration needed. Limitation: tester plan has volume limits.

## Timeline

| Date | Event |
|------|-------|
| Apr 6, 2026 | v1 built with Telnyx SMS relay (multiple relay numbers per conversation) |
| Apr 6, 2026 | 10DLC + toll-free both require weeks of carrier verification |
| Apr 6, 2026 | Switched to Pingram same day. Simplified to notification-only SMS. |
| Apr 7, 2026 | Telnyx 10DLC campaign created (TCR: C295A3B), toll-free +18337982347 purchased |
| Apr 7, 2026 | Campaign approved by Telnyx, sent to MNOs |
| ~Apr 10, 2026 | MNO_REJECTED: opt-in message missing HELP keyword, frequency, privacy link |
| Apr 14, 2026 | Campaign messages updated via API, appeal submitted |
| Apr 14, 2026 | Campaign status: TCR_ACCEPTED (re-queued for MNO review) |

### Earlier: Object Lesson (separate project)

Twilio was used for sale notification SMS on the Object Lesson project. Hit the same 10DLC wall: carriers blocked messages from unregistered campaigns. Twilio account was deleted. Not related to Early Bird's SMS but same underlying problem (US A2P 10DLC requirements since 2024).

## 10DLC Explained

Since 2024, all US application-to-person (A2P) SMS requires 10DLC registration:

1. **Brand registration** with The Campaign Registry (TCR) — identifies who is sending
2. **Campaign registration** — describes what messages you send and how users opt in/out
3. **MNO approval** — T-Mobile, AT&T, Verizon each review and approve the campaign
4. **Number assignment** — link your phone number to the approved campaign

Sole proprietor brands get lower throughput (roughly 1 msg/sec) but that's fine for Early Bird's volume.

## Architecture

All SMS goes through `src/lib/sms.ts`. The provider is selected at startup based on `SMS_PROVIDER` env var. Every callsite uses `sendSMS(to, body)` and doesn't know which provider is active.

SMS sends are deferred via Next.js `after()` so they never block HTTP responses. See:
- `src/app/api/items/[id]/route.ts` — price drops, hold/sold/lost receipts
- `src/app/api/inquiries/route.ts` — dealer notification on new inquiry
- `src/app/api/auth/start/route.ts` — magic link (this one is synchronous, user waits for it)
- `src/app/api/admin/sms-blast/route.ts` — admin bulk send

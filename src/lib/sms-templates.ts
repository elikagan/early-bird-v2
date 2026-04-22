/**
 * SMS sent to dealer when a buyer inquires on their item.
 */
export function composeInquiryNotification(
  buyerName: string,
  buyerPhone: string,
  itemTitle: string,
  message: string
): string {
  return `Early Bird: ${buyerName} at ${buyerPhone} says: "${message}" about ${itemTitle}. Contact them directly to make the deal.`;
}

/**
 * SMS sent to winning buyer when dealer sells to them. No pickup details —
 * payment and logistics are arranged directly between buyer and dealer.
 * Includes a no-warranty / common-sense disclaimer.
 */
export function composeSoldReceipt(
  dealerName: string,
  itemTitle: string
): string {
  return `Early Bird: Congrats! ${dealerName} marked the ${itemTitle} sold to you. We trust you'll both honor whatever you agreed on. Early Bird doesn't warranty this transaction — use common sense.`;
}

/**
 * SMS sent to watchers when a dealer drops the price on an item.
 */
export function composePriceDropNotification(
  itemTitle: string,
  oldPrice: string,
  newPrice: string,
  url: string
): string {
  return `Early Bird: ${itemTitle} just dropped from ${oldPrice} to ${newPrice}.\n\n${url}`;
}

/**
 * SMS with magic link for auth.
 */
export function composeMagicLink(url: string): string {
  return `Early Bird sign-in link:\n\n${url}`;
}

/**
 * SMS sent to a user's NEW phone number when they're changing it.
 * Tapping the link confirms ownership and swaps the phone on their
 * account. Falls under the "magic link" umbrella in EB_DESIGN.md.
 */
export function composePhoneChangeVerification(url: string): string {
  return `Early Bird: tap to confirm your new number.\n\n${url}`;
}

/**
 * Internal admin notification. Fires when a buyer submits a dealer
 * application. Goes only to ADMIN_PHONES — never to a regular user.
 */
export function composeAdminNewApplication(
  applicantName: string,
  businessName: string,
  adminUrl: string
): string {
  return `Early Bird: New dealer application from ${applicantName} (${businessName}). Review: ${adminUrl}`;
}

/**
 * Internal admin notification. Fires when a scheduled blast (dealer
 * Monday / dealer Thursday / buyer Thursday) queues. Eli taps the link,
 * reviews the proposed copy + recipient count, edits if he wants, and
 * presses Send. Goes only to ADMIN_PHONES.
 */
export function composeScheduledBlastReady(
  blastLabel: string,
  marketName: string,
  recipientCount: number,
  reviewUrl: string
): string {
  return `Early Bird: ${blastLabel} for ${marketName} is ready to send to ${recipientCount} people. Review + approve: ${reviewUrl}`;
}

/**
 * SMS sent to a new dealer when an admin invites them to the platform (cold
 * invite, not an approval of an existing application).
 */
export function composeDealerInvite(url: string): string {
  return `Early Bird: You've been invited to sell on Early Bird. Tap to set up your booth:\n\n${url}`;
}

/**
 * SMS sent when an admin approves a dealer application. Different from the
 * cold invite — this person applied, so we welcome them rather than invite.
 */
export function composeDealerApproval(url: string): string {
  return `Early Bird: Welcome aboard. You're approved to sell. Tap here to set up your booth:\n\n${url}`;
}

/**
 * SMS sent to a buyer right after they submit an anonymous inquiry.
 * Dealer has NOT been notified yet — this link proves phone ownership.
 * Tapping it creates the inquiry, fires the dealer notification, and
 * returns the buyer to the listing signed in.
 */
export function composeInquiryBuyerConfirmation(
  dealerName: string,
  itemTitle: string,
  url: string
): string {
  return `Early Bird: tap to confirm it's you and send your message about "${itemTitle}" to ${dealerName}:\n\n${url}`;
}

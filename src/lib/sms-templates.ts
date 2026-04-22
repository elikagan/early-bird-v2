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
 * SMS sent to buyer when dealer holds an item for them.
 */
export function composeHoldReceipt(
  dealerName: string,
  itemTitle: string,
  boothNumber: string | null,
  marketName: string,
  marketDate: string
): string {
  const booth = boothNumber ? ` at Booth ${boothNumber}` : "";
  return `Early Bird: ${dealerName} is holding ${itemTitle} for you. First dibs${booth}, ${marketName}, ${marketDate}.`;
}

/**
 * SMS sent to winning buyer when dealer sells to them. No pickup details —
 * payment and logistics are arranged directly between buyer and dealer.
 * Includes a no-warranty / common-sense disclaimer.
 *
 * The booth/market/date args are accepted for backward compatibility but
 * intentionally unused in the current copy.
 */
export function composeSoldReceipt(
  dealerName: string,
  itemTitle: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _boothNumber: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _marketName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _marketDate: string
): string {
  return `Early Bird: Congrats! ${dealerName} marked the ${itemTitle} sold to you. We trust you'll both honor whatever you agreed on. Early Bird doesn't warranty this transaction — use common sense.`;
}

/**
 * SMS sent to losing inquirers when item sells to someone else.
 */
export function composeLostReceipt(
  itemTitle: string,
  dealerName: string
): string {
  return `Early Bird: ${itemTitle} sold to another buyer. Keep an eye on ${dealerName}'s booth for more drops.`;
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
  return `Early Bird\n\n${url}`;
}

/**
 * SMS sent to a new dealer when an admin invites them to the platform.
 */
export function composeDealerInvite(url: string): string {
  return `Early Bird: You've been invited to sell on Early Bird. Tap to set up your booth:\n\n${url}`;
}

/**
 * SMS sent to a buyer who requested early access to pre-shop a market.
 * Contains the magic link that signs them in and grants access.
 */
export function composeEarlyAccess(marketName: string, url: string): string {
  return `Early Bird: Here's your link to pre-shop ${marketName}:\n\n${url}`;
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

/**
 * SMS sent to followers when a market drops (goes live).
 */
export function composeDropAlert(
  marketName: string,
  itemCount: number,
  dealerCount: number,
  url: string
): string {
  return `Early Bird: ${marketName} is live — ${itemCount} items from ${dealerCount} dealers. Shop now.\n\n${url}`;
}

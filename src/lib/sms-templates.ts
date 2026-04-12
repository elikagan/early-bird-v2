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
 * SMS sent to winning buyer when dealer sells to them.
 */
export function composeSoldReceipt(
  dealerName: string,
  itemTitle: string,
  boothNumber: string | null,
  marketName: string,
  marketDate: string
): string {
  const booth = boothNumber ? `See ${dealerName} at Booth ${boothNumber}` : `See ${dealerName}`;
  return `Early Bird: Sold! ${itemTitle} is yours. ${booth}, ${marketName}, ${marketDate}. Bring payment.`;
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
 * SMS with magic link for auth.
 */
export function composeMagicLink(url: string): string {
  return `Early Bird: Tap to sign in: ${url}`;
}

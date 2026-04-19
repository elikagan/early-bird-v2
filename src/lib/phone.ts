/**
 * Liberal US phone normalizer. Accepts basically any format a human
 * might paste — contact card labels, formatted numbers, extra +1s,
 * whitespace, punctuation — and returns a clean E.164 string.
 *
 * Returns { ok: false, reason } only when the underlying 10-digit
 * number can't possibly be a valid NANP phone (bad area or exchange
 * code). That prevents the silent-fail-at-carrier case where a typo
 * produces a plausible-looking E.164 string that no phone can receive.
 *
 * Examples of inputs that all normalize to "+13235081158":
 *   (323) 508-1158
 *   323-508-1158
 *   323.508.1158
 *   +1 (323) 508-1158
 *   +1 323 508 1158
 *   1-323-508-1158
 *   "My cell: +1 323 508 1158"    (extra text stripped by digit-only scan)
 *   +1+1 (323) 508-1158            (double country code, peeled off)
 */

export type NormalizeResult =
  | { ok: true; phone: string }
  | { ok: false; reason: string };

export function normalizeUSPhone(input: unknown): NormalizeResult {
  if (input == null) return { ok: false, reason: "Phone is required" };

  // Strip everything that isn't a digit.
  let digits = String(input).replace(/\D/g, "");

  // Peel off leading 1s. Handles:
  //   +1  → one leading 1 (normal)
  //   +1+1 → two leading 1s (double-country-code paste accident)
  //   more leading 1s keep peeling until either we hit a non-1
  //   or we're down to 10 digits.
  while (digits.length > 10 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length < 10) {
    return { ok: false, reason: "That's not enough digits for a US phone" };
  }
  if (digits.length > 10) {
    return { ok: false, reason: "Too many digits for a US phone" };
  }

  // NANP rules: US/Canada area code and exchange code (the 3 digits
  // after the area code) both must start with 2-9. Numbers that break
  // these rules cannot be dialed.
  const areaCode = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  if (areaCode[0] === "0" || areaCode[0] === "1") {
    return {
      ok: false,
      reason: `Area code "${areaCode}" isn't a valid US area code`,
    };
  }
  if (exchange[0] === "0" || exchange[0] === "1") {
    return {
      ok: false,
      reason: `"${digits}" doesn't look like a real US number`,
    };
  }

  return { ok: true, phone: `+1${digits}` };
}

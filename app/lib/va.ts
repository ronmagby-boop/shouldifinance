/* ----------------------------------------------------------------------------
 * VA funding fee.
 *
 * The fee is set in statute, not by the VA: 38 U.S.C. § 3729(b)(2) carries the
 * table, by down payment and by first or subsequent use, and VA's funding fee
 * chart publishes the same figures. Both were read for these values.
 * ------------------------------------------------------------------------- */

/**
 * The schedule in force, and when it started and stops.
 *
 * § 3729(b)(2) rows (A)(iii), (B)(iii), (C)(iii) and (D)(iii) apply to loans
 * "closed on or after April 7, 2023, and before June 9, 2034". On that later
 * date the statute steps every purchase rate down (to 1.40, 1.25, 0.75 and
 * 0.50), so this table has a known expiry and needs replacing before then.
 */
export const VA_FUNDING_FEE_AS_OF = "7 April 2023";
export const VA_FUNDING_FEE_UNTIL = "9 June 2034";

export type VaFundingFeeUse = "first" | "subsequent" | "exempt";

/**
 * Purchase and construction loans, as a percent of the base loan amount, for
 * active duty and veteran borrowers.
 *
 * Highest down payment first, ending at 0, so the first tier the down payment
 * reaches is the one that applies. From § 3729(b)(2):
 *   - 10-down, (D)(iii): 1.25, first and subsequent use alike
 *   - 5-down, (C)(iii): 1.50, first and subsequent use alike
 *   - 0-down, (A)(iii) initial 2.15 and (B)(iii) subsequent 3.30
 * § 3729(b)(4) defines 5-down as "at least 5 percent or more, but less than 10
 * percent" of the purchase price, and 10-down as "10 percent or more".
 *
 * Row (B) reads "subsequent loan ... with 0-down, or any other subsequent
 * loan", which can look as if it catches a subsequent loan with 5% down. It
 * does not in practice: VA's chart prices "after first use" at 1.5% at 5% or
 * more and 1.25% at 10% or more, the same as first use.
 */
export const VA_FUNDING_FEE_PURCHASE: readonly {
  minDownPct: number;
  firstUse: number;
  subsequentUse: number;
}[] = [
  { minDownPct: 10, firstUse: 1.25, subsequentUse: 1.25 },
  { minDownPct: 5, firstUse: 1.5, subsequentUse: 1.5 },
  { minDownPct: 0, firstUse: 2.15, subsequentUse: 3.3 },
];

/**
 * Interest rate reduction refinancing loan (IRRRL, the VA streamline), as a
 * percent of the loan amount. 0.50, from § 3729(b)(2) row (E), and VA's chart
 * prices it at "0.5%" too.
 *
 * NOT DATED LIKE THE PURCHASE TABLE. Row (E) is a single row with no "closed on
 * or after" range, so the April 2023 to June 2034 window above does not apply
 * to it and VA_FUNDING_FEE_UNTIL is not its expiry. It changes only when the
 * statute is amended. First and subsequent use do not matter either:
 * § 3729(b)(4)(E) defines a "subsequent loan" as one "other than an interest
 * rate reduction refinancing loan".
 */
export const VA_FUNDING_FEE_IRRRL = 0.5;

/**
 * The tier a down payment lands in. The fallback to the lowest tier only
 * matters for a percentage that is not a number or is negative; the old
 * if-chain landed there too.
 */
function purchaseTier(downPct: number) {
  return (
    VA_FUNDING_FEE_PURCHASE.find((t) => downPct >= t.minDownPct) ??
    VA_FUNDING_FEE_PURCHASE[VA_FUNDING_FEE_PURCHASE.length - 1]
  );
}

/**
 * VA funding fee on a purchase loan, as a percent of the base loan amount.
 *
 * `use` is a string rather than VaFundingFeeUse because it arrives from a
 * select element; anything other than "first" or "exempt" prices as subsequent
 * use, which is how the calculator behaved before this moved here.
 */
export function vaFundingFeeRate(downPct: number, use: string): number {
  if (use === "exempt") return 0;
  const t = purchaseTier(downPct);
  return use === "first" ? t.firstUse : t.subsequentUse;
}

/** Why the rate above was picked, for the user to check against their own plan. */
export function vaFundingFeeReason(downPct: number, use: string): string {
  if (use === "exempt") return "Exempt — no funding fee at any down payment";
  const t = purchaseTier(downPct);
  if (t.minDownPct > 0) return `${t.minDownPct}% or more down`;
  const lowestPaid = VA_FUNDING_FEE_PURCHASE[VA_FUNDING_FEE_PURCHASE.length - 2].minDownPct;
  return `${use === "first" ? "First use" : "Subsequent use"}, under ${lowestPaid}% down`;
}

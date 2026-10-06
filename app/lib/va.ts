/* ----------------------------------------------------------------------------
 * VA entitlement.
 *
 * VA Pamphlet 26-7, Chapter 3, Topic 4 (change date 14 May 2024), and VA's
 * home loan limits page (va.gov/housing-assistance/home-loans/loan-limits/,
 * last updated 12 August 2025). Both were read for these values.
 * ------------------------------------------------------------------------- */

/**
 * Basic ("first tier") entitlement. Pamphlet 26-7, Ch. 3: "VA refers to the
 * first $36,000 of a Veteran's entitlement as their 'basic' entitlement."
 */
export const VA_BASIC_ENTITLEMENT = 36_000;

/**
 * The loan amount above which bonus entitlement applies, and the guaranty
 * share above it. Ch. 3: "For Veterans with full entitlement, the maximum
 * amount of guaranty entitlement available to the Veteran, for a loan amount
 * above $144,000 is 25 percent of the loan amount", and for partial
 * entitlement: "25% of the single-unit Freddie Mac Conforming Loan Limit (CLL)
 * for the county ... reduced by the amount of unrestored entitlement."
 */
export const VA_BONUS_ENTITLEMENT_THRESHOLD = 144_000;
export const VA_GUARANTY_PCT = 25;

/**
 * Table 3, "Maximum Potential Guaranty by Loan Amount", for loans up to
 * $144,000 (above that it is VA_GUARANTY_PCT of the loan with full
 * entitlement): "Up to $45,000: 50 percent of the loan amount"; "$45,001 to
 * $56,250: $22,500"; "$56,251 to $144,000: 40 percent of the loan amount,
 * with a maximum of $36,000".
 */
export const VA_GUARANTY_TIERS: readonly { upTo: number; pct: number | null; flat: number | null; max: number | null }[] = [
  { upTo: 45_000, pct: 50, flat: null, max: null },
  { upTo: 56_250, pct: null, flat: 22_500, max: null },
  { upTo: 144_000, pct: 40, flat: null, max: 36_000 },
];

/**
 * VA's loan limits page: "Most lenders require that your entitlement, down
 * payment, or a combination of both covers at least 25% of your total loan
 * amount", and "Multiply your remaining bonus entitlement by 4 ... the
 * maximum amount most lenders would be willing to loan you without your
 * needing to make a down payment." A lender practice VA describes, not a VA
 * rule: Ch. 3 says "Lenders should consult with their investor".
 */
export const VA_LENDER_COVERAGE_PCT = 25;

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

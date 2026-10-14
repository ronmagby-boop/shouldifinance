/**
 * Buying out a car lease at the end of its term: the math behind
 * /calculators/lease-buyout.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE PRICE IS IN THE LEASE. Regulation M, 12 CFR 1013.4(i), requires the
 * lease to state "whether or not the lessee has the option to purchase the
 * leased property" and, "If at the end of the lease term, the purchase price".
 * The CFPB's leasing page calls the residual value "what you will pay for the
 * car if a purchase option is included." Fees, the state's tax and the
 * market value are the reader's own inputs: no constant here is a standard.
 *
 * THE DECISION. Buying out costs the purchase price plus fees and tax, and
 * leaves you a car worth its market value; returning costs the end-of-lease
 * charges and leaves you nothing. Valuing the car at what it would sell for:
 *
 *   equity              = market value − buyout total
 *   buyout advantage    = equity + return charges avoided
 *
 * Positive means buying out leaves you better off than handing the car back.
 * With a comparable used car priced, the second comparison is cash out: the
 * buyout against the return charges plus buying that car, taxed and titled
 * the same way.
 */
import { payment } from "./finance";

export type Inputs = {
  /** The purchase option price from the lease. */
  buyoutPrice: number;
  /** The purchase option fee, if the lease charges one. */
  optionFee: number;
  /** Sales tax on the buyout price, percent: state-specific, the reader's input. */
  taxRatePct: number;
  /** Title and registration. */
  titleFees: number;
  /** The reader's estimate of what the car would sell for. */
  marketValue: number;
  dispositionFee: number;
  milesOver: number;
  perMileCharge: number;
  excessWear: number;
  /** The price of a similar used car, or null if not compared. */
  comparablePrice: number | null;
  /** Null for cash; otherwise the loan used for the buyout. */
  loan: { apr: number; months: number } | null;
};

export function analyze(i: Inputs) {
  const tax = (i.buyoutPrice * i.taxRatePct) / 100;
  const buyoutTotal = i.buyoutPrice + i.optionFee + tax + i.titleFees;
  const equity = i.marketValue - buyoutTotal;

  const mileageCharge = Math.max(0, i.milesOver) * Math.max(0, i.perMileCharge);
  const returnCosts = i.dispositionFee + mileageCharge + i.excessWear;
  const buyoutAdvantage = equity + returnCosts;

  const comparable = i.comparablePrice === null ? null : (() => {
    const compTax = (i.comparablePrice * i.taxRatePct) / 100;
    const replaceTotal = i.comparablePrice + compTax + i.titleFees;
    const returnAndReplace = returnCosts + replaceTotal;
    return { compTax, replaceTotal, returnAndReplace, savingFromBuyout: returnAndReplace - buyoutTotal };
  })();

  const financed = i.loan && i.loan.months > 0 ? (() => {
    const monthly = payment(buyoutTotal, i.loan.apr, Math.round(i.loan.months));
    return { monthly, totalInterest: monthly * Math.round(i.loan.months) - buyoutTotal };
  })() : null;

  return { tax, buyoutTotal, equity, mileageCharge, returnCosts, buyoutAdvantage, comparable, financed };
}

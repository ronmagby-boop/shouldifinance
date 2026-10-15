/**
 * Trading a car in or selling it privately: the math behind
 * /calculators/trade-in-or-sell.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE TAX CREDIT. Some states tax only the difference between the next car's
 * price and the trade-in allowance; others tax the full price. No state table
 * is built here: each state's rule would have to be sourced from its own
 * revenue department, so the reader answers yes, no or not sure, and the page
 * says to check. Where it applies, the saving is the tax rate on the trade-in
 * allowance, never more than the tax on the next car itself.
 *
 * THE COMPARISON. Both paths end with the old car gone and the loan on it
 * settled:
 *
 *   trade-in      offer + tax saving − payoff
 *   private sale  price − selling costs − the value of your time − payoff
 *
 * The payoff comes off both sides alike, so it never changes which is larger;
 * it decides whether there is cash left over or a shortfall to cover.
 */

export type TaxCredit = "yes" | "no" | "unsure";

export type Inputs = {
  tradeOffer: number;
  privatePrice: number;
  nextCarPrice: number;
  /** Sales tax rate, percent: state-specific, the reader's input. */
  taxRatePct: number;
  taxCredit: TaxCredit;
  /** Owed on the current car; 0 if it is paid off. */
  payoff: number;
  /** Listing, detailing, inspection, title and similar. */
  privateCosts: number;
  /** What the reader's own time selling it is worth, in dollars; 0 to leave it out. */
  timeValue: number;
};

/** The sales tax a trade-in saves where the state taxes only the difference. */
export const taxSaving = (tradeOffer: number, nextCarPrice: number, taxRatePct: number) =>
  (Math.min(Math.max(0, tradeOffer), Math.max(0, nextCarPrice)) * taxRatePct) / 100;

function compare(i: Inputs, withCredit: boolean) {
  const saving = withCredit ? taxSaving(i.tradeOffer, i.nextCarPrice, i.taxRatePct) : 0;
  const tradeNet = i.tradeOffer + saving - i.payoff;
  const privateNet = i.privatePrice - i.privateCosts - i.timeValue - i.payoff;
  return {
    taxSaving: saving,
    tradeNet,
    privateNet,
    /** Positive: selling privately leaves more. */
    privateAdvantage: privateNet - tradeNet,
    /** The private price at which the two come out level. */
    breakEvenPrivatePrice: i.tradeOffer + saving + i.privateCosts + i.timeValue,
  };
}

export function analyze(i: Inputs) {
  const credit = compare(i, true);
  const noCredit = compare(i, false);
  const primary = i.taxCredit === "no" ? noCredit : credit;
  return {
    ...primary,
    /** For "not sure": both answers, so the reader sees what the rule is worth. */
    withCredit: credit,
    withoutCredit: noCredit,
    /** Owing more than the car brings in: the shortfall on each path, 0 if none. */
    tradeShortfall: Math.max(0, i.payoff - i.tradeOffer),
    privateShortfall: Math.max(0, i.payoff - (i.privatePrice - i.privateCosts)),
    negativeEquity: i.payoff > Math.max(i.tradeOffer, i.privatePrice),
  };
}

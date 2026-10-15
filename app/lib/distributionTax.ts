/**
 * Tax on a taxable distribution from a retirement plan: federal income tax
 * stacked on the year's other income, a flat state rate, and the additional
 * tax on early distributions.
 *
 * Shared by /calculators/early-withdrawal and /calculators/401k-loan (where an
 * unpaid loan balance becomes a distribution), so the two pages cannot tax
 * the same dollar differently.
 *
 * THE ADDITIONAL TAX. IRS, "Retirement topics: exceptions to tax on early
 * distributions": "Generally, the amounts an individual withdraws from an IRA
 * or retirement plan before reaching age 59½ are called 'early' or
 * 'premature' distributions. Individuals must pay an additional 10% early
 * withdrawal tax unless an exception applies."
 */
import { taxOnExtraIncome, type FilingStatus } from "./tax";

export const EARLY_DISTRIBUTION_AGE = 59.5;
export const EARLY_DISTRIBUTION_ADDITIONAL_TAX_PCT = 10;

export type DistributionInputs = {
  /** The part of the distribution that is taxable. */
  taxable: number;
  /** The year's other gross income, for stacking the federal tax. */
  otherIncome: number;
  status: FilingStatus;
  /** A flat state rate in percent, the reader's input. */
  stateRatePct: number;
  /** Age when the distribution is taken. */
  age: number;
  /** True when an exception to the additional tax applies. */
  exception: boolean;
};

export function distributionTax(i: DistributionInputs) {
  const taxable = Math.max(0, i.taxable);
  const penaltyApplies = i.age < EARLY_DISTRIBUTION_AGE && !i.exception;
  const penalty = penaltyApplies ? (taxable * EARLY_DISTRIBUTION_ADDITIONAL_TAX_PCT) / 100 : 0;
  const fed = taxOnExtraIncome(i.otherIncome, taxable, i.status);
  const stateTax = (taxable * i.stateRatePct) / 100;
  return { penaltyApplies, penalty, fed, fedTax: fed.tax, stateTax, total: penalty + fed.tax + stateTax };
}

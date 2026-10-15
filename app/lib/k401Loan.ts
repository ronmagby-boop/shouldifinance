/**
 * Borrowing from a 401(k): the math behind /calculators/401k-loan.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE LIMIT. 26 U.S.C. 72(p)(2)(A): a loan is not treated as a distribution
 * to the extent it does not exceed the lesser of "$50,000" (reduced by recent
 * loan balances) or "the greater of (I) one-half of the present value of the
 * nonforfeitable accrued benefit of the employee under the plan, or (II)
 * $10,000." IRS, "Retirement Topics: Loans" (26 February 2026): "The maximum
 * amount a participant may borrow from his or her plan is 50% of his or her
 * vested account balance or $50,000, whichever is less. An exception to this
 * limit is if 50% of the vested account balance is less than $10,000: in such
 * case, the participant may borrow up to $10,000. Plans are not required to
 * include this exception." A loan can never be more than the balance itself.
 *
 * THE TERM. 72(p)(2)(B): repayable "within 5 years", except "any loan used to
 * acquire any dwelling unit which ... is to be used ... as the principal
 * residence of the participant". (C): "substantially level amortization ...
 * (with payments not less frequently than quarterly)". Modelled monthly.
 *
 * THE REAL COST. The interest goes back into your own account, so the rate is
 * not the cost. You pay the interest out of pocket, and your account ends the
 * loan ahead or behind where it would have been; together that is the growth
 * the borrowed money would have earned while it was out:
 *
 *   growth missed = interest paid in + (account without the loan − with it)
 *
 * At a 0% return it is nothing (you only paid yourself); at a return equal to
 * the loan's rate it equals the interest. It is the figure to set against
 * another loan's interest, which leaves the account untouched.
 */
import { balanceAfter, payment } from "./finance";
import { distributionTax, type DistributionInputs } from "./distributionTax";

export const KLOAN_DOLLAR_CAP = 50_000;
export const KLOAN_VESTED_SHARE = 0.5;
export const KLOAN_SMALL_BALANCE_FLOOR = 10_000;
export const KLOAN_MAX_YEARS = 5;

/** The most the plan can lend: half the vested balance or $50,000, whichever is less, with the optional $10,000 floor. */
export function maxLoan(vested: number, planHasFloor = false): number {
  const half = Math.max(0, vested) * KLOAN_VESTED_SHARE;
  const byBalance = planHasFloor ? Math.max(half, KLOAN_SMALL_BALANCE_FLOOR) : half;
  return Math.max(0, Math.min(KLOAN_DOLLAR_CAP, byBalance, vested));
}

/** Total interest on a level-payment loan. */
export const loanInterest = (amount: number, apr: number, months: number) =>
  payment(amount, apr, months) * months - amount;

/**
 * The account at the end of the loan with and without it. Without: the
 * borrowed amount stays invested at `annualReturn`. With: it is lent out, and
 * each monthly repayment (principal and interest) is reinvested as it comes
 * in. Contributions that stop during the loan are counted as well.
 */
export function opportunityCost(
  amount: number, loanApr: number, months: number, annualReturn: number,
  missedMonthlyContribution = 0,
) {
  const r = annualReturn / 100 / 12;
  const pmt = payment(amount, loanApr, months);
  const withoutLoan = amount * (1 + r) ** months;
  let withLoan = 0;
  for (let m = 1; m <= months; m++) withLoan = withLoan * (1 + r) + pmt;
  let missedContributions = 0;
  for (let m = 1; m <= months; m++) missedContributions = missedContributions * (1 + r) + missedMonthlyContribution;
  return {
    payment: pmt,
    interestToYourself: pmt * months - amount,
    withoutLoan,
    withLoan,
    /** How far ahead (+) or behind (−) the account ends, counting the interest paid in. */
    accountDifference: withLoan - withoutLoan,
    /** The growth the borrowed money would have earned while it was out. */
    growthMissed: pmt * months - amount + withoutLoan - withLoan,
    missedContributions,
    totalCost: pmt * months - amount + withoutLoan - withLoan + missedContributions,
  };
}

/**
 * Leaving the job with a balance outstanding: if it is not repaid, or rolled
 * over by the tax-return due date including extensions, it is a distribution,
 * taxed by the same rules as an early withdrawal.
 */
export function jobChange(
  amount: number, loanApr: number, months: number, leaveAfterMonths: number,
  tax: Omit<DistributionInputs, "taxable">,
) {
  const outstanding = leaveAfterMonths >= months ? 0 : balanceAfter(amount, loanApr, months, Math.max(0, leaveAfterMonths));
  const t = distributionTax({ ...tax, taxable: outstanding });
  return { outstanding, ...t, keep: outstanding - t.total };
}

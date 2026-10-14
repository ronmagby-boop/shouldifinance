/**
 * Paying off one credit card: the math behind /calculators/credit-card-payoff.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE MONTH. Interest is the APR ÷ 12 on the balance carried into the month;
 * new charges are added; the payment comes off the result, the statement
 * balance. Issuers actually charge a daily rate on the average daily balance,
 * so real figures differ a little. Regulation Z's own method for the statement
 * estimates allows the same simplification: Appendix M1 to Part 1026 says "A
 * monthly or daily periodic rate may be assumed."
 *
 * NEVER PAYING OFF is detected, not looped on. A month in which the balance
 * does not fall means the payment does not cover the interest and new charges;
 * for a fixed payment, or a minimum that is a share of the balance, that stays
 * true at every higher balance, so the run stops and says so. A minimum that
 * only just covers new charges lets the balance sink toward a level it never
 * goes below, and the same check stops it when the progress runs out. Anything
 * still unpaid after MAX_MONTHS stops there as a backstop.
 */

/** The longest run simulated: 100 years. */
export const MAX_MONTHS = 1200;

/**
 * Minimum payment formulas. ISSUER-SPECIFIC, NOT SOURCED: no regulation sets
 * a card's minimum payment, and each issuer's formula is in its cardholder
 * agreement. These are two common shapes, with starting values the page
 * labels as editable, never as a standard.
 *
 *   interestPlusPct  the month's interest plus a % of the statement balance
 *   pctOfBalance     a % of the statement balance
 *
 * Either way, never below the dollar floor, and never above the statement
 * balance.
 */
export type MinRule = { kind: "interestPlusPct" | "pctOfBalance"; pct: number; floor: number };
export const MIN_RULE_DEFAULTS: Record<MinRule["kind"], MinRule> = {
  interestPlusPct: { kind: "interestPlusPct", pct: 1, floor: 25 },
  pctOfBalance: { kind: "pctOfBalance", pct: 3, floor: 25 },
};

/** The minimum due on a statement balance, given that month's interest. */
export function minimumPayment(rule: MinRule, statementBalance: number, interest: number): number {
  if (statementBalance <= 0) return 0;
  const formula = rule.kind === "interestPlusPct"
    ? interest + (statementBalance * rule.pct) / 100
    : (statementBalance * rule.pct) / 100;
  return Math.min(statementBalance, Math.max(rule.floor, formula));
}

export type Run = {
  /** True when the balance reaches zero. */
  paidOff: boolean;
  /** Why it never does: the payment does not beat interest and charges, or it takes longer than MAX_MONTHS. */
  never: null | "payment-below-interest" | "too-long";
  months: number;
  totalInterest: number;
  totalPaid: number;
  firstPayment: number;
  /** Balance at the end of each month, starting with the opening balance. */
  balances: number[];
};

/**
 * Pay a card down month by month. `payment` is the monthly payment for a
 * given statement balance and interest: a fixed amount, or a minimum rule.
 */
function run(balance: number, apr: number, charges: number, payment: (s: number, interest: number) => number): Run {
  const r = apr / 100 / 12;
  let bal = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let firstPayment = 0;
  const balances = [bal];
  for (let m = 1; m <= MAX_MONTHS; m++) {
    const interest = bal * r;
    const statement = bal + interest + charges;
    const pay = Math.min(statement, payment(statement, interest));
    if (m === 1) firstPayment = pay;
    const next = statement - pay;
    totalInterest += interest;
    totalPaid += pay;
    balances.push(Math.max(0, next));
    if (next <= 0.005) return { paidOff: true, never: null, months: m, totalInterest, totalPaid, firstPayment, balances };
    // No progress this month: the payment does not cover the interest and new charges.
    if (next >= bal - 1e-9) {
      return { paidOff: false, never: "payment-below-interest", months: m, totalInterest, totalPaid, firstPayment, balances };
    }
    bal = next;
  }
  return { paidOff: false, never: "too-long", months: MAX_MONTHS, totalInterest, totalPaid, firstPayment, balances };
}

export const payMinimum = (balance: number, apr: number, rule: MinRule, charges = 0) =>
  run(balance, apr, charges, (s, interest) => minimumPayment(rule, s, interest));

export const payFixed = (balance: number, apr: number, amount: number, charges = 0) =>
  run(balance, apr, charges, () => Math.max(0, amount));

/**
 * The level payment that clears the balance in `months`, with `charges` added
 * every month: the textbook amortizing payment, plus the charges, because
 * each month's charges have to be paid as well.
 */
export function paymentToClear(balance: number, apr: number, months: number, charges = 0): number {
  const n = Math.max(1, Math.round(months));
  const r = apr / 100 / 12;
  const level = r === 0 ? balance / n : (balance * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  return level + charges;
}

/* ----------------------------------------------------------------------------
 * The statement check.
 *
 * 12 CFR 1026.7(b)(12) requires a card statement to show, for the balance on
 * it: the minimum payment warning; how long minimum payments alone would take
 * ("If the minimum payment repayment estimate is less than 2 years, the card
 * issuer must disclose the estimate in months. Otherwise, the estimate must be
 * disclosed in years and rounded to the nearest whole year"); what they would
 * cost in total; and, unless an exception applies, "The estimated monthly
 * payment for repayment in 36 months", its total cost, and the savings. The
 * 36-month figures are not required when the minimum-only estimate "after
 * rounding is three years or less", or when the 36-month payment "is less
 * than the minimum payment required". Where minimum payments never pay it off,
 * (b)(12)(ii) replaces the estimates with a warning that "we estimate you will
 * never pay off the balance shown on this statement" and still shows the
 * 36-month payment.
 *
 * Appendix M1 assumes no new charges ("No additional extensions of credit are
 * obtained"), so this check ignores the reader's new charges.
 * ------------------------------------------------------------------------- */
export const STATEMENT_MONTHS = 36;

export function statementCheck(balance: number, apr: number, rule: MinRule) {
  const min = payMinimum(balance, apr, rule, 0);
  const payment36 = paymentToClear(balance, apr, STATEMENT_MONTHS, 0);
  const total36 = payment36 * STATEMENT_MONTHS;
  if (!min.paidOff) {
    return { neverPaysOff: true as const, payment36, total36 };
  }
  const inMonths = min.months < 24;
  const disclosed = inMonths ? { value: min.months, unit: "months" as const } : { value: Math.round(min.months / 12), unit: "years" as const };
  const yearsAfterRounding = inMonths ? min.months / 12 : disclosed.value;
  const show36 = yearsAfterRounding > 3 && !(payment36 < min.firstPayment);
  return {
    neverPaysOff: false as const,
    disclosed,
    minMonths: min.months,
    minTotalCost: min.totalPaid,
    payment36,
    total36,
    savings36: min.totalPaid - total36,
    show36,
  };
}

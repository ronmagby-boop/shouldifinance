/**
 * Paying a car loan off early: the math behind /calculators/car-loan-payoff.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * SIMPLE INTEREST. The math assumes the usual simple-interest loan: each
 * month's interest is the rate on the balance still owed, so every extra
 * dollar of principal stops costing interest from then on. CFPB, "What's the
 * difference between a simple interest rate and precomputed interest on an
 * auto loan?": "Simple interest – which is far more common - calculates the
 * interest based on the outstanding balance of the loan either on a daily or
 * monthly basis." A precomputed loan saves less; the page says so and does
 * not model it.
 *
 * THE COMPARISON, over the loan's original remaining term. Two households
 * with the same loan and the same spare money:
 *   prepay  the lump sum and the extra go to the loan; once it is gone, the
 *           whole payment plus the extra is invested each month until the
 *           original end date.
 *   invest  the loan runs as scheduled; the lump sum is invested now and the
 *           extra every month, at the alternative return.
 * At the original end date neither owes anything, so the difference in what
 * each has invested is the whole answer. At a return equal to the loan's rate
 * the two come out the same: prepaying "earns" exactly the loan's rate.
 */
import { monthsFromPayment, payment } from "./finance";

export type Inputs = {
  balance: number;
  apr: number;
  /** Remaining months; or null when the current payment is given instead. */
  months: number | null;
  /** The current monthly payment; used when months is null. */
  currentPayment: number | null;
  extraMonthly: number;
  lumpSum: number;
  /** What the spare money could earn instead, or the rate on a debt it could pay down, in percent. */
  altReturn: number;
  /** A prepayment penalty in dollars, charged when the loan is paid off early. */
  penalty: number;
};

export type Schedule = {
  months: number;
  totalInterest: number;
  /** Balance at the end of each month, starting with the opening balance. */
  balances: number[];
  /** The payment made in each month, 1-based: payments[m - 1] is month m's. */
  payments: number[];
};

/** Pay a balance down at a fixed monthly amount; the last payment is whatever is left. */
export function schedule(balance: number, apr: number, monthly: number, maxMonths = 1200): Schedule | null {
  const r = apr / 100 / 12;
  let bal = balance;
  let totalInterest = 0;
  const balances = [bal];
  const payments: number[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    if (bal <= 0.005) return { months: m - 1, totalInterest, balances, payments };
    const interest = bal * r;
    if (monthly <= interest + 1e-9) return null; // never pays off
    totalInterest += interest;
    const pay = Math.min(monthly, bal + interest);
    payments.push(pay);
    bal = bal + interest - pay;
    balances.push(bal);
  }
  return bal <= 0.005 ? { months: maxMonths, totalInterest, balances, payments } : null;
}

export function analyze(i: Inputs) {
  const months = i.months !== null
    ? Math.round(i.months)
    : Math.ceil(monthsFromPayment(i.balance, i.apr, i.currentPayment ?? 0) ?? NaN);
  if (!Number.isFinite(months) || months <= 0) return null;
  const monthly = i.months !== null ? payment(i.balance, i.apr, months) : (i.currentPayment ?? 0);

  const base = schedule(i.balance, i.apr, monthly);
  if (!base) return null;
  const lump = Math.min(Math.max(0, i.lumpSum), i.balance);
  const extra = Math.max(0, i.extraMonthly);
  const fast = schedule(i.balance - lump, i.apr, monthly + extra);
  if (!fast) return null;

  const paysOffEarly = fast.months < base.months;
  const penalty = paysOffEarly ? Math.max(0, i.penalty) : 0;
  const interestSaved = base.totalInterest - fast.totalInterest;

  /* Over the original term, both households have the same budget each month,
   * the payment plus the extra, and invest whatever their loan does not take.
   * The lump sum goes to the loan on one path and is invested on the other. */
  const a = i.altReturn / 100 / 12;
  const budget = monthly + extra;
  // Any lump sum beyond the balance is spare on the prepay path too; a lump sum
  // that clears the loan outright pays the penalty on day one.
  const lumpTotal = Math.max(0, i.lumpSum);
  let prepayPot = lumpTotal - lump - (fast.months === 0 ? penalty : 0);
  let investPot = lumpTotal;
  for (let m = 1; m <= base.months; m++) {
    prepayPot = prepayPot * (1 + a) + budget - (fast.payments[m - 1] ?? 0);
    investPot = investPot * (1 + a) + budget - (base.payments[m - 1] ?? 0);
    // The penalty is due with the payment that clears the loan early.
    if (m === fast.months && penalty > 0) prepayPot -= penalty;
  }

  return {
    months,
    monthly,
    baseInterest: base.totalInterest,
    fastMonths: fast.months,
    fastInterest: fast.totalInterest,
    monthsSooner: base.months - fast.months,
    interestSaved,
    penalty,
    netSaved: interestSaved - penalty,
    /** The monthly payment freed once the loan is gone, and for how many months before the original end. */
    freedMonthly: monthly,
    freedMonths: base.months - fast.months,
    /** Prepaying earns the loan's rate, guaranteed, on a simple-interest loan. */
    guaranteedReturn: i.apr,
    prepayPot,
    investPot,
    /** Positive when prepaying leaves more by the original end date. */
    prepayAdvantage: prepayPot - investPot,
    baseBalances: base.balances,
    fastBalances: fast.balances,
  };
}

/** Shared loan and investment math used across the calculators. */

/** Level monthly payment for a fully amortizing loan. */
export function payment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export type AmortResult = {
  /** Balance at the end of each month, starting with the opening balance. */
  balances: number[];
  totalInterest: number;
  totalPaid: number;
  /** Months until the balance reaches zero. */
  payoffMonths: number;
};

/** Amortize a loan, optionally with an extra principal payment each month. */
export function amortize(
  principal: number,
  annualRate: number,
  months: number,
  extra = 0,
  overridePayment?: number,
): AmortResult {
  const r = annualRate / 100 / 12;
  const pmt = overridePayment ?? payment(principal, annualRate, months);
  let bal = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  const balances = [bal];
  let payoffMonths = 0;

  if (pmt <= 0) return { balances, totalInterest: 0, totalPaid: 0, payoffMonths: 0 };

  // Cap the loop so a payment that never covers interest cannot run forever.
  const cap = Math.max(months, 1) * 4 + 1200;
  for (let i = 0; i < cap && bal > 0.005; i++) {
    const interest = bal * r;
    const target = pmt + extra;
    if (target <= interest && r > 0) {
      // Payment does not cover interest — the loan never amortizes.
      return { balances, totalInterest: Infinity, totalPaid: Infinity, payoffMonths: Infinity };
    }
    const principalPart = Math.min(target - interest, bal);
    bal = Math.max(0, bal - principalPart);
    totalInterest += interest;
    totalPaid += interest + principalPart;
    balances.push(bal);
    payoffMonths = i + 1;
  }
  return { balances, totalInterest, totalPaid, payoffMonths };
}

/**
 * Months needed to clear a balance at a fixed payment — the inverse of
 * payment(). Returns null when the payment does not cover the monthly interest,
 * because the loan then never amortizes.
 */
export function monthsFromPayment(
  balance: number,
  annualRate: number,
  pmt: number,
): number | null {
  if (balance <= 0 || pmt <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return balance / pmt;
  // A relative epsilon, because balance * r lands a hair under the round
  // interest-only figure in binary floating point (300000 * 7.5%/12 comes out
  // as 1874.9999999999998, so a literal $1,875 would slip past a bare <=).
  if (pmt <= balance * r * (1 + 1e-9)) return null;
  const months = -Math.log(1 - (r * balance) / pmt) / Math.log(1 + r);
  // A payment barely above interest-only amortizes only in theory. Past a
  // century it is not a loan term anyone should be shown.
  if (!Number.isFinite(months) || months > 1200) return null;
  return months;
}

/** Interest paid over the first `months` payments, at a fixed payment. */
export function interestOver(
  balance: number,
  annualRate: number,
  pmt: number,
  extra: number,
  months: number,
): number {
  const r = annualRate / 100 / 12;
  let bal = balance;
  let total = 0;
  for (let i = 0; i < months && bal > 0.005; i++) {
    const interest = bal * r;
    const principal = Math.min(pmt + extra - interest, bal);
    if (principal <= 0) return Infinity;
    total += interest;
    bal -= principal;
  }
  return total;
}

/** Remaining balance on a loan after a number of payments. */
export function balanceAfter(
  principal: number,
  annualRate: number,
  months: number,
  elapsed: number,
): number {
  const r = annualRate / 100 / 12;
  const pmt = payment(principal, annualRate, months);
  if (r === 0) return Math.max(0, principal - pmt * elapsed);
  const bal = principal * Math.pow(1 + r, elapsed) - pmt * ((Math.pow(1 + r, elapsed) - 1) / r);
  return Math.max(0, bal);
}

/**
 * Grow a balance period by period with contributions.
 * Returns the balance at the end of every period, starting with the opening balance.
 */
export function growthSeries({
  initial,
  contribution,
  annualRate,
  years,
  periodsPerYear = 12,
  contributionGrowth = 0,
  contributeAtStart = true,
}: {
  initial: number;
  contribution: number;
  annualRate: number;
  years: number;
  periodsPerYear?: number;
  /** Annual % increase applied to the contribution each year. */
  contributionGrowth?: number;
  contributeAtStart?: boolean;
}): { balances: number[]; contributed: number; growth: number } {
  const periods = Math.max(0, Math.round(years * periodsPerYear));
  const r = annualRate / 100 / periodsPerYear;
  let bal = initial;
  let contributed = initial;
  let c = contribution;
  const balances = [bal];

  for (let i = 0; i < periods; i++) {
    if (i > 0 && i % periodsPerYear === 0 && contributionGrowth) {
      c *= 1 + contributionGrowth / 100;
    }
    if (contributeAtStart) bal += c;
    bal *= 1 + r;
    if (!contributeAtStart) bal += c;
    contributed += c;
    balances.push(bal);
  }
  return { balances, contributed, growth: bal - contributed };
}

/** Compound a lump sum forward. */
export function futureValue(pv: number, annualRate: number, years: number, periodsPerYear = 12): number {
  const r = annualRate / 100 / periodsPerYear;
  return pv * Math.pow(1 + r, years * periodsPerYear);
}

/** Convert a nominal annual rate into the effective annual rate (APY). */
export function effectiveAnnualRate(nominal: number, periodsPerYear: number): number {
  if (periodsPerYear === Infinity) return (Math.exp(nominal / 100) - 1) * 100;
  return (Math.pow(1 + nominal / 100 / periodsPerYear, periodsPerYear) - 1) * 100;
}

/**
 * Internal rate of return for a series of cash flows, per period.
 * Uses bisection so it cannot diverge. Returns null when no sign change exists.
 */
export function irr(cashflows: number[], guessLow = -0.9999, guessHigh = 1): number | null {
  const npv = (rate: number) =>
    cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
  let lo = guessLow;
  let hi = guessHigh;
  let fLo = npv(lo);
  let fHi = npv(hi);
  let tries = 0;
  while (fLo * fHi > 0 && tries < 60) {
    hi *= 1.5;
    fHi = npv(hi);
    tries++;
  }
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (fMid === 0) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** APR implied by a loan amount net of fees, given the payment schedule. */
export function aprFromFees(
  loanAmount: number,
  annualRate: number,
  months: number,
  financedFees: number,
): number {
  const pmt = payment(loanAmount, annualRate, months);
  const net = loanAmount - financedFees;
  if (net <= 0 || pmt <= 0) return annualRate;
  const flows = [net, ...Array<number>(months).fill(-pmt)];
  const monthly = irr(flows);
  return monthly === null ? annualRate : monthly * 12 * 100;
}

/** Federal long-term capital gains bracket for a filing status (2025 thresholds). */
export function longTermRate(taxableIncome: number, status: "single" | "married" | "head"): number {
  const brackets = {
    single: [48350, 533400],
    married: [96700, 600050],
    head: [64750, 566700],
  }[status];
  if (taxableIncome <= brackets[0]) return 0;
  if (taxableIncome <= brackets[1]) return 15;
  return 20;
}

/** Marginal ordinary federal income tax rate (2025 brackets). */
export function ordinaryRate(taxableIncome: number, status: "single" | "married" | "head"): number {
  const table: Record<string, [number, number][]> = {
    single: [
      [11925, 10], [48475, 12], [103350, 22], [197300, 24],
      [250525, 32], [626350, 35], [Infinity, 37],
    ],
    married: [
      [23850, 10], [96950, 12], [206700, 22], [394600, 24],
      [501050, 32], [751600, 35], [Infinity, 37],
    ],
    head: [
      [17000, 10], [64850, 12], [103350, 22], [197300, 24],
      [250500, 32], [626350, 35], [Infinity, 37],
    ],
  };
  for (const [cap, rate] of table[status]) {
    if (taxableIncome <= cap) return rate;
  }
  return 37;
}

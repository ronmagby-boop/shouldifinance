/** Shared loan and investment math used across the calculators. */

/** Level monthly payment for a fully amortizing loan. */
export function payment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Annual PMI as a percent of the loan, by loan-to-value band AND credit score.
 *
 * REPRESENTATIVE, NOT A QUOTE, and that is not a hedge — there is no current
 * authoritative table to quote. Mortgage insurers have moved to per-loan
 * risk-based pricing: MGIC's own rates page now says its "risk-based pricing
 * model provides rates tailored to unique loan scenarios" and directs you to a
 * quoting engine instead of publishing a card. The published cards that remain
 * are archived. So this is calibrated against one rather than copied from a
 * live source, and every page using it says so.
 *
 * The figures are Enact's national monthly borrower-paid card for a fixed loan
 * over 20 years, at the coverage level Fannie and Freddie require for each
 * band — 35% at 97-95.01, 30% at 95-90.01, 25% at 90-85.01, 12% below.
 * Effective 4 June 2018, updated 27 January 2022.
 *
 * WHY BOTH AXES. This replaced two tables that disagreed: an LTV-banded one
 * here, used by three calculators, and a score-banded one inside
 * va-vs-conventional that used LTV only as an on/off gate at 80%. Checked
 * against the card, each turned out to be a single slice of it — the LTV table
 * was the 700-score column, the score table was roughly the 90-95% LTV row —
 * and each was badly wrong along the axis it ignored. A 660-score borrower at
 * 96% LTV pays 1.54% on the card; the LTV table said 1.03% and the score table
 * 1.15%. Neither was better than the other, so neither survived alone.
 *
 * Real premiums also move with coverage level, term, occupancy, number of
 * borrowers and DTI. Those are left out deliberately: they are adjustments to a
 * number that is already an approximation, and the calculators do not ask for
 * them.
 */
const PMI_CARD: { maxLtv: number; byScore: Record<number, number> }[] = [
  { maxLtv: 85, byScore: { 760: 0.19, 740: 0.20, 720: 0.23, 700: 0.25, 680: 0.28, 660: 0.38 } },
  { maxLtv: 90, byScore: { 760: 0.28, 740: 0.38, 720: 0.46, 700: 0.55, 680: 0.65, 660: 0.90 } },
  { maxLtv: 95, byScore: { 760: 0.38, 740: 0.53, 720: 0.66, 700: 0.78, 680: 0.96, 660: 1.28 } },
  { maxLtv: Infinity, byScore: { 760: 0.58, 740: 0.70, 720: 0.87, 700: 0.99, 680: 1.21, 660: 1.54 } },
];

/** Score tiers the card prices, highest first. Exported so a page can offer them. */
export const PMI_SCORE_TIERS = [760, 740, 720, 700, 680, 660] as const;

/**
 * The score assumed where a calculator does not ask for one.
 *
 * 700 rather than a flattering number, and chosen because it is what the old
 * LTV-only table was already pricing — so the three calculators that do not ask
 * for a score keep the figures they had, to within a few hundredths of a
 * percent, while gaining a stated assumption instead of a hidden one.
 */
export const PMI_DEFAULT_SCORE = 700;

export function pmiRate(ltv: number, score: number = PMI_DEFAULT_SCORE): number {
  if (ltv <= 80) return 0;
  const row = PMI_CARD.find((b) => ltv <= b.maxLtv) ?? PMI_CARD[PMI_CARD.length - 1];
  /* Snap to the nearest tier at or below the score, the way a rate card reads:
     a 735 borrower is priced in the 720-739 bucket, not interpolated. */
  const tier = PMI_SCORE_TIERS.find((t) => score >= t) ?? PMI_SCORE_TIERS[PMI_SCORE_TIERS.length - 1];
  return row.byScore[tier];
}

/** The previous name, kept so the three callers that assume a score read clearly. */
export const pmiRateForLtv = (ltv: number): number => pmiRate(ltv);

/**
 * PMI comes off automatically once the balance reaches this share of the
 * original purchase price — 78% under the Homeowners Protection Act, which is
 * why every page that amortizes stops charging it there.
 */
export const PMI_TERMINATION_LTV = 0.78;

/* ----------------------------------------------------------------------------
 * FHA mortgage insurance.
 *
 * Every figure below is read off a HUD primary source, named beside it. FHA
 * insurance is priced and timed by rules, not by market convention, so unlike
 * the PMI bands above these are not representative estimates — they are the
 * schedule, and a wrong digit here is a wrong answer rather than a rough one.
 * ------------------------------------------------------------------------- */

/**
 * The annual MIP schedule in force, and the date it took effect.
 *
 * Mortgagee Letter 2023-05 cut the rates and applies to case numbers endorsed
 * on or after this date. Nothing since has superseded it: HUD's mortgagee
 * letter index carries no later single-family MIP letter (checked through
 * ML 2026-10), and no 2026 FHA INFO message announces one. The February 2026
 * Drafting Table copy ("Multifamily Improvements for MAP Efficiency", 26
 * February 2026) is addressed to multifamily mortgagees and only restates the
 * September 2025 multifamily MIP notice; it does not touch these rates.
 */
export const FHA_MIP_AS_OF = "20 March 2023";
export const FHA_MIP_SOURCE = "HUD Mortgagee Letter 2023-05";

/**
 * Upfront MIP, charged once on the base loan amount and normally financed into
 * the loan. 175 basis points, from Handbook 4000.1 Appendix 1.0.
 */
export const FHA_UFMIP_RATE = 1.75;

/**
 * The base loan amount that splits the two annual MIP rate tables. Written as
 * the figure ML 2023-05 states rather than tracked against the conforming
 * limit, because the letter states a number and that number is the rule.
 *
 * The letter's summary does say it "amends the Base Loan amount threshold ...
 * to the national conforming loan limit", which reads as if the figure should
 * move every year. It has not: Handbook 4000.1 Appendix 1.0 in Update 18
 * (12 August 2026) still prints $726,200 in both tables. Check that appendix,
 * not this year's conforming limit, before changing it.
 *
 * Confirmed October 2026 against live lender pricing: base loans above
 * $726,200 price at the higher annual MIP. The threshold has not followed the
 * conforming loan limit.
 */
export const FHA_MIP_LOAN_THRESHOLD = 726_200;

/**
 * Minimum down payment, which is a credit rule rather than a pricing one:
 * 3.5% (96.5% LTV) needs a decision credit score of 580 or above, and 500-579
 * is capped at 90% LTV. Below 500 there is no FHA loan at all.
 *
 * Worth holding on to, because it interacts with the duration cliff below in a
 * way nobody expects: a borrower under 580 is forced to 10% down, which puts
 * them on the RIGHT side of the 90% line and gets them the 11-year MIP rather
 * than the full term.
 */
export const FHA_MIN_DOWN_PCT = 3.5;
export const FHA_LOW_SCORE_MIN_DOWN_PCT = 10;

/** The LTV at which the annual MIP duration changes from 11 years to the term. */
export const FHA_MIP_DURATION_CLIFF_LTV = 90;

/**
 * How long the annual MIP runs, either side of FHA_MIP_DURATION_CLIFF_LTV.
 *
 * Mortgagee Letter 2013-04, for case numbers assigned on or after 3 June 2013:
 * at or below 90% LTV "for the first 11 years of the mortgage term", above it
 * "for the first 30 years of the term", in each case or the end of the term if
 * that comes first. ML 2023-05 and Handbook 4000.1 Appendix 1.0 repeat both
 * durations in their rate tables.
 */
export const FHA_MIP_DURATION_MONTHS = {
  atOrBelowCliff: 132,
  aboveCliff: 360,
} as const;

/**
 * Terms of this many years or fewer use the short-term annual MIP table; longer
 * terms use the long-term one. ML 2023-05 headings: "Mortgage Term of More Than
 * 15 Years" and "... Less than or Equal to 15 Years".
 */
export const FHA_MIP_SHORT_TERM_MAX_YEARS = 15;

type MipBand = { maxLtv: number; bps: number };

/**
 * Annual MIP in basis points, from the ML 2023-05 tables, effective for case
 * numbers endorsed on or after 20 March 2023 (FHA_MIP_AS_OF) and carried
 * unchanged into Handbook 4000.1 Appendix 1.0 through Update 18.
 *
 * Each list is in ascending LTV and ends at Infinity, so the first band whose
 * maxLtv the loan does not exceed is the answer. The letter's own rows include
 * a "> 90.00% but <= 95.00%" band on long terms that prices the same as the band
 * below it; it is folded in here because the rate is all this table carries —
 * the duration split at 90% lives in FHA_MIP_DURATION_MONTHS.
 */
export const FHA_ANNUAL_MIP_BPS: Record<
  "longTerm" | "shortTerm",
  Record<"atOrBelowThreshold" | "aboveThreshold", readonly MipBand[]>
> = {
  longTerm: {
    atOrBelowThreshold: [{ maxLtv: 95, bps: 50 }, { maxLtv: Infinity, bps: 55 }],
    aboveThreshold: [{ maxLtv: 95, bps: 70 }, { maxLtv: Infinity, bps: 75 }],
  },
  shortTerm: {
    atOrBelowThreshold: [{ maxLtv: 90, bps: 15 }, { maxLtv: Infinity, bps: 40 }],
    aboveThreshold: [{ maxLtv: 78, bps: 15 }, { maxLtv: 90, bps: 40 }, { maxLtv: Infinity, bps: 65 }],
  },
};

/**
 * Annual MIP in basis points for one loan, read off FHA_ANNUAL_MIP_BPS.
 *
 * `ltv` is the base loan over the lesser of price or appraised value, EXCLUDING
 * any financed upfront MIP — ML 2013-04 says so explicitly, and it matters:
 * financing the UFMIP cannot push a borrower over the 90% cliff.
 *
 * The fallback to the last band only matters for an LTV that is not a number,
 * which compares false against every bound; the old if-chain landed there too.
 */
export function fhaAnnualMipBps(baseLoan: number, ltv: number, termYears: number): number {
  const table = termYears > FHA_MIP_SHORT_TERM_MAX_YEARS ? FHA_ANNUAL_MIP_BPS.longTerm : FHA_ANNUAL_MIP_BPS.shortTerm;
  const bands = baseLoan > FHA_MIP_LOAN_THRESHOLD ? table.aboveThreshold : table.atOrBelowThreshold;
  return (bands.find((b) => ltv <= b.maxLtv) ?? bands[bands.length - 1]).bps;
}

/**
 * How many months the annual MIP is charged for, from FHA_MIP_DURATION_MONTHS.
 *
 * There is no balance-based cancellation — the 78% automatic termination is a
 * conventional rule under the Homeowners Protection Act. FHA had its own 78%
 * cancellation until ML 2013-04 withdrew it for case numbers assigned on or
 * after 3 June 2013, so this models a loan taken out today, not one endorsed
 * before then.
 */
export function fhaMipDurationMonths(ltv: number, termMonths: number): number {
  return ltv <= FHA_MIP_DURATION_CLIFF_LTV
    ? Math.min(FHA_MIP_DURATION_MONTHS.atOrBelowCliff, termMonths)
    : Math.min(FHA_MIP_DURATION_MONTHS.aboveCliff, termMonths);
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

/**
 * The same calculation over a holding period shorter than the term: the
 * borrower makes `holdMonths` payments and then repays whatever is left as a
 * lump sum, on a sale or a refinance.
 *
 * The fees do not shrink with the hold, so spreading them over fewer payments
 * always reads higher than the full-term figure, and the two converge as the
 * hold approaches the term. A hold at or beyond the term is the full-term
 * case, and delegates to it rather than duplicating it.
 */
export function aprFromFeesHeld(
  loanAmount: number,
  annualRate: number,
  months: number,
  financedFees: number,
  holdMonths: number,
): number {
  const held = Math.min(Math.max(1, Math.round(holdMonths)), months);
  if (held >= months) return aprFromFees(loanAmount, annualRate, months, financedFees);

  const pmt = payment(loanAmount, annualRate, months);
  const net = loanAmount - financedFees;
  if (net <= 0 || pmt <= 0) return annualRate;

  const flows = [net, ...Array<number>(held).fill(-pmt)];
  // The balloon lands in the same month as the last scheduled payment.
  flows[held] -= balanceAfter(loanAmount, annualRate, months, held);
  const monthly = irr(flows);
  return monthly === null ? annualRate : monthly * 12 * 100;
}


/**
 * A starting-point monthly rent for a home at a given price, for the
 * calculators that have to charge a waiting household for somewhere to live.
 *
 * Rent on an owner-equivalent single-family home typically lands between 0.5%
 * and 0.7% of value a month; 0.55% is a mid-low figure to start from. Rounded
 * to $50 so it reads like a rent rather than a computation, and always meant to
 * be overridden by anyone who knows their own number.
 */
export function typicalMonthlyRent(price: number): number {
  if (price <= 0) return 0;
  return Math.round((price * 0.0055) / 50) * 50;
}

/**
 * HELOC or cash-out refinance: the math behind /calculators/heloc-vs-cash-out.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE COMPARISON. Both options raise the same cash. A cash-out refinance
 * replaces the existing mortgage with one new fixed-rate loan for the old
 * balance plus the cash (plus closing costs, if financed). A HELOC leaves the
 * existing mortgage exactly as it is and borrows the cash on a separate,
 * variable-rate line. So the deciding question is what happens to the
 * existing mortgage's rate: the refinance reprices all of it; the HELOC
 * reprices none of it.
 *
 * COST OVER THE HORIZON is interest plus fees: every dollar paid in the years
 * the reader expects to keep the loans, plus whatever is still owed at the
 * end, minus the money that was owed or raised at the start. Principal repaid
 * is not a cost, and a loan that has paid down less shows it in the balance
 * still owed, which is reported beside the cost rather than folded into it.
 * Financed closing costs count as a cost once, as fees, whether paid at
 * closing or rolled into the loan.
 *
 * ASSUMPTIONS, stated on the page as well:
 *   - the whole cash amount is drawn on day one, from both;
 *   - the HELOC rate is constant through the horizon, at the starting rate
 *     plus any Fed move, clamped to the cap and floor if set; a Fed move is
 *     treated as moving prime, and the HELOC with it, one-for-one, by the
 *     prime-rate convention (see PRIME in lib/rates.ts and the guide);
 *   - the cash-out rate is fixed at closing and does not move;
 *   - HELOC fees are paid once, up front; payments are made monthly.
 */
import { payment } from "./finance";
import { VA_FUNDING_FEE_PURCHASE } from "./va";

/* ----------------------------------------------------------------------------
 * Cash-out refinance limits.
 * ------------------------------------------------------------------------- */

/**
 * The most a cash-out refinance of a one-unit principal residence may borrow,
 * as the new loan over the home's value, by program. Each figure is quoted
 * from its source in CASH_OUT_LIMIT_SOURCES, which the page shows.
 *
 *   conventional  80: Fannie Mae Eligibility Matrix (incorporated into the
 *                 Selling Guide as of 5 August 2026), Desktop Underwriter
 *                 table, principal residence, cash-out refinance, one unit.
 *   fha           80: HUD Handbook 4000.1, Update 18 (issued 12 August 2026),
 *                 II.A.8.d.v, "The maximum LTV is 80 percent of the Adjusted
 *                 Value."
 *   va            100: 38 CFR 36.4306(a)(1), and (a)(2) puts the funding fee
 *                 inside that 100 percent: any part of it that would push the
 *                 loan over must be paid in cash at closing.
 *
 * Each program has further conditions (Fannie Mae: the mortgage being paid
 * off at least 12 months old; FHA: owned and occupied as the principal
 * residence for the prior 12 months, at least six payments made). The page
 * checks only the loan-to-value cap and says so.
 *
 * HELOCs have no equivalent here on purpose. A HELOC's combined loan-to-value
 * cap is the lender's own credit policy, not a program rule, so the page
 * shows the reader's combined LTV and says the cap varies by lender rather
 * than presenting one lender's number as a limit.
 */
export const CASH_OUT_MAX_LTV = {
  conventional: 80,
  fha: 80,
  va: 100,
} as const;

export type CashOutProgram = keyof typeof CASH_OUT_MAX_LTV;

export const CASH_OUT_LIMIT_SOURCES: Record<CashOutProgram, { label: string; source: string; url: string; quote: string }> = {
  conventional: {
    label: "Conventional (Fannie Mae)",
    source: "Fannie Mae Eligibility Matrix, Desktop Underwriter, principal residence (August 5, 2026)",
    url: "https://singlefamily.fanniemae.com/media/20786/display",
    quote: "Cash-Out Refinance 1 Unit FRM/ARM: 80%",
  },
  fha: {
    label: "FHA",
    source: "HUD Handbook 4000.1, II.A.8.d.v (Update 18, issued August 12, 2026)",
    url: "https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18.pdf",
    quote: "The maximum LTV is 80 percent of the Adjusted Value.",
  },
  va: {
    label: "VA",
    source: "38 CFR 36.4306(a)",
    url: "https://www.ecfr.gov/current/title-38/chapter-I/part-36/subpart-B/subject-group-ECFR3cf44b6fb6dc0c3/section-36.4306",
    quote:
      "The amount of the new loan must not exceed an amount equal to 100 percent of the reasonable value ... any portion of the funding fee that would cause the new loan amount to exceed 100 percent of the reasonable value of the property must be paid in cash at the loan closing.",
  },
};

/**
 * The VA funding fee on a cash-out refinance, percent of the loan: the 0-down
 * rows of 38 U.S.C. 3729(b)(2), (A) and (B), "any other initial [subsequent]
 * loan described in section 3710(a)". VA's own chart lists cash-out
 * refinancing at the same 2.15% first use and 3.3% after.
 */
export const VA_CASH_OUT_FUNDING_FEE = (() => {
  const zeroDown = VA_FUNDING_FEE_PURCHASE[VA_FUNDING_FEE_PURCHASE.length - 1];
  return { firstUse: zeroDown.firstUse, subsequentUse: zeroDown.subsequentUse };
})();

/* ----------------------------------------------------------------------------
 * Inputs.
 * ------------------------------------------------------------------------- */

export type HelocPlan = { kind: "interest-only" } | { kind: "paydown"; years: number };

export type Inputs = {
  mortgageBalance: number;
  /** Annual percent, e.g. 3.25. */
  mortgageRate: number;
  mortgageYearsLeft: number;
  homeValue: number;
  cashNeeded: number;
  cashOutRate: number;
  cashOutTermYears: number;
  closingCosts: number;
  financeClosingCosts: boolean;
  helocRate: number;
  drawYears: number;
  repayYears: number;
  helocFees: number;
  plan: HelocPlan;
  /** Lifetime cap and floor on the HELOC rate, or null when not set. */
  rateCap: number | null;
  rateFloor: number | null;
  horizonYears: number;
};

/** The Fed moves the page tabulates, in percentage points. */
export const FED_MOVES = [-0.5, -0.25, 0, 0.25, 0.5, 0.75, 1] as const;
/** The custom slider's range and step, in percentage points. */
export const FED_MOVE_MIN = -2;
export const FED_MOVE_MAX = 3;
export const FED_MOVE_STEP = 0.25;

/* ----------------------------------------------------------------------------
 * Building blocks.
 * ------------------------------------------------------------------------- */

/** Balances under half a cent are paid off. */
const PAID = 0.005;

/**
 * The HELOC rate after a Fed move, clamped to the lifetime cap and floor.
 * `clamped` says which limit applied, so the page can say so.
 */
export function helocRateAfter(start: number, move: number, cap: number | null, floor: number | null) {
  const raw = start + move;
  if (cap !== null && raw > cap) return { rate: cap, raw, clamped: "cap" as const };
  if (floor !== null && raw < floor) return { rate: floor, raw, clamped: "floor" as const };
  // A rate cannot go below zero even without a floor.
  if (raw < 0) return { rate: 0, raw, clamped: "zero" as const };
  return { rate: raw, raw, clamped: null };
}

/**
 * A level-payment loan run month by month to the horizon: interest paid,
 * principal paid and balance left after `horizonMonths`. Stops when it is
 * paid off.
 */
function runFixed(principal: number, rate: number, termMonths: number, horizonMonths: number) {
  const pmt = payment(principal, rate, termMonths);
  const r = rate / 100 / 12;
  let bal = principal;
  let interest = 0;
  for (let m = 1; m <= Math.min(horizonMonths, termMonths) && bal > PAID; m++) {
    const int = bal * r;
    const principalPart = Math.min(pmt - int, bal);
    interest += int;
    bal -= principalPart;
  }
  return { payment: pmt, interest, balance: Math.max(0, bal) };
}

/* ----------------------------------------------------------------------------
 * The two options.
 * ------------------------------------------------------------------------- */

export function cashOutOption(i: Inputs) {
  const termMonths = Math.round(i.cashOutTermYears * 12);
  const horizonMonths = Math.round(i.horizonYears * 12);
  const loanAmount = i.mortgageBalance + i.cashNeeded + (i.financeClosingCosts ? i.closingCosts : 0);
  const run = runFixed(loanAmount, i.cashOutRate, termMonths, horizonMonths);
  return {
    loanAmount,
    payment: run.payment,
    /** Paid at closing, out of pocket, when not financed. */
    upfront: i.financeClosingCosts ? 0 : i.closingCosts,
    interest: run.interest,
    fees: i.closingCosts,
    cost: run.interest + i.closingCosts,
    balance: run.balance,
    termMonths,
  };
}

/**
 * The existing mortgage, kept as it is, plus a HELOC at `rate` for the whole
 * horizon.
 */
export function helocOption(i: Inputs, rate: number) {
  const horizonMonths = Math.round(i.horizonYears * 12);
  const mortgageMonths = Math.round(i.mortgageYearsLeft * 12);
  const drawMonths = Math.round(i.drawYears * 12);
  const repayMonths = Math.round(i.repayYears * 12);
  const mortgage = runFixed(i.mortgageBalance, i.mortgageRate, mortgageMonths, horizonMonths);

  const r = rate / 100 / 12;
  const paydownMonths = i.plan.kind === "paydown" ? Math.round(i.plan.years * 12) : 0;
  /** The payment during the draw: interest only, or the level payment that clears it over the chosen years. */
  const drawPaymentPlanned = i.plan.kind === "interest-only"
    ? i.cashNeeded * r
    : payment(i.cashNeeded, rate, paydownMonths);

  let bal = i.cashNeeded;
  let interest = 0;
  let balanceAtDrawEnd = i.cashNeeded;
  let repayPayment = 0;
  let clearedMonth = 0;
  const lastMonth = drawMonths + repayMonths;
  for (let m = 1; m <= lastMonth && bal > PAID; m++) {
    if (m === drawMonths + 1) {
      balanceAtDrawEnd = bal;
      // Whatever is left when the draw ends amortizes over the repayment period.
      repayPayment = payment(bal, rate, repayMonths);
    }
    const int = bal * r;
    const pmt = m <= drawMonths
      ? (i.plan.kind === "interest-only" ? int : drawPaymentPlanned)
      : repayPayment;
    const principalPart = Math.min(pmt - int, bal);
    if (m <= horizonMonths) interest += int;
    bal -= principalPart;
    if (bal <= PAID) clearedMonth = m;
  }
  if (drawMonths === 0) balanceAtDrawEnd = i.cashNeeded;
  if (clearedMonth && clearedMonth <= drawMonths) balanceAtDrawEnd = 0;

  // Balance at the horizon, re-run to the horizon only (the loop above runs
  // the line to the end of its term so the repayment payment is known).
  const helocBalanceAtHorizon = helocBalanceAt(i, rate, horizonMonths);

  const mortgageRunning = (month: number) => month <= mortgageMonths;
  const helocPaymentAt = (month: number) => {
    if (clearedMonth && month > clearedMonth) return 0;
    if (month <= drawMonths) return i.plan.kind === "interest-only" ? i.cashNeeded * r : drawPaymentPlanned;
    return month <= lastMonth ? repayPayment : 0;
  };
  const afterDraw = drawMonths + 1;
  return {
    rate,
    mortgagePayment: mortgage.payment,
    helocPaymentYear1: helocPaymentAt(1),
    helocPaymentAfterDraw: helocPaymentAt(afterDraw),
    /** Mortgage plus HELOC, in month 1 and in the first month after the draw. */
    totalPaymentYear1: (mortgageRunning(1) ? mortgage.payment : 0) + helocPaymentAt(1),
    totalPaymentAfterDraw: (mortgageRunning(afterDraw) ? mortgage.payment : 0) + helocPaymentAt(afterDraw),
    balanceAtDrawEnd,
    clearedMonth,
    mortgageInterest: mortgage.interest,
    helocInterest: interest,
    fees: i.helocFees,
    cost: mortgage.interest + interest + i.helocFees,
    mortgageBalance: mortgage.balance,
    helocBalance: helocBalanceAtHorizon,
    balance: mortgage.balance + helocBalanceAtHorizon,
  };
}

/** The HELOC balance after `months`, by the same rules as helocOption. */
function helocBalanceAt(i: Inputs, rate: number, months: number) {
  const drawMonths = Math.round(i.drawYears * 12);
  const repayMonths = Math.round(i.repayYears * 12);
  const r = rate / 100 / 12;
  const drawPayment = i.plan.kind === "interest-only" ? null : payment(i.cashNeeded, rate, Math.round(i.plan.years * 12));
  let bal = i.cashNeeded;
  let repayPayment = 0;
  for (let m = 1; m <= Math.min(months, drawMonths + repayMonths) && bal > PAID; m++) {
    if (m === drawMonths + 1) repayPayment = payment(bal, rate, repayMonths);
    const int = bal * r;
    const pmt = m <= drawMonths ? (drawPayment ?? int) : repayPayment;
    bal -= Math.min(pmt - int, bal);
  }
  return Math.max(0, bal);
}

/* ----------------------------------------------------------------------------
 * The comparison.
 * ------------------------------------------------------------------------- */

/** Balance-weighted rate of the existing mortgage and the HELOC together. */
export function blendedRate(i: Inputs, helocRate: number) {
  const total = i.mortgageBalance + i.cashNeeded;
  return total > 0 ? (i.mortgageBalance * i.mortgageRate + i.cashNeeded * helocRate) / total : 0;
}

/** Both options after a Fed move, and which costs less over the horizon. */
export function compare(i: Inputs, move = 0) {
  const rate = helocRateAfter(i.helocRate, move, i.rateCap, i.rateFloor);
  const cashOut = cashOutOption(i);
  const heloc = helocOption(i, rate.rate);
  const difference = heloc.cost - cashOut.cost; // negative: the HELOC costs less
  return {
    move,
    rate,
    cashOut,
    heloc,
    difference,
    cheaper: Math.abs(difference) < 0.5 ? ("neither" as const) : difference < 0 ? ("heloc" as const) : ("cash-out" as const),
    blended: blendedRate(i, rate.rate),
  };
}

/**
 * The HELOC rate, held for the whole horizon, at which the two options cost
 * the same over the horizon. Below it the HELOC costs less; above it the
 * cash-out does. Ignores the cap and floor: it is the rate itself, not a
 * scenario. Null with a reason when no rate in [0, 40] crosses over.
 */
export function breakEvenHelocRate(i: Inputs): { rate: number | null; reason: "found" | "cash-out-always" | "heloc-always" } {
  const target = cashOutOption(i).cost;
  const cost = (rate: number) => helocOption(i, rate).cost;
  let lo = 0;
  let hi = 40;
  if (cost(lo) >= target) return { rate: null, reason: "cash-out-always" };
  if (cost(hi) <= target) return { rate: null, reason: "heloc-always" };
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (cost(mid) < target) lo = mid;
    else hi = mid;
  }
  return { rate: (lo + hi) / 2, reason: "found" };
}

/**
 * Each program's cash-out limit against this refinance, and the most cash it
 * would allow. For VA the funding fee is part of the loan the 100% limit is
 * measured on (38 CFR 36.4306(a)(2)): the loan is the base amount times
 * (1 + fee), at `vaFeePct` (first use unless given; 0 for an exempt veteran).
 */
export function borrowingLimits(i: Inputs, vaFeePct: number = VA_CASH_OUT_FUNDING_FEE.firstUse) {
  const base = cashOutOption(i).loanAmount;
  const financed = i.financeClosingCosts ? i.closingCosts : 0;
  return (Object.keys(CASH_OUT_MAX_LTV) as CashOutProgram[]).map((program) => {
    const maxLtv = CASH_OUT_MAX_LTV[program];
    const feeFactor = program === "va" ? 1 + vaFeePct / 100 : 1;
    const loan = base * feeFactor;
    const ltv = i.homeValue > 0 ? (loan / i.homeValue) * 100 : Infinity;
    const maxBase = (i.homeValue * maxLtv) / 100 / feeFactor;
    return {
      program,
      maxLtv,
      loan,
      ltv,
      within: ltv <= maxLtv + 1e-9,
      maxCash: Math.max(0, maxBase - i.mortgageBalance - financed),
      vaFeePct: program === "va" ? vaFeePct : null,
      ...CASH_OUT_LIMIT_SOURCES[program],
    };
  });
}

/** Combined loan-to-value with the HELOC: the existing mortgage plus the line, over the home's value. */
export function helocCltv(i: Inputs) {
  return i.homeValue > 0 ? ((i.mortgageBalance + i.cashNeeded) / i.homeValue) * 100 : Infinity;
}

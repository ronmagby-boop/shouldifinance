/**
 * Fixed home equity loan or HELOC: the math behind
 * /calculators/home-equity-loan-vs-heloc.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE TWO OPTIONS borrow the same amount against the same home.
 *   home equity loan  the whole amount at closing, at a fixed rate, repaid in
 *                     level monthly payments over its term; interest runs on
 *                     all of it from the first month.
 *   HELOC             drawn as needed: all at once, or the same amount each
 *                     month over the first N months. Interest runs only on what
 *                     has been drawn. During the draw period the reader pays
 *                     interest only, or pays it down over a chosen number of
 *                     years; whatever is left at the end of the draw period is
 *                     repaid in level payments over the repayment period.
 *
 * COST OVER THE HORIZON is interest plus fees paid in the years compared;
 * principal repaid is not a cost, and what is still owed is reported beside it
 * rather than folded in, as in lib/helocCashOut.ts.
 *
 * ASSUMPTIONS, stated on the page as well:
 *   - a draw is taken at the start of its month and earns interest that month;
 *   - the HELOC rate is the starting rate plus any Fed move, held for the
 *     whole horizon and clamped to the cap and floor (helocRateAfter, the
 *     prime-rate convention in lib/helocCashOut.ts and lib/rates.ts);
 *   - a home equity loan drawn all at once when the money is needed over time
 *     leaves cash sitting idle; any interest it earns is not counted;
 *   - fees and closing costs are paid once, up front.
 */
import { payment } from "./finance";
import { helocRateAfter } from "./helocCashOut";

export { FED_MOVES, FED_MOVE_MAX, FED_MOVE_MIN, FED_MOVE_STEP, helocRateAfter } from "./helocCashOut";

/** HELOC term defaults, the same as the other HELOC calculators: assumptions the reader replaces with the agreement's terms. */
export const DEFAULT_DRAW_YEARS = 10;
export const DEFAULT_REPAY_YEARS = 20;

export type PaybackPlan = { kind: "interest-only" } | { kind: "paydown"; years: number };

export type Inputs = {
  amount: number;
  /** 0: drawn all at once. N: the same amount drawn at the start of each of the first N months. */
  drawSpreadMonths: number;
  /** Home equity loan: annual fixed rate in percent, term in years, closing costs. */
  loanRate: number;
  loanTermYears: number;
  loanClosingCosts: number;
  /** HELOC: starting annual rate in percent, draw and repayment periods in years, fees. */
  helocRate: number;
  drawYears: number;
  repayYears: number;
  helocFees: number;
  plan: PaybackPlan;
  rateCap: number | null;
  rateFloor: number | null;
  horizonYears: number;
};

/** Balances under half a cent are paid off. */
const PAID = 0.005;

const months = (years: number) => Math.round(years * 12);

/** The fixed loan's payment, interest and balance over the horizon, and its payment in any month. */
export function homeEquityLoan(i: Inputs) {
  const term = months(i.loanTermYears);
  const horizon = months(i.horizonYears);
  const pmt = payment(i.amount, i.loanRate, term);
  const r = i.loanRate / 100 / 12;
  let bal = i.amount;
  let interest = 0;
  for (let m = 1; m <= Math.min(horizon, term) && bal > PAID; m++) {
    const int = bal * r;
    interest += int;
    bal -= Math.min(pmt - int, bal);
  }
  return {
    payment: pmt,
    paymentInMonth: (m: number) => (m <= term ? pmt : 0),
    interest,
    fees: i.loanClosingCosts,
    cost: interest + i.loanClosingCosts,
    balance: Math.max(0, bal),
    termMonths: term,
  };
}

/**
 * The HELOC at `rate` for the whole horizon, run month by month to the end
 * of its term so every payment is known. Interest is charged on the balance
 * after the month's draw.
 */
export function heloc(i: Inputs, rate: number) {
  const drawMonths = months(i.drawYears);
  const repayMonths = months(i.repayYears);
  const last = drawMonths + repayMonths;
  const spread = Math.max(0, Math.min(Math.round(i.drawSpreadMonths), drawMonths));
  const perDraw = spread > 0 ? i.amount / spread : i.amount;
  const horizon = months(i.horizonYears);
  const paydownMonths = i.plan.kind === "paydown" ? months(i.plan.years) : 0;
  const r = rate / 100 / 12;

  let bal = 0;
  let drawn = 0;
  let interest = 0;
  let repayPayment = 0;
  const payments: number[] = [];
  let balanceAtHorizon = 0;
  for (let m = 1; m <= last; m++) {
    if (spread === 0 ? m === 1 : m <= spread) {
      bal += perDraw;
      drawn += perDraw;
    }
    const int = bal * r;
    let pmt: number;
    if (m <= drawMonths) {
      // Interest only, or the level payment that clears today's balance by the end of the pay-down plan.
      pmt = i.plan.kind === "interest-only" || paydownMonths <= 0
        ? int
        : Math.max(int, payment(bal, rate, Math.max(1, paydownMonths - m + 1)));
    } else {
      if (m === drawMonths + 1) repayPayment = payment(bal, rate, repayMonths);
      pmt = repayPayment;
    }
    pmt = Math.min(pmt, bal + int);
    if (m <= horizon) interest += int;
    bal = Math.max(0, bal + int - pmt);
    if (bal <= PAID) bal = 0;
    payments.push(pmt);
    if (m === horizon) balanceAtHorizon = bal;
  }
  if (horizon > last) balanceAtHorizon = 0;
  return {
    rate,
    paymentInMonth: (m: number) => (m >= 1 && m <= payments.length ? payments[m - 1] : 0),
    drawMonths,
    drawn,
    interest,
    fees: i.helocFees,
    cost: interest + i.helocFees,
    balance: balanceAtHorizon,
  };
}

/** Both options after a Fed move, and which costs less over the horizon. */
export function compare(i: Inputs, move = 0) {
  const rate = helocRateAfter(i.helocRate, move, i.rateCap, i.rateFloor);
  const loan = homeEquityLoan(i);
  const line = heloc(i, rate.rate);
  const difference = line.cost - loan.cost; // positive: the HELOC costs more
  return {
    move,
    rate,
    loan,
    heloc: line,
    difference,
    cheaper: Math.abs(difference) < 0.5 ? ("neither" as const) : difference < 0 ? ("heloc" as const) : ("loan" as const),
  };
}

/**
 * The Fed move, held for the whole horizon, at which the two cost the same,
 * cap and floor applied. Positive: rates would have to rise this far for the
 * fixed loan to cost less. Negative: the fixed loan already costs less, and
 * rates would have to fall this far for the HELOC to catch up. Searched from
 * −10 to +20 points; null with a reason when no move in that range crosses
 * over, which a cap or floor can cause.
 */
export function breakEvenMove(i: Inputs): { move: number | null; reason: "found" | "heloc-always" | "loan-always" } {
  const diff = (m: number) => compare(i, m).difference;
  let lo = -10;
  let hi = 20;
  if (diff(lo) >= 0) return { move: null, reason: "loan-always" };
  if (diff(hi) <= 0) return { move: null, reason: "heloc-always" };
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { move: (lo + hi) / 2, reason: "found" };
}

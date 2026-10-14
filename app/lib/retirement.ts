/**
 * Retirement savings projection and Social Security timing: the math behind
 * /calculators/retirement-savings.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE PROJECTION. Savings grow monthly to the retirement date, then fund the
 * income the reader wants, in today's dollars inflated each year. Until the
 * Social Security claiming age, savings fund ALL of it; from the claiming age
 * on, Social Security covers its share and savings fund the rest. The years
 * between retiring and claiming are the bridge.
 *
 * Social Security is entered in today's dollars and inflated with the income
 * target, because benefits carry a cost-of-living adjustment (42 U.S.C.
 * 415(i)), so both sides rise together.
 */
import { growthSeries } from "./finance";
import {
  SS_EARLIEST_CLAIM_AGE, SS_LATEST_CREDIT_AGE, benefitAt, clampClaimAgeMonths, fullRetirementAgeMonths,
} from "./socialSecurity";

/* The claiming-age rules (full retirement age, early reduction, delayed
 * credits) live in lib/socialSecurity.ts, shared with the claiming-age page. */

/** The default claiming age: full retirement age, or the retirement age if later; never past 70. */
export function defaultClaimAge(birthYear: number, retireAge: number): number {
  return Math.min(SS_LATEST_CREDIT_AGE, Math.max(fullRetirementAgeMonths(birthYear) / 12, retireAge, SS_EARLIEST_CLAIM_AGE));
}

export type SocialSecurity =
  /** The benefit at full retirement age from the SSA statement, adjusted for the claiming age. */
  | { mode: "fra"; benefitAtFra: number; birthYear: number; claimAge: number }
  /** A benefit already estimated for the claiming age: taken as entered. */
  | { mode: "asEntered"; benefit: number; claimAge: number };

/** The monthly benefit at the claiming age, in today's dollars. */
export function adjustedBenefit(ss: SocialSecurity): number {
  if (ss.mode === "asEntered") return Math.max(0, ss.benefit);
  return benefitAt(ss.benefitAtFra, ss.birthYear, ss.claimAge);
}

/** The claiming age the projection uses: 62-70 in whole months. */
export const claimAgeUsed = (ss: SocialSecurity) => clampClaimAgeMonths(ss.claimAge) / 12;

/* ----------------------------------------------------------------------------
 * The projection.
 * ------------------------------------------------------------------------- */

export type Inputs = {
  age: number;
  retireAge: number;
  planThroughAge: number;
  savings: number;
  /** Monthly contribution, the reader's plus any employer match. */
  contribution: number;
  preReturn: number;
  postReturn: number;
  /** Monthly income wanted in retirement, today's dollars. */
  income: number;
  inflation: number;
  ss: SocialSecurity;
};

export function project(i: Inputs) {
  const yearsToRetire = i.retireAge - i.age;
  const retirementYears = i.planThroughAge - i.retireAge;
  const months = Math.round(retirementYears * 12);

  const accum = growthSeries({
    initial: i.savings,
    contribution: i.contribution,
    annualRate: i.preReturn,
    years: yearsToRetire,
    periodsPerYear: 12,
  });
  const nestEgg = accum.balances[accum.balances.length - 1];

  const infl = i.inflation / 100;
  const postR = i.postReturn / 100 / 12;
  const benefit = adjustedBenefit(i.ss);
  const claimAge = claimAgeUsed(i.ss);
  /** Retirement months before the first benefit: the bridge. Zero if claiming at or before retiring. */
  const bridgeMonths = Math.min(months, Math.max(0, Math.round((claimAge - i.retireAge) * 12)));

  /**
   * Savings' share of the income in month m of retirement, in today's
   * dollars: all of it in the bridge, the income less the benefit after.
   * Inflated by the years since today, stepping once a year from retirement.
   */
  const inflator = (m: number) => Math.pow(1 + infl, yearsToRetire + Math.floor(m / 12));
  const drawToday = (m: number) => Math.max(0, i.income - (m < bridgeMonths ? 0 : benefit));
  const draw = (m: number) => drawToday(m) * inflator(m);

  let bal = nestEgg;
  const drawdown = [bal];
  let monthsLasted = 0;
  let ranOut = false;
  for (let m = 0; m < months; m++) {
    bal = bal * (1 + postR) - draw(m);
    if (bal <= 0) {
      bal = 0;
      if (!ranOut) {
        ranOut = true;
        monthsLasted = m + 1;
      }
    }
    drawdown.push(bal);
  }
  if (!ranOut) monthsLasted = months;

  /* Nest egg needed: the present value at retirement of the same schedule,
   * discounted at the same monthly return the drawdown earns. */
  const pv = (f: (m: number) => number) => {
    let total = 0;
    if (1 + postR <= 0) return total;
    for (let m = 0; m < months; m++) total += f(m) / Math.pow(1 + postR, m + 1);
    return total;
  };
  const needed = pv(draw);
  /* What the bridge costs: the benefit savings stand in for until the claim,
   * as a present value at retirement. Zero without a bridge. */
  const bridgeCost = pv((m) => (m < bridgeMonths ? Math.min(benefit, i.income) * inflator(m) : 0));

  return {
    yearsToRetire,
    retirementYears,
    nestEgg,
    contributed: accum.contributed,
    growth: accum.growth,
    accumBalances: accum.balances,
    combined: [...accum.balances, ...drawdown.slice(1)],
    benefit,
    claimAge,
    bridgeMonths,
    /** The first month's draw, at retirement, in that day's dollars. */
    firstDraw: months > 0 ? draw(0) : 0,
    /** The draw once Social Security starts, in today's dollars. */
    drawAfterClaimToday: Math.max(0, i.income - benefit),
    /** The extra drawn from savings in the bridge, in today's dollars a month and in total. */
    bridgeExtraToday: bridgeMonths > 0 ? Math.min(benefit, i.income) : 0,
    bridgeExtraTotalToday: Math.min(benefit, i.income) * bridgeMonths,
    bridgeCost,
    needed,
    gap: nestEgg - needed,
    monthsLasted,
    ranOut,
    ageRanOut: i.retireAge + monthsLasted / 12,
    endingBalance: drawdown[drawdown.length - 1],
    stillGrowing: !ranOut && drawdown[drawdown.length - 1] > nestEgg,
    firstMonthReturn: nestEgg * postR,
    /** 4% of the nest egg a year, monthly, and in today's dollars. */
    safeWithdrawalMonthly: (nestEgg * 0.04) / 12,
    safeToday: (nestEgg * 0.04) / 12 / Math.pow(1 + infl, yearsToRetire),
  };
}

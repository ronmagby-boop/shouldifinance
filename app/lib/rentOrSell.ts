/**
 * Rent out the house or sell it: the math behind /calculators/rent-or-sell.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE COMPARISON. Two positions at the horizon, in dollars then:
 *   sell now   the net proceeds today (price less selling costs, repairs, the
 *              mortgage payoff and any tax on the gain), grown at the
 *              alternative return for the horizon;
 *   rent       the equity after selling at the horizon (the grown price less
 *              selling costs, repairs, the mortgage balance then and the tax
 *              on that sale), plus every month's rental cash flow, each grown
 *              at the same alternative return from the month it happened. A
 *              negative month is money put in, and costs the return it would
 *              have earned.
 * Where the reader lives in the meantime costs the same either way, so it is
 * left out of both.
 *
 * TAX, modelled: the section 121 exclusion on each sale, the gain beyond it at
 * long-term capital gains rates, and depreciation recapture on the later sale
 * (taxed at ordinary rates but no more than UNRECAPTURED_1250_MAX_RATE). NOT
 * modelled, and the page says so: income tax on the rent, the depreciation
 * deduction against it, the passive activity loss rules, the 3.8% net
 * investment income tax, state tax, and tax on the alternative investment's
 * growth.
 *
 * ASSUMPTIONS, stated on the page as well:
 *   - "now" is when the rental starts and the horizon is counted from;
 *   - the reader owned the home at least as long as they lived in it, lived in
 *     it in one stretch ending on the move-out date, and did not rent it out
 *     before living in it (so section 121(b)(5) nonqualified use does not
 *     arise: time after the last use as a main home is excepted from it);
 *   - rent, expenses and the home's value move once a year, at the growth
 *     rates given; the vacancy share is lost evenly through the year;
 *   - the military suspension covers the duty years given, starting at
 *     move-out, up to the statutory 10.
 */
import { payment } from "./finance";
import {
  RESIDENTIAL_RENTAL_RECOVERY_YEARS,
  SECTION_121_EXCLUSION,
  SECTION_121_MILITARY_SUSPENSION_MAX_YEARS,
  SECTION_121_TEST_YEARS,
  SECTION_121_USE_DAYS,
  UNRECAPTURED_1250_MAX_RATE,
  taxOnCapitalGain,
  taxOnExtraIncome,
  type FilingStatus,
} from "./tax";
import {
  VA_BASIC_ENTITLEMENT,
  VA_BONUS_ENTITLEMENT_THRESHOLD,
  VA_GUARANTY_PCT,
  VA_GUARANTY_TIERS,
  VA_LENDER_COVERAGE_PCT,
} from "./va";

/* ----------------------------------------------------------------------------
 * Assumptions. NOT SOURCED: starting values the reader is expected to change,
 * and the page labels every one as an editable assumption. Each is a round,
 * middle-of-the-road figure rather than a measured one.
 * ------------------------------------------------------------------------- */

export const ASSUMPTION_DEFAULTS = {
  /** Commission, transfer taxes and closing costs together, percent of price. */
  sellingCostPct: 7,
  /** Share of the year's rent lost between tenants. 5% is about 18 days. */
  vacancyPct: 5,
  /** Property management fee, percent of rent collected. */
  managementPct: 10,
  /** Routine maintenance a year, percent of the home's value. */
  maintenancePct: 1,
  /** Reserve for big replacements (roof, HVAC, appliances), percent of rent. */
  capexPct: 5,
  /** Cleaning, repainting and leasing a year, averaged across tenant changes. */
  turnoverPerYear: 1_000,
  appreciationPct: 3,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  /** What the sale proceeds would earn instead, a year. */
  investReturnPct: 5,
  /** The land's share of the home's value, which cannot be depreciated. */
  landPct: 20,
  horizonYears: 3,
} as const;

/* ----------------------------------------------------------------------------
 * Dates. ISO "YYYY-MM-DD", read as UTC midnight.
 * ------------------------------------------------------------------------- */

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Adds whole months, holding the day but clamping to the month's last day (Aug 31 + 6 months is Feb 28). */
export function addMonths(iso: string, months: number): string {
  const d = toDate(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay))));
}
export const addDays = (iso: string, days: number) => isoDate(new Date(toDate(iso).getTime() + days * DAY));
export const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY);

/* ----------------------------------------------------------------------------
 * Section 121: the last day to sell and keep the exclusion.
 * ------------------------------------------------------------------------- */

/**
 * The last sale date that still meets the 2-of-5-year use test, for someone
 * who lived in the home `yearsLived` years up to `moveOut` (the first day it
 * was no longer their home). Null when they lived there under two years,
 * which no sale date can fix.
 *
 * The test period is the 5 years ending on the sale date, counted as
 * Publication 523 counts it: its military example's test period for a sale
 * on August 1 begins on August 2. The days lived in it must reach
 * SECTION_121_USE_DAYS. Days from the start of that period up to the
 * move-out date reach it while
 *   moveOut − (sale − 5 years + 1 day) ≥ 730,
 * so the last sale date is moveOut + 5 years − 731 days: about three years
 * after moving out, which is where the "three-year window" comes from.
 *
 * With the military suspension (121(d)(9)), the 5-year period does not run
 * while the reader or their spouse is on qualified official extended duty,
 * up to SECTION_121_MILITARY_SUSPENSION_MAX_YEARS, so the date moves later
 * by the months of duty after moving out, capped at 120.
 */
export function sellByDate(moveOut: string, yearsLived: number, dutyMonths = 0): string | null {
  if (yearsLived * 365.25 < SECTION_121_USE_DAYS) return null;
  const suspension = Math.min(Math.max(0, Math.round(dutyMonths)), SECTION_121_MILITARY_SUSPENSION_MAX_YEARS * 12);
  return addDays(addMonths(moveOut, suspension + SECTION_121_TEST_YEARS * 12), -(SECTION_121_USE_DAYS + 1));
}

export type Exclusion = {
  kind: "full" | "partial" | "none";
  /** The most gain excludable on this sale. */
  limit: number;
  /** For a partial exclusion, the share of 24 months lived; 1 for full, 0 for none. */
  fraction: number;
  /** For a partial exclusion, the months of residence counted. */
  residenceMonths: number | null;
};

/**
 * The section 121 exclusion a sale on `saleDate` gets.
 *
 * FULL when the 2-of-5-year test is met (sellByDate).
 *
 * PARTIAL when the reader lived there under 2 years and moved for a new job.
 * Publication 523: "You can meet the requirements for a partial exclusion if
 * the main reason for your home sale was a change in workplace location",
 * and the work-related safe harbor is a new job "in a work location at least
 * 50 miles farther from the home than your old work location". Its Worksheet
 * 1, section B: take the shortest of the residence in the 5-year period
 * before the sale, the ownership, and the time since a prior excluded sale,
 * "divide that number by 730 (if using days) or 24 (if using months)", and
 * "Multiply the result ... by $250,000"; on a joint return, "Repeat Steps 1–3
 * for your spouse and add the two results". This counts months, assumes
 * ownership at least as long as residence and no excluded sale in the prior
 * two years, and on a joint return assumes both spouses lived there the same
 * time, so the sum is the fraction of $500,000. Residence is counted only
 * inside the 5-year period before the sale, which the military suspension
 * extends, so a sale long after moving out gets less or nothing.
 *
 * Applies only under 2 years lived, as asked; someone who lived there 2
 * years but sells after the window closes is shown no exclusion.
 */
export function exclusionFor(i: Inputs, saleDate: string): Exclusion {
  const sellBy = sellByDate(i.moveOut, i.yearsLived, i.dutyMonths);
  if (sellBy !== null && saleDate <= sellBy) {
    return { kind: "full", limit: SECTION_121_EXCLUSION[i.status], fraction: 1, residenceMonths: null };
  }
  if (sellBy === null && i.jobMove) {
    const suspension = Math.min(Math.max(0, Math.round(i.dutyMonths)), SECTION_121_MILITARY_SUSPENSION_MAX_YEARS * 12);
    // The first day of the 5-year period, counted as sellByDate counts it.
    const periodStart = addDays(addMonths(saleDate, -(SECTION_121_TEST_YEARS * 12 + suspension)), 1);
    const monthsInPeriod = (Math.max(0, daysBetween(periodStart, i.moveOut)) * 12) / 365.25;
    const residenceMonths = Math.min(i.yearsLived * 12, monthsInPeriod);
    const fraction = Math.min(1, residenceMonths / (SECTION_121_USE_DAYS / 365 * 12));
    const spouses = i.status === "married" ? 2 : 1;
    const limit = fraction * SECTION_121_EXCLUSION.single * spouses;
    if (limit > 0) return { kind: "partial", limit, fraction, residenceMonths };
  }
  return { kind: "none", limit: 0, fraction: 0, residenceMonths: null };
}

/* ----------------------------------------------------------------------------
 * Depreciation and the tax on a sale.
 * ------------------------------------------------------------------------- */

/**
 * The basis for depreciation when a home becomes a rental: Publication 527,
 * "the lesser of its adjusted basis or its FMV when you change it to rental
 * use", less the land, which "You can't depreciate".
 */
export function depreciableBasis(adjustedBasis: number, valueAtConversion: number, landPct: number) {
  return Math.max(0, Math.min(adjustedBasis, valueAtConversion)) * (1 - landPct / 100);
}

/**
 * Straight-line depreciation over RESIDENTIAL_RENTAL_RECOVERY_YEARS for
 * `months` in service. The mid-month convention counts half a month at each
 * end, so a rental placed in service in one month and sold in the same
 * calendar month `months` later has exactly `months` of depreciation.
 * Recapture is owed on depreciation "allowed or allowable" (Publication 523),
 * so this is counted whether or not it was claimed.
 */
export function depreciationFor(basis: number, months: number) {
  return Math.min(basis, (basis * Math.max(0, months)) / (RESIDENTIAL_RENTAL_RECOVERY_YEARS * 12));
}

export type SaleTax = {
  /** Price less selling costs, less the adjusted basis net of depreciation. */
  gain: number;
  /** The depreciation part of the gain, which 121(d)(6) keeps out of the exclusion. */
  recaptureGain: number;
  /** Gain the section 121 exclusion covers. */
  excluded: number;
  /** Gain left taxable at capital gains rates. */
  taxableGain: number;
  recaptureTax: number;
  gainTax: number;
  tax: number;
  /** The exclusion this sale gets: full, partial (reduced) or none. */
  exclusion: Exclusion;
  /** True when any exclusion applies, full or partial. */
  qualifies: boolean;
};

/**
 * Federal tax on selling the home. With `income` (household gross income in
 * the year of the sale), the recapture is stacked as ordinary income and
 * capped at the 25% rate, and the rest of the gain is taxed by the 0/15/20%
 * brackets on top of both; without it, the recapture is taxed at the 25%
 * maximum and the gain at 15%, which the page says.
 */
export function saleTax(args: {
  amountRealized: number;
  adjustedBasis: number;
  depreciation: number;
  /** The full exclusion when true, none when false; or pass `exclusion` instead. */
  qualifies?: boolean;
  exclusion?: Exclusion;
  status: FilingStatus;
  income: number | null;
}): SaleTax {
  const { amountRealized, adjustedBasis, depreciation, status, income } = args;
  const exclusion: Exclusion = args.exclusion ?? (args.qualifies
    ? { kind: "full", limit: SECTION_121_EXCLUSION[status], fraction: 1, residenceMonths: null }
    : { kind: "none", limit: 0, fraction: 0, residenceMonths: null });
  const gain = Math.max(0, amountRealized - (adjustedBasis - depreciation));
  const recaptureGain = Math.min(depreciation, gain);
  const otherGain = gain - recaptureGain;
  const excluded = Math.min(exclusion.limit, otherGain);
  const taxableGain = otherGain - excluded;
  let recaptureTax: number;
  let gainTax: number;
  if (income === null) {
    recaptureTax = (recaptureGain * UNRECAPTURED_1250_MAX_RATE) / 100;
    gainTax = taxableGain * 0.15;
  } else {
    recaptureTax = Math.min(
      taxOnExtraIncome(income, recaptureGain, status).tax,
      (recaptureGain * UNRECAPTURED_1250_MAX_RATE) / 100,
    );
    gainTax = taxOnCapitalGain(income + recaptureGain, taxableGain, status).tax;
  }
  return {
    gain, recaptureGain, excluded, taxableGain, recaptureTax, gainTax, tax: recaptureTax + gainTax,
    exclusion, qualifies: exclusion.kind !== "none",
  };
}

/* ----------------------------------------------------------------------------
 * Inputs.
 * ------------------------------------------------------------------------- */

export type Inputs = {
  homeValue: number;
  mortgageBalance: number;
  /** Annual percent. */
  mortgageRate: number;
  mortgageYearsLeft: number;
  /** Annual dollars. */
  propertyTax: number;
  insurance: number;
  /** Monthly dollars. */
  hoa: number;

  sellingCostPct: number;
  repairsToSell: number;

  /** Monthly dollars. */
  rent: number;
  vacancyPct: number;
  management: boolean;
  managementPct: number;
  maintenancePct: number;
  capexPct: number;
  turnoverPerYear: number;
  /** Extra a landlord policy costs over the homeowner's policy, a year. */
  landlordInsuranceExtra: number;

  appreciationPct: number;
  rentGrowthPct: number;
  expenseGrowthPct: number;

  horizonYears: number;
  investReturnPct: number;

  status: FilingStatus;
  yearsLived: number;
  /** ISO date: the first day the home was no longer the reader's main home. */
  moveOut: string;
  /** Months of qualified official extended duty after moving out; 0 for none. */
  dutyMonths: number;
  /**
   * The move is for a new job (a workplace at least 50 miles farther away),
   * which allows a partial exclusion when the reader lived there under two
   * years. False when not given.
   */
  jobMove?: boolean;
  /** What was paid for the home plus improvements. */
  adjustedBasis: number;
  landPct: number;
  /** Household gross income in a sale year, or null to use the flat rates. */
  income: number | null;

  /** ISO date: now, when the rental starts. */
  asOf: string;
};

/* ----------------------------------------------------------------------------
 * The two choices.
 * ------------------------------------------------------------------------- */

const grow = (pct: number, years: number) => (1 + pct / 100) ** years;

export function sellNow(i: Inputs) {
  const sellingCosts = (i.homeValue * i.sellingCostPct) / 100;
  const tax = saleTax({
    amountRealized: i.homeValue - sellingCosts,
    adjustedBasis: i.adjustedBasis,
    depreciation: 0,
    exclusion: exclusionFor(i, i.asOf),
    status: i.status,
    income: i.income,
  });
  const net = i.homeValue - sellingCosts - i.repairsToSell - i.mortgageBalance - tax.tax;
  return {
    sellingCosts,
    tax,
    net,
    /** The net proceeds grown at the alternative return to the horizon. */
    position: net * grow(i.investReturnPct, i.horizonYears),
  };
}

/** One month's rental cash flow, by line, in month `m` (1 = the first). */
function monthLines(i: Inputs, m: number, mortgagePayment: number, mortgageMonths: number) {
  const year = Math.ceil(m / 12) - 1;
  const rentGrowth = grow(i.rentGrowthPct, year);
  const costGrowth = grow(i.expenseGrowthPct, year);
  const scheduledRent = i.rent * rentGrowth;
  const vacancy = (scheduledRent * i.vacancyPct) / 100;
  const collected = scheduledRent - vacancy;
  const management = i.management ? (collected * i.managementPct) / 100 : 0;
  const capex = (scheduledRent * i.capexPct) / 100;
  const maintenance = ((i.homeValue * i.maintenancePct) / 100 / 12) * costGrowth;
  const taxInsHoa = ((i.propertyTax + i.insurance + i.landlordInsuranceExtra) / 12 + i.hoa) * costGrowth;
  const turnover = (i.turnoverPerYear / 12) * costGrowth;
  const mortgage = m <= mortgageMonths ? mortgagePayment : 0;
  const cashFlow = collected - management - capex - maintenance - taxInsHoa - turnover - mortgage;
  return { scheduledRent, vacancy, management, capex, maintenance, taxInsHoa, turnover, mortgage, cashFlow };
}

export function rentOut(i: Inputs) {
  const months = Math.round(i.horizonYears * 12);
  const mortgageMonths = Math.round(i.mortgageYearsLeft * 12);
  const pmt = payment(i.mortgageBalance, i.mortgageRate, mortgageMonths);
  const r = i.mortgageRate / 100 / 12;
  const monthlyReturn = grow(i.investReturnPct, 1 / 12) - 1;

  let balance = i.mortgageBalance;
  let account = 0;
  let cashFlowTotal = 0;
  for (let m = 1; m <= months; m++) {
    const lines = monthLines(i, m, pmt, mortgageMonths);
    if (m <= mortgageMonths && balance > 0) balance = Math.max(0, balance * (1 + r) - pmt);
    account = account * (1 + monthlyReturn) + lines.cashFlow;
    cashFlowTotal += lines.cashFlow;
  }

  const saleDate = addMonths(i.asOf, months);
  const price = i.homeValue * grow(i.appreciationPct, i.horizonYears);
  const sellingCosts = (price * i.sellingCostPct) / 100;
  const repairs = i.repairsToSell * grow(i.expenseGrowthPct, i.horizonYears);
  const basis = depreciableBasis(i.adjustedBasis, i.homeValue, i.landPct);
  const depreciation = depreciationFor(basis, months);
  const tax = saleTax({
    amountRealized: price - sellingCosts,
    adjustedBasis: i.adjustedBasis,
    depreciation,
    exclusion: exclusionFor(i, saleDate),
    status: i.status,
    income: i.income,
  });
  const equity = price - sellingCosts - repairs - balance - tax.tax;
  return {
    firstMonth: monthLines(i, 1, pmt, mortgageMonths),
    mortgagePayment: pmt,
    saleDate,
    price,
    sellingCosts,
    repairs,
    mortgageBalance: balance,
    depreciableBasis: basis,
    depreciation,
    tax,
    equity,
    /** The plain sum of the monthly cash flows, before any return on them. */
    cashFlowTotal,
    /** The cash flows with the alternative return on each. */
    cashFlowGrown: account,
    position: equity + account,
  };
}

export function compare(i: Inputs) {
  const sell = sellNow(i);
  const rent = rentOut(i);
  const difference = rent.position - sell.position; // positive: renting comes out ahead
  return {
    sell,
    rent,
    difference,
    better: Math.abs(difference) < 0.5 ? ("neither" as const) : difference > 0 ? ("rent" as const) : ("sell" as const),
    sellBy: sellByDate(i.moveOut, i.yearsLived, i.dutyMonths),
    sellByWithoutSuspension: sellByDate(i.moveOut, i.yearsLived, 0),
  };
}

/** Bisection for the value of `f` that makes renting and selling come out equal. */
function solve(lo: number, hi: number, diff: (x: number) => number) {
  const dLo = diff(lo);
  const dHi = diff(hi);
  if (dLo >= 0) return { value: null, reason: "rent-always" as const };
  if (dHi <= 0) return { value: null, reason: "sell-always" as const };
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { value: (lo + hi) / 2, reason: "found" as const };
}

/**
 * The yearly appreciation at which renting and selling come out the same.
 * Above it renting wins. Searched from −20% to 30% a year.
 */
export function breakEvenAppreciation(i: Inputs) {
  return solve(-20, 30, (a) => compare({ ...i, appreciationPct: a }).difference);
}

/**
 * The starting monthly rent at which renting and selling come out the same.
 * Searched from $0 to 5% of the home's value a month.
 */
export function breakEvenRent(i: Inputs) {
  return solve(0, i.homeValue * 0.05, (rent) => compare({ ...i, rent }).difference);
}

/* ----------------------------------------------------------------------------
 * Buying again with VA while this loan stays in place.
 * ------------------------------------------------------------------------- */

/**
 * The guaranty, and so the entitlement charged, on a VA loan made with full
 * entitlement: Table 3 of Pamphlet 26-7 Ch. 3 up to $144,000, and 25% of the
 * loan above it. An estimate for a reader who does not have their COE; the
 * COE's "Entitlement Charged" column is the real figure.
 */
export function vaGuarantyFullEntitlement(loan: number) {
  if (loan > VA_BONUS_ENTITLEMENT_THRESHOLD) return (loan * VA_GUARANTY_PCT) / 100;
  const tier = VA_GUARANTY_TIERS.find((t) => loan <= t.upTo) ?? VA_GUARANTY_TIERS[VA_GUARANTY_TIERS.length - 1];
  if (tier.flat !== null) return tier.flat;
  const g = (loan * (tier.pct ?? 0)) / 100;
  return tier.max !== null ? Math.min(g, tier.max) : g;
}

/**
 * The entitlement this loan uses: the reader's COE figure when they have it,
 * otherwise estimated from the original loan amount by
 * vaGuarantyFullEntitlement. The loan amount is taken as given, meaning the
 * full amount on the note: Pamphlet 26-7 Ch. 3 says the guaranty "is based on
 * the loan amount including the funding fee portion when the fee is paid from
 * loan proceeds", and a financed fee is already in that amount, so nothing is
 * added for it here. Null when neither is given.
 */
export function vaEntitlementInUse(args: { coeFigure: number | null; originalLoan: number | null }) {
  const { coeFigure, originalLoan } = args;
  if (coeFigure !== null && coeFigure >= 0) return { used: coeFigure, source: "coe" as const };
  if (originalLoan !== null && originalLoan > 0) return { used: vaGuarantyFullEntitlement(originalLoan), source: "estimate" as const };
  return null;
}

/**
 * Remaining entitlement with this loan kept, for a new loan over $144,000:
 * "25% of the single-unit ... Conforming Loan Limit (CLL) for the county ...
 * reduced by the amount of unrestored entitlement" (Pamphlet 26-7 Ch. 3), and
 * the most a lender would usually lend with no down payment, the remaining
 * entitlement times 4 (VA's loan limits page). For a price above that, the
 * down payment that brings entitlement plus down payment to 25% of the loan:
 *   remaining + D = 25% × (price − D)  →  D = (25% × price − remaining) / 1.25.
 * For a new loan of $144,000 or less, the basic $36,000 less what is used.
 */
export function vaNextLoan(args: { entitlementUsed: number; countyLimit: number; price: number | null }) {
  const { entitlementUsed, countyLimit, price } = args;
  const remaining = Math.max(0, (countyLimit * VA_GUARANTY_PCT) / 100 - entitlementUsed);
  const remainingBasic = Math.max(0, VA_BASIC_ENTITLEMENT - entitlementUsed);
  const maxNoDown = (remaining * 100) / VA_LENDER_COVERAGE_PCT;
  const cover = VA_LENDER_COVERAGE_PCT / 100;
  const downPayment = price === null ? null : Math.max(0, (cover * price - remaining) / (1 + cover));
  return { remaining, remainingBasic, maxNoDown, downPayment };
}

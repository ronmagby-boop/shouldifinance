/**
 * Should I buy a rental property: the math behind
 * /calculators/rental-property.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 * The operating costs are lib/rentOrSell.ts's rentalOperatingLines, and the
 * starting assumptions are its ASSUMPTION_DEFAULTS, so a landlord's costs are
 * counted the same way on both rental calculators.
 *
 * Everything is the first year, monthly, before income tax:
 *
 *   NOI (net operating income)  rent − vacancy − management − capital
 *                               reserve − maintenance − property tax −
 *                               insurance − HOA. No mortgage.
 *   cash flow                   NOI − the mortgage payment (principal and
 *                               interest).
 *   cash to close               down payment + closing costs.
 *   cash-on-cash return         annual cash flow ÷ cash to close.
 *   cap rate                    annual NOI ÷ purchase price.
 *   DSCR                        annual NOI ÷ annual mortgage payments; null
 *                               with no mortgage. Lenders define it their own
 *                               way (some use gross rent, some their own
 *                               vacancy and expense figures), which the page
 *                               says.
 *   break-even rent             the rent at which cash flow is zero.
 *
 * NOT MODELLED, and the page says so: income tax on the rent, depreciation
 * and the passive activity rules, appreciation, principal paid down, rent and
 * cost growth after year one, and turnover costs.
 */
import { INVESTMENT_MAX_LTV, INVESTMENT_PURCHASE_LLPA, payment } from "./finance";
import { ASSUMPTION_DEFAULTS, rentalOperatingLines } from "./rentOrSell";

/** The editable starting assumptions, shared with rent-or-sell. Not sourced. */
export const RENTAL_DEFAULTS = {
  vacancyPct: ASSUMPTION_DEFAULTS.vacancyPct,
  managementPct: ASSUMPTION_DEFAULTS.managementPct,
  maintenancePct: ASSUMPTION_DEFAULTS.maintenancePct,
  capexPct: ASSUMPTION_DEFAULTS.capexPct,
} as const;

export type Inputs = {
  price: number;
  downPct: number;
  /** Annual percent. */
  rate: number;
  termYears: number;
  closingCosts: number;
  /** Monthly scheduled rent. */
  rent: number;
  vacancyPct: number;
  management: boolean;
  managementPct: number;
  /** Percent of the price a year. */
  maintenancePct: number;
  /** Percent of scheduled rent. */
  capexPct: number;
  /** Annual dollars. */
  propertyTax: number;
  insurance: number;
  /** Monthly dollars. */
  hoa: number;
};

const operating = (i: Inputs, rent = i.rent) =>
  rentalOperatingLines({
    scheduledRent: rent,
    vacancyPct: i.vacancyPct,
    management: i.management,
    managementPct: i.managementPct,
    capexPct: i.capexPct,
    maintenancePct: i.maintenancePct,
    value: i.price,
    annualFixed: i.propertyTax + i.insurance,
    hoa: i.hoa,
    turnoverPerYear: 0,
    costGrowth: 1,
  });

/**
 * The share of scheduled rent that survives the rent-linked costs: vacancy,
 * management on what is collected, and the capital reserve. Cash flow is this
 * share of rent, less everything that does not depend on rent.
 */
export function rentKeptShare(i: Inputs) {
  const v = i.vacancyPct / 100;
  const m = i.management ? i.managementPct / 100 : 0;
  return 1 - v - m * (1 - v) - i.capexPct / 100;
}

/** Fannie Mae's investment-property LLPA at an LTV, percent of the loan (INVESTMENT_PURCHASE_LLPA). */
export function investmentLlpa(ltv: number) {
  return (INVESTMENT_PURCHASE_LLPA.find((b) => ltv <= b.maxLtv) ?? INVESTMENT_PURCHASE_LLPA[INVESTMENT_PURCHASE_LLPA.length - 1]).pct;
}

export function analyze(i: Inputs) {
  const down = (i.price * i.downPct) / 100;
  const loan = Math.max(0, i.price - down);
  const ltv = i.price > 0 ? (loan / i.price) * 100 : 0;
  const mortgage = payment(loan, i.rate, Math.round(i.termYears * 12));
  const ops = operating(i);
  const noi = ops.operatingIncome;
  const cashFlow = noi - mortgage;
  const cashToClose = down + i.closingCosts;
  const share = rentKeptShare(i);
  // Cash flow is share × rent − fixed costs, so it is zero at fixed ÷ share.
  const fixed = ops.maintenance + ops.taxInsHoa + mortgage;
  return {
    down,
    loan,
    ltv,
    lines: { ...ops, mortgage },
    noi,
    mortgage,
    cashFlow,
    annualCashFlow: cashFlow * 12,
    cashToClose,
    cashOnCash: cashToClose > 0 ? ((cashFlow * 12) / cashToClose) * 100 : null,
    capRate: i.price > 0 ? ((noi * 12) / i.price) * 100 : null,
    dscr: mortgage > 0 ? noi / mortgage : null,
    breakEvenRent: share > 0 ? fixed / share : null,
    /** Below Fannie Mae's minimum down payment for a one-unit investment property. */
    belowFannieMinimum: loan > 0 && ltv > INVESTMENT_MAX_LTV.oneUnit + 1e-9,
    llpaPct: loan > 0 ? investmentLlpa(ltv) : null,
  };
}

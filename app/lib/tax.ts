/**
 * Tax figures that change every year.
 *
 * Update them together and bump TAX_YEAR. Nothing else in the app hardcodes
 * these numbers, so this file is the only place they go stale.
 *
 * Source for the 2026 figures: IRS Revenue Procedure 2025-32, announced at
 * irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026.
 * They apply to returns filed in 2027.
 */

export const TAX_YEAR = 2026;

export type FilingStatus = "single" | "married" | "head";

/** The bar itemized deductions have to clear before itemizing is worth doing. */
export const STANDARD_DEDUCTION = {
  single: 16_100,
  marriedFilingJointly: 32_200,
  headOfHousehold: 24_150,
};

export const standardDeduction = (status: FilingStatus): number =>
  status === "married"
    ? STANDARD_DEDUCTION.marriedFilingJointly
    : status === "head"
      ? STANDARD_DEDUCTION.headOfHousehold
      : STANDARD_DEDUCTION.single;

/**
 * Most student loan interest deductible in a year. It is an above-the-line
 * deduction, so it does not require itemizing, but it phases out with income.
 */
export const STUDENT_LOAN_INTEREST_CAP = 2_500;

/**
 * Elective deferral and IRA limits, from IRS Notice 2025-67 (13 November
 * 2025), announced at
 * irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500.
 *
 * Roth and traditional contributions share one deferral limit between them,
 * which is the whole reason the choice matters at the cap: the limit is
 * counted in dollars going in, so a Roth dollar shelters more after-tax value
 * than a traditional one.
 */
export const RETIREMENT_LIMITS = {
  /** 401(k), 403(b) and most governmental 457(b) plans. */
  electiveDeferral: 24_500,
  /** Additional, age 50 and over. */
  catchUp50: 8_000,
  /** Additional, ages 60 to 63, under SECURE 2.0. */
  catchUp60to63: 11_250,
  ira: 7_500,
};

/**
 * Ordinary income brackets, as taxable income — after the standard deduction,
 * not gross. `upTo` is the top of the band.
 */
export const FEDERAL_BRACKETS: Record<FilingStatus, { upTo: number; rate: number }[]> = {
  single: [
    { upTo: 12_400, rate: 10 },
    { upTo: 50_400, rate: 12 },
    { upTo: 105_700, rate: 22 },
    { upTo: 201_775, rate: 24 },
    { upTo: 256_225, rate: 32 },
    { upTo: 640_600, rate: 35 },
    { upTo: Infinity, rate: 37 },
  ],
  married: [
    { upTo: 24_800, rate: 10 },
    { upTo: 100_800, rate: 12 },
    { upTo: 211_400, rate: 22 },
    { upTo: 403_550, rate: 24 },
    { upTo: 512_450, rate: 32 },
    { upTo: 768_700, rate: 35 },
    { upTo: Infinity, rate: 37 },
  ],
  head: [
    { upTo: 17_700, rate: 10 },
    { upTo: 67_450, rate: 12 },
    { upTo: 105_700, rate: 22 },
    { upTo: 201_775, rate: 24 },
    { upTo: 256_200, rate: 32 },
    { upTo: 640_600, rate: 35 },
    { upTo: Infinity, rate: 37 },
  ],
};

/**
 * Long-term capital gains brackets, as TAXABLE income including the gain —
 * the gain stacks on top of ordinary income and fills these bands from
 * wherever ordinary income leaves off. `zeroUpTo` is the top of the 0% band,
 * `fifteenUpTo` the top of the 15%; everything above is 20%.
 *
 * Source: IRS Revenue Procedure 2025-32 section 3.03, "Maximum Capital Gains
 * Rate" (sections 1(h) and 1(j)(5)), for taxable years beginning in 2026.
 * "All Other Individuals" is the single column.
 */
export const LT_GAINS_BRACKETS: Record<FilingStatus, { zeroUpTo: number; fifteenUpTo: number }> = {
  single: { zeroUpTo: 49_450, fifteenUpTo: 545_500 },
  married: { zeroUpTo: 98_900, fifteenUpTo: 613_700 },
  head: { zeroUpTo: 66_200, fifteenUpTo: 579_600 },
};

/**
 * Net investment income tax: 3.8% on the LESSER of net investment income or
 * the amount modified AGI exceeds the threshold.
 *
 * These thresholds are written into section 1411 and are not adjusted for
 * inflation, so unlike everything else in this file they do not move with
 * TAX_YEAR — they have been the same since the tax took effect in 2013.
 * Source: irs.gov/individuals/net-investment-income-tax.
 */
export const NIIT_RATE = 3.8;
export const NIIT_THRESHOLDS: Record<FilingStatus, number> = {
  single: 200_000,
  married: 250_000,
  head: 200_000,
};

/**
 * Federal clean vehicle credits, and when they stopped.
 *
 * Public Law 119-21 (4 July 2025), the One Big Beautiful Bill Act, terminated
 * all three vehicle credits early:
 *
 *  - Section 30D, the new clean vehicle credit worth up to $7,500, is
 *    available only for vehicles ACQUIRED ON OR BEFORE 30 September 2025.
 *  - Section 25E, the previously-owned clean vehicle credit, ends on the
 *    same date.
 *  - Section 30C, the charger credit, runs a little longer: the property has
 *    to be PLACED IN SERVICE BEFORE 1 July 2026.
 *
 * A binding written contract plus a payment on or before the cutoff counts as
 * acquisition, so a small number of 2026 deliveries still qualify.
 *
 * Source: irs.gov/clean-vehicle-tax-credits, and the IRS FAQs for the
 * modification of sections 25C, 25D, 25E, 30C, 30D, 45L, 45W and 179D under
 * Public Law 119-21.
 *
 * Unlike the brackets above these do not move with TAX_YEAR — they are gone,
 * not adjusted, and the dates are what a calculator needs to say so.
 */
export const CLEAN_VEHICLE_CREDITS = {
  /** Section 30D, new vehicles. Acquired on or before this date. */
  newVehicleCutoff: "30 September 2025",
  /** Section 25E, used vehicles. Same cutoff. */
  usedVehicleCutoff: "30 September 2025",
  /** Section 30C, charging equipment. Placed in service before this date. */
  chargerCutoff: "1 July 2026",
  /** What 30D was worth before it ended, for explaining the change. */
  formerNewVehicleMax: 7_500,
};

/** Total federal tax on a taxable income, band by band. */
export function federalTax(taxableIncome: number, status: FilingStatus): number {
  let remaining = Math.max(0, taxableIncome);
  let last = 0;
  let tax = 0;
  for (const band of FEDERAL_BRACKETS[status]) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, band.upTo - last);
    tax += (slice * band.rate) / 100;
    remaining -= slice;
    last = band.upTo;
  }
  return tax;
}

/** The top band a taxable income reaches — the marginal rate. */
export function marginalRate(taxableIncome: number, status: FilingStatus): number {
  const band = FEDERAL_BRACKETS[status].find((b) => Math.max(0, taxableIncome) <= b.upTo);
  return (band ?? FEDERAL_BRACKETS[status][FEDERAL_BRACKETS[status].length - 1]).rate;
}

/**
 * What an extra slab of ordinary income actually costs in federal tax.
 *
 * A single marginal rate applied to the whole amount is wrong whenever the
 * money straddles a bracket, and it is wrong in the expensive direction: the
 * first dollars are taxed at the rate the filer is already in, and only the
 * top of the slab reaches the next band. This stacks the extra on top of the
 * existing taxable income and returns the difference, along with the bands it
 * actually crossed.
 *
 * `grossIncome` is gross — the standard deduction is applied here, so callers
 * can ask people for the figure on their payslip rather than a computed one.
 */
export function taxOnExtraIncome(
  grossIncome: number,
  extra: number,
  status: FilingStatus,
): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
  baseTaxable: number;
  bands: { rate: number; amount: number }[];
} {
  const deduction = standardDeduction(status);
  const baseTaxable = Math.max(0, Math.max(0, grossIncome) - deduction);
  // The deduction may not be fully used by the base income; the extra soaks up
  // whatever is left of it before any of it is taxed.
  const withExtraTaxable = Math.max(0, Math.max(0, grossIncome) + Math.max(0, extra) - deduction);

  const tax = federalTax(withExtraTaxable, status) - federalTax(baseTaxable, status);

  // Which bands the extra crossed, for showing the reader.
  const bands: { rate: number; amount: number }[] = [];
  const cursor = baseTaxable;
  let last = 0;
  for (const band of FEDERAL_BRACKETS[status]) {
    const bandLow = Math.max(last, cursor);
    const bandHigh = Math.min(band.upTo, withExtraTaxable);
    if (bandHigh > bandLow) bands.push({ rate: band.rate, amount: bandHigh - bandLow });
    last = band.upTo;
    if (withExtraTaxable <= band.upTo) break;
  }

  return {
    tax,
    effectiveRate: extra > 0 ? (tax / extra) * 100 : 0,
    marginalRate: marginalRate(withExtraTaxable, status),
    baseTaxable,
    bands,
  };
}

/**
 * Federal tax on a long-term capital gain, stacked on top of ordinary income.
 *
 * The 0/15/20% rates are brackets, not a flat rate picked from a table. The
 * gain sits on top of taxable ordinary income and fills whatever is left of
 * each band, so a gain can span two rates — or three. Applying the single
 * rate the stacked total happens to land in is wrong in both directions: it
 * overcharges a gain that starts in a lower band, and it is the reason a
 * modest earner with a large gain used to be quoted 15% on every dollar when
 * the first slice of it is taxed at nothing.
 *
 * `grossIncome` is gross — the standard deduction is applied here, matching
 * taxOnExtraIncome, so both sides of a short-versus-long comparison ask the
 * reader for the same figure.
 */
export function taxOnCapitalGain(
  grossIncome: number,
  gain: number,
  status: FilingStatus,
): {
  tax: number;
  effectiveRate: number;
  baseTaxable: number;
  bands: { rate: number; amount: number }[];
} {
  const deduction = standardDeduction(status);
  const gross = Math.max(0, grossIncome);
  const g = Math.max(0, gain);
  const baseTaxable = Math.max(0, gross - deduction);
  // Any deduction the ordinary income did not use is absorbed by the gain
  // before the gain is taxed, the same way taxOnExtraIncome treats a slab.
  const withGainTaxable = Math.max(0, gross + g - deduction);

  const { zeroUpTo, fifteenUpTo } = LT_GAINS_BRACKETS[status];
  const bands: { rate: number; amount: number }[] = [];
  let remaining = withGainTaxable - baseTaxable;
  let cursor = baseTaxable;
  let tax = 0;

  for (const [upTo, rate] of [
    [zeroUpTo, 0],
    [fifteenUpTo, 15],
    [Infinity, 20],
  ] as const) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, Math.max(0, upTo - cursor));
    if (slice > 0) {
      bands.push({ rate, amount: slice });
      tax += (slice * rate) / 100;
      cursor += slice;
      remaining -= slice;
    }
  }

  return { tax, effectiveRate: g > 0 ? (tax / g) * 100 : 0, baseTaxable, bands };
}

/**
 * Net investment income tax on a gain, with the working shown: which of the
 * two amounts the lesser-of rule picked, and how far MAGI sits from the
 * threshold. `margin` is negative below the threshold, positive above.
 */
export function niitOn(
  magi: number,
  netInvestmentIncome: number,
  status: FilingStatus,
): {
  tax: number;
  base: number;
  nii: number;
  excess: number;
  threshold: number;
  margin: number;
  lesserIs: "nii" | "excess";
} {
  const threshold = NIIT_THRESHOLDS[status];
  const nii = Math.max(0, netInvestmentIncome);
  const excess = Math.max(0, magi - threshold);
  const base = Math.min(nii, excess);
  return {
    tax: (base * NIIT_RATE) / 100,
    base,
    nii,
    excess,
    threshold,
    margin: magi - threshold,
    lesserIs: excess < nii ? "excess" : "nii",
  };
}

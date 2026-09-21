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
  let cursor = baseTaxable;
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

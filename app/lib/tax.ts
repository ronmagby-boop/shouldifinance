/**
 * Tax figures that change every year.
 *
 * Update them together and bump TAX_YEAR. Nothing else in the app hardcodes
 * these numbers, so this file is the only place they go stale.
 */

export const TAX_YEAR = 2026;

/** The bar itemized deductions have to clear before itemizing is worth doing. */
export const STANDARD_DEDUCTION = {
  marriedFilingJointly: 31_500,
  single: 15_750,
};

/**
 * Most student loan interest deductible in a year. It is an above-the-line
 * deduction, so it does not require itemizing, but it phases out with income.
 */
export const STUDENT_LOAN_INTEREST_CAP = 2_500;

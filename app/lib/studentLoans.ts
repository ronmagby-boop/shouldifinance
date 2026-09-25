/**
 * Federal student loan repayment policy, in one place.
 *
 * P.L. 119-21 (signed 4 July 2025) created the Repayment Assistance Plan and
 * restructured the plan set from 1 July 2026. Every figure below is taken from
 * the statute or the agency that publishes it, not from a secondary summary —
 * the summaries disagree with each other on where the RAP brackets fall.
 *
 *  - RAP payment table, the $50 per-dependent reduction, the $10 floor, the
 *    interest waiver, the $50 principal match and 360-month forgiveness:
 *    20 U.S.C. 1087e(q), as added by P.L. 119-21.
 *  - Standard plan terms by balance, for loans first disbursed on or after
 *    1 July 2026: 20 U.S.C. 1087e(d)(7)(A)(i).
 *  - Plan availability and the transition deadline: 20 U.S.C. 1087e(d).
 *  - IBR percentages and forgiveness periods: 20 U.S.C. 1098e.
 *  - Poverty guideline: HHS 2026, 48 contiguous states and DC.
 *  - Forgiveness tax treatment: IRC 108(f)(5).
 *
 * These change with legislation and with the calendar. Change them here.
 */

/** What the rules on this page reflect. Shown to the reader. */
export const POLICY_AS_OF = "1 July 2026";

/** The disbursement date that decides which plans a borrower may choose. */
export const NEW_LOAN_CUTOFF = "1 July 2026";

/** Borrowers with only older loans keep the legacy plans until this date. */
export const LEGACY_PLAN_SUNSET = "1 July 2028";

/* ------------------------------------------------------------------ RAP -- */

/**
 * 20 U.S.C. 1087e(q). An annual payment amount by adjusted gross income.
 * The first band is a flat dollar figure; the rest are percentages that step
 * up one point per $10,000 band and stop at 10%.
 *
 * The bands are written as hard boundaries, so the amount jumps at each one —
 * $20,000 pays 1% and $20,001 pays 2%. That is the statute, not a rounding
 * artefact, and it is modelled as written.
 */
export const RAP_BRACKETS: { upTo: number; pct?: number; flat?: number }[] = [
  { upTo: 10_000, flat: 120 },
  { upTo: 20_000, pct: 1 },
  { upTo: 30_000, pct: 2 },
  { upTo: 40_000, pct: 3 },
  { upTo: 50_000, pct: 4 },
  { upTo: 60_000, pct: 5 },
  { upTo: 70_000, pct: 6 },
  { upTo: 80_000, pct: 7 },
  { upTo: 90_000, pct: 8 },
  { upTo: 100_000, pct: 9 },
  { upTo: Infinity, pct: 10 },
];

/** Monthly reduction per dependent claimed on the federal return. */
export const RAP_DEPENDENT_DEDUCTION = 50;

/** No RAP payment falls below this, however low the income. */
export const RAP_MIN_PAYMENT = 10;

/**
 * If a month's payment reduces principal by less than this, the Secretary
 * covers the shortfall, so every month retires at least this much principal.
 */
export const RAP_PRINCIPAL_MATCH = 50;

/** 360 qualifying monthly payments. */
export const RAP_FORGIVE_MONTHS = 360;

/** The annual RAP amount before the dependent reduction. */
export function rapAnnualPayment(agi: number): number {
  const band = RAP_BRACKETS.find((b) => agi <= b.upTo) ?? RAP_BRACKETS[RAP_BRACKETS.length - 1];
  return band.flat !== undefined ? band.flat : (agi * (band.pct ?? 0)) / 100;
}

/** The RAP monthly payment: the band, less dependents, never below the floor. */
export function rapMonthlyPayment(agi: number, dependents: number): number {
  const base = rapAnnualPayment(Math.max(0, agi)) / 12;
  return Math.max(RAP_MIN_PAYMENT, base - RAP_DEPENDENT_DEDUCTION * Math.max(0, dependents));
}

/** The band a given AGI falls in, for display. */
export function rapBandLabel(agi: number): string {
  const band = RAP_BRACKETS.find((b) => agi <= b.upTo) ?? RAP_BRACKETS[RAP_BRACKETS.length - 1];
  return band.flat !== undefined ? `$${band.flat}/yr` : `${band.pct}% of AGI`;
}

/* ------------------------------------------- Standard, for new borrowers -- */

/**
 * 20 U.S.C. 1087e(d)(7)(A)(i). For loans first disbursed on or after the
 * cutoff, the standard plan's term comes from the balance instead of being a
 * flat ten years.
 */
export const STANDARD_TIERS: { under: number; years: number }[] = [
  { under: 25_000, years: 10 },
  { under: 50_000, years: 15 },
  { under: 100_000, years: 20 },
  { under: Infinity, years: 25 },
];

export function standardTermYears(balance: number): number {
  return (STANDARD_TIERS.find((t) => balance < t.under) ?? STANDARD_TIERS[STANDARD_TIERS.length - 1]).years;
}

/** How the tier reads on screen, e.g. "$50,000 to under $100,000". */
export function standardTierLabel(balance: number): string {
  const i = STANDARD_TIERS.findIndex((t) => balance < t.under);
  const lo = i <= 0 ? 0 : STANDARD_TIERS[i - 1].under;
  const hi = STANDARD_TIERS[Math.max(0, i)].under;
  const money = (v: number) => `$${v.toLocaleString()}`;
  if (lo === 0) return `under ${money(hi)}`;
  if (hi === Infinity) return `${money(lo)} or more`;
  return `${money(lo)} to under ${money(hi)}`;
}

/* ------------------------------------------------------------------ IBR -- */

/**
 * 20 U.S.C. 1098e. The 10%/20-year terms apply to a "new borrower" — someone
 * with no outstanding balance who borrowed on or after 1 July 2014 and before
 * 1 July 2026. Everyone else pays 15% over 25 years.
 *
 * Nothing a repayment calculator asks for reveals which side of that line a
 * borrower sits on, so the page shows one and names the other rather than
 * picking silently.
 */
export const IBR_NEW_BORROWER_FROM = "1 July 2014";
export const IBR_NEW_PCT = 10;
export const IBR_NEW_FORGIVE_MONTHS = 240;
export const IBR_PRIOR_PCT = 15;
export const IBR_PRIOR_FORGIVE_MONTHS = 300;

/** Discretionary income for IBR is AGI above this multiple of the guideline. */
export const IBR_POVERTY_MULTIPLE = 1.5;

/* --------------------------------------------- Marriage and filing status -- */

export type FilingStatus = "single" | "joint" | "separate";

export const FILING_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single / head of household" },
  { value: "joint", label: "Married filing jointly" },
  { value: "separate", label: "Married filing separately" },
];

/**
 * Whose income counts, under each plan.
 *
 * BOTH plans exclude a spouse's income when the borrower files separately, and
 * both say so in statute rather than by regulation.
 *
 * RAP — 20 U.S.C. 1087e, Repayment Assistance Plan definitions:
 *
 *   "The term 'adjusted gross income', when used with respect to a borrower,
 *   means the adjusted gross income (as such term is defined in section 62 of
 *   title 26) of the borrower (and the borrower's spouse, as applicable) for
 *   the most recent taxable year, except that, in the case of a married
 *   borrower who files a separate Federal income tax return, the term does not
 *   include the adjusted gross income of the borrower's spouse."
 *
 * IBR — 20 U.S.C. 1098e(d):
 *
 *   "In the case of a married borrower who files a separate Federal income tax
 *   return, the Secretary shall calculate the amount of the borrower's
 *   income-based repayment under this section solely on the basis of the
 *   borrower's student loan debt and adjusted gross income."
 *
 * Both quoted from the Office of Law Revision Counsel's text at
 * uscode.house.gov; Cornell's copy of 1087e truncates before the RAP
 * definitions and cannot be used to check this.
 */
export function householdAgi(status: FilingStatus, borrower: number, spouse: number): number {
  return status === "joint" ? borrower + Math.max(0, spouse) : borrower;
}

/**
 * THE ASYMMETRY, and it is not the one you would guess.
 *
 * IBR's separate-filing rule covers the spouse's STUDENT LOAN DEBT as well as
 * their income — "solely on the basis of the borrower's student loan debt and
 * adjusted gross income". RAP's rule covers income only; there is no debt
 * provision in its text at all.
 *
 * That is not an oversight in RAP, and it does not mean a separate filer is
 * worse off there. Debt does not enter RAP's payment at any point, for anyone:
 * the payment is a band of AGI less the dependent reduction, and a borrower's
 * own balance does not appear in it either. There is simply nothing for a
 * spousal-debt exclusion to exclude.
 *
 * Nor does it change a number on this page. Neither plan's MONTHLY PAYMENT is
 * computed from debt here — IBR's is a percentage of discretionary income. The
 * debt half of 1098e(d) bears on the partial-financial-hardship test that
 * gates entry to IBR and on the cap at the ten-year standard payment, neither
 * of which this calculator models. So it is stated, not computed.
 */
export const SPOUSAL_DEBT_NOTE =
  "IBR's separate-filing rule also excludes a spouse's student loan debt, not just their income — it says the payment is worked out \u201Csolely on the basis of the borrower's student loan debt and adjusted gross income\u201D. RAP has no equivalent, because no debt figure enters a RAP payment for anyone. Neither affects the monthly payments shown here, which are worked out from income; a spouse's debt matters for whether you qualify for IBR and for the cap at the standard ten-year payment, which this page does not model.";

/**
 * Dependents, when filing separately.
 *
 * 20 U.S.C. 1087e narrows the RAP reduction to the borrower's own return:
 *
 *   "$50 for each dependent of the borrower (which, in the case of a married
 *   borrower filing a separate Federal income tax return, shall include only
 *   each dependent that the borrower claims on that return)."
 */
export const RAP_DEPENDENTS_SEPARATE_NOTE =
  "Filing separately, count only the dependents claimed on your own return \u2014 a dependent your spouse claims does not reduce your RAP payment.";

/**
 * The part a repayment calculator cannot see, and must not imply away.
 *
 * Filing separately lowers the payment by removing a spouse's income from it.
 * It usually raises the tax bill by more than people expect, and none of that
 * is modelled here — this page knows nothing about the household's taxes.
 */
export const FILING_SEPARATELY_TAX_WARNING =
  "Filing separately almost always costs more in tax. It disqualifies you from the Earned Income Tax Credit and the student loan interest deduction outright, cuts or removes the education credits, and applies less favourable brackets and a smaller standard deduction to each of you. None of that is modelled here. A lower loan payment can easily cost more than it saves, and the only way to know is to work out both returns.";

/* ------------------------------------------------- Poverty and tax bits -- */

export const FPL_YEAR = 2026;
export const FPL_BASE = 15_960;
export const FPL_PER_PERSON = 5_680;

export function povertyLine(familySize: number): number {
  return FPL_BASE + FPL_PER_PERSON * Math.max(0, familySize - 1);
}

/**
 * The ARPA exclusion under IRC 108(f)(5) covered discharges through
 * 31 December 2025 and was not extended. P.L. 119-21 made the death and
 * disability exclusion permanent but left the general one lapsed, so an
 * income-driven or RAP balance forgiven from 2026 is cancellation-of-debt
 * income again. PSLF and teacher forgiveness are separately excluded.
 */
export const IDR_FORGIVENESS_TAXABLE = true;
export const IDR_FORGIVENESS_TAX_NOTE =
  "A balance forgiven under an income-driven plan or RAP is treated as taxable income again — the exclusion that covered 2021 through 2025 lapsed on 31 December 2025. Public Service Loan Forgiveness and discharges for death or disability remain tax-free.";

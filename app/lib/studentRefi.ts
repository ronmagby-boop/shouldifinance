/**
 * Refinancing federal student loans into a private loan: the math behind
 * /calculators/student-loan-refinance.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE COMPARISON is the arithmetic of two level-payment loans: the federal
 * loan on its current rate and remaining term, and the private loan on the
 * offered rate and term. The federal income-driven payments come from the
 * plans calculator's own logic in lib/studentLoans.ts (RAP and IBR).
 *
 * WHAT IS GIVEN UP is not arithmetic. CFPB, "Should I consolidate or refinance
 * my student loans?" (last reviewed 3 December 2024): "If you consolidate with
 * a private lender, you will lose your rights under the federal student loan
 * program, including deferment, forbearance, cancellation, and affordable
 * repayment options", and "If you refinance your federal loan with a new
 * private student loan, you will no longer be eligible to participate in these
 * federal loan forgiveness programs." Public Service Loan Forgiveness covers
 * only Direct Loans: 34 CFR 685.219(b)(7), "Eligible Direct Loan means a Direct
 * Subsidized Loan, a Direct Unsubsidized Loan, a Direct PLUS Loan, or a Direct
 * Consolidation Loan." A private loan is none of those.
 */
import { payment } from "./finance";
import { IBR_NEW_PCT, IBR_PRIOR_PCT, ibrMonthlyPayment, rapMonthlyPayment } from "./studentLoans";

export type Inputs = {
  balance: number;
  federalRate: number;
  federalMonths: number;
  privateRate: number;
  privateMonths: number;
  /** Adjusted gross income, for the income-driven payments; null to skip them. */
  agi: number | null;
  /** Household size for IBR's poverty line; dependents for RAP are this less one. */
  familySize: number;
  /** Pursuing Public Service Loan Forgiveness or another federal forgiveness program. */
  forgiveness: boolean;
};

const level = (balance: number, rate: number, months: number) => {
  const monthly = payment(balance, rate, months);
  return { monthly, months, totalInterest: monthly * months - balance };
};

export function analyze(i: Inputs) {
  const federal = level(i.balance, i.federalRate, Math.round(i.federalMonths));
  const refinanced = level(i.balance, i.privateRate, Math.round(i.privateMonths));
  const idr = i.agi === null ? null : {
    rap: rapMonthlyPayment(i.agi, Math.max(0, i.familySize - 1)),
    ibrNew: ibrMonthlyPayment(i.agi, i.familySize, IBR_NEW_PCT),
    ibrPrior: ibrMonthlyPayment(i.agi, i.familySize, IBR_PRIOR_PCT),
  };
  return {
    federal,
    refinanced,
    interestSaved: federal.totalInterest - refinanced.totalInterest,
    paymentChange: refinanced.monthly - federal.monthly,
    idr,
    /** Refinancing ends eligibility for federal forgiveness, so a reader on that path gets the warning whatever the saving. */
    forgivenessWarning: i.forgiveness,
  };
}

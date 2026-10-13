/**
 * Debt-to-income ratios and VA residual income: the math behind
 * /calculators/debt-to-income.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE RATIOS. Front-end is the proposed housing payment over gross monthly
 * income; back-end is the housing payment plus every other monthly debt over
 * the same income. Both use gross income, before tax.
 *
 * THE PROGRAM FIGURES ARE GUIDELINES, NOT LIMITS. Each one below is quoted
 * from its source, and each source lets a loan go past it: Fannie Mae's
 * Desktop Underwriter to 50%, FHA's TOTAL Scorecard with no fixed ratio at
 * all, VA with residual income or a supervisor's justification, USDA with
 * compensating factors or its automated system. The page says so beside the
 * comparison.
 *
 * STUDENT LOANS are counted differently by each program, so the back-end
 * ratio is computed per program with that program's student loan payment.
 */

/* ----------------------------------------------------------------------------
 * Conventional (Fannie Mae).
 *
 * Selling Guide B3-6-02, Debt-to-Income Ratios (guide published 7 October
 * 2026): "For manually underwritten loans, Fannie Mae's maximum total DTI
 * ratio is 36% of the borrower's stable monthly income. The maximum can be
 * exceeded up to 45% if the borrower meets the credit score and reserve
 * requirements reflected in the Eligibility Matrix." and "For loan casefiles
 * underwritten through DU, the maximum allowable DTI ratio is 50%."
 *
 * Fannie Mae sets no front-end (housing) ratio, so none is shown for it.
 * ------------------------------------------------------------------------- */
export const FNMA_DTI = { manual: 36, manualMax: 45, du: 50 } as const;
export const FNMA_GUIDE_DATE = "7 October 2026";

/* ----------------------------------------------------------------------------
 * FHA.
 *
 * HUD Handbook 4000.1 (Last Revised 12 August 2026), II.A.5, "Approvable
 * Ratio Requirements (Manual)": the maximum housing / total ratios for a
 * manually underwritten loan, by credit score and compensating factors. A
 * score of 500-579, or no score, may not exceed 31/43. Loans scored through
 * TOTAL have no fixed ratio; the scorecard decides.
 *
 * "Energy Efficient Homes may have stretch ratios of 33/45." (not modelled:
 * it only matters at the first tier, and the page names it in a note).
 * ------------------------------------------------------------------------- */
export type FhaTier = { front: number; back: number; needs: string };
export const FHA_MANUAL_TIERS: readonly FhaTier[] = [
  { front: 31, back: 43, needs: "no compensating factors" },
  { front: 37, back: 47, needs: "one compensating factor: verified cash reserves, a minimal increase in housing payment, or residual income" },
  { front: 40, back: 40, needs: "no discretionary debt" },
  { front: 40, back: 50, needs: "two compensating factors from reserves, a minimal housing increase, significant income not counted, and residual income" },
];
export const FHA_HANDBOOK_DATE = "12 August 2026";

/* ----------------------------------------------------------------------------
 * VA.
 *
 * 38 CFR 36.4340(d): "The ratio should be rounded to the nearest two digits;
 * e.g., 35.6 percent would be rounded to 36 percent. The standard is 41
 * percent or less." 36.4340(c)(3): "If the ratio is greater than 41 percent
 * and the residual income exceeds the guidelines by at least 20 percent, the
 * second level review and statement of justification are not required."
 * VA sets no front-end ratio.
 * ------------------------------------------------------------------------- */
export const VA_DTI = 41;
export const VA_RESIDUAL_BENCHMARK_PCT = 20;

/**
 * VA charges no monthly mortgage insurance, so the VA row and residual income
 * leave it out of the housing payment. VA's funding fee page (va.gov/housing-
 * assistance/home-loans/funding-fee-and-closing-costs/, last updated 5 October
 * 2026), the source the VA-vs-conventional guide cites: "the VA home loan
 * program doesn't require down payments or monthly mortgage insurance." Its
 * one-time funding fee is financed or paid at closing, not monthly.
 */
export const countsMortgageInsurance = (program: Program) => program !== "va";

/* ----------------------------------------------------------------------------
 * USDA.
 *
 * 7 CFR 3555.151(h)(1)(i): PITI and related housing costs that do "not
 * exceed 29 percent of the applicant's repayment income and the monthly
 * amount of PITI plus recurring monthly debts (total debt) does not exceed 41
 * percent". (h)(2): the ratios "may exceed" these with compensating factors.
 * ------------------------------------------------------------------------- */
export const USDA_DTI = { front: 29, back: 41 } as const;

/* ----------------------------------------------------------------------------
 * Student loans, as each program counts them.
 *
 * Fannie Mae, B3-6-05: the credit report payment if there is one; "If the
 * borrower is on an income-driven payment plan, the lender may obtain student
 * loan documentation to verify the actual monthly payment is $0. The lender
 * may then qualify the borrower with a $0 payment." "For deferred loans or
 * loans in forbearance, the lender may calculate a payment equal to 1% of the
 * outstanding student loan balance (even if this amount is lower than the
 * actual fully amortizing payment), or a fully amortizing payment using the
 * documented loan repayment terms." The page uses the 1% option and names
 * the other.
 *
 * FHA, Handbook 4000.1, "Student Loans (TOTAL)" and the same text under
 * Manual Underwriting: "For outstanding
 * Student Loans, regardless of the payment status, the Mortgagee must use: the
 * payment amount reported on the credit report or the actual documented
 * payment, when the payment amount is above zero; or 0.5 percent of the
 * outstanding loan balance, when the monthly payment reported on the
 * Borrower's credit report is zero."
 *
 * VA, Pamphlet 26-7, Chapter 4 (updated 26 August 2026): no payment if the
 * debt "will be deferred at least 12 months beyond the date of closing";
 * otherwise "five percent of the outstanding balance divided by 12 months",
 * unless the credit report shows more (then that), or a servicer statement
 * documents less (then that).
 *
 * USDA: the rule is in HB-1-3555, Chapter 11, which could not be opened
 * (rd.usda.gov refuses automated access). Not modelled: the page says
 * "not shown: check with your lender", and USDA's ratio uses the payment the
 * reader entered.
 * ------------------------------------------------------------------------- */
export const FNMA_STUDENT_DEFERRED_PCT = 1;
export const FHA_STUDENT_ZERO_PCT = 0.5;
export const VA_STUDENT_ANNUAL_PCT = 5;
export const VA_STUDENT_DEFERRAL_MONTHS = 12;

export type StudentLoanStatus = "repaying" | "idr-zero" | "deferred";

export type StudentLoan = {
  balance: number;
  /** The monthly payment on the credit report or statement; 0 if none. */
  payment: number;
  status: StudentLoanStatus;
  /** Written evidence the deferment runs at least 12 months past closing (VA). */
  deferredPastTwelveMonths: boolean;
  /** A servicer statement dated within 60 days of closing shows the lower payment (VA). */
  servicerStatement: boolean;
};

export type Program = "conventional" | "fha" | "va" | "usda";
export const PROGRAMS: readonly Program[] = ["conventional", "fha", "va", "usda"];
export const PROGRAM_LABEL: Record<Program, string> = {
  conventional: "Conventional (Fannie Mae)",
  fha: "FHA",
  va: "VA",
  usda: "USDA",
};

/** VA's threshold payment: 5% of the balance a year, by the month. */
export const vaStudentThreshold = (balance: number) => (balance * VA_STUDENT_ANNUAL_PCT) / 100 / 12;

/**
 * The monthly student loan payment a program counts, or null where the rule is
 * not modelled (USDA).
 */
export function studentLoanPayment(program: Program, l: StudentLoan): number | null {
  const pay = Math.max(0, l.payment);
  switch (program) {
    case "conventional":
      if (l.status === "deferred") return pay > 0 ? pay : (l.balance * FNMA_STUDENT_DEFERRED_PCT) / 100;
      if (l.status === "idr-zero") return pay;
      return pay > 0 ? pay : (l.balance * FNMA_STUDENT_DEFERRED_PCT) / 100;
    case "fha":
      return pay > 0 ? pay : (l.balance * FHA_STUDENT_ZERO_PCT) / 100;
    case "va": {
      if (l.status === "deferred" && l.deferredPastTwelveMonths) return 0;
      const threshold = vaStudentThreshold(l.balance);
      if (pay > threshold) return pay;
      return l.servicerStatement ? pay : threshold;
    }
    case "usda":
      return null;
  }
}

/* ----------------------------------------------------------------------------
 * Ratios.
 * ------------------------------------------------------------------------- */

export type Income = { borrower: number; coBorrower: number; other: number };
export type Housing = { principalInterest: number; taxes: number; insurance: number; hoa: number; mortgageInsurance: number };
export type Debts = {
  car: number;
  creditCards: number;
  personal: number;
  support: number;
  other: number;
};

export const totalIncome = (i: Income) => i.borrower + i.coBorrower + i.other;
export const housingPayment = (h: Housing) => h.principalInterest + h.taxes + h.insurance + h.hoa + h.mortgageInsurance;
/** Every monthly debt except the housing payment and student loans. */
export const otherDebts = (d: Debts) => d.car + d.creditCards + d.personal + d.support + d.other;

/** A ratio in percent, or null without income. */
export const ratio = (amount: number, income: number) => (income > 0 ? (amount / income) * 100 : null);

/**
 * The largest housing payment that keeps the back-end ratio at `targetPct`:
 * target × income − every other monthly debt, never below zero.
 */
export const maxHousingPayment = (income: number, nonHousingDebts: number, targetPct: number) =>
  Math.max(0, (income * targetPct) / 100 - nonHousingDebts);

/** VA rounds its ratio to a whole percent: 35.6 becomes 36. */
export const vaRoundedRatio = (pct: number) => Math.round(pct);

export type Standing = "within" | "stretch" | "above";

export type ProgramRow = {
  program: Program;
  /** The student loan payment this program counts, or null where not modelled. */
  studentPayment: number | null;
  /** The housing payment this program counts: mortgage insurance included except for VA. */
  housing: number;
  front: number;
  back: number;
  standing: Standing;
  /** The guideline, as the page prints it. */
  guideline: string;
  /** Where the reader's ratios sit against it. */
  verdict: string;
};

/** FHA manual tiers the ratios fit within, in the matrix's order. */
export const fhaTiersMet = (front: number, back: number) =>
  FHA_MANUAL_TIERS.filter((t) => front <= t.front && back <= t.back);

const p0 = (v: number) => `${v}%`;

export function programRow(
  program: Program,
  income: number,
  /** Principal, interest, taxes, insurance and HOA: the housing payment before mortgage insurance. */
  housingBeforeMi: number,
  mortgageInsurance: number,
  nonHousingDebts: number,
  loans: readonly StudentLoan[],
): ProgramRow {
  const housing = housingBeforeMi + (countsMortgageInsurance(program) ? mortgageInsurance : 0);
  const counted = loans.map((l) => studentLoanPayment(program, l));
  const notModelled = counted.some((c) => c === null);
  // Where a program's rule is not modelled, the reader's own payment stands in.
  const studentPayment = notModelled ? null : counted.reduce<number>((s, c) => s + (c ?? 0), 0);
  const studentUsed = studentPayment ?? loans.reduce((s, l) => s + Math.max(0, l.payment), 0);
  const front = ratio(housing, income) ?? 0;
  const back = ratio(housing + nonHousingDebts + studentUsed, income) ?? 0;

  switch (program) {
    case "conventional": {
      const standing: Standing = back <= FNMA_DTI.manual ? "within" : back <= FNMA_DTI.du ? "stretch" : "above";
      const verdict =
        back <= FNMA_DTI.manual
          ? `Within ${p0(FNMA_DTI.manual)}, the manual-underwriting guideline.`
          : back <= FNMA_DTI.manualMax
            ? `Above ${p0(FNMA_DTI.manual)}: manual underwriting allows up to ${p0(FNMA_DTI.manualMax)} with the credit score and reserves in Fannie Mae's Eligibility Matrix; Desktop Underwriter allows up to ${p0(FNMA_DTI.du)}.`
            : back <= FNMA_DTI.du
              ? `Above ${p0(FNMA_DTI.manualMax)}: only through Desktop Underwriter, whose maximum is ${p0(FNMA_DTI.du)}.`
              : `Above Desktop Underwriter's ${p0(FNMA_DTI.du)} maximum.`;
      return {
        program, studentPayment, housing, front, back, standing, verdict,
        guideline: `Total ${p0(FNMA_DTI.manual)} manual (to ${p0(FNMA_DTI.manualMax)} with score and reserves); ${p0(FNMA_DTI.du)} through DU. No housing ratio.`,
      };
    }
    case "fha": {
      const met = fhaTiersMet(front, back);
      const standing: Standing = met[0] === FHA_MANUAL_TIERS[0] ? "within" : met.length ? "stretch" : "above";
      const verdict = !met.length
        ? `Above every manual tier; only an automated (TOTAL) approval could go higher.`
        : met[0] === FHA_MANUAL_TIERS[0]
          ? `Within ${met[0].front}/${met[0].back}, with no compensating factors needed.`
          : `Within ${met.map((t) => `${t.front}/${t.back} (${t.needs})`).join(", or ")}.`;
      return {
        program, studentPayment, housing, front, back, standing, verdict,
        guideline: "Manual: 31/43, rising to 37/47, 40/40 or 40/50 with compensating factors, for scores of 580 and above. TOTAL sets no fixed ratio.",
      };
    }
    case "va": {
      const rounded = vaRoundedRatio(back);
      const standing: Standing = rounded <= VA_DTI ? "within" : "stretch";
      return {
        program, studentPayment, housing, front, back, standing,
        verdict:
          rounded <= VA_DTI
            ? `${rounded}% after VA's rounding: within ${p0(VA_DTI)}.`
            : `${rounded}% after VA's rounding: above ${p0(VA_DTI)}, so residual income ${VA_RESIDUAL_BENCHMARK_PCT}% above the guideline, or a supervisor's written justification, is needed.`,
        guideline: `Total ${p0(VA_DTI)}, rounded to a whole percent, read with residual income. No housing ratio.`,
      };
    }
    case "usda": {
      const ok = front <= USDA_DTI.front && back <= USDA_DTI.back;
      return {
        program, studentPayment, housing, front, back,
        standing: ok ? "within" : "stretch",
        verdict: ok
          ? `Within ${USDA_DTI.front}/${USDA_DTI.back}.`
          : `Above ${USDA_DTI.front}/${USDA_DTI.back}: needs compensating factors, such as a 680 credit score, or acceptance by USDA's automated system.`,
        guideline: `Housing ${p0(USDA_DTI.front)}, total ${p0(USDA_DTI.back)}.`,
      };
    }
  }
}

/* ----------------------------------------------------------------------------
 * VA residual income.
 *
 * 38 CFR 36.4340(e)(1)-(3), and the same tables in Pamphlet 26-7, Chapter 4,
 * Tables 9 and 10. By loan amount band, region and family size; "For families
 * with more than five members, add $75 for each additional member up to a
 * family of seven" ($80 in the $80,000-and-above table). The pamphlet's own
 * example: a family of 8 in Georgia, a $150,000 loan: "$1,199 (family size of
 * 5 which is $1,039 adding $80 for each additional family member up to a
 * family size of 7). The eighth person will not be considered".
 * ------------------------------------------------------------------------- */
export type Region = "northeast" | "midwest" | "south" | "west";
export const REGIONS: readonly Region[] = ["northeast", "midwest", "south", "west"];
export const REGION_LABEL: Record<Region, string> = {
  northeast: "Northeast", midwest: "Midwest", south: "South", west: "West",
};
/** 38 CFR 36.4340(e)(3), for the page's hint. */
export const REGION_STATES: Record<Region, string> = {
  northeast: "CT, ME, MA, NH, NJ, NY, PA, RI, VT",
  midwest: "IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI",
  south: "AL, AR, DE, DC, FL, GA, KY, LA, MD, MS, NC, OK, PR, SC, TN, TX, VA, WV",
  west: "AK, AZ, CA, CO, HI, ID, MT, NV, NM, OR, UT, WA, WY",
};

/** The top of the lower loan band; $80,000 and above uses the higher table. */
export const VA_RESIDUAL_LOW_BAND_MAX = 79_999;

/** Family sizes 1 to 5, Northeast, Midwest, South, West. */
export const VA_RESIDUAL_TABLE: Record<"low" | "high", Record<Region, readonly number[]>> = {
  low: {
    northeast: [390, 654, 788, 888, 921],
    midwest: [382, 641, 772, 868, 902],
    south: [382, 641, 772, 868, 902],
    west: [425, 713, 859, 967, 1004],
  },
  high: {
    northeast: [450, 755, 909, 1025, 1062],
    midwest: [441, 738, 889, 1003, 1039],
    south: [441, 738, 889, 1003, 1039],
    west: [491, 823, 990, 1117, 1158],
  },
};
export const VA_RESIDUAL_EXTRA_MEMBER = { low: 75, high: 80 } as const;
/** The largest family the tables count; members past it are not considered. */
export const VA_RESIDUAL_MAX_FAMILY = 7;

/**
 * 38 CFR 36.4340(e)(4): reduced "by a minimum of 5 percent" for an active-duty
 * servicemember or military retiree with "a clear indication" of continued
 * benefits from a nearby base; Pamphlet 26-7: "by five percent".
 */
export const VA_MILITARY_REDUCTION_PCT = 5;

/**
 * Pamphlet 26-7, Chapter 4, Table 8: "Calculate maintenance and utility costs
 * using 14¢ per square foot for the gross living area as per the appraisal."
 */
export const VA_MAINTENANCE_PER_SQFT = 0.14;

/** The required residual income for a loan amount, region and family size. */
export function vaRequiredResidual(loanAmount: number, region: Region, familySize: number, military = false): number {
  const band = loanAmount <= VA_RESIDUAL_LOW_BAND_MAX ? "low" : "high";
  const size = Math.min(Math.max(1, Math.floor(familySize)), VA_RESIDUAL_MAX_FAMILY);
  const row = VA_RESIDUAL_TABLE[band][region];
  const base = row[Math.min(size, 5) - 1] + Math.max(0, size - 5) * VA_RESIDUAL_EXTRA_MEMBER[band];
  return military ? base * (1 - VA_MILITARY_REDUCTION_PCT / 100) : base;
}

export type VaResidualInputs = {
  grossIncome: number;
  /** Monthly, from the pay stub. */
  federalTax: number;
  stateTax: number;
  socialSecurityMedicare: number;
  retirement: number;
  /** The proposed housing payment: principal, interest, taxes, insurance, HOA. */
  housing: number;
  /** Gross living area, for the 14¢ maintenance and utilities figure. */
  squareFeet: number;
  /** Monthly debts as VA counts them, student loans included. */
  debts: number;
  /** Child care, significant commuting and other job-related costs. */
  jobRelated: number;
  loanAmount: number;
  region: Region;
  familySize: number;
  military: boolean;
};

export function vaResidual(i: VaResidualInputs) {
  const taxes = i.federalTax + i.stateTax + i.socialSecurityMedicare + i.retirement;
  const maintenance = Math.max(0, i.squareFeet) * VA_MAINTENANCE_PER_SQFT;
  const shelter = i.housing + maintenance;
  const residual = i.grossIncome - taxes - shelter - i.debts - i.jobRelated;
  const required = vaRequiredResidual(i.loanAmount, i.region, i.familySize, i.military);
  const benchmark = required * (1 + VA_RESIDUAL_BENCHMARK_PCT / 100);
  return { taxes, maintenance, shelter, residual, required, benchmark, meets: residual >= required, meetsBenchmark: residual >= benchmark };
}

/**
 * How much a HELOC could be: the math behind /calculators/heloc-limit.
 *
 * Pure functions, no React, so the page and the tests read the same numbers.
 *
 * THE LIMIT. A HELOC is sized against combined loan-to-value (CLTV): the
 * lender takes a percentage of the home's value and subtracts everything
 * already secured on it. The CFPB's HELOC booklet, in its comparison table,
 * puts it as "Generally a percentage of the appraised value of your home,
 * minus the amount you owe on your mortgage." Any other lien counts too,
 * because the cap is on everything the home secures.
 *
 *   line = value × cap − (mortgage + other liens), never below zero.
 *
 * THE CAP IS THE LENDER'S. No rule sets a HELOC's CLTV cap: it is each
 * lender's credit policy, and the same borrower can be offered different
 * caps by different lenders. So the page offers HELOC_CAP_CHOICES as points
 * to compare, labelled as lender-specific, plus a custom value, and never
 * presents one as "typical".
 *
 * Credit and income limit the line as well, and the page says so. The
 * federal banking agencies' guidance (SR 05-11, revised June 2026) says
 * underwriting should consider "a borrower's income and debt levels, credit
 * score (if obtained), and credit history", and for interest-only and
 * variable-rate lines "an assessment of the borrower's ability to amortize
 * the fully drawn line": the payments here are that fully drawn line.
 */
import { payment } from "./finance";

/**
 * CLTV caps the page compares side by side. NOT SOURCED and not a rule:
 * three round points for comparison, which the page labels as lender-
 * specific. The reader's own lender's cap goes in the custom field.
 */
export const HELOC_CAP_CHOICES = [80, 85, 90] as const;

/**
 * A starting value for the repayment period, in years. The CFPB booklet says
 * a lender "may set a schedule so that you repay the full amount, often over
 * ten or 15 years"; the reader's agreement gives the real term.
 */
export const HELOC_REPAY_YEARS_DEFAULT = 15;

export type Inputs = {
  homeValue: number;
  mortgageBalance: number;
  /** Any other liens: a second mortgage, home equity loan, an existing HELOC balance. */
  otherLiens: number;
  /** A custom CLTV cap in percent, or null. */
  customCap: number | null;
  /** Annual HELOC rate in percent, or null when not given (no payments shown). */
  rate: number | null;
  repayYears: number;
};

/** Everything secured on the home now. */
export const securedBalances = (i: Pick<Inputs, "mortgageBalance" | "otherLiens">) => i.mortgageBalance + i.otherLiens;

/** Combined loan-to-value today, in percent: everything owed against the home over its value. */
export function currentCltv(i: Inputs) {
  return i.homeValue > 0 ? (securedBalances(i) / i.homeValue) * 100 : Infinity;
}

/** The line a CLTV cap leaves: value × cap − all balances, never below zero. */
export function availableLine(i: Inputs, capPct: number) {
  return Math.max(0, (i.homeValue * capPct) / 100 - securedBalances(i));
}

/**
 * Monthly payments with the whole line drawn: interest only during the draw
 * period, and the level payment that repays it over the repayment period.
 */
export function fullyDrawnPayments(line: number, rate: number, repayYears: number) {
  return {
    interestOnly: (line * rate) / 100 / 12,
    amortized: payment(line, rate, Math.round(repayYears * 12)),
  };
}

export type Row = {
  cap: number;
  custom: boolean;
  line: number;
  /** Null when no rate was given. */
  payments: ReturnType<typeof fullyDrawnPayments> | null;
};

/** One row per cap: the three choices, then the custom cap if given and not already listed. */
export function limitRows(i: Inputs): Row[] {
  const caps: { cap: number; custom: boolean }[] = HELOC_CAP_CHOICES.map((cap) => ({ cap, custom: false }));
  if (i.customCap !== null && i.customCap > 0 && !caps.some((c) => c.cap === i.customCap)) {
    caps.push({ cap: i.customCap, custom: true });
    caps.sort((a, b) => a.cap - b.cap);
  }
  return caps.map(({ cap, custom }) => {
    const line = availableLine(i, cap);
    return { cap, custom, line, payments: i.rate === null ? null : fullyDrawnPayments(line, i.rate, i.repayYears) };
  });
}

/**
 * True when no cap on the page leaves any line: everything owed is already
 * at or above the highest cap times the value.
 */
export function equityTooThin(i: Inputs) {
  return limitRows(i).every((r) => r.line <= 0);
}

import fred from "./fred.json";
import { PMMS } from "./pmms";

/**
 * The rates page's data model.
 *
 * Seven figures from three publishers, every one fetched at build time and
 * shown exactly as published. See the alteration notes in scripts/fetch-fred.mjs
 * and lib/pmms.ts before touching any of the numbers.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ STALENESS IS PER SERIES, NOT PER PAGE.                               │
 * │                                                                      │
 * │ A Treasury yield is published every business day; the G.19 consumer  │
 * │ credit rates are quarterly. One page-wide "as of" would be wrong for │
 * │ six of the seven cards, and one page-wide max age would either hide  │
 * │ a perfectly current quarterly rate or show a Treasury yield weeks    │
 * │ after it stopped being true.                                         │
 * │                                                                      │
 * │ So every card carries its own date and its own maxAgeDays, and each  │
 * │ disappears on its own. The page renders whatever is still fresh.     │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * WHAT IS NOT HERE, AND WHY. Both are deliberate absences the page states
 * rather than leaving as gaps:
 *
 *  - The S&P 500. FRED carries it, but S&P Dow Jones Indices marks it
 *    "Copyrighted: Pre-Approval Required" and states that reproduction in any
 *    form is prohibited without their prior written permission. Republishing
 *    it here would need a licence we do not have.
 *  - A high-yield savings APY. No authority publishes one. The FDIC's national
 *    savings rate is a deposit-share-weighted average across every insured
 *    institution, which is a different thing entirely and would be misleading
 *    under that name.
 */

type Raw = {
  ok?: boolean;
  series?: Record<string, { value?: number; date?: string; series?: string }>;
};

const data = fred as Raw;

export type RateCategory = "Home" | "Money" | "Debt" | "Auto";

export type Rate = {
  key: string;
  /** What the figure is, in the reader's words. */
  label: string;
  /** Exactly as published. Never transform this. */
  value: number;
  /** ISO date of the observation the figure belongs to. */
  date: string;
  /** Rendered observation date, shown on the card. */
  dateLabel: string;
  /** Who published it, shown on the card. */
  source: string;
  /** How often the publisher releases it, so the date reads as intended. */
  cadence: string;
  category: RateCategory;
  /** The calculator this figure is actually useful in. */
  calculator: string;
  /** One line of context — what the number is and is not. */
  note: string;
};

/**
 * How old each series may be before its card disappears.
 *
 * Set from the publication interval plus enough slack for one missed release
 * and a late rebuild, the same reasoning as PMMS_MAX_AGE_DAYS. A figure past
 * its window is not shown at all: a wrong rate presented confidently is worse
 * than a missing one, because somebody will plan around it.
 */
const MAX_AGE_DAYS: Record<string, number> = {
  treasury10: 5,
  treasury30: 5,
  mortgage30: 10,
  mortgage15: 10,
  cd12: 45,
  creditCard: 120,
  personalLoan: 120,
  autoNew48: 120,
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function fresh(key: string, date: string): boolean {
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  const ageDays = (Date.now() - t) / 86_400_000;
  // A future-dated observation means something is wrong with the feed or the
  // clock; treat it as unusable rather than publishing it.
  if (ageDays < -1) return false;
  return ageDays <= (MAX_AGE_DAYS[key] ?? 30);
}

type Def = Omit<Rate, "value" | "date" | "dateLabel">;

const DEFS: Record<string, Def> = {
  mortgage30: {
    key: "mortgage30",
    label: "30-year fixed mortgage",
    source: "Freddie Mac Primary Mortgage Market Survey",
    cadence: "Weekly, Thursdays",
    category: "Home",
    calculator: "mortgage-payment",
    note: "A national average across lenders, not a quote. What you are offered depends on your credit, the property and the lender.",
  },
  mortgage15: {
    key: "mortgage15",
    label: "15-year fixed mortgage",
    source: "Freddie Mac Primary Mortgage Market Survey",
    cadence: "Weekly, Thursdays",
    category: "Home",
    calculator: "mortgage-payment",
    note: "Lower rate, higher payment — the shorter term is what buys the rate. Worth running both before assuming it is cheaper.",
  },
  treasury10: {
    key: "treasury10",
    label: "10-year Treasury",
    source: "Board of Governors of the Federal Reserve System (H.15)",
    cadence: "Every business day",
    category: "Money",
    calculator: "required-rate-of-return",
    note: "The closest thing to a risk-free return over ten years, and the usual yardstick for whether an investment is worth its risk.",
  },
  treasury30: {
    key: "treasury30",
    label: "30-year Treasury",
    source: "Board of Governors of the Federal Reserve System (H.15)",
    cadence: "Every business day",
    category: "Money",
    calculator: "required-rate-of-return",
    note: "The long end of the curve. Mortgage rates track it loosely, which is why it moves before the rate you are quoted does.",
  },
  cd12: {
    key: "cd12",
    label: "12-month CD",
    source: "FDIC national rate",
    cadence: "Monthly, third Monday",
    category: "Money",
    calculator: "savings-apy",
    note: "A national AVERAGE across every insured institution, weighted by deposits — and well below what shopping around finds. Online banks routinely pay several times this. The gap is the point: it is what not shopping costs you.",
  },
  creditCard: {
    key: "creditCard",
    label: "Credit card APR",
    source: "Board of Governors of the Federal Reserve System (G.19)",
    cadence: "Quarterly",
    category: "Debt",
    calculator: "debt-payoff",
    note: "Averaged across all credit card accounts at reporting commercial banks. Accounts actually carrying a balance are charged more than this.",
  },
  personalLoan: {
    key: "personalLoan",
    label: "Personal loan, 24-month",
    source: "Board of Governors of the Federal Reserve System (G.19)",
    cadence: "Quarterly",
    category: "Debt",
    calculator: "debt-consolidation",
    note: "Two-year personal loans at commercial banks. The figure people compare against a credit card when deciding whether consolidating is worth it.",
  },
  autoNew48: {
    key: "autoNew48",
    label: "New car loan, 48-month",
    source: "Board of Governors of the Federal Reserve System (G.19)",
    cadence: "Quarterly",
    category: "Auto",
    calculator: "auto-affordability",
    note: "48 months on a NEW car at a commercial bank — that exact term, not the 60 or 72 months most car loans now run to, and not a used-car rate. Both cost more. It is the only auto term the Federal Reserve still publishes.",
  },
};

function build(): Rate[] {
  const out: Rate[] = [];

  const push = (key: string, value: number | null | undefined, date: string | undefined) => {
    const def = DEFS[key];
    if (!def || typeof value !== "number" || !Number.isFinite(value) || !date) return;
    if (!fresh(key, date)) return;
    out.push({ ...def, value, date, dateLabel: fmtDate(date) });
  };

  // The two mortgage rates come from the survey the site already downloads
  // weekly for the home page; the 15-year is column D of the same sheet.
  if (PMMS) {
    push("mortgage30", PMMS.rate30, PMMS.week);
    push("mortgage15", PMMS.rate15, PMMS.week);
  }

  if (data?.ok && data.series) {
    for (const key of ["treasury10", "treasury30", "cd12", "creditCard", "personalLoan", "autoNew48"]) {
      const s = data.series[key];
      push(key, s?.value, s?.date);
    }
  }

  return out;
}

/** Every rate fit to show, in no particular order. Evaluated at build time. */
export const RATES: Rate[] = build();

export const RATE_CATEGORIES: RateCategory[] = ["Home", "Money", "Debt", "Auto"];

export const ratesIn = (c: RateCategory) => RATES.filter((r) => r.category === c);

/** True when there is anything at all to show — the page and the home page
 *  signpost both hide entirely when this is false. */
export const HAS_RATES = RATES.length > 0;

/**
 * Required verbatim by the FRED API terms of use. It must appear wherever
 * FRED-sourced figures do.
 */
export const FRED_NOTICE =
  "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.";

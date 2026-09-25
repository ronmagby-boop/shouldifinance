import raw from "./pmms.json";

/**
 * Freddie Mac's Primary Mortgage Market Survey — the 30-year fixed average.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DO NOT ALTER THE RATE.                                               │
 * │                                                                      │
 * │ Freddie Mac permits use with attribution and states that "alteration │
 * │ of this document or its content is strictly prohibited." Display     │
 * │ `rate30` exactly as it arrives. Do not round it, re-derive it from   │
 * │ the 15-year figure, average it across weeks, or reformat it to a     │
 * │ fixed number of decimals — 6.9 and 6.90 are different claims about   │
 * │ precision and only one of them is Freddie Mac's.                     │
 * │                                                                      │
 * │ Attribution must appear wherever the rate does.                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * The figure is baked in at build time by scripts/fetch-pmms.mjs, so a visitor's
 * browser does not contact Freddie Mac to show it. That is a deliberate choice
 * about this feature, not a promise about the whole site: the site does use
 * measurement and will carry advertising, and the privacy policy says so. What
 * is promised is narrower and unconditional — figures typed into a calculator
 * are never transmitted. Nothing here touches those.
 */

type Payload = {
  ok?: boolean;
  rate30?: number;
  rate15?: number | null;
  week?: string;
  fetchedAt?: string;
  attribution?: string;
};

const data = raw as Payload;

/**
 * How old a survey may be before it is no longer shown.
 *
 * The PMMS publishes every Thursday, so a healthy feed is never more than 7
 * days behind. Ten days absorbs one missed publication plus a late rebuild and
 * still guarantees that anything displayed is at most one survey old. Past
 * that the banner disappears rather than presenting a stale rate as current —
 * a wrong rate shown confidently is worse than no rate at all, because someone
 * will plan around it.
 */
export const PMMS_MAX_AGE_DAYS = 10;

export type Pmms = {
  /** Exactly as published. Never transform this. */
  rate30: number;
  /** The 15-year from the same survey week, or null if the sheet had none. */
  rate15: number | null;
  /** ISO date of the week the survey covers. */
  week: string;
  /** Rendered survey date, for display next to the rate. */
  weekLabel: string;
  attribution: string;
};

function read(): Pmms | null {
  if (!data?.ok || typeof data.rate30 !== "number" || !data.week) return null;

  const week = Date.parse(`${data.week}T00:00:00Z`);
  if (Number.isNaN(week)) return null;

  const ageDays = (Date.now() - week) / 86_400_000;
  // A future-dated survey means something is wrong with the source or the
  // clock; treat it the same as stale rather than publishing it.
  if (ageDays < -1 || ageDays > PMMS_MAX_AGE_DAYS) return null;

  return {
    rate30: data.rate30,
    rate15: typeof data.rate15 === "number" ? data.rate15 : null,
    week: data.week,
    weekLabel: new Date(week).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    attribution: data.attribution || "Freddie Mac Primary Mortgage Market Survey",
  };
}

/**
 * The current survey, or null when there is nothing fit to show — no data, a
 * failed fetch, or a rate older than PMMS_MAX_AGE_DAYS. Callers render nothing
 * on null; there is deliberately no fallback figure to fall back to.
 *
 * Evaluated once at module load, which on a static build is build time.
 */
export const PMMS: Pmms | null = read();

/**
 * Social Security claiming age: the rules both /calculators/retirement-savings
 * and /calculators/when-to-start-social-security use, kept in one place so the
 * two pages cannot disagree.
 *
 * Every figure below is from SSA's or the IRS's own pages, read 14 October
 * 2026 and saved in content/quote-sources.json.
 *
 * Amounts are in today's dollars throughout. Benefits receive an annual
 * cost-of-living adjustment (42 U.S.C. 415(i)), which keeps them roughly level
 * in real terms, so a benefit stated in today's dollars stays that size.
 */

/**
 * SSA, "Starting Your Retirement Benefits Early": "You can start receiving
 * your Social Security retirement benefits as early as age 62." SSA, "Delayed
 * Retirement Credits": "The benefit increase stops when you reach age 70."
 */
export const SS_EARLIEST_CLAIM_AGE = 62;
export const SS_LATEST_CREDIT_AGE = 70;

/**
 * Full retirement age by year of birth, in months: SSA's "Full Retirement and
 * Age 62 Benefit By Year Of Birth" table. 1943-1954: 66; 1955: 66 and 2
 * months; 1956: 66 and 4; 1957: 66 and 6; 1958: 66 and 8; 1959: 66 and 10;
 * "1960 and later": 67. SSA: "If you were born on January 1st, you should
 * refer to the previous year." Birth years before 1943 are treated as 1943:
 * they also have different delayed credit rates, and anyone born then is past
 * 70 already.
 */
export const SS_FIRST_BIRTH_YEAR = 1943;
export function fullRetirementAgeMonths(birthYear: number): number {
  const y = Math.floor(birthYear);
  if (y <= 1954) return 66 * 12;
  if (y >= 1960) return 67 * 12;
  return 66 * 12 + (y - 1954) * 2;
}

/**
 * SSA Office of the Chief Actuary, "Benefit Reduction for Early Retirement":
 * "The percentage reduction is 5/9 of 1% per month for the first 36 months
 * and 5/12 of 1% for each additional month."
 */
export const SS_EARLY_REDUCTION = { firstMonths: 36, firstPctPerMonth: 5 / 9, laterPctPerMonth: 5 / 12 } as const;

/**
 * SSA, "Delayed Retirement Credits", for those born "1943 or later": a
 * "12-Month Rate of Increase" of 8.0%, "Monthly Rate of Increase" "2/3 of
 * 1%", until 70.
 */
export const SS_DELAYED_CREDIT_PCT_PER_MONTH = 2 / 3;

/** A claiming age in years, held to 62-70 and to whole months. */
export const clampClaimAgeMonths = (ageYears: number) =>
  Math.round(Math.min(SS_LATEST_CREDIT_AGE, Math.max(SS_EARLIEST_CLAIM_AGE, ageYears)) * 12);

/**
 * The percentage change from the full-retirement-age benefit for claiming at
 * a given age: negative before full retirement age, positive after it.
 * Born 1960 or later: −30% at 62 (36 × 5/9 + 24 × 5/12), +24% at 70 (36 × 2/3).
 */
export function claimAdjustmentPct(birthYear: number, claimAgeYears: number): number {
  const fra = fullRetirementAgeMonths(birthYear);
  const claim = clampClaimAgeMonths(claimAgeYears);
  if (claim < fra) {
    const early = fra - claim;
    const first = Math.min(early, SS_EARLY_REDUCTION.firstMonths);
    const later = Math.max(0, early - SS_EARLY_REDUCTION.firstMonths);
    return -(first * SS_EARLY_REDUCTION.firstPctPerMonth + later * SS_EARLY_REDUCTION.laterPctPerMonth);
  }
  return (claim - fra) * SS_DELAYED_CREDIT_PCT_PER_MONTH;
}

/** The monthly benefit for claiming at an age, from the benefit at full retirement age. */
export const benefitAt = (benefitAtFra: number, birthYear: number, claimAgeYears: number) =>
  Math.max(0, benefitAtFra) * (1 + claimAdjustmentPct(birthYear, claimAgeYears) / 100);

/* ----------------------------------------------------------------------------
 * Comparing claiming ages.
 * ------------------------------------------------------------------------- */

/** Today as a fractional calendar year: 14 October 2026 is about 2026.79. */
export function yearFraction(today: Date): number {
  const y = today.getFullYear();
  const start = new Date(y, 0, 1).getTime();
  const next = new Date(y + 1, 0, 1).getTime();
  return y + (today.getTime() - start) / (next - start);
}

/**
 * True when a claiming age has certainly passed. Only the birth year is
 * known, so someone born in year B reaches age A somewhere between B + A
 * and B + A + 1; the age has certainly passed once today is past the later
 * of the two. Erring this way never tells a reader an option is gone while
 * it may still be open.
 */
export const claimAgePassed = (birthYear: number, claimAgeYears: number, today: Date) =>
  Math.floor(birthYear) + claimAgeYears + 1 <= yearFraction(today);

/** Benefits received by an age, claiming at `claimAge`: the benefit for every month since. */
export const cumulativeBy = (benefit: number, claimAge: number, age: number) =>
  benefit * 12 * Math.max(0, age - claimAge);

/**
 * The age at which claiming later has paid out as much in total as claiming
 * earlier: B1 × (x − a1) = B2 × (x − a2), so x = (B2·a2 − B1·a1) / (B2 − B1).
 * Null if the later benefit is not larger, when it never catches up.
 */
export function breakEvenAge(earlyAge: number, earlyBenefit: number, lateAge: number, lateBenefit: number): number | null {
  if (lateBenefit <= earlyBenefit) return null;
  return (lateBenefit * lateAge - earlyBenefit * earlyAge) / (lateBenefit - earlyBenefit);
}

/** The oldest age the investing comparison looks to. */
export const SS_COMPARE_MAX_AGE = 110;

/**
 * Benefits received by an age, each invested as it arrives at `annualReturn`
 * (percent, compounding monthly): the future value of a monthly payment
 * received at the start of each month since the claim. At 0% it is the plain
 * total, counted in whole months.
 */
export function investedBy(benefit: number, claimAge: number, age: number, annualReturn: number): number {
  const n = Math.max(0, Math.round((age - claimAge) * 12));
  const r = annualReturn / 100 / 12;
  if (r === 0) return benefit * n;
  return benefit * (((1 + r) ** n - 1) / r) * (1 + r);
}

/**
 * The break-even age when early benefits are invested at `annualReturn`: the
 * first whole month at which the later claim's invested total catches up.
 * Null if it does not by SS_COMPARE_MAX_AGE.
 */
export function investedBreakEvenAge(
  earlyAge: number, earlyBenefit: number, lateAge: number, lateBenefit: number, annualReturn: number,
): number | null {
  if (lateBenefit <= earlyBenefit) return null;
  for (let m = Math.round(lateAge * 12); m <= SS_COMPARE_MAX_AGE * 12; m++) {
    const age = m / 12;
    if (investedBy(lateBenefit, lateAge, age, annualReturn) >= investedBy(earlyBenefit, earlyAge, age, annualReturn) - 1e-9) return age;
  }
  return null;
}

/* ----------------------------------------------------------------------------
 * The earnings test. UPDATE EACH YEAR: SSA publishes the next year's exempt
 * amounts each autumn, on its "Exempt Amounts Under the Earnings Test" page
 * (ssa.gov/oact/cola/rtea.html), which lists 2026: $24,480 and $65,160, and
 * 2027: $25,560 and $67,920. SSA, "Receiving Benefits While Working": "If you
 * are under full retirement age for the entire year, we deduct $1 from your
 * benefit payments for every $2 you earn above the annual limit. For 2026,
 * that limit is $24,480." and "In the year you reach full retirement age, we
 * deduct $1 in benefits for every $3 you earn above a different limit. In
 * 2026, this limit on your earnings is $65,160."
 * ------------------------------------------------------------------------- */
export const EARNINGS_TEST = { year: 2026, lower: 24_480, higher: 65_160 } as const;
export const EARNINGS_TEST_NEXT = { year: 2027, lower: 25_560, higher: 67_920 } as const;

/* ----------------------------------------------------------------------------
 * Tax on benefits: IRS Publication 915 (2025). "Your base amount is: $25,000
 * if you are single, head of household, or qualifying surviving spouse; ...
 * $32,000 if you are married filing jointly". "Generally, up to 50% of your
 * benefits will be taxable. However, up to 85% of your benefits can be taxable
 * if ... The total of one-half of your benefits and all your other income is
 * more than $34,000 ($44,000 if you are married filing jointly)." Set in
 * 26 U.S.C. 86; recheck when the publication is reissued each year.
 * ------------------------------------------------------------------------- */
export const BENEFIT_TAX_BASE = { single: 25_000, joint: 32_000 } as const;
export const BENEFIT_TAX_85_THRESHOLD = { single: 34_000, joint: 44_000 } as const;

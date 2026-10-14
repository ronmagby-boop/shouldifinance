// Tests for lib/retirement.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { adjustedBenefit, defaultClaimAge, project } from "./retirement.ts";
import { claimAdjustmentPct, fullRetirementAgeMonths } from "./socialSecurity.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

test("full retirement age by birth year, from SSA's table", () => {
  assert.equal(fullRetirementAgeMonths(1950), 66 * 12);
  assert.equal(fullRetirementAgeMonths(1954), 66 * 12);
  assert.equal(fullRetirementAgeMonths(1955), 66 * 12 + 2);
  assert.equal(fullRetirementAgeMonths(1958), 66 * 12 + 8);
  assert.equal(fullRetirementAgeMonths(1959), 66 * 12 + 10);
  assert.equal(fullRetirementAgeMonths(1960), 67 * 12);
  assert.equal(fullRetirementAgeMonths(1990), 67 * 12);
});

test("claiming at 62, born 1960 or later: 36 × 5/9% + 24 × 5/12% = a 30% reduction", () => {
  near(claimAdjustmentPct(1960, 62), -30, 1e-9);
  near(claimAdjustmentPct(1985, 62), -30, 1e-9);
  // SSA's table: born 1955, 50 months early, 25.83%.
  near(claimAdjustmentPct(1955, 62), -(20 + 14 * 5 / 12), 1e-9);
  near(claimAdjustmentPct(1955, 62), -25.83, 0.005);
  // Born 1954, 48 months early: 25.00%.
  near(claimAdjustmentPct(1954, 62), -25, 1e-9);
  // Two years early, all within the first 36 months: 24 × 5/9% = 13.33%.
  near(claimAdjustmentPct(1970, 65), -40 / 3, 1e-9);
  assert.equal(claimAdjustmentPct(1970, 67), 0);
  // Before 62 is held to 62.
  near(claimAdjustmentPct(1970, 60), -30, 1e-9);
});

test("claiming at 70, born 1960 or later: 36 months × 2/3% = a 24% increase, and no more after 70", () => {
  near(claimAdjustmentPct(1960, 70), 24, 1e-9);
  near(claimAdjustmentPct(1960, 72), 24, 1e-9);
  // Born 1954: four years of credits, 32%.
  near(claimAdjustmentPct(1954, 70), 32, 1e-9);
  near(claimAdjustmentPct(1960, 68), 8, 1e-9);
});

test("the adjusted benefit: $2,000 at full retirement age is $1,400 at 62 and $2,480 at 70", () => {
  near(adjustedBenefit({ mode: "fra", benefitAtFra: 2000, birthYear: 1965, claimAge: 62 }), 1400, 1e-9);
  near(adjustedBenefit({ mode: "fra", benefitAtFra: 2000, birthYear: 1965, claimAge: 67 }), 2000, 1e-9);
  near(adjustedBenefit({ mode: "fra", benefitAtFra: 2000, birthYear: 1965, claimAge: 70 }), 2480, 1e-9);
});

test("\"I already have my estimate\": the amount is taken as entered, whatever the age", () => {
  assert.equal(adjustedBenefit({ mode: "asEntered", benefit: 1500, claimAge: 62 }), 1500);
  assert.equal(adjustedBenefit({ mode: "asEntered", benefit: 1500, claimAge: 70 }), 1500);
});

test("the default claiming age is full retirement age, or the retirement age if later, never past 70", () => {
  assert.equal(defaultClaimAge(1960, 60), 67);
  assert.equal(defaultClaimAge(1957, 60), 66.5);
  assert.equal(defaultClaimAge(1960, 68), 68);
  assert.equal(defaultClaimAge(1960, 75), 70);
});

// Retire at 55 with $1,000,000, plan to 75, want $5,000 a month; Social Security
// of $2,000 starts at 65. With 0% returns and 0% inflation it is all addition:
// ten years at $5,000, then ten at $3,000.
const bridge = {
  age: 54, retireAge: 55, planThroughAge: 75, savings: 1_000_000, contribution: 0,
  preReturn: 0, postReturn: 0, income: 5000, inflation: 0,
  ss: { mode: "asEntered", benefit: 2000, claimAge: 65 },
};

test("retire 55, claim 65: savings fund the whole $5,000 for ten years, then $3,000", () => {
  const r = project(bridge);
  assert.equal(r.bridgeMonths, 120);
  near(r.nestEgg, 1_000_000, 1e-6);
  near(r.firstDraw, 5000, 1e-9);
  near(r.drawAfterClaimToday, 3000, 1e-9);
  near(r.needed, 120 * 5000 + 120 * 3000, 1e-6); // $960,000
  near(r.gap, 40_000, 1e-6);
  near(r.endingBalance, 40_000, 1e-6);
  assert.equal(r.ranOut, false);
  // The bridge's extra draw: $2,000 a month for 120 months.
  near(r.bridgeExtraToday, 2000, 1e-9);
  near(r.bridgeExtraTotalToday, 240_000, 1e-9);
  near(r.bridgeCost, 240_000, 1e-6);
  // The balance on the day Social Security starts: $1,000,000 − 120 × $5,000.
  near(r.combined[r.accumBalances.length - 1 + 120], 400_000, 1e-6);
});

test("retire 55, claim 65 from the statement's full-retirement-age figure: $2,400 at 67 is $2,080 at 65", () => {
  const r = project({ ...bridge, ss: { mode: "fra", benefitAtFra: 2400, birthYear: 1971, claimAge: 65 } });
  near(r.benefit, 2080, 1e-9); // 24 months early: −13.33%
  near(r.needed, 120 * 5000 + 120 * (5000 - 2080), 1e-6); // $950,400
});

test("claiming before retiring leaves no bridge; Social Security covers its share from the first month", () => {
  const r = project({ ...bridge, retireAge: 66, age: 65, planThroughAge: 76, ss: { mode: "asEntered", benefit: 2000, claimAge: 62 } });
  assert.equal(r.bridgeMonths, 0);
  near(r.firstDraw, 3000, 1e-9);
  assert.equal(r.bridgeCost, 0);
  near(r.needed, 120 * 3000, 1e-6);
});

test("claiming at retirement reproduces the previous model, with returns and inflation", () => {
  // Discount (income − benefit), inflated yearly from retirement, at the monthly return, written out independently.
  const i = {
    age: 35, retireAge: 65, planThroughAge: 92, savings: 120000, contribution: 1600,
    preReturn: 7, postReturn: 5, income: 6000, inflation: 2.5,
    ss: { mode: "asEntered", benefit: 2200, claimAge: 65 },
  };
  const r = project(i);
  const postR = 0.05 / 12;
  let d = 3800 * 1.025 ** 30;
  let pv = 0;
  for (let m = 0; m < 27 * 12; m++) {
    if (m > 0 && m % 12 === 0) d *= 1.025;
    pv += d / (1 + postR) ** (m + 1);
  }
  near(r.needed, pv, 1e-6);
  assert.equal(r.bridgeMonths, 0);
});

test("inflation in the bridge: the first draw is the full income inflated to the retirement date", () => {
  const r = project({ ...bridge, inflation: 2, age: 45, retireAge: 55 });
  near(r.firstDraw, 5000 * 1.02 ** 10, 1e-9);
});

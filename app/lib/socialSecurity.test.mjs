// Tests for lib/socialSecurity.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BENEFIT_TAX_BASE, EARNINGS_TEST, benefitAt, breakEvenAge, claimAgePassed, cumulativeBy, investedBreakEvenAge, investedBy,
} from "./socialSecurity.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

test("SSA's own example: $2,000 at 67 is $1,400 at 62 and $2,480 at 70, and each age between", () => {
  // SSA Publication 05-10147's chart, for a full retirement age of 67.
  const ssa = { 62: 1400, 63: 1500, 64: 1600, 65: 1733, 66: 1867, 67: 2000, 68: 2160, 69: 2320, 70: 2480 };
  for (const [age, amount] of Object.entries(ssa)) near(benefitAt(2000, 1962, Number(age)), amount, 0.5, `age ${age}`);
  near(benefitAt(2000, 1962, 62), 1400, 1e-9);
  near(benefitAt(2000, 1962, 70), 2480, 1e-9);
});

test("cumulative benefits by an age: the benefit for every month since the claim", () => {
  assert.equal(cumulativeBy(1400, 62, 72), 1400 * 120);
  assert.equal(cumulativeBy(2480, 70, 65), 0);
});

test("break-even ages for the $2,000 example", () => {
  // 62 vs 67: (2,000 × 67 − 1,400 × 62) / 600 = 47,200 / 600 = 78.67, 78 years 8 months.
  near(breakEvenAge(62, 1400, 67, 2000), 47200 / 600, 1e-9);
  near(breakEvenAge(62, 1400, 67, 2000), 78 + 8 / 12, 1e-9);
  // 67 vs 70: (2,480 × 70 − 2,000 × 67) / 480 = 39,600 / 480 = 82.5.
  near(breakEvenAge(67, 2000, 70, 2480), 82.5, 1e-9);
  // 62 vs 70: (2,480 × 70 − 1,400 × 62) / 1,080 = 86,800 / 1,080 = 80.37.
  near(breakEvenAge(62, 1400, 70, 2480), 86800 / 1080, 1e-9);
  // And the totals really are equal there.
  const x = breakEvenAge(62, 1400, 70, 2480);
  near(cumulativeBy(1400, 62, x), cumulativeBy(2480, 70, x), 1e-6);
  // No larger benefit, no break-even.
  assert.equal(breakEvenAge(62, 1400, 67, 1400), null);
});

test("investing early benefits: at 0% it is the plain break-even; a return pushes it later, or past 110", () => {
  // 0%: the first whole month at or after 78 years 8 months.
  near(investedBreakEvenAge(62, 1400, 67, 2000, 0), 78 + 8 / 12, 1e-9);
  const at3 = investedBreakEvenAge(62, 1400, 67, 2000, 3);
  assert.ok(at3 > 79 && at3 < 110, `3%: ${at3}`);
  assert.equal(investedBreakEvenAge(62, 1400, 70, 2480, 8), null);
});

test("invested totals: $100 a month for 12 months at 12% (1% a month), each invested as it arrives", () => {
  // Annuity due: 100 × ((1.01^12 − 1) / 0.01) × 1.01 = $1,280.93.
  near(investedBy(100, 62, 63, 12), 100 * ((1.01 ** 12 - 1) / 0.01) * 1.01, 1e-9);
  near(investedBy(100, 62, 63, 12), 1280.93, 0.005);
  assert.equal(investedBy(100, 62, 63, 0), 1200);
});

test("dated constants: the 2026 earnings test and Publication 915's base amounts", () => {
  assert.deepEqual({ ...EARNINGS_TEST }, { year: 2026, lower: 24480, higher: 65160 });
  assert.deepEqual({ ...BENEFIT_TAX_BASE }, { single: 25000, joint: 32000 });
});

test("claiming ages already passed, from the birth year and today's date (14 October 2026)", () => {
  const today = new Date(2026, 9, 14);
  // Born 1960: everyone had turned 65 by the end of 2025, so 62 to 65 have
  // certainly passed; the 66th birthday falls this year and may not have come yet.
  const passed1960 = [62, 63, 64, 65, 66, 67, 70].filter((a) => claimAgePassed(1960, a, today));
  assert.deepEqual(passed1960, [62, 63, 64, 65]);
  // Born 1964 (the example): 62 falls this year, so nothing has certainly passed.
  assert.equal(claimAgePassed(1964, 62, today), false);
  // A full retirement age of 66 and 6 months, born 1957: passed by mid-2024 at the latest.
  assert.equal(claimAgePassed(1957, 66.5, today), true);
  // Born 1955: 70 passed by the end of 2025, so every age has; born 1956, 70 is still ahead.
  assert.equal(claimAgePassed(1955, 70, today), true);
  assert.equal(claimAgePassed(1956, 70, today), false);
  // On 1 January the year just ended counts in full.
  assert.equal(claimAgePassed(1963, 62, new Date(2026, 0, 1)), true);
});

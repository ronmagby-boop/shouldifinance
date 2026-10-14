// Tests for lib/carPayoff.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, schedule } from "./carPayoff.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

const base = { balance: 12000, apr: 0, months: 24, currentPayment: null, extraMonthly: 0, lumpSum: 0, altReturn: 0, penalty: 0 };

test("a 0% loan: prepaying saves no interest, and investing the money instead comes out ahead", () => {
  // $12,000 over 24 months is $500 a month; $100 extra clears it in 12,000 / 600 = 20 months.
  const r = analyze({ ...base, extraMonthly: 100 });
  near(r.monthly, 500, 1e-9);
  assert.equal(r.fastMonths, 20);
  assert.equal(r.monthsSooner, 4);
  assert.equal(r.interestSaved, 0);
  assert.equal(r.guaranteedReturn, 0);
  // At a 0% alternative the two paths end level; at any positive return investing wins.
  near(r.prepayAdvantage, 0, 1e-6);
  assert.ok(analyze({ ...base, extraMonthly: 100, altReturn: 4 }).prepayAdvantage < 0);
});

test("$10,000 at 6% over 12 months: $860.66 a month, and a lump sum that clears it saves all $327.97 of interest", () => {
  // r = 0.5%: 10,000 × 0.005 × 1.005^12 / (1.005^12 − 1) = $860.66.
  const r = analyze({ ...base, balance: 10000, apr: 6, months: 12, lumpSum: 10000 });
  near(r.monthly, (10000 * 0.005 * 1.005 ** 12) / (1.005 ** 12 - 1), 1e-9);
  near(r.monthly, 860.66, 0.005);
  near(r.baseInterest, 12 * r.monthly - 10000, 1e-6); // $327.97
  near(r.baseInterest, 327.97, 0.01);
  assert.equal(r.fastMonths, 0);
  near(r.interestSaved, r.baseInterest, 1e-9);
  // The whole payment is freed for all 12 months.
  assert.equal(r.freedMonths, 12);
  near(r.freedMonthly, r.monthly, 1e-9);
});

test("the remaining months can come from the current payment instead", () => {
  const r = analyze({ ...base, balance: 10000, apr: 6, months: null, currentPayment: 860.67 });
  assert.equal(r.months, 12);
});

test("prepaying earns exactly the loan's rate: at an alternative return equal to the APR the two paths tie", () => {
  const i = { ...base, balance: 20000, apr: 7, months: 48, extraMonthly: 150, lumpSum: 1000, altReturn: 7 };
  const r = analyze(i);
  near(r.prepayAdvantage, 0, 0.01);
  // Below the loan's rate prepaying wins; above it investing does.
  assert.ok(analyze({ ...i, altReturn: 4 }).prepayAdvantage > 0);
  assert.ok(analyze({ ...i, altReturn: 10 }).prepayAdvantage < 0);
  assert.ok(r.interestSaved > 0 && r.fastMonths < 48);
});

test("a prepayment penalty comes off the saving, dollar for dollar at a 0% alternative", () => {
  const i = { ...base, balance: 20000, apr: 7, months: 48, extraMonthly: 150, altReturn: 0 };
  const without = analyze(i);
  const withPenalty = analyze({ ...i, penalty: 200 });
  near(withPenalty.netSaved, without.interestSaved - 200, 1e-9);
  near(withPenalty.prepayAdvantage, without.prepayAdvantage - 200, 1e-6);
  // No early payoff, no penalty.
  assert.equal(analyze({ ...i, extraMonthly: 0, penalty: 200 }).penalty, 0);
});

test("the schedule: the last payment is only what is left, and a payment below the interest never pays off", () => {
  const s = schedule(1000, 12, 100);
  assert.equal(s.months, 11); // n = −ln(1 − 10/100) / ln(1.01) = 10.59
  assert.ok(s.payments[10] < 100);
  near(s.payments.reduce((a, b) => a + b, 0), 1000 + s.totalInterest, 1e-9);
  assert.equal(schedule(1000, 24, 20), null); // $20 is exactly the month's interest
});

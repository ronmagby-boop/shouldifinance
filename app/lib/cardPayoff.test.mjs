// Tests for lib/cardPayoff.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MONTHS, minimumPayment, payFixed, payMinimum, paymentToClear, statementCheck,
} from "./cardPayoff.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

const plus1 = { kind: "interestPlusPct", pct: 1, floor: 25 };
const pct2 = { kind: "pctOfBalance", pct: 2, floor: 25 };

test("minimum payment formulas: interest plus 1%, or 2% of the balance, each with a $25 floor", () => {
  // $6,000 at 24%: $120 of interest, a $6,120 statement; $120 + $61.20.
  near(minimumPayment(plus1, 6120, 120), 181.2, 1e-9);
  near(minimumPayment(pct2, 6120, 120), 122.4, 1e-9);
  // The floor, and never more than the balance.
  assert.equal(minimumPayment(plus1, 500, 0), 25);
  assert.equal(minimumPayment(plus1, 10, 0), 10);
  assert.equal(minimumPayment(plus1, 0, 0), 0);
});

test("at 0% APR it is division: $1,000 at the $25 floor takes 40 months; $100 a month takes 10; no interest", () => {
  const min = payMinimum(1000, 0, plus1);
  assert.equal(min.paidOff, true);
  assert.equal(min.months, 40); // 1% of $1,000 is $10, so the $25 floor applies throughout
  assert.equal(min.totalInterest, 0);
  near(min.totalPaid, 1000, 1e-9);
  const fixed = payFixed(1000, 0, 100);
  assert.equal(fixed.months, 10);
  assert.equal(fixed.totalInterest, 0);
});

test("a fixed $100 on $1,000 at 12%: $10 of interest in month one, paid off in 11 months", () => {
  const r = payFixed(1000, 12, 100);
  near(r.balances[1], 910, 1e-9); // $1,000 + $10 − $100
  // n = −ln(1 − 0.01 × 1,000 / 100) / ln(1.01) = 10.59, so an eleventh, smaller payment.
  assert.equal(r.months, 11);
  near(r.totalPaid, 1000 + r.totalInterest, 1e-9);
  assert.ok(r.totalInterest > 50 && r.totalInterest < 60, `interest ${r.totalInterest}`);
});

test("the minimum shrinks as the balance falls", () => {
  const r = payMinimum(6000, 24, plus1);
  near(r.firstPayment, 181.2, 1e-9);
  assert.equal(r.paidOff, true);
  // The statement balance less the minimum: $6,120 − $181.20 = $5,938.80, 99% of $6,120 less the interest paid.
  near(r.balances[1], 6120 - 181.2, 1e-9);
  // As the balance falls, so does the minimum.
  assert.ok(payMinimum(r.balances[1], 24, plus1).firstPayment < r.firstPayment);
  assert.ok(r.months > 120, `months ${r.months}`);
});

test("a minimum that never pays off is detected in the first month, not looped on", () => {
  // 2% of the balance at 30% APR: $5,000 earns $125 of interest; the minimum is 2% of $5,125, $102.50.
  const r = payMinimum(5000, 30, pct2);
  assert.equal(r.paidOff, false);
  assert.equal(r.never, "payment-below-interest");
  assert.equal(r.months, 1);
  near(r.balances[1], 5125 - 102.5, 1e-9); // it grew
  // A fixed payment equal to the interest never pays off either: $1,000 at 24% with $20.
  const f = payFixed(1000, 24, 20);
  assert.equal(f.never, "payment-below-interest");
  // New charges can do it too: $200 a month of charges against a $200 payment at 0%.
  assert.equal(payFixed(1000, 0, 200, 200).never, "payment-below-interest");
});

test("a minimum that only covers new charges settles above zero, and is stopped there rather than run for 100 years", () => {
  // 3% of the balance, 0% APR, $100 of new charges a month: it falls toward the
  // statement balance where 3% is $100, $3,333, and stops making progress.
  const r = payMinimum(5000, 0, { kind: "pctOfBalance", pct: 3, floor: 25 }, 100);
  assert.equal(r.paidOff, false);
  assert.equal(r.never, "payment-below-interest");
  assert.ok(r.months < MAX_MONTHS, `months ${r.months}`);
  near(r.balances[r.balances.length - 1], 100 / 0.03 - 100, 0.01); // the balance after the payment, $3,233.33
});

test("the payment to clear a balance in a target number of months", () => {
  near(paymentToClear(1200, 0, 12), 100, 1e-9);
  near(paymentToClear(1200, 0, 12, 50), 150, 1e-9); // the charges have to be paid too
  // 1% a month for 12 months: 1,200 × 0.01 × 1.01^12 / (1.01^12 − 1) = $106.62.
  near(paymentToClear(1200, 12, 12), 106.62, 0.005);
  // And paying it does clear it in exactly 12 months, with or without charges.
  assert.equal(payFixed(1200, 12, paymentToClear(1200, 12, 12)).months, 12);
  assert.equal(payFixed(1200, 12, paymentToClear(1200, 12, 12, 75), 75).months, 12);
});

test("the statement check: years at the minimum, the 36-month payment, its cost and the savings", () => {
  const s = statementCheck(6000, 24, plus1);
  assert.equal(s.neverPaysOff, false);
  const min = payMinimum(6000, 24, plus1);
  // Over two years, so disclosed in whole years.
  assert.equal(s.disclosed.unit, "years");
  assert.equal(s.disclosed.value, Math.round(min.months / 12));
  // 6,000 × 0.02 × 1.02^36 / (1.02^36 − 1) = $235.40.
  near(s.payment36, (6000 * 0.02 * 1.02 ** 36) / (1.02 ** 36 - 1), 1e-9);
  near(s.payment36, 235.4, 0.01);
  near(s.total36, s.payment36 * 36, 1e-9);
  near(s.savings36, min.totalPaid - s.total36, 1e-9);
  assert.equal(s.show36, true);
});

test("the statement check: under two years is disclosed in months, and the 36-month figures are not required", () => {
  // $1,000 at 0% with a 20% minimum and a $25 floor: 20% of the balance, then the floor; about 15 months.
  const s = statementCheck(1000, 0, { kind: "pctOfBalance", pct: 20, floor: 25 });
  assert.equal(s.disclosed.unit, "months");
  assert.ok(s.disclosed.value < 24);
  assert.equal(s.show36, false);
});

test("the statement check: a minimum that never pays off gets the warning and the 36-month payment", () => {
  const s = statementCheck(5000, 30, pct2);
  assert.equal(s.neverPaysOff, true);
  near(s.payment36, (5000 * 0.025 * 1.025 ** 36) / (1.025 ** 36 - 1), 1e-9);
});

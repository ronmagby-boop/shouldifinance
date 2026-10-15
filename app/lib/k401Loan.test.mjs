// Tests for lib/k401Loan.ts and lib/distributionTax.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { jobChange, loanInterest, maxLoan, opportunityCost } from "./k401Loan.ts";
import { distributionTax } from "./distributionTax.ts";
import { taxOnExtraIncome } from "./tax.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

test("the limit: half the vested balance or $50,000, whichever is less (the IRS's own examples)", () => {
  assert.equal(maxLoan(40000), 20000); // IRS FAQ: "$40,000 ... $20,000"
  assert.equal(maxLoan(80000), 40000); // Bill
  assert.equal(maxLoan(120000), 50000); // Sue: half is $60,000, so $50,000
  assert.equal(maxLoan(100000), 50000);
});

test("the $10,000 exception: only if the plan includes it, and never more than the balance", () => {
  assert.equal(maxLoan(12000), 6000);
  assert.equal(maxLoan(12000, true), 10000);
  assert.equal(maxLoan(6000, true), 6000);
  assert.equal(maxLoan(30000, true), 15000); // half is already above $10,000
});

test("the payment: $10,000 at 6% over five years is $193.33 a month, $1,599.68 of interest to yourself", () => {
  const o = opportunityCost(10000, 6, 60, 6);
  near(o.payment, (10000 * 0.005 * 1.005 ** 60) / (1.005 ** 60 - 1), 1e-9);
  near(o.payment, 193.33, 0.005);
  near(o.interestToYourself, 1599.68, 0.01);
  near(loanInterest(10000, 6, 60), o.interestToYourself, 1e-9);
});

test("the real cost is the growth the money would have earned: nothing at 0%, the interest at the loan's own rate", () => {
  // At a 0% return you only paid yourself: the account ends $1,599.68 ahead and nothing is lost.
  near(opportunityCost(10000, 6, 60, 0).accountDifference, 1599.68, 0.01);
  near(opportunityCost(10000, 6, 60, 0).growthMissed, 0, 1e-6);
  // At a return equal to the loan's rate the account ends level, and the interest paid is the growth missed.
  near(opportunityCost(10000, 6, 60, 6).accountDifference, 0, 1e-6);
  near(opportunityCost(10000, 6, 60, 6).growthMissed, 1599.68, 0.01);
  // A higher return costs more.
  assert.ok(opportunityCost(10000, 6, 60, 8).growthMissed > 1599.68);
  // Contributions stopped for the term: $300 a month for 60 months at 0% is $18,000 missed.
  near(opportunityCost(10000, 6, 60, 0, 300).missedContributions, 18000, 1e-9);
  near(opportunityCost(10000, 6, 60, 0, 300).totalCost, 18000, 1e-6);
});

test("a 401(k) loan beats a credit card: $10,000 over five years at 24% costs $7,261 of interest", () => {
  const card = loanInterest(10000, 24, 60);
  near(card, 287.68 * 60 - 10000, 1); // $287.68 a month
  // At 6% with a 7% return the 401(k) loan costs the growth missed, between the interest ($1,600) and the card.
  const k = opportunityCost(10000, 6, 60, 7).totalCost;
  assert.ok(k > 1599.68 && k < 2000, `401(k) loan cost ${k}`);
  assert.ok(k < card);
});

test("against a HELOC the cash flows agree: the 401(k) loan's cost minus the HELOC's interest is the difference in what you end with", () => {
  // $10,000 at 8.5% from the plan (7% return) against 8% from a HELOC, both over five years.
  const o = opportunityCost(10000, 8.5, 60, 7);
  const heloc = loanInterest(10000, 8, 60);
  // Ending position on each path: the account, less everything paid, plus the $10,000 received.
  const kPath = o.withLoan - o.payment * 60;
  const hPath = o.withoutLoan - (10000 + heloc);
  near(hPath - kPath, o.totalCost - heloc, 1e-6);
});

test("leaving the job a year in: the outstanding balance is taxed as a distribution, with 10% under 59½", () => {
  // $10,000 at 6% over 60 months; after 12 payments
  // 10,000 × 1.005^12 − 193.33 × (1.005^12 − 1) / 0.005 = $8,231.97 is still owed.
  const tax = { otherIncome: 60000, status: "single", stateRatePct: 5, age: 40, exception: false };
  const j = jobChange(10000, 6, 60, 12, tax);
  near(j.outstanding, 8231.97, 0.01);
  near(j.penalty, 823.20, 0.01);
  near(j.stateTax, 411.60, 0.01);
  near(j.fedTax, taxOnExtraIncome(60000, j.outstanding, "single").tax, 1e-9);
  near(j.total, j.penalty + j.fedTax + j.stateTax, 1e-9);
  // At 60 the additional tax does not apply; after the last payment nothing is owed.
  assert.equal(jobChange(10000, 6, 60, 12, { ...tax, age: 60 }).penalty, 0);
  assert.equal(jobChange(10000, 6, 60, 60, tax).outstanding, 0);
});

test("the shared distribution tax: the same dollar taxed the same way the early withdrawal page taxes it", () => {
  const d = distributionTax({ taxable: 30000, otherIncome: 95000, status: "single", stateRatePct: 5, age: 40, exception: false });
  near(d.penalty, 3000, 1e-9);
  near(d.stateTax, 1500, 1e-9);
  near(d.fedTax, taxOnExtraIncome(95000, 30000, "single").tax, 1e-9);
  assert.equal(distributionTax({ taxable: 30000, otherIncome: 95000, status: "single", stateRatePct: 5, age: 40, exception: true }).penalty, 0);
});

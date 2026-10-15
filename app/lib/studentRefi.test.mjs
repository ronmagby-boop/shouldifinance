// Tests for lib/studentRefi.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./studentRefi.ts";
import { ibrMonthlyPayment } from "./studentLoans.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

const level = (p, annual, n) => {
  const r = annual / 1200;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
};

const base = {
  balance: 60000, federalRate: 6.5, federalMonths: 120, privateRate: 4.5, privateMonths: 120,
  agi: 60000, familySize: 1, forgiveness: false,
};

test("$60,000 over ten years: 6.5% federal against 4.5% private", () => {
  const r = analyze(base);
  near(r.federal.monthly, level(60000, 6.5, 120), 1e-9); // $681.29
  near(r.federal.monthly, 681.29, 0.005);
  near(r.refinanced.monthly, level(60000, 4.5, 120), 1e-9); // $621.83
  near(r.refinanced.monthly, 621.83, 0.005);
  near(r.federal.totalInterest, r.federal.monthly * 120 - 60000, 1e-6);
  near(r.interestSaved, (r.federal.monthly - r.refinanced.monthly) * 120, 1e-6);
  assert.equal(r.forgivenessWarning, false);
});

test("the same rate saves nothing", () => {
  const r = analyze({ ...base, privateRate: 6.5 });
  near(r.interestSaved, 0, 1e-9);
  near(r.paymentChange, 0, 1e-9);
});

test("a longer private term lowers the payment but can cost more interest", () => {
  const r = analyze({ ...base, privateRate: 5.5, privateMonths: 180 });
  assert.ok(r.paymentChange < 0);
  assert.ok(r.interestSaved < 0, `saved ${r.interestSaved}`);
});

test("income-driven payments from the plans calculator's logic: RAP and IBR on $60,000", () => {
  // RAP: $60,000 is in the 5% band, $3,000 a year, $250 a month; single, no dependents.
  const single = analyze(base).idr;
  near(single.rap, 250, 1e-9);
  // IBR: 150% of the $15,960 guideline is $23,940; 10% of $36,060 over 12 is $300.50, 15% is $450.75.
  near(single.ibrNew, 300.5, 1e-9);
  near(single.ibrPrior, 450.75, 1e-9);
  // A family of three: RAP less $50 for each of two dependents; IBR's line rises to $27,320.
  const three = analyze({ ...base, familySize: 3 }).idr;
  near(three.rap, 150, 1e-9);
  near(three.ibrNew, ((60000 - 27320 * 1.5) * 0.1) / 12, 1e-9); // $158.50
  near(three.ibrNew, ibrMonthlyPayment(60000, 3, 10), 1e-12);
  assert.equal(analyze({ ...base, agi: null }).idr, null);
});

test("large savings on a forgiveness path still carry the warning", () => {
  // 8% federal to 4% private saves thousands, but refinancing ends federal forgiveness eligibility.
  const r = analyze({ ...base, federalRate: 8, privateRate: 4, forgiveness: true });
  assert.ok(r.interestSaved > 10000, `saved ${r.interestSaved}`);
  assert.equal(r.forgivenessWarning, true);
});

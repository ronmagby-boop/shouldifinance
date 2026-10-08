// Tests for lib/rentalProperty.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, investmentLlpa, rentKeptShare } from "./rentalProperty.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

/** The textbook level payment, written out independently of lib/finance. */
const level = (p, annual, n) => {
  const r = annual / 1200;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
};

// $200,000, 20% down, at 0% over 30 years: a $160,000 loan at $444.44 a month.
// $1,500 rent; $2,400 tax and $1,200 insurance a year ($300 a month); nothing else.
const base = {
  price: 200000, downPct: 20, rate: 0, termYears: 30, closingCosts: 5000,
  rent: 1500, vacancyPct: 0, management: false, managementPct: 10, maintenancePct: 0, capexPct: 0,
  propertyTax: 2400, insurance: 1200, hoa: 0,
};

test("at 0% it is division: $755.56 a month, 7.2% cap rate, 20.1% cash-on-cash, DSCR 2.7", () => {
  const r = analyze(base);
  near(r.loan, 160000);
  near(r.mortgage, 444.44);
  near(r.noi, 1200); // $1,500 − $300
  near(r.cashFlow, 1500 - 300 - 160000 / 360);
  near(r.cashFlow, 755.56);
  near(r.cashToClose, 45000); // $40,000 down + $5,000 closing
  near(r.capRate, 7.2, 1e-9); // $14,400 / $200,000
  near(r.cashOnCash, (755.56 * 12) / 45000 * 100, 0.01);
  near(r.cashOnCash, 20.15, 0.01);
  near(r.dscr, 1200 / 444.444, 1e-3); // 2.7
  // Break-even rent covers $300 + $444.44 when nothing scales with rent.
  near(r.breakEvenRent, 744.44);
});

test("vacancy, management and the capital reserve come off the rent; maintenance comes off the value", () => {
  const i = { ...base, vacancyPct: 5, management: true, managementPct: 10, capexPct: 5, maintenancePct: 1 };
  const l = analyze(i).lines;
  near(l.vacancy, 75); // 5% of $1,500
  near(l.management, 142.5); // 10% of the $1,425 collected
  near(l.capex, 75); // 5% of $1,500
  near(l.maintenance, 166.67); // 1% of $200,000 / 12
  near(analyze(i).noi, 1500 - 75 - 142.5 - 75 - 166.67 - 300);
  // Share of rent kept: 1 − 0.05 − 0.10 × 0.95 − 0.05 = 0.805.
  near(rentKeptShare(i), 0.805, 1e-12);
  // Break-even rent: ($166.67 + $300 + $444.44) / 0.805 = $1,131.82, and cash flow is zero there.
  const be = analyze(i).breakEvenRent;
  near(be, (166.667 + 300 + 444.444) / 0.805, 0.01);
  near(analyze({ ...i, rent: be }).cashFlow, 0, 1e-6);
});

test("at a 7% rate the same house loses money: cash flow turns negative and DSCR falls below 1", () => {
  // $160,000 at 7% over 30 years is $1,064.48 a month, against $1,200 of NOI before costs that scale with rent.
  const i = { ...base, rate: 7, vacancyPct: 5, management: true, capexPct: 5, maintenancePct: 1 };
  const r = analyze(i);
  near(r.mortgage, level(160000, 7, 360));
  near(r.mortgage, 1064.48);
  assert.ok(r.cashFlow < 0, `cash flow ${r.cashFlow}`);
  near(r.cashFlow, 740.83 - 1064.48, 0.01); // NOI $740.83
  assert.ok(r.dscr < 1);
  assert.ok(r.cashOnCash < 0);
  // The cap rate does not depend on the financing.
  near(r.capRate, analyze({ ...i, rate: 0 }).capRate, 1e-9);
});

test("an all-cash purchase has no DSCR, and cash-on-cash is NOI over the price plus closing costs", () => {
  const r = analyze({ ...base, downPct: 100 });
  near(r.loan, 0);
  near(r.mortgage, 0);
  assert.equal(r.dscr, null);
  assert.equal(r.llpaPct, null);
  near(r.cashOnCash, (1200 * 12) / 205000 * 100, 1e-9);
});

test("Fannie Mae's investment limits: under 15% down on one unit is flagged; the price adjustment follows LTV", () => {
  assert.equal(analyze({ ...base, downPct: 10 }).belowFannieMinimum, true);
  assert.equal(analyze({ ...base, downPct: 15 }).belowFannieMinimum, false);
  near(investmentLlpa(60), 1.125);
  near(investmentLlpa(70), 1.625);
  near(investmentLlpa(75), 2.125);
  near(investmentLlpa(80), 3.375);
  near(investmentLlpa(85), 4.125);
  near(analyze({ ...base, downPct: 25 }).llpaPct, 2.125);
});

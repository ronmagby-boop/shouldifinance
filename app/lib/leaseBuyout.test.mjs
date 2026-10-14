// Tests for lib/leaseBuyout.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./leaseBuyout.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

// A $20,000 purchase option, a $300 fee, 6% tax ($1,200) and $150 of title: $21,650 all in.
const base = {
  buyoutPrice: 20000, optionFee: 300, taxRatePct: 6, titleFees: 150, marketValue: 24000,
  dispositionFee: 400, milesOver: 0, perMileCharge: 0.25, excessWear: 0, comparablePrice: null, loan: null,
};

test("the buyout total: price + fee + tax on the price + title", () => {
  const r = analyze(base);
  near(r.tax, 1200, 1e-9);
  near(r.buyoutTotal, 21650, 1e-9);
  near(analyze({ ...base, taxRatePct: 0 }).buyoutTotal, 20450, 1e-9);
});

test("a car worth more than the buyout: $2,350 of equity, and $2,750 ahead counting the $400 disposition fee avoided", () => {
  const r = analyze(base);
  near(r.equity, 24000 - 21650, 1e-9);
  near(r.returnCosts, 400, 1e-9);
  near(r.buyoutAdvantage, 2750, 1e-9);
});

test("a car worth less than the buyout: $2,650 under water, and returning it is $2,250 better", () => {
  const r = analyze({ ...base, marketValue: 19000 });
  near(r.equity, -2650, 1e-9);
  near(r.buyoutAdvantage, -2250, 1e-9);
});

test("mileage charges can tip it: $650 under water, but 6,000 miles over at 25 cents makes buying out $1,250 better", () => {
  const under = { ...base, marketValue: 21000 };
  near(analyze(under).equity, -650, 1e-9);
  // Without the miles, returning wins by $250 ($650 − $400).
  near(analyze(under).buyoutAdvantage, -250, 1e-9);
  // 6,000 × $0.25 = $1,500 of mileage charges avoided, plus the $400 disposition fee.
  const over = analyze({ ...under, milesOver: 6000 });
  near(over.mileageCharge, 1500, 1e-9);
  near(over.returnCosts, 1900, 1e-9);
  near(over.buyoutAdvantage, 1250, 1e-9);
});

test("against returning and buying a comparable car: $22,000 + 6% + title + the return charges, $23,870, against $21,650", () => {
  const r = analyze({ ...base, comparablePrice: 22000 });
  near(r.comparable.replaceTotal, 22000 + 1320 + 150, 1e-9);
  near(r.comparable.returnAndReplace, 23870, 1e-9);
  near(r.comparable.savingFromBuyout, 2220, 1e-9);
});

test("financing the buyout total: $21,650 at 0% over 36 months is $601.39; at 6% the textbook payment", () => {
  near(analyze({ ...base, loan: { apr: 0, months: 36 } }).financed.monthly, 21650 / 36, 1e-9);
  near(analyze({ ...base, loan: { apr: 0, months: 36 } }).financed.totalInterest, 0, 1e-9);
  const f = analyze({ ...base, loan: { apr: 6, months: 36 } }).financed;
  near(f.monthly, (21650 * 0.005 * 1.005 ** 36) / (1.005 ** 36 - 1), 1e-9);
  near(f.totalInterest, f.monthly * 36 - 21650, 1e-9);
  assert.equal(analyze(base).financed, null);
});

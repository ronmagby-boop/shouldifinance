// Tests for lib/tradeIn.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, taxSaving } from "./tradeIn.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

// A $15,000 offer against $16,000 privately, less $300 of selling costs; a $30,000
// next car taxed at 7%.
const base = {
  tradeOffer: 15000, privatePrice: 16000, nextCarPrice: 30000, taxRatePct: 7,
  taxCredit: "yes", payoff: 0, privateCosts: 300, timeValue: 0,
};

test("the tax credit makes the trade-in win: $15,000 + 7% ($1,050) beats $16,000 − $300 by $350", () => {
  const r = analyze(base);
  near(r.taxSaving, 1050, 1e-9);
  near(r.tradeNet, 16050, 1e-9);
  near(r.privateNet, 15700, 1e-9);
  near(r.privateAdvantage, -350, 1e-9);
  // The private price that only breaks even: $15,000 + $1,050 + $300 = $16,350.
  near(r.breakEvenPrivatePrice, 16350, 1e-9);
});

test("without the credit the private sale wins by $700", () => {
  const r = analyze({ ...base, taxCredit: "no" });
  near(r.taxSaving, 0, 1e-9);
  near(r.privateAdvantage, 700, 1e-9);
  near(r.breakEvenPrivatePrice, 15300, 1e-9);
});

test("not sure: the headline assumes the credit, and both answers are given", () => {
  const r = analyze({ ...base, taxCredit: "unsure" });
  near(r.privateAdvantage, -350, 1e-9);
  near(r.withCredit.privateAdvantage, -350, 1e-9);
  near(r.withoutCredit.privateAdvantage, 700, 1e-9);
});

test("the credit cannot exceed the tax on the next car", () => {
  near(taxSaving(15000, 10000, 7), 700, 1e-9);
  near(taxSaving(15000, 30000, 0), 0, 1e-9);
});

test("the value of your time counts against the private sale", () => {
  const r = analyze({ ...base, taxCredit: "no", timeValue: 500 });
  near(r.privateAdvantage, 200, 1e-9);
  near(r.breakEvenPrivatePrice, 15800, 1e-9);
});

test("negative equity: owing $18,000 leaves a $3,000 shortfall on the trade and $2,300 privately", () => {
  const r = analyze({ ...base, payoff: 18000 });
  assert.equal(r.negativeEquity, true);
  near(r.tradeShortfall, 3000, 1e-9);
  near(r.privateShortfall, 2300, 1e-9); // $18,000 − ($16,000 − $300)
  // The payoff comes off both paths, so the difference between them is unchanged.
  near(r.tradeNet, 16050 - 18000, 1e-9);
  near(r.privateAdvantage, -350, 1e-9);
  // With nothing owed there is no shortfall.
  assert.equal(analyze(base).negativeEquity, false);
  assert.equal(analyze(base).tradeShortfall, 0);
});

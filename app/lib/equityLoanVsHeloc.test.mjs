// Tests for lib/equityLoanVsHeloc.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { breakEvenMove, compare, FED_MOVES, heloc, homeEquityLoan } from "./equityLoanVsHeloc.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

/** The textbook level payment, written out independently of lib/finance. */
const level = (p, annual, n) => {
  const r = annual / 1200;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
};

const base = {
  amount: 60000, drawSpreadMonths: 0,
  loanRate: 8, loanTermYears: 10, loanClosingCosts: 1000,
  helocRate: 8.5, drawYears: 10, repayYears: 20, helocFees: 200,
  plan: { kind: "interest-only" }, rateCap: null, rateFloor: null,
  horizonYears: 5,
};

test("at 0% it is division: $60,000 over 10 years is $500 a month; the HELOC is $0 then $250", () => {
  const i = { ...base, loanRate: 0, helocRate: 0 };
  const loan = homeEquityLoan(i);
  const line = heloc(i, 0);
  near(loan.payment, 500);
  near(line.paymentInMonth(1), 0); // interest only, at 0%
  near(line.paymentInMonth(121), 250); // $60,000 over the 20-year repayment period
  // Five years: no interest, so cost is the fees; the loan has repaid 60 × $500.
  near(loan.cost, 1000);
  near(line.cost, 200);
  near(loan.balance, 30000);
  near(line.balance, 60000);
});

test("interest only on what is drawn: $12,000 at 12% drawn $1,000 a month costs $780 in year one, not $1,440", () => {
  // At 1% a month, month m carries $1,000 × m of balance: 10 + 20 + ... + 120 = $780.
  const i = { ...base, amount: 12000, helocRate: 12, drawSpreadMonths: 12, horizonYears: 1, helocFees: 0 };
  const spread = heloc(i, 12);
  near(spread.paymentInMonth(1), 10);
  near(spread.paymentInMonth(12), 120);
  near(spread.interest, 780);
  // All at once: $12,000 × 1% × 12 = $1,440.
  near(heloc({ ...i, drawSpreadMonths: 0 }, 12).interest, 1440);
  // The fixed loan pays interest on the whole $12,000 from month one whatever the draw pattern.
  near(homeEquityLoan(i).interest, homeEquityLoan({ ...i, drawSpreadMonths: 0 }).interest);
});

test("the fixed loan matches the closed-form payment, and the HELOC repays its balance after the draw", () => {
  const loan = homeEquityLoan(base);
  near(loan.payment, level(60000, 8, 120));
  near(loan.payment, 727.97);
  const line = heloc(base, 8.5);
  near(line.paymentInMonth(1), (60000 * 0.085) / 12); // $425 interest only
  near(line.paymentInMonth(121), level(60000, 8.5, 240));
  near(line.interest, 425 * 60);
});

test("a pay-down plan with the same term is the fixed loan's schedule at the HELOC's rate", () => {
  const i = { ...base, plan: { kind: "paydown", years: 10 } };
  const line = heloc(i, 8);
  near(line.paymentInMonth(1), level(60000, 8, 120));
  near(line.paymentInMonth(60), level(60000, 8, 120));
  near(line.interest, homeEquityLoan(i).interest);
});

test("a +1.00 Fed move flips the answer: 7.5% HELOC beats an 8% fixed loan, 8.5% does not", () => {
  // Same amount, same 10-year pay-down, no fees: only the rate differs, so the break-even move is +0.50.
  const i = { ...base, helocRate: 7.5, plan: { kind: "paydown", years: 10 }, loanClosingCosts: 0, helocFees: 0 };
  assert.equal(compare(i, 0).cheaper, "heloc");
  assert.equal(compare(i, 1).cheaper, "loan");
  const b = breakEvenMove(i);
  assert.equal(b.reason, "found");
  near(b.move, 0.5, 1e-6);
  // The scenario rows move the HELOC rate one for one.
  assert.deepEqual(FED_MOVES.map((m) => compare(i, m).rate.rate), [7, 7.25, 7.5, 7.75, 8, 8.25, 8.5]);
});

test("a lifetime cap at the fixed rate stops the flip; a cap below it means the HELOC always wins", () => {
  const i = { ...base, helocRate: 7.5, plan: { kind: "paydown", years: 10 }, loanClosingCosts: 0, helocFees: 0 };
  const capped = compare({ ...i, rateCap: 8 }, 1);
  assert.equal(capped.rate.rate, 8);
  assert.equal(capped.rate.clamped, "cap");
  assert.equal(capped.cheaper, "neither");
  assert.equal(breakEvenMove({ ...i, rateCap: 7.9 }).reason, "heloc-always");
  // A floor holds a falling rate up.
  const floored = compare({ ...i, rateFloor: 7.25 }, -0.5);
  assert.equal(floored.rate.rate, 7.25);
  assert.equal(floored.rate.clamped, "floor");
});

test("a horizon past both terms counts all the interest and leaves nothing owed", () => {
  const i = { ...base, horizonYears: 40 };
  near(homeEquityLoan(i).balance, 0);
  near(heloc(i, 8.5).balance, 0);
  near(homeEquityLoan(i).interest, level(60000, 8, 120) * 120 - 60000, 0.05);
});

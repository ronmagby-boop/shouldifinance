// Tests for lib/helocLimit.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableLine, currentCltv, equityTooThin, fullyDrawnPayments, HELOC_CAP_CHOICES, limitRows,
} from "./helocLimit.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

/** The textbook level payment, written out independently of lib/finance. */
const level = (p, annual, n) => {
  const r = annual / 1200;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
};

const base = { homeValue: 400000, mortgageBalance: 250000, otherLiens: 0, customCap: null, rate: null, repayYears: 15 };

test("$400,000 home, $250,000 owed: 85% leaves $90,000; 80% $70,000; 90% $110,000", () => {
  near(availableLine(base, 85), 90000); // 400,000 × 85% = 340,000 − 250,000
  near(availableLine(base, 80), 70000);
  near(availableLine(base, 90), 110000);
  near(currentCltv(base), 62.5); // 250,000 / 400,000
  assert.deepEqual(limitRows(base).map((r) => r.cap), [...HELOC_CAP_CHOICES]);
});

test("other liens count against the cap: a $20,000 second lien takes $20,000 off every line", () => {
  const i = { ...base, otherLiens: 20000 };
  assert.deepEqual(limitRows(i).map((r) => r.line), [50000, 70000, 90000]);
  near(currentCltv(i), 67.5); // 270,000 / 400,000
});

test("a line is never below zero, and thin equity is flagged at every cap", () => {
  // $380,000 owed on $400,000 is 95%: over all three caps.
  const thin = { ...base, mortgageBalance: 380000 };
  assert.deepEqual(limitRows(thin).map((r) => r.line), [0, 0, 0]);
  assert.equal(equityTooThin(thin), true);
  near(currentCltv(thin), 95);
  // At 88%, the 90% cap still leaves $8,000, so it is not too thin.
  const close = { ...base, mortgageBalance: 352000 };
  assert.deepEqual(limitRows(close).map((r) => r.line), [0, 0, 8000]);
  assert.equal(equityTooThin(close), false);
  // A custom cap above the owed share opens a line where the three choices do not.
  assert.equal(equityTooThin({ ...thin, customCap: 97 }), false);
  near(availableLine({ ...thin, customCap: 97 }, 97), 8000);
});

test("a custom cap is added in order, and not duplicated if it matches a choice", () => {
  assert.deepEqual(limitRows({ ...base, customCap: 75 }).map((r) => [r.cap, r.custom, r.line]),
    [[75, true, 50000], [80, false, 70000], [85, false, 90000], [90, false, 110000]]);
  assert.deepEqual(limitRows({ ...base, customCap: 85 }).map((r) => r.cap), [80, 85, 90]);
});

test("fully drawn payments: $90,000 at 9% is $675 a month interest-only; at 0% over 15 years, $500", () => {
  const p = fullyDrawnPayments(90000, 9, 15);
  near(p.interestOnly, 675); // 90,000 × 9% / 12
  near(p.amortized, level(90000, 9, 180));
  near(p.amortized, 912.84);
  near(fullyDrawnPayments(90000, 0, 15).amortized, 500); // 90,000 / 180
  // No rate given: no payments.
  assert.equal(limitRows(base)[0].payments, null);
  near(limitRows({ ...base, rate: 9 })[1].payments.interestOnly, 675);
});

test("a zero or missing home value gives no line and an infinite CLTV, not an error", () => {
  const none = { ...base, homeValue: 0 };
  assert.equal(currentCltv(none), Infinity);
  assert.equal(equityTooThin(none), true);
});

// Tests for lib/dti.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countsMortgageInsurance, fhaTiersMet, maxHousingPayment, programRow, ratio, studentLoanPayment, vaRequiredResidual,
  vaResidual, vaRoundedRatio, vaStudentThreshold,
} from "./dti.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

const loan = (over) => ({ balance: 25000, payment: 0, status: "repaying", deferredPastTwelveMonths: false, servicerStatement: false, ...over });

test("ratios: $2,000 of housing and $800 of other debt on $8,000 of income is 25% and 35%", () => {
  near(ratio(2000, 6000 + 2000), 25, 1e-12);
  near(ratio(2000 + 800, 8000), 35, 1e-12);
  assert.equal(ratio(100, 0), null);
});

test("the maximum housing payment at a 36% back-end ratio is $8,000 × 36% − $800 = $2,080", () => {
  near(maxHousingPayment(8000, 800, 36), 2080, 1e-9);
  // Debts already past the target leave nothing for housing.
  assert.equal(maxHousingPayment(8000, 4000, 36), 0);
});

test("VA student loans: the pamphlet's $25,000 balance is $1,250 a year, $104.17 a month", () => {
  near(vaStudentThreshold(25000), 104.17, 0.005);
  near(studentLoanPayment("va", loan({ payment: 0 })), 104.17, 0.005);
  // A credit report payment above the threshold is used instead.
  assert.equal(studentLoanPayment("va", loan({ payment: 300 })), 300);
  // A lower one only with a servicer statement; otherwise the threshold.
  near(studentLoanPayment("va", loan({ payment: 50 })), 104.17, 0.005);
  assert.equal(studentLoanPayment("va", loan({ payment: 50, servicerStatement: true })), 50);
  // Deferred at least 12 months past closing: no payment counted.
  assert.equal(studentLoanPayment("va", loan({ status: "deferred", deferredPastTwelveMonths: true })), 0);
  near(studentLoanPayment("va", loan({ status: "deferred" })), 104.17, 0.005);
});

test("FHA student loans: the reported payment when above zero, otherwise 0.5% of the balance ($125)", () => {
  assert.equal(studentLoanPayment("fha", loan({ payment: 180 })), 180);
  assert.equal(studentLoanPayment("fha", loan({ payment: 0 })), 125);
  // Regardless of status: an income-driven $0 and a deferment both count $125.
  assert.equal(studentLoanPayment("fha", loan({ status: "idr-zero" })), 125);
  assert.equal(studentLoanPayment("fha", loan({ status: "deferred", deferredPastTwelveMonths: true })), 125);
});

test("Fannie Mae student loans: a documented income-driven $0 counts as $0; deferred is 1% of the balance ($250)", () => {
  assert.equal(studentLoanPayment("conventional", loan({ payment: 180 })), 180);
  assert.equal(studentLoanPayment("conventional", loan({ status: "idr-zero" })), 0);
  assert.equal(studentLoanPayment("conventional", loan({ status: "deferred" })), 250);
  assert.equal(studentLoanPayment("conventional", loan({ payment: 0 })), 250);
});

test("USDA's student loan rule is not modelled: null, and the row uses the payment entered", () => {
  assert.equal(studentLoanPayment("usda", loan({ payment: 180 })), null);
  const r = programRow("usda", 8000, 2000, 0, 600, [loan({ payment: 200 })]);
  assert.equal(r.studentPayment, null);
  near(r.back, 35, 1e-9); // ($2,000 + $600 + $200) / $8,000
});

test("each program's back-end ratio uses its own student loan payment", () => {
  // $8,000 income, $2,000 housing, $600 other debt, one $25,000 loan in deferment.
  const loans = [loan({ status: "deferred" })];
  near(programRow("conventional", 8000, 2000, 0, 600, loans).back, (2600 + 250) / 80, 1e-9); // 35.625
  near(programRow("fha", 8000, 2000, 0, 600, loans).back, (2600 + 125) / 80, 1e-9); // 34.0625
  near(programRow("va", 8000, 2000, 0, 600, loans).back, (2600 + 104.1667) / 80, 1e-4); // 33.80
  near(programRow("conventional", 8000, 2000, 0, 600, loans).front, 25, 1e-9);
});

test("mortgage insurance counts for conventional, FHA and USDA, but not VA, which charges none monthly", () => {
  // $8,000 income; $2,000 of housing before a $150 mortgage insurance premium; $600 of other debt.
  const row = (p) => programRow(p, 8000, 2000, 150, 600, []);
  for (const p of ["conventional", "fha", "usda"]) {
    assert.equal(countsMortgageInsurance(p), true);
    near(row(p).housing, 2150, 1e-9);
    near(row(p).front, 26.875, 1e-9); // $2,150 / $8,000
    near(row(p).back, 34.375, 1e-9); // $2,750 / $8,000
  }
  assert.equal(countsMortgageInsurance("va"), false);
  near(row("va").housing, 2000, 1e-9);
  near(row("va").front, 25, 1e-9); // $2,000 / $8,000
  near(row("va").back, 32.5, 1e-9); // $2,600 / $8,000
  // The premium alone moves VA's ratio not at all.
  near(programRow("va", 8000, 2000, 0, 600, []).back, row("va").back, 1e-12);
});

test("Fannie Mae: within 36% manual, a stretch to 45% or DU's 50%, and above 50%", () => {
  assert.equal(programRow("conventional", 10000, 2000, 0, 1600, []).standing, "within"); // 36%
  assert.equal(programRow("conventional", 10000, 2000, 0, 2500, []).standing, "stretch"); // 45%
  assert.equal(programRow("conventional", 10000, 2000, 0, 3000, []).standing, "stretch"); // 50%
  assert.equal(programRow("conventional", 10000, 2000, 0, 3001, []).standing, "above"); // 50.01%
});

test("FHA's manual tiers: 31/43, then 37/47, 40/40 and 40/50", () => {
  const tiers = (f, b) => fhaTiersMet(f, b).map((t) => `${t.front}/${t.back}`);
  assert.deepEqual(tiers(31, 43), ["31/43", "37/47", "40/50"]);
  assert.deepEqual(tiers(35, 45), ["37/47", "40/50"]);
  assert.deepEqual(tiers(39, 40), ["40/40", "40/50"]);
  assert.deepEqual(tiers(39, 49), ["40/50"]);
  assert.deepEqual(tiers(41, 45), []);
  assert.deepEqual(tiers(30, 51), []);
  assert.equal(programRow("fha", 10000, 3100, 0, 1200, []).standing, "within"); // 31/43
  assert.equal(programRow("fha", 10000, 3500, 0, 1000, []).standing, "stretch"); // 35/45
  assert.equal(programRow("fha", 10000, 4100, 0, 0, []).standing, "above"); // 41/41
});

test("VA rounds its ratio to a whole percent: 41.4% is within 41%, 41.5% is not", () => {
  assert.equal(vaRoundedRatio(35.6), 36);
  assert.equal(programRow("va", 10000, 3000, 0, 1140, []).standing, "within"); // 41.4%
  assert.equal(programRow("va", 10000, 3000, 0, 1150, []).standing, "stretch"); // 41.5%
});

test("USDA: within 29/41, otherwise a stretch", () => {
  assert.equal(programRow("usda", 10000, 2900, 0, 1200, []).standing, "within");
  assert.equal(programRow("usda", 10000, 3000, 0, 1000, []).standing, "stretch"); // housing 30%
  assert.equal(programRow("usda", 10000, 2900, 0, 1300, []).standing, "stretch"); // total 42%
});

test("VA residual income tables: the pamphlet's examples", () => {
  // "A Veteran has a family size of 3 purchasing a home in Arizona with a loan amount of $400,000. The residual figure will be $990."
  assert.equal(vaRequiredResidual(400000, "west", 3), 990);
  // Family of 8 in Georgia, $150,000: $1,039 + 2 × $80 = $1,199; the eighth person is not counted.
  assert.equal(vaRequiredResidual(150000, "south", 8), 1199);
  assert.equal(vaRequiredResidual(150000, "south", 7), 1199);
  // The lower band runs to $79,999, with $75 a member past five.
  assert.equal(vaRequiredResidual(79999, "south", 4), 868);
  assert.equal(vaRequiredResidual(80000, "south", 4), 1003);
  assert.equal(vaRequiredResidual(79999, "northeast", 6), 921 + 75);
  assert.equal(vaRequiredResidual(250000, "midwest", 1), 441);
  // The 5% military reduction: $990 × 0.95 = $940.50.
  near(vaRequiredResidual(400000, "west", 3, true), 940.5, 1e-9);
});

test("VA residual income: income less taxes, shelter (with 14¢ a square foot), debts and job costs", () => {
  const r = vaResidual({
    grossIncome: 7000, federalTax: 600, stateTax: 200, socialSecurityMedicare: 535.5, retirement: 350,
    housing: 2000, squareFeet: 1500, debts: 500, jobRelated: 300,
    loanAmount: 300000, region: "west", familySize: 3, military: false,
  });
  near(r.taxes, 1685.5, 1e-9);
  near(r.maintenance, 210, 1e-9); // 1,500 × $0.14, the pamphlet's own example
  near(r.shelter, 2210, 1e-9);
  near(r.residual, 7000 - 1685.5 - 2210 - 500 - 300, 1e-9); // $2,304.50
  assert.equal(r.required, 990);
  near(r.benchmark, 1188, 1e-9); // 20% above $990
  assert.equal(r.meets, true);
  assert.equal(r.meetsBenchmark, true);
});

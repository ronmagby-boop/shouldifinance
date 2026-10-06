// Tests for lib/rentOrSell.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths, breakEvenAppreciation, breakEvenRent, compare, depreciableBasis, depreciationFor,
  rentOut, saleTax, sellByDate, sellNow, vaGuarantyFullEntitlement, vaNextLoan,
} from "./rentOrSell.ts";
import * as tax from "./tax.ts";
import * as va from "./va.ts";
import * as finance from "./finance.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

/*
 * depends_on: the figures below were worked by hand against these constants.
 * The engine reads them, so a change flows into the page; this test fails
 * first, naming the constant, so the hand figures get re-checked.
 */
const SNAPSHOT = {
  tax: {
    SECTION_121_EXCLUSION: { single: 250000, married: 500000, head: 250000 },
    SECTION_121_TEST_YEARS: 5,
    SECTION_121_USE_DAYS: 730,
    SECTION_121_MILITARY_SUSPENSION_MAX_YEARS: 10,
    RESIDENTIAL_RENTAL_RECOVERY_YEARS: 27.5,
    UNRECAPTURED_1250_MAX_RATE: 25,
  },
  va: {
    VA_BASIC_ENTITLEMENT: 36000,
    VA_BONUS_ENTITLEMENT_THRESHOLD: 144000,
    VA_GUARANTY_PCT: 25,
    VA_LENDER_COVERAGE_PCT: 25,
  },
  finance: { CONFORMING_LOAN_LIMIT_BASELINE: 832750 },
};

test("depends_on: the constants are the values these hand figures were checked against", () => {
  const modules = { tax, va, finance };
  for (const [mod, names] of Object.entries(SNAPSHOT)) {
    for (const [name, value] of Object.entries(names)) {
      assert.deepEqual(modules[mod][name], value, `${name} changed: re-check the figures in this file by hand, then update SNAPSHOT`);
    }
  }
});

/*
 * The base case, at 0% so every line is division. A $400,000 home with
 * $200,000 owed at 0% over 20 years ($833.33 a month), $4,800 tax and $1,200
 * insurance a year ($500 a month), renting at $2,000 with nothing else: the
 * rental clears $666.67 a month. Bought for $343,750 with 20% land, so the
 * depreciable basis is $275,000 and depreciation is exactly $10,000 a year.
 */
const base = {
  homeValue: 400000, mortgageBalance: 200000, mortgageRate: 0, mortgageYearsLeft: 20,
  propertyTax: 4800, insurance: 1200, hoa: 0,
  sellingCostPct: 5, repairsToSell: 0,
  rent: 2000, vacancyPct: 0, management: false, managementPct: 10, maintenancePct: 0, capexPct: 0,
  turnoverPerYear: 0, landlordInsuranceExtra: 0,
  appreciationPct: 0, rentGrowthPct: 0, expenseGrowthPct: 0,
  horizonYears: 3, investReturnPct: 0,
  status: "single", yearsLived: 5, moveOut: "2026-10-01", dutyMonths: 0,
  adjustedBasis: 343750, landPct: 20, income: null,
  asOf: "2026-10-01",
};

test("sell now: $400,000 less 5% selling costs and the $200,000 payoff is $180,000, tax-free inside the exclusion", () => {
  const s = sellNow(base);
  near(s.sellingCosts, 20000);
  // Gain $380,000 − $343,750 = $36,250, all excluded.
  near(s.tax.gain, 36250);
  near(s.tax.excluded, 36250);
  near(s.tax.tax, 0);
  near(s.net, 180000);
  near(s.position, 180000);
  // At 5% for 3 years the proceeds grow to $180,000 × 1.05³ = $208,372.50.
  near(sellNow({ ...base, investReturnPct: 5 }).position, 208372.5);
});

test("rent for 3 years: $666.67 a month, $24,000 in all, and the 3-year sale misses the exclusion by a day", () => {
  const r = rentOut(base);
  near(r.mortgagePayment, 833.33);
  near(r.firstMonth.cashFlow, 2000 - 500 - 833.33);
  near(r.cashFlowTotal, 24000);
  near(r.mortgageBalance, 200000 - 36 * (200000 / 240));
  // Sold 1 October 2029; the last day to keep the exclusion is 30 September 2029.
  assert.equal(r.saleDate, "2029-10-01");
  assert.equal(r.tax.qualifies, false);
  // Depreciation: $275,000 / 27.5 × 3 = $30,000; recapture at 25% = $7,500.
  near(r.depreciableBasis, 275000);
  near(r.depreciation, 30000);
  near(r.tax.recaptureTax, 7500);
  // The rest of the gain, $36,250, taxed at 15% with no exclusion: $5,437.50.
  near(r.tax.gain, 380000 - (343750 - 30000));
  near(r.tax.gainTax, 5437.5);
  // $400,000 − $20,000 − $170,000 − $12,937.50 = $197,062.50, plus $24,000 of rent.
  near(r.equity, 197062.5);
  near(r.position, 221062.5);
  const c = compare(base);
  near(c.difference, 41062.5);
  assert.equal(c.better, "rent");
});

test("rent for 2 years: the sale keeps the exclusion, but the $20,000 of depreciation is still taxed, $5,000", () => {
  const r = rentOut({ ...base, horizonYears: 2 });
  assert.equal(r.tax.qualifies, true);
  near(r.depreciation, 20000);
  near(r.tax.excluded, 36250);
  near(r.tax.gainTax, 0);
  near(r.tax.recaptureTax, 5000);
  // $400,000 − $20,000 − $180,000 − $5,000 = $195,000, plus 24 × $666.67 = $16,000.
  near(r.position, 211000);
});

test("cash flow lines: vacancy, management, capex, maintenance and turnover each come off the rent", () => {
  const i = { ...base, vacancyPct: 5, management: true, managementPct: 10, capexPct: 5, maintenancePct: 1,
    turnoverPerYear: 1200, landlordInsuranceExtra: 600, hoa: 50 };
  const f = rentOut(i).firstMonth;
  near(f.vacancy, 100); // 5% of $2,000
  near(f.management, 190); // 10% of the $1,900 collected
  near(f.capex, 100); // 5% of $2,000
  near(f.maintenance, 333.33); // 1% of $400,000 / 12
  near(f.turnover, 100);
  near(f.taxInsHoa, 400 + 100 + 50 + 50); // tax, insurance, landlord extra ($600/12), HOA
  near(f.cashFlow, 2000 - 100 - 190 - 100 - 333.33 - 100 - 600 - 833.33);
});

test("growth: rent, costs and value move once a year", () => {
  const i = { ...base, rentGrowthPct: 10, expenseGrowthPct: 10, appreciationPct: 10, horizonYears: 2 };
  const r = rentOut(i);
  // Year 1 at $2,000 rent and $500 costs; year 2 at $2,200 and $550; the mortgage stays $833.33.
  near(r.cashFlowTotal, 12 * (2000 - 500 - 833.33) + 12 * (2200 - 550 - 833.33), 0.1);
  near(r.price, 484000);
});

test("sell-by date: 5 years less 731 days after moving out, about three years", () => {
  // 2029-10-01 to 2031-10-01 is 730 days, so 731 days before 2031-10-01 is 2029-09-30.
  assert.equal(sellByDate("2026-10-01", 5), "2029-09-30");
  // Under two years lived: no sale date meets the use test.
  assert.equal(sellByDate("2026-10-01", 1.5), null);
});

test("sell-by date, Publication 523's military example: duty from 28 Aug 2011, sale 1 Aug 2024 qualifies", () => {
  // Lived there 1 May 2008 to 27 Aug 2011; on qualified official extended duty from 28 Aug 2011 through
  // the sale, 13 years, of which 10 can be suspended. 2011-08-28 + 15 years = 2026-08-28, and 731 days
  // before that is 2024-08-27 (2024-08-28 to 2026-08-28 is 730 days).
  const withDuty = sellByDate("2011-08-28", 3.3, 13 * 12);
  assert.equal(withDuty, "2024-08-27");
  assert.ok("2024-08-01" <= withDuty, "Pub 523: the sale on August 1, 2024 meets the use test");
  // Without the suspension: 2016-08-28 less 731 days (2016 is a leap year) is 2014-08-28.
  assert.equal(sellByDate("2011-08-28", 3.3, 0), "2014-08-28");
  // Two years of duty move it two years: 2033-10-01 less 731 days (2032 is a leap year) is 2031-10-01.
  assert.equal(sellByDate("2026-10-01", 5, 24), "2031-10-01");
  // Duty beyond 10 years counts as 10.
  assert.equal(sellByDate("2026-10-01", 5, 200), sellByDate("2026-10-01", 5, 120));
});

test("month arithmetic clamps to the month's last day", () => {
  assert.equal(addMonths("2026-08-31", 6), "2027-02-28");
  assert.equal(addMonths("2026-10-01", 36), "2029-10-01");
});

test("depreciation: the lesser of basis or value, less land, over 27.5 years", () => {
  near(depreciableBasis(343750, 400000, 20), 275000);
  // Value below basis at conversion: the value is used. $400,000 × 80% = $320,000.
  near(depreciableBasis(500000, 400000, 20), 320000);
  near(depreciationFor(275000, 12), 10000);
  near(depreciationFor(275000, 330), 275000);
  near(depreciationFor(275000, 400), 275000);
});

test("recapture is taxed even when the exclusion applies, at no more than 25%", () => {
  // $50,000 of other gain excluded, $10,000 of depreciation taxed: at a high income the 25% cap binds.
  const t = saleTax({ amountRealized: 360000, adjustedBasis: 320000, depreciation: 10000, qualifies: true,
    status: "single", income: 1_000_000 });
  near(t.gain, 50000);
  near(t.recaptureGain, 10000);
  near(t.excluded, 40000);
  near(t.recaptureTax, 2500);
  near(t.gainTax, 0);
  // Not qualifying: the $40,000 is taxed at 20%, the whole slice sitting above the 15% band.
  near(saleTax({ amountRealized: 360000, adjustedBasis: 320000, depreciation: 10000, qualifies: false,
    status: "single", income: 1_000_000 }).gainTax, 8000);
  // The exclusion is capped by filing status: $250,000 single, $500,000 married filing jointly.
  const big = { amountRealized: 900000, adjustedBasis: 300000, depreciation: 0, qualifies: true, income: null };
  near(saleTax({ ...big, status: "single" }).excluded, 250000);
  near(saleTax({ ...big, status: "married" }).excluded, 500000);
});

test("break-even appreciation and rent make the two positions equal, and either side flips the answer", () => {
  const i = { ...base, investReturnPct: 6, rent: 1600 };
  const a = breakEvenAppreciation(i);
  assert.equal(a.reason, "found");
  near(compare({ ...i, appreciationPct: a.value }).difference, 0, 0.01);
  assert.equal(compare({ ...i, appreciationPct: a.value + 0.5 }).better, "rent");
  assert.equal(compare({ ...i, appreciationPct: a.value - 0.5 }).better, "sell");
  const r = breakEvenRent(i);
  assert.equal(r.reason, "found");
  near(compare({ ...i, rent: r.value }).difference, 0, 0.01);
  assert.equal(compare({ ...i, rent: r.value + 50 }).better, "rent");
});

test("VA, VA's own example: $900,000 county limit, $50,000 used: $175,000 left, $700,000 with no down payment", () => {
  const v = vaNextLoan({ entitlementUsed: 50000, countyLimit: 900000, price: 700000 });
  near(v.remaining, 175000);
  near(v.maxNoDown, 700000);
  near(v.downPayment, 0);
  // An $800,000 home: (25% × $800,000 − $175,000) / 1.25 = $20,000 down, a $780,000 loan,
  // and $175,000 + $20,000 = $195,000 is 25% of $780,000.
  near(vaNextLoan({ entitlementUsed: 50000, countyLimit: 900000, price: 800000 }).downPayment, 20000);
});

test("VA, Pamphlet 26-7's example: $650,000 limit, $55,000 used: $107,500 left; nothing left of the basic $36,000", () => {
  const v = vaNextLoan({ entitlementUsed: 55000, countyLimit: 650000, price: null });
  near(v.remaining, 107500);
  near(v.remainingBasic, 0);
  // At the 2026 baseline, with a $300,000 loan kept (25% = $75,000 used):
  // $832,750 × 25% = $208,187.50 − $75,000 = $133,187.50, × 4 = $532,750.
  const b = vaNextLoan({ entitlementUsed: vaGuarantyFullEntitlement(300000), countyLimit: 832750, price: null });
  near(b.remaining, 133187.5);
  near(b.maxNoDown, 532750);
});

test("VA guaranty with full entitlement, Table 3: 50%, $22,500, 40% capped at $36,000, then 25%", () => {
  near(vaGuarantyFullEntitlement(40000), 20000);
  near(vaGuarantyFullEntitlement(50000), 22500);
  near(vaGuarantyFullEntitlement(100000), 36000);
  near(vaGuarantyFullEntitlement(80000), 32000);
  near(vaGuarantyFullEntitlement(300000), 75000);
});

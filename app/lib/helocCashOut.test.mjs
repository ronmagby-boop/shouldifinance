// Tests for lib/helocCashOut.ts, with figures that can be checked by hand.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blendedRate, borrowingLimits, breakEvenHelocRate, cashOutOption, compare,
  FED_MOVES, helocCltv, helocOption, helocRateAfter,
} from "./helocCashOut.ts";
import * as finance from "./finance.ts";

const near = (actual, expected, tol = 0.01, msg = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual}`);

/** The textbook level payment, written out independently of lib/finance. */
const level = (p, annual, n) => {
  const r = annual / 1200;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
};
/** Balance after k level payments, closed form. */
const balanceAfter = (p, annual, n, k) => {
  const r = annual / 1200;
  const pmt = level(p, annual, n);
  return r === 0 ? p - pmt * k : p * (1 + r) ** k - pmt * (((1 + r) ** k - 1) / r);
};

const base = {
  mortgageBalance: 200000, mortgageRate: 3, mortgageYearsLeft: 25,
  homeValue: 500000, cashNeeded: 50000,
  cashOutRate: 6.5, cashOutTermYears: 30, closingCosts: 5000, financeClosingCosts: false,
  helocRate: 8.5, drawYears: 10, repayYears: 20, helocFees: 500,
  plan: { kind: "interest-only" }, rateCap: null, rateFloor: null,
  horizonYears: 5,
};

test("at 0% everything is division: payments, balances and costs are the fees alone", () => {
  // $120,000 over 10 years left = $1,000/mo; $144,000 cash-out over 20 years = $600/mo;
  // a $24,000 line repaid over 20 years after the draw = $100/mo.
  const i = { ...base, mortgageBalance: 120000, mortgageRate: 0, mortgageYearsLeft: 10, cashNeeded: 24000,
    cashOutRate: 0, cashOutTermYears: 20, closingCosts: 3000, helocRate: 0, helocFees: 600 };
  const c = cashOutOption(i);
  const h = helocOption(i, 0);
  assert.equal(c.loanAmount, 144000);
  near(c.payment, 600);
  near(h.mortgagePayment, 1000);
  near(h.helocPaymentYear1, 0);
  near(h.totalPaymentYear1, 1000);
  // Month 121: the mortgage (120 months) is paid off; the HELOC repays at $100.
  near(h.helocPaymentAfterDraw, 100);
  near(h.totalPaymentAfterDraw, 100);
  // Five years: cost is the fees; balances fall by 60 payments.
  near(c.cost, 3000);
  near(h.cost, 600);
  near(c.balance, 144000 - 60 * 600);
  near(h.mortgageBalance, 60000);
  near(h.helocBalance, 24000);
  near(blendedRate(i, 0), 0);
});

test("interest-only draw: 8.5% on $50,000 is $354.17 a month and $21,250 over five years", () => {
  const h = helocOption(base, 8.5);
  near(h.helocPaymentYear1, (50000 * 0.085) / 12);
  near(h.helocPaymentYear1, 354.17);
  near(h.helocInterest, 21250);
  near(h.helocBalance, 50000);
  // After the 10-year draw, $50,000 amortizes over 20 years at 8.5%.
  near(h.helocPaymentAfterDraw, level(50000, 8.5, 240));
  near(h.helocPaymentAfterDraw, 433.91);
});

test("the existing mortgage and the cash-out loan match the closed-form payment and balance", () => {
  const h = helocOption(base, 8.5);
  near(h.mortgagePayment, level(200000, 3, 300));
  near(h.mortgageBalance, balanceAfter(200000, 3, 300, 60));
  near(h.mortgageInterest, level(200000, 3, 300) * 60 - (200000 - balanceAfter(200000, 3, 300, 60)));
  const c = cashOutOption(base);
  assert.equal(c.loanAmount, 250000);
  near(c.payment, level(250000, 6.5, 360));
  near(c.payment, 1580.17);
  near(c.balance, balanceAfter(250000, 6.5, 360, 60));
  near(c.cost, level(250000, 6.5, 360) * 60 - (250000 - balanceAfter(250000, 6.5, 360, 60)) + 5000);
});

test("financed closing costs join the loan but count once as a fee", () => {
  const i = { ...base, financeClosingCosts: true };
  const c = cashOutOption(i);
  assert.equal(c.loanAmount, 255000);
  assert.equal(c.upfront, 0);
  near(c.cost, c.interest + 5000);
  assert.equal(cashOutOption(base).upfront, 5000);
});

test("blended rate weights the old mortgage and the HELOC by balance: (200k × 3% + 50k × 8.5%) / 250k = 4.1%", () => {
  near(blendedRate(base, 8.5), 4.1, 1e-9);
});

test("a Fed move shifts the HELOC rate one-for-one, clamped to the cap or floor", () => {
  assert.deepEqual(helocRateAfter(8.5, 0.25, null, null), { rate: 8.75, raw: 8.75, clamped: null });
  assert.deepEqual(helocRateAfter(8.5, 1, 9, null), { rate: 9, raw: 9.5, clamped: "cap" });
  assert.deepEqual(helocRateAfter(8.5, -2, null, 7.5), { rate: 7.5, raw: 6.5, clamped: "floor" });
  assert.equal(helocRateAfter(1, -2, null, null).rate, 0);
  // The cash-out side never moves; the HELOC side's cost rises with every step.
  const rows = FED_MOVES.map((m) => compare(base, m));
  assert.deepEqual(rows.map((r) => r.rate.rate), [8, 8.25, 8.5, 8.75, 9, 9.25, 9.5]);
  for (let k = 1; k < rows.length; k++) {
    assert.ok(rows[k].heloc.cost > rows[k - 1].heloc.cost);
    assert.equal(rows[k].cashOut.cost, rows[0].cashOut.cost);
  }
  const capped = compare({ ...base, rateCap: 9 }, 1);
  assert.equal(capped.rate.rate, 9);
  assert.equal(capped.rate.clamped, "cap");
});

test("the break-even HELOC rate makes the two costs equal, and either side of it the answer flips", () => {
  const b = breakEvenHelocRate(base);
  assert.equal(b.reason, "found");
  near(helocOption(base, b.rate).cost, cashOutOption(base).cost, 0.01);
  assert.equal(compare({ ...base, helocRate: b.rate - 0.25 }).cheaper, "heloc");
  assert.equal(compare({ ...base, helocRate: b.rate + 0.25 }).cheaper, "cash-out");
});

test("no break-even when one side wins at any rate from 0% to 40%", () => {
  // A cheap old mortgage and a tiny draw: the HELOC wins even at 40%.
  const tiny = { ...base, cashNeeded: 1000, closingCosts: 8000 };
  assert.equal(breakEvenHelocRate(tiny).reason, "heloc-always");
  // A refinance that lowers the old rate a lot and costs nothing: cash-out wins even at a 0% HELOC.
  const refi = { ...base, mortgageRate: 9, cashOutRate: 3, closingCosts: 0, helocFees: 5000 };
  assert.equal(breakEvenHelocRate(refi).reason, "cash-out-always");
});

test("paying the line down over 5 years at 0%: $200 a month, cleared inside the draw, nothing after it", () => {
  const i = { ...base, cashNeeded: 12000, helocRate: 0, plan: { kind: "paydown", years: 5 } };
  const h = helocOption(i, 0);
  near(h.helocPaymentYear1, 200);
  assert.equal(h.clearedMonth, 60);
  assert.equal(h.balanceAtDrawEnd, 0);
  near(h.helocPaymentAfterDraw, 0);
});

test("a pay-down longer than the draw re-amortizes what is left over the repayment period", () => {
  // $36,000 at 0% planned over 15 years ($200/mo); after 10 years $12,000 is left,
  // which the 20-year repayment period spreads to $50/mo.
  const i = { ...base, cashNeeded: 36000, helocRate: 0, plan: { kind: "paydown", years: 15 } };
  const h = helocOption(i, 0);
  near(h.helocPaymentYear1, 200);
  near(h.balanceAtDrawEnd, 12000);
  near(h.helocPaymentAfterDraw, 50);
});

test("borrowing limits: 80% conventional and FHA, 100% VA; the most cash each allows", () => {
  // $400,000 home, $250,000 owed, $60,000 cash, $5,000 financed: a $315,000 loan, 78.75% LTV.
  const i = { ...base, homeValue: 400000, mortgageBalance: 250000, cashNeeded: 60000, closingCosts: 5000, financeClosingCosts: true };
  const limits = Object.fromEntries(borrowingLimits(i).map((l) => [l.program, l]));
  near(limits.conventional.ltv, 78.75);
  assert.equal(limits.conventional.within, true);
  near(limits.conventional.maxCash, 320000 - 250000 - 5000);
  near(limits.fha.maxCash, 65000);
  // VA measures 100% on the loan with the funding fee in it (38 CFR 36.4306(a)(2)):
  // $315,000 × 1.0215 = $321,772.50, 80.44% of value; the most cash is $400,000 / 1.0215 − $255,000.
  near(limits.va.loan, 321772.5);
  near(limits.va.ltv, 80.443125, 1e-6);
  near(limits.va.maxCash, 136581.01);
  // An exempt veteran pays no fee: then it is $400,000 − $255,000.
  near(Object.fromEntries(borrowingLimits(i, 0).map((l) => [l.program, l])).va.maxCash, 145000);
  // $100,000 cash would be 88.75%: over the 80% programs; inside VA's 100% even with the fee (90.66%).
  const big = Object.fromEntries(borrowingLimits({ ...i, cashNeeded: 100000 }).map((l) => [l.program, l]));
  assert.equal(big.conventional.within, false);
  assert.equal(big.fha.within, false);
  assert.equal(big.va.within, true);
  near(big.va.ltv, 90.658125, 1e-6);
  near(helocCltv(i), (250000 + 60000) / 4000);
});

// A $300,000 base loan on a $400,000 home: $250,000 owed plus $50,000 cash, closing costs paid at closing.
const va = { ...base, homeValue: 400000, mortgageBalance: 250000, cashNeeded: 50000, loanType: "va" };

test("VA funding fee, first use: 2.15% of $300,000 is $6,450, financed into a $306,450 loan", () => {
  const c = cashOutOption({ ...va, vaUse: "first" });
  assert.equal(c.baseLoan, 300000);
  near(c.programFee.pct, 2.15, 1e-12);
  near(c.programFee.amount, 6450);
  near(c.programFee.financed, 6450);
  near(c.programFee.cash, 0);
  near(c.loanAmount, 306450);
  near(c.payment, level(306450, 6.5, 360));
  near(c.upfront, 5000);
  near(c.fees, 5000 + 6450);
  near(c.cost, c.interest + 11450);
  // The first-use rate is the default when no use is given.
  near(cashOutOption(va).programFee.amount, 6450);
});

test("VA funding fee, subsequent use: 3.3% of $300,000 is $9,900, financed into a $309,900 loan", () => {
  const c = cashOutOption({ ...va, vaUse: "subsequent" });
  near(c.programFee.amount, 9900);
  near(c.loanAmount, 309900);
  near(c.cost, c.interest + 5000 + 9900);
});

test("VA funding fee, exempt: no fee, and the loan is the $300,000 base", () => {
  const c = cashOutOption({ ...va, vaUse: "exempt" });
  assert.equal(c.programFee.amount, 0);
  assert.equal(c.loanAmount, 300000);
  near(c.cost, c.interest + 5000);
  // Same as a conventional loan on the same numbers.
  near(c.cost, cashOutOption({ ...va, loanType: "conventional" }).cost);
});

test("VA fee over 100% of value is paid in cash: on a $305,000 home, $5,000 is financed and $1,450 paid at closing", () => {
  const c = cashOutOption({ ...va, homeValue: 305000, vaUse: "first" });
  near(c.programFee.financed, 5000);
  near(c.programFee.cash, 1450);
  near(c.loanAmount, 305000);
  near(c.upfront, 5000 + 1450);
  // The whole fee is still a cost, financed or not.
  near(c.fees, 5000 + 6450);
  // A base loan already over 100%: none of the fee can be financed.
  const over = cashOutOption({ ...va, homeValue: 290000 });
  near(over.programFee.financed, 0);
  near(over.programFee.cash, 6450);
  near(over.loanAmount, 300000);
});

test("FHA upfront MIP: 1.75% of $300,000 is $5,250, financed on top; the 80% limit is on the $300,000 base", () => {
  const i = { ...va, loanType: "fha" };
  const c = cashOutOption(i);
  near(c.programFee.amount, 5250);
  near(c.programFee.financed, 5250);
  near(c.loanAmount, 305250);
  near(c.cost, c.interest + 5000 + 5250 + c.annualMip.total);
  const fha = borrowingLimits(i).find((l) => l.program === "fha");
  near(fha.ltv, 75);
  assert.equal(fha.within, true);
  // A conventional loan carries no program fee.
  assert.equal(cashOutOption({ ...va, loanType: "conventional" }).programFee.amount, 0);
});

test("VA borrowing limit follows the use: the most cash is $400,000 / (1 + fee) − $250,000", () => {
  const limit = (vaUse) => borrowingLimits({ ...va, vaUse }).find((l) => l.program === "va");
  near(limit("first").maxCash, 400000 / 1.0215 - 250000);
  near(limit("subsequent").maxCash, 137221.68);
  near(limit("exempt").maxCash, 150000);
  // Paying the fee at closing instead, the base loan alone can reach 100%: $150,000 cash.
  near(limit("first").maxCashFeeInCash, 150000);
  // At $305,000 the base fits, so it is within the limit; $1,450 of the fee is paid in cash and the loan is 100%.
  const tight = borrowingLimits({ ...va, homeValue: 305000 }).find((l) => l.program === "va");
  assert.equal(tight.within, true);
  near(tight.feeCash, 1450);
  near(tight.ltv, 100);
  assert.equal(borrowingLimits({ ...va, homeValue: 290000 }).find((l) => l.program === "va").within, false);
});

/*
 * FHA annual MIP. depends_on: FHA_ANNUAL_MIP_BPS, FHA_MIP_DURATION_MONTHS,
 * FHA_MIP_LOAN_THRESHOLD, FHA_MIP_SHORT_TERM_MAX_YEARS, FHA_MIP_DURATION_CLIFF_LTV,
 * FHA_UFMIP_RATE (app/lib/finance.ts). The engine reads them, so a change flows
 * into the page; the figures below were worked by hand against these values,
 * and the snapshot test fails first if any of them moves, naming it.
 */
const FHA_SNAPSHOT = {
  FHA_ANNUAL_MIP_BPS: {
    longTerm: {
      atOrBelowThreshold: [{ maxLtv: 95, bps: 50 }, { maxLtv: Infinity, bps: 55 }],
      aboveThreshold: [{ maxLtv: 95, bps: 70 }, { maxLtv: Infinity, bps: 75 }],
    },
    shortTerm: {
      atOrBelowThreshold: [{ maxLtv: 90, bps: 15 }, { maxLtv: Infinity, bps: 40 }],
      aboveThreshold: [{ maxLtv: 78, bps: 15 }, { maxLtv: 90, bps: 40 }, { maxLtv: Infinity, bps: 65 }],
    },
  },
  FHA_MIP_DURATION_MONTHS: { atOrBelowCliff: 132, aboveCliff: 360 },
  FHA_MIP_LOAN_THRESHOLD: 726200,
  FHA_MIP_SHORT_TERM_MAX_YEARS: 15,
  FHA_MIP_DURATION_CLIFF_LTV: 90,
  FHA_UFMIP_RATE: 1.75,
};

test("depends_on: the FHA constants are the values the MIP figures below were checked against", () => {
  for (const [name, value] of Object.entries(FHA_SNAPSHOT)) {
    assert.deepEqual(finance[name], value,
      `${name} changed: re-check the FHA MIP figures in this file by hand, then update FHA_SNAPSHOT`);
  }
});

// FHA at 0%: a $200,000 base loan ($150,000 owed + $50,000 cash) on a $400,000 home, 50% LTV.
// The 1.75% UFMIP makes the loan $203,500; over 30 years that is $565.28 a month of principal.
const fha0 = { ...base, mortgageBalance: 150000, cashNeeded: 50000, homeValue: 400000,
  cashOutRate: 0, closingCosts: 0, loanType: "fha" };
const L = 203500;
/** Σ over months 1..k of the 0% balance after that month's payment, times the monthly MIP rate. */
const mipAtZero = (bps, k, n = 360) => (L * bps) / 10000 / 12 * (k - (k * (k + 1)) / (2 * n));

test("FHA annual MIP at 0%: 0.50% on the balance, $84.56 in month 1 and $4,656.48 over five years", () => {
  const c = cashOutOption(fha0);
  assert.equal(c.annualMip.bps, 50);
  assert.equal(c.annualMip.months, 132);
  near(c.loanAmount, L);
  // Month 1: ($203,500 − $565.28) × 0.5% / 12.
  near(c.annualMip.firstMonth, ((L - L / 360) * 0.005) / 12);
  near(c.annualMip.firstMonth, 84.56);
  near(c.firstPayment, L / 360 + 84.56);
  // Five years: $84.79 × (60 − 60 × 61 / 720) = $84.79 × 54.917.
  near(c.annualMip.total, mipAtZero(50, 60));
  near(c.annualMip.total, 4656.48);
  // It is a cost, beside the $3,500 UFMIP; interest is nil at 0%.
  near(c.cost, 3500 + 4656.48);
});

test("FHA annual MIP stops after 11 years at 80% LTV or less: month 132 pays it, month 133 does not", () => {
  const c = cashOutOption({ ...fha0, horizonYears: 15 });
  near(c.annualMip.total, mipAtZero(50, 132));
  near(c.annualMip.total, 9125.0);
  near(c.paymentInMonth(132), L / 360 + ((L - (132 * L) / 360) * 0.005) / 12);
  near(c.paymentInMonth(133), L / 360);
});

test("FHA annual MIP by loan amount, term and LTV, as the FHA calculator reads the table", () => {
  const bps = (over) => cashOutOption({ ...fha0, ...over }).annualMip;
  // Over $726,200: $800,000 base on a $1,000,000 home, 30 years: 70 bps.
  assert.equal(bps({ mortgageBalance: 750000, homeValue: 1000000 }).bps, 70);
  // 15 years or less, at or under $726,200: 15 bps.
  assert.equal(bps({ cashOutTermYears: 15 }).bps, 15);
  // 15 years, over $726,200, 80% LTV (over 78%): 40 bps.
  assert.equal(bps({ mortgageBalance: 750000, homeValue: 1000000, cashOutTermYears: 15 }).bps, 40);
  // Over 90% LTV (not a cash-out FHA allows, but the rule still applies): for the whole term.
  const high = bps({ mortgageBalance: 330000, homeValue: 400000 });
  assert.equal(high.bps, 50);
  assert.equal(high.months, 360);
  // The MIP rate's LTV is on the base loan: $200,000 / $400,000, not the $203,500 loan.
  near(bps({}).ltv, 50);
  // Conventional and VA pay none.
  assert.equal(cashOutOption({ ...fha0, loanType: "conventional" }).annualMip, null);
  assert.equal(cashOutOption({ ...fha0, loanType: "va" }).annualMip, null);
});

test("the FHA annual MIP enters the payment and the break-even", () => {
  const i = { ...base, loanType: "fha" };
  const c = cashOutOption(i);
  near(c.firstPayment, c.payment + c.annualMip.firstMonth);
  near(c.cost, c.interest + c.fees + c.annualMip.total);
  const b = breakEvenHelocRate(i);
  assert.equal(b.reason, "found");
  near(helocOption(i, b.rate).cost, c.cost, 0.01);
  // The premium makes the cash-out dearer, so the HELOC can cost more before it loses.
  assert.ok(b.rate > breakEvenHelocRate({ ...i, loanType: "conventional" }).rate);
});

test("a horizon beyond both terms still counts every dollar of interest, and leaves nothing owed", () => {
  const i = { ...base, horizonYears: 40 };
  const h = helocOption(i, 8.5);
  const c = cashOutOption(i);
  near(h.balance, 0);
  near(c.balance, 0);
  near(c.interest, level(250000, 6.5, 360) * 360 - 250000, 0.05);
  near(h.mortgageInterest, level(200000, 3, 300) * 300 - 200000, 0.05);
});

// Tests for check-assumptions.mjs on synthetic facts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assumptions, checkAssumptions, checkedKind, isSiteModel } from "./check-assumptions.mjs";

const fact = (card, card_source, extra = {}) => ({ id: "x", card, card_source, ...extra });
const matches = (cardSource, text) => assumptions(cardSource).map((a) => [`${a.kind} ${a.label}`, a.test.test(text)]);

test("only card_sources starting 'Site model' are site-model facts", () => {
  assert.ok(isSiteModel(fact("", "Site model: $1 at 2%")));
  assert.ok(isSiteModel(fact("", "Site model; Damodaran returns data")));
  assert.ok(!isSiteModel(fact("", "Arithmetic: 2% of $1")));
  assert.ok(!isSiteModel(fact("", "Illustration: Site model")));
});

test("Site model, Arithmetic and Illustration facts are all checked, by the same rule", () => {
  assert.equal(checkedKind(fact("", "Site model: $1 at 2%")), "Site model");
  assert.equal(checkedKind(fact("", "Arithmetic: $280,000 at 3.25%")), "Arithmetic");
  assert.equal(checkedKind(fact("", "illustration; $500 a month")), "Illustration");
  assert.equal(checkedKind(fact("", "Source: IRS Publication 523")), null);
  assert.equal(checkedKind(fact("", "Rule of thumb: 1% a year")), null);
  // The label is stripped the same way for each, so the inputs read are the same.
  for (const label of ["Site model", "Arithmetic", "Illustration"]) {
    assert.deepEqual(assumptions(`${label}: $280,000 at 3.25%, 30 years`).map((a) => a.label), ["$280,000", "3.25%", "30 years"]);
  }
  // An Arithmetic card stating its inputs passes; one whose card_source lists none fails.
  assert.equal(checkAssumptions(fact("It blends to about 4.1%.", "Arithmetic: $280,000 at 3.25%, $60,000 at 8.25%")).status, "pass");
  assert.equal(checkAssumptions(fact("It blends to 6.12%.", "Arithmetic: balance-weighted average")).status, "fail");
});

test("it reads prices, rates, down payments and terms out of the card_source", () => {
  const list = assumptions("Site model: $400,000, 10% down, 6.5%, 30 years, 72 mo, 48 payments");
  assert.deepEqual(list.map((a) => `${a.kind} ${a.label}`), ["price $400,000", "down payment 10% down", "rate 6.5%", "term 30 years", "term 72 mo", "term 48 payments"]);
});

test("equivalent forms match", () => {
  const src = "Site model: $400,000 at 6.5%, 30 years, 72 mo";
  for (const text of [
    "On a $400,000 loan at 6.5% over 30 years and 72 months.",
    "A 30-year, $400k loan at 6.5 percent, 72-month car loan.",
    "Thirty years at 6.5% on $400,000 with a 72-month term.",
  ]) assert.ok(matches(src, text).every(([, ok]) => ok), text);
});

test("near misses do not match: a different rate, a longer number, a different unit, a percentage that is not a down payment", () => {
  assert.deepEqual(matches("Site model: 6.5%", "At 16.5% it is 5."), [["rate 6.5%", false]]);
  assert.deepEqual(matches("Site model: $400,000", "On $400,0000 it is 5."), [["price $400,000", false]]);
  assert.deepEqual(matches("Site model: $400,000", "On $400,000,5 it is 5."), [["price $400,000", false]]);
  assert.deepEqual(matches("Site model: $400,000", "$400,000, 5% down"), [["price $400,000", true]], "a clause-ending comma is fine");
  assert.deepEqual(matches("Site model: 30 years", "After 30 months it is 5."), [["term 30 years", false]]);
  assert.deepEqual(matches("Site model: 10% down", "With 10% more it is 5."), [["down payment 10% down", false]]);
});

test("card_source counts as stating its inputs, so a fact that lists inputs passes by construction", () => {
  assert.equal(checkAssumptions(fact("87% goes to interest.", "Site model: $300,000 at 7%, 30 years")).status, "pass");
  assert.equal(checkAssumptions(fact("87% goes to interest.", "Site model: 7%, 30 years", { hero_context: "of year one at 7% over 30 years" })).status, "pass");
});

test("no headline figure is reported rather than passed or failed", () => {
  assert.equal(checkAssumptions(fact("Choosing the car matters more than the rate.", "Site model: $36,000 car, 7 years")).status, "no-figure");
});

test("a figure with no inputs listed fails, unless inputs_none gives a reason", () => {
  const noInputs = fact("Loans of 72 months exist for a reason.", "Site model: depreciation vs. loan balance");
  const failed = checkAssumptions(noInputs);
  assert.equal(failed.status, "fail");
  assert.match(failed.reason, /no inputs_none/);
  assert.equal(checkAssumptions({ ...noInputs, inputs_none: "The 72 months is the loan term named." }).status, "exempt");
  // An empty or blank reason fails, as depends_on_none does.
  assert.equal(checkAssumptions({ ...noInputs, inputs_none: "" }).status, "fail");
  assert.equal(checkAssumptions({ ...noInputs, inputs_none: "   " }).status, "fail");
  assert.equal(checkAssumptions({ ...noInputs, inputs_none: null }).status, "fail");
  // A fact cannot both list inputs and claim to have none.
  const both = checkAssumptions(fact("It blends to 6.12%.", "Arithmetic: $2,000 at 24%", { inputs_none: "a general rule" }));
  assert.equal(both.status, "fail");
  assert.match(both.reason, /lists inputs/);
  // A card with no figure at all is still only reported.
  assert.equal(checkAssumptions(fact("Check which match formula is yours.", "Arithmetic: two common match formulas")).status, "no-figure");
});

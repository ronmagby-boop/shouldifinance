// Tests for check-assumptions.mjs on synthetic facts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assumptions, checkAssumptions, isSiteModel } from "./check-assumptions.mjs";

const fact = (card, card_source, extra = {}) => ({ id: "x", card, card_source, ...extra });

test("only card_sources starting 'Site model' are site-model facts", () => {
  assert.ok(isSiteModel(fact("", "Site model: $1 at 2%")));
  assert.ok(isSiteModel(fact("", "Site model; Damodaran returns data")));
  assert.ok(!isSiteModel(fact("", "Arithmetic: 2% of $1")));
  assert.ok(!isSiteModel(fact("", "Illustration: Site model")));
});

test("it reads prices, rates, down payments and terms out of the card_source", () => {
  const list = assumptions("Site model: $400,000, 10% down, 6.5%, 30 years, 72 mo, 48 payments");
  assert.deepEqual(list.map((a) => `${a.kind} ${a.label}`), ["price $400,000", "down payment 10% down", "rate 6.5%", "term 30 years", "term 72 mo", "term 48 payments"]);
});

test("equivalent forms on the card pass", () => {
  const src = "Site model: $400,000 at 6.5%, 30 years, 72 mo";
  for (const card of [
    "On a $400,000 loan at 6.5% over 30 years and 72 months, X is 5.",
    "A 30-year, $400k loan at 6.5 percent, 72-month car loan: 5.",
    "Thirty years at 6.5% on $400,000 with a 72-month term: 5.",
  ]) assert.equal(checkAssumptions(fact(card, src)).status, "pass", card);
});

test("the hero and hero_context count, the source line does not", () => {
  const src = "Site model: $300,000 at 7%, 30 years";
  assert.equal(checkAssumptions(fact("87% goes to interest.", src, { hero: "87%", hero_context: "of year one on $300,000 at 7% over 30 years" })).status, "pass");
  const r = checkAssumptions(fact("87% goes to interest.", src));
  assert.equal(r.status, "fail");
  assert.deepEqual(r.missing, ["price $300,000", "rate 7%", "term 30 years"]);
});

test("near misses do not pass: a different rate, a prefix of a number, a different unit", () => {
  assert.deepEqual(checkAssumptions(fact("At 16.5% it is 5.", "Site model: 6.5%")).missing, ["rate 6.5%"]);
  assert.deepEqual(checkAssumptions(fact("On $400,0000 it is 5.", "Site model: $400,000")).missing, ["price $400,000"]);
  assert.deepEqual(checkAssumptions(fact("After 30 months it is 5.", "Site model: 30 years")).missing, ["term 30 years"]);
  assert.deepEqual(checkAssumptions(fact("With 10% more it is 5.", "Site model: 10% down")).missing, ["down payment 10% down"]);
});

test("no headline figure, or no inputs listed, is reported rather than passed or failed", () => {
  assert.equal(checkAssumptions(fact("Choosing the car matters more than the rate.", "Site model: $36,000 car, 7 years")).status, "no-figure");
  assert.equal(checkAssumptions(fact("Loans of 72 months exist for a reason.", "Site model: depreciation vs. loan balance")).status, "no-inputs");
});

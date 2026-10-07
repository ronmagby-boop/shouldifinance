// Every calculator belongs to exactly one section of its own category.
// Run with: npm run test:calc
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSections, byCategory, CALC_SECTIONS, CALCULATORS, sectionOf } from "./calculators.ts";

test("every calculator is in exactly one section of its own category", () => {
  assert.doesNotThrow(() => assertSections());
  const listed = Object.values(CALC_SECTIONS).flat().flatMap((s) => s.slugs);
  assert.equal(listed.length, CALCULATORS.length);
  assert.equal(new Set(listed).size, CALCULATORS.length);
  for (const c of CALCULATORS) assert.ok(sectionOf(c.slug), `${c.slug} has no section`);
});

test("the guard names a calculator left out, listed twice, or in another category's section", () => {
  const sections = structuredClone(CALC_SECTIONS);
  sections.Home[0].slugs = sections.Home[0].slugs.filter((s) => s !== "rent-vs-buy");
  assert.throws(() => assertSections(CALCULATORS, sections), /"rent-vs-buy" \(Home\) is in no section/);
  const twice = structuredClone(CALC_SECTIONS);
  twice.Home[1].slugs = [...twice.Home[1].slugs, "rent-vs-buy"];
  assert.throws(() => assertSections(CALCULATORS, twice), /"rent-vs-buy" is in both/);
  const wrong = structuredClone(CALC_SECTIONS);
  wrong.Debt[0].slugs = [...wrong.Debt[0].slugs, "rent-vs-buy"];
  assert.throws(() => assertSections(CALCULATORS, wrong), /in a Debt section but its category is Home/);
});

test("byCategory follows the section order", () => {
  assert.deepEqual(byCategory("Home").slice(0, 3).map((c) => c.slug), ["rent-vs-buy", "home-affordability", "buy-now-or-save"]);
  assert.deepEqual(sectionOf("heloc-limit").calcs.map((c) => c.slug),
    ["heloc-vs-cash-out", "heloc-limit", "home-equity-loan-vs-heloc", "heloc-debt-payoff"]);
  assert.equal(sectionOf("pay-off-debt").section.id, "mortgage-payment-and-payoff");
  assert.equal(byCategory("Debt").length, 6);
});

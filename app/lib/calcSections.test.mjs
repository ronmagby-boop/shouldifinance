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
  for (const sec of sections.Home) sec.slugs = sec.slugs.filter((s) => s !== "rent-vs-buy");
  assert.throws(() => assertSections(CALCULATORS, sections), /"rent-vs-buy" \(Home\) is in no section/);
  const twice = structuredClone(CALC_SECTIONS);
  twice.Home[1].slugs = [...twice.Home[1].slugs, "rent-vs-buy"];
  assert.throws(() => assertSections(CALCULATORS, twice), /"rent-vs-buy" is in both/);
  const wrong = structuredClone(CALC_SECTIONS);
  wrong.Debt[0].slugs = [...wrong.Debt[0].slugs, "rent-vs-buy"];
  assert.throws(() => assertSections(CALCULATORS, wrong), /in a Debt section but its category is Home/);
});

test("byCategory follows the section order", () => {
  // Home's sections run Refinancing, Home equity, Buying a home, payment and payoff, Selling or moving.
  assert.deepEqual(CALC_SECTIONS.Home.map((s) => s.id),
    ["refinancing", "home-equity", "buying-a-home", "mortgage-payment-and-payoff", "selling-or-moving", "rental-property"]);
  assert.deepEqual(byCategory("Home").slice(0, 4).map((c) => c.slug), ["should-i-refinance", "va-recoup", "refinance-to-pay-off-debt", "heloc-vs-cash-out"]);
  // Every titled section has a short jump-link label; Debt's untitled one has none.
  for (const s of Object.values(CALC_SECTIONS).flat()) assert.equal(Boolean(s.title), Boolean(s.short), s.id);
  assert.deepEqual(sectionOf("heloc-limit").calcs.map((c) => c.slug),
    ["heloc-vs-cash-out", "heloc-limit", "home-equity-loan-vs-heloc", "heloc-debt-payoff"]);
  assert.equal(sectionOf("pay-off-debt").section.id, "mortgage-payment-and-payoff");
  assert.equal(byCategory("Debt").length, 6);
});

test("the homepage's Home box shows its hand-picked four; the others show their first four", async () => {
  const { homepagePicks } = await import("./calculators.ts");
  assert.deepEqual(homepagePicks("Home").map((c) => c.slug), ["should-i-refinance", "heloc-vs-cash-out", "home-affordability", "rent-or-sell"]);
  assert.deepEqual(homepagePicks("Money").map((c) => c.slug), byCategory("Money").slice(0, 4).map((c) => c.slug));
  // The index order is unchanged by the picks.
  assert.equal(byCategory("Home")[0].slug, "should-i-refinance");
  assert.equal(byCategory("Home")[1].slug, "va-recoup");
});

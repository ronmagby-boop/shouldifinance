// Tests for the card input hash in render-cards.mjs: what makes cards:public
// republish a card. No browser is launched.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DESIGN_CONSTANTS, IMAGE_FIELDS, categoryColours, designHash, inputHash } from "./render-cards.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(HERE, "render-cards.mjs"), "utf8");
const facts = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "content", "instagram-facts.json"), "utf8")).facts;
const colours = categoryColours();
const design = designHash();

test("every constant page() interpolates is part of the design hash", () => {
  const page = source.slice(source.indexOf("function page("), source.indexOf("function fitInPage("));
  const used = [...new Set([...page.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]))];
  assert.ok(used.length > 5, "found the constants");
  assert.deepEqual(used.filter((c) => !(c in DESIGN_CONSTANTS)), []);
});

test("the input hash moves with every field that reaches the image, and with the category's colours", () => {
  const f = facts.find((x) => x.id === "principal-beats-interest-233");
  const h = inputHash(f, colours, design);
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(inputHash({ ...f }, colours, design), h, "stable");
  for (const k of IMAGE_FIELDS) {
    const value = k === "category" ? "Debt" : k === "layout" ? "statement" : `${f[k] ?? ""} changed`;
    assert.notEqual(inputHash({ ...f, [k]: value }, colours, design), h, `${k} changes the hash`);
  }
  assert.notEqual(inputHash(f, { ...colours, [f.category]: { ...colours[f.category], card: "#000000" } }, design), h, "colours");
  assert.notEqual(inputHash(f, colours, "another design"), h, "design");
});

test("fields that never reach the image do not move it, so editing them republishes nothing", () => {
  const f = facts.find((x) => x.id === "principal-beats-interest-233");
  const h = inputHash(f, colours, design);
  for (const [k, v] of [["caption", "x"], ["source", "x"], ["guide", "x"], ["reviewed", { date: "2026-01-01", hash: "0" }], ["depends_on", ["X"]], ["shelfLife", null]]) {
    assert.equal(inputHash({ ...f, [k]: v }, colours, design), h, k);
  }
});

test("the committed record matches the committed facts: no published card is out of date", () => {
  const record = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "content", "instagram-public-cards.json"), "utf8")).cards;
  const stale = facts.filter((f) => !f.shelfLife && record[f.id]?.hash !== inputHash(f, colours, design)).map((f) => f.id);
  assert.deepEqual(stale, [], "run npm run cards and npm run cards:public");
});

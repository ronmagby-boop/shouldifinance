// Tests for check-quotes.mjs: synthetic quotes against synthetic excerpts, and
// the committed guides against the committed sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkQuotes, classify, normalize, quotesIn } from "./check-quotes.mjs";

const ex = (text, source = "src") => ({ source, text: normalize(text), lower: normalize(text).toLowerCase() });
const SOURCE = [ex("The maximum LTV is 80 percent of the Adjusted Value. The UFMIP is not considered."),
  ex("Restoration is possible if the property has been sold, and the loan has been paid in full; or a veteran assumes it.")];

test("an exact quote passes, with or without punctuation the source has at that point", () => {
  assert.equal(classify("The maximum LTV is 80 percent of the Adjusted Value.", SOURCE).status, "pass");
  assert.equal(classify("The maximum LTV is 80 percent", SOURCE).status, "pass");
});

test("a comma or period inside the marks that the source does not have there fails", () => {
  // The source continues "...been sold, and the loan...": a period after "sold" is not in it.
  const r = classify("the property has been sold.", SOURCE);
  assert.equal(r.status, "fail");
  assert.match(r.reason, /trailing punctuation/);
  assert.equal(classify("the property has been sold,", SOURCE).status, "pass", "the source has the comma");
  assert.equal(classify("the loan has been paid in full.", SOURCE).status, "fail", "the source has a semicolon there");
});

test("a changed capital fails", () => {
  assert.equal(classify("the maximum LTV is 80 percent of the Adjusted Value.", SOURCE).status, "fail");
});

test("a reworded quote that starts or ends like a saved passage fails", () => {
  const r = classify("The maximum LTV is 80 percent of the appraised value", SOURCE);
  assert.equal(r.status, "fail");
  assert.match(r.reason, /starts or ends/);
});

test("a quote from no saved source is unverified, and short terms are not checked", () => {
  assert.equal(classify("marry the house, date the rate", SOURCE).status, "unverified");
  assert.equal(classify("cap cost", SOURCE).status, "term");
});

test("curly quotes, dashes, spacing and markdown are normalized before comparing", () => {
  assert.equal(normalize("it’s “fine” — really"), `it's "fine" - really`);
  assert.deepEqual(quotesIn('---\ntitle: "Not a quote here"\n---\nIt said "an *emphasized* [linked](/x) phrase\nacross lines".'),
    ["an emphasized linked phrase across lines"]);
});

test("the committed guides have no quotation that fails against the committed sources", () => {
  const fails = checkQuotes().filter((r) => r.status === "fail");
  assert.deepEqual(fails, []);
});

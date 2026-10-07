// Tests for check-quotes.mjs: synthetic quotes against synthetic excerpts, and
// the committed guides against the committed sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

/** A throwaway guides folder, sources file and allowlist, for the whole-check tests. */
function fixture({ guide, sources, allow }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quotes-"));
  fs.mkdirSync(path.join(dir, "guides"));
  fs.writeFileSync(path.join(dir, "guides", "g.md"), `---\ntitle: "x"\n---\n${guide}\n`);
  fs.writeFileSync(path.join(dir, "sources.json"), JSON.stringify({ sources: [{ id: "s", excerpts: sources }] }));
  fs.writeFileSync(path.join(dir, "allow.json"), JSON.stringify({ phrases: allow }));
  return { guidesDir: path.join(dir, "guides"), sourcesFile: path.join(dir, "sources.json"), allowlistFile: path.join(dir, "allow.json"), tokens: { YEAR: "2025" } };
}
const statuses = (rows) => rows.map((r) => [r.quote, r.status]);

test("an allowlisted phrase is skipped as the guide's own wording; anything else is still checked", () => {
  const f = fixture({
    guide: 'It is not "should I wait for rates". The report says "fees fell again this year".',
    sources: ["Fees fell again this year."],
    allow: [{ guide: "g", phrase: "should I wait for rates", reason: "A question posed by the guide." }],
  });
  assert.deepEqual(statuses(checkQuotes(f)), [["should I wait for rates", "own"], ["fees fell again this year", "fail"]]);
});

test("an allowlist entry with an empty reason fails, and so does one no longer in its guide", () => {
  const f = fixture({
    guide: 'Not "am I ready" at all.',
    sources: [],
    allow: [{ guide: "g", phrase: "am I ready", reason: "  " }, { guide: "g", phrase: "a phrase that was edited away", reason: "Gone." }],
  });
  const rows = checkQuotes(f);
  assert.deepEqual(statuses(rows), [["am I ready", "fail"], ["a phrase that was edited away", "fail"]]);
  assert.match(rows[0].reason, /empty reason/);
  assert.match(rows[1].reason, /not found in its guide/);
});

test("{{TOKEN}} figures are resolved before a quote is compared", () => {
  const f = fixture({ guide: 'The report, "Trends in Fees, {{YEAR}}", says so.', sources: ["Research Trends in Fees, 2025 Key Findings"], allow: [] });
  assert.deepEqual(statuses(checkQuotes(f)), [["Trends in Fees, 2025", "pass"]]);
});

test("the committed guides have no quotation that fails against the committed sources", () => {
  const fails = checkQuotes().filter((r) => r.status === "fail");
  assert.deepEqual(fails, []);
});

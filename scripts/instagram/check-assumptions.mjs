#!/usr/bin/env node
/**
 * Every site-model fact must say, on the card itself, what its headline
 * figure assumes.
 *
 *   npm run check:assumptions        exits 1 if any site-model fact fails
 *
 * A site-model fact is one whose card_source starts "Site model". Its
 * assumptions are the rates, terms and prices that card_source lists:
 * percentages ("6.5%"), terms ("30 years", "72 mo", "48 payments") and
 * prices ("$400,000"). Each must appear somewhere printed on the card: the
 * card text, the hero, the hero_context or the card_source line itself.
 * Equivalent forms pass: "30-year" for "30 years", "thirty" for "30",
 * "72-month" for "72 mo", "$400k" for "$400,000".
 *
 * Because the assumptions are read from card_source and card_source counts as
 * stating them, every fact with inputs listed passes. What the check still
 * catches: a site-model card whose card_source names no rate, term or price
 * (NOTE), and a card_source that lists an input in a form the matcher cannot
 * find again. It does not know which inputs a headline figure depends on;
 * card_source has to list them, and nothing here checks that it does.
 *
 * Not checked, and listed: a card with no headline figure (no digit in the
 * card or hero), and a card_source that names no inputs to check against.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FACTS_FILE = process.env.IG_FACTS_FILE || path.join(ROOT, "content", "instagram-facts.json");

const WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, "twenty-five": 25, thirty: 30, forty: 40, fifty: 50, sixty: 60,
};
const numberWords = (n) => Object.entries(WORDS).filter(([, v]) => v === n).map(([w]) => w);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isSiteModel = (fact) => /^Site model\b/i.test(fact.card_source ?? "");

/** The rates, terms and prices a card_source lists, each with a test for the card. */
export function assumptions(cardSource) {
  const text = cardSource.replace(/^Site model\s*[:;]?\s*/i, "");
  const found = [];
  for (const m of text.matchAll(/\$\d{1,3}(?:,\d{3})*(?:\.\d+)?/g)) {
    const digits = m[0].replace(/[$,]/g, "");
    const k = Number(digits) >= 1000 && Number(digits) % 1000 === 0 ? `\\$${Number(digits) / 1000}k` : null;
    // Not followed by another digit or digit group ("$400,0000"), but a comma
    // that ends the clause ("$400,000, 5% down") is fine.
    found.push({ kind: "price", label: m[0], test: new RegExp(`${esc(m[0])}(?!\\d|,\\d)${k ? `|${k}\\b` : ""}`, "i") });
  }
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)%( down)?/g)) {
    const down = m[2] ? " down" : "";
    found.push({ kind: down ? "down payment" : "rate", label: m[0], test: new RegExp(`(?<![\\d.])${esc(m[1])}(?:%| percent)${down}`, "i") });
  }
  for (const m of text.matchAll(/(\d+)\s*(years?|yrs?|months?|mo|payments?)\b/gi)) {
    const n = Number(m[1]);
    const unit = /^y/i.test(m[2]) ? "years?|yr" : /^mo/i.test(m[2]) ? "months?|mo" : "payments?";
    const nums = [m[1], ...numberWords(n)].map(esc).join("|");
    found.push({ kind: "term", label: m[0], test: new RegExp(`\\b(?:${nums})[- ](?:${unit})\\b`, "i") });
  }
  return found;
}

/** { status: "pass" | "fail" | "no-figure" | "no-inputs", missing: [labels] } for one fact. */
export function checkAssumptions(fact) {
  const visible = [fact.card, fact.hero, fact.hero_context, fact.card_source].filter(Boolean).join(" \n ");
  if (!/\d/.test(`${fact.card} ${fact.hero ?? ""}`)) return { status: "no-figure", missing: [] };
  const list = assumptions(fact.card_source);
  if (!list.length) return { status: "no-inputs", missing: [] };
  const missing = list.filter((a) => !a.test.test(visible)).map((a) => `${a.kind} ${a.label}`);
  return { status: missing.length ? "fail" : "pass", missing };
}

function main() {
  const facts = JSON.parse(fs.readFileSync(FACTS_FILE, "utf8")).facts.filter((f) => !f.shelfLife && isSiteModel(f));
  const results = facts.map((f) => ({ f, ...checkAssumptions(f) }));
  const by = (s) => results.filter((r) => r.status === s);
  console.log(`check:assumptions: ${facts.length} site-model facts`);
  for (const r of by("fail")) {
    console.log(`  FAIL  ${r.f.id}: card does not state ${r.missing.join(", ")}`);
    console.log(`          card_source: ${r.f.card_source}`);
    console.log(`          card: ${r.f.card}${r.f.hero_context ? `\n          hero_context: ${r.f.hero_context}` : ""}`);
  }
  for (const r of by("no-inputs")) console.log(`  NOTE  ${r.f.id}: card_source names no rate, term or price to check against ("${r.f.card_source}")`);
  for (const r of by("no-figure")) console.log(`  NOTE  ${r.f.id}: no headline figure on the card, not checked`);
  console.log(`  ${by("pass").length} pass, ${by("fail").length} fail, ${by("no-inputs").length} with no inputs listed, ${by("no-figure").length} with no headline figure`);
  if (by("fail").length) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

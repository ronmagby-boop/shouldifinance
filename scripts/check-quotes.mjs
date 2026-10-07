#!/usr/bin/env node
/**
 * Every quotation in a guide must match its source exactly, punctuation and
 * case included.
 *
 *   npm run check:quotes     (also run by npm run check:guides)
 *
 * The sources are content/quote-sources.json: for each source its URL, the
 * date its text was retrieved, and the passages the guides quote, copied from
 * the source. A quotation is any text in straight double quotes in a guide's
 * body, of three words or more; shorter ones are terms ("cap cost
 * reduction"), not quotations, and are only counted. Each is:
 *
 *   pass        found in a saved excerpt exactly as written, including any
 *               comma or period inside the closing quotation mark
 *   fail        found only once case or a trailing comma, period, semicolon
 *               or colon is ignored, or its first or last six words are in an
 *               excerpt but the whole is not: a misquote of a source on file
 *   unverified  not in any saved excerpt. Listed, never failed: a question a
 *               guide poses, a saying, a title, or a quote whose source has
 *               not been saved yet
 *
 * The usual cause of a fail is punctuation: where the quoted words do not end
 * the source's sentence, a comma or period belongs outside the quotation
 * marks. To verify an unverified quote, add the passage it comes from to
 * content/quote-sources.json, copied from the source, never from the guide.
 *
 * Text is compared after the same normalization on both sides: curly quotes
 * and apostrophes to straight ones, dashes to hyphens, runs of whitespace to
 * one space, and markdown emphasis and link syntax removed from the quote.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCES_FILE = path.join(ROOT, "content", "quote-sources.json");
const GUIDES_DIR = path.join(ROOT, "content", "guides");
const MIN_WORDS = 3;
const EDGE_WORDS = 6;

export function normalize(s) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/[ ﻿]/g, " ")
    .replace(/(\w) -(\w)/g, "$1-$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Markdown in a quote is formatting, not quoted text. */
const stripMarkdown = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*+/g, "");

/** The straight-quoted passages in a guide's body (frontmatter excluded). */
export function quotesIn(markdown) {
  const parts = markdown.replace(/\r\n/g, "\n").split(/^---$/m);
  const body = parts.length >= 3 ? parts.slice(2).join("---") : markdown;
  return [...body.matchAll(/"([^"]*)"/g)].map((m) => normalize(stripMarkdown(m[1])));
}

/** Classifies one quotation against the excerpts. */
export function classify(quote, excerpts) {
  const words = quote.split(" ").filter(Boolean);
  if (words.length < MIN_WORDS) return { status: "term" };
  const hit = excerpts.find((e) => e.text.includes(quote));
  if (hit) return { status: "pass", source: hit.source };
  const core = quote.replace(/[.,;:]$/, "").toLowerCase();
  const loose = excerpts.find((e) => e.lower.includes(core));
  if (loose) return { status: "fail", source: loose.source, reason: "matches only once case or trailing punctuation is ignored" };
  if (words.length >= EDGE_WORDS + 2) {
    const head = words.slice(0, EDGE_WORDS).join(" ").toLowerCase();
    const tail = words.slice(-EDGE_WORDS).join(" ").replace(/[.,;:]$/, "").toLowerCase();
    const near = excerpts.find((e) => e.lower.includes(head) || e.lower.includes(tail));
    if (near) return { status: "fail", source: near.source, reason: "starts or ends like a saved passage but does not match it" };
  }
  return { status: "unverified" };
}

export function loadExcerpts(file = SOURCES_FILE) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  return doc.sources.flatMap((s) => s.excerpts.map((x) => {
    const text = normalize(x);
    return { source: s.id, text, lower: text.toLowerCase() };
  }));
}

/** Every quotation in every guide, classified. */
export function checkQuotes({ guidesDir = GUIDES_DIR, sourcesFile = SOURCES_FILE } = {}) {
  const excerpts = loadExcerpts(sourcesFile);
  const rows = [];
  for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith(".md")).sort()) {
    const guide = file.replace(/\.md$/, "");
    for (const quote of quotesIn(fs.readFileSync(path.join(guidesDir, file), "utf8"))) {
      rows.push({ guide, quote, ...classify(quote, excerpts) });
    }
  }
  return rows;
}

/** Prints the report; returns the number of failures. */
export function reportQuotes(rows, log = console.log, err = console.error) {
  const count = (s) => rows.filter((r) => r.status === s).length;
  const checked = rows.length - count("term");
  log(`check:quotes: ${checked} quotations in ${new Set(rows.map((r) => r.guide)).size} guides — ${count("pass")} pass, ${count("fail")} fail, ${count("unverified")} unverified (${count("term")} short terms not checked)`);
  for (const r of rows.filter((x) => x.status === "unverified")) log(`  UNVERIFIED  ${r.guide}: "${r.quote}"`);
  for (const r of rows.filter((x) => x.status === "fail")) err(`  FAIL  ${r.guide}: "${r.quote}"\n          ${r.reason} (${r.source})`);
  return count("fail");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(reportQuotes(checkQuotes()) ? 1 : 0);
}

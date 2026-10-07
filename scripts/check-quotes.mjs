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
 *   own         the guide's own wording, a saying, or a question it poses,
 *               not a quotation from a source: listed for that guide in
 *               content/quote-allowlist.json with a one-line reason, and
 *               skipped
 *   unverified  none of the above: a quotation whose source has not been
 *               saved yet. Listed, never failed
 *
 * The allowlist is checked too: an entry with an empty reason fails, and so
 * does one whose phrase no longer appears in its guide, so the list cannot
 * quietly outlive the text it excuses.
 *
 * {{TOKEN}} figures are resolved from app/lib/guide-tokens.ts before
 * comparing, as the site does when it renders a guide.
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
import { fileURLToPath, pathToFileURL } from "node:url";
// app/lib modules import each other without extensions; this resolves them.
import "./ts-resolve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCES_FILE = path.join(ROOT, "content", "quote-sources.json");
export const ALLOWLIST_FILE = path.join(ROOT, "content", "quote-allowlist.json");
const { GUIDE_TOKENS } = await import(pathToFileURL(path.join(ROOT, "app", "lib", "guide-tokens.ts")).href);
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

/** {{TOKEN}} replaced by its value, as the site renders it; an unknown token is left as written. */
export const resolveTokens = (s, tokens = GUIDE_TOKENS) => s.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => tokens[k] ?? m);

/** The straight-quoted passages in a guide's body (frontmatter excluded). */
export function quotesIn(markdown, tokens = GUIDE_TOKENS) {
  const parts = markdown.replace(/\r\n/g, "\n").split(/^---$/m);
  const body = resolveTokens(parts.length >= 3 ? parts.slice(2).join("---") : markdown, tokens);
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

/** The allowlist's { guide, phrase, reason } entries, phrases normalized as quotes are. */
export function loadAllowlist(file = ALLOWLIST_FILE) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8")).phrases.map((e) => ({ ...e, phrase: normalize(e.phrase) }));
}

/**
 * Every quotation in every guide, classified, followed by the allowlist's
 * own problems as fail rows: an empty reason, or a phrase its guide no longer
 * contains.
 */
export function checkQuotes({ guidesDir = GUIDES_DIR, sourcesFile = SOURCES_FILE, allowlistFile = ALLOWLIST_FILE, tokens = GUIDE_TOKENS } = {}) {
  const excerpts = loadExcerpts(sourcesFile);
  const allow = loadAllowlist(allowlistFile);
  const used = new Set();
  const rows = [];
  for (const file of fs.readdirSync(guidesDir).filter((f) => f.endsWith(".md")).sort()) {
    const guide = file.replace(/\.md$/, "");
    for (const quote of quotesIn(fs.readFileSync(path.join(guidesDir, file), "utf8"), tokens)) {
      const r = classify(quote, excerpts);
      const entry = r.status === "unverified" || r.status === "term" ? allow.find((e) => e.guide === guide && e.phrase === quote) : null;
      if (!entry) {
        rows.push({ guide, quote, ...r });
        continue;
      }
      used.add(entry);
      const reason = typeof entry.reason === "string" ? entry.reason.trim() : "";
      rows.push(reason
        ? { guide, quote, status: "own", reason }
        : { guide, quote, status: "fail", reason: "allowlisted with an empty reason", source: "quote-allowlist.json" });
    }
  }
  for (const e of allow) {
    if (!used.has(e)) {
      rows.push({ guide: e.guide, quote: e.phrase, status: "fail", reason: "allowlist entry not found in its guide: remove it, or correct the guide or phrase", source: "quote-allowlist.json" });
    }
  }
  return rows;
}

/** Prints the report; returns the number of failures. */
export function reportQuotes(rows, log = console.log, err = console.error) {
  const count = (s) => rows.filter((r) => r.status === s).length;
  const checked = count("pass") + count("fail") + count("unverified");
  log(`check:quotes: ${checked} quotations in ${new Set(rows.map((r) => r.guide)).size} guides — ${count("pass")} pass, ${count("fail")} fail, ${count("unverified")} unverified (skipped: ${count("own")} allowlisted as the guides' own wording, ${count("term")} short terms)`);
  for (const r of rows.filter((x) => x.status === "unverified")) log(`  UNVERIFIED  ${r.guide}: "${r.quote}"`);
  for (const r of rows.filter((x) => x.status === "fail")) err(`  FAIL  ${r.guide}: "${r.quote}"\n          ${r.reason} (${r.source})`);
  return count("fail");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(reportQuotes(checkQuotes()) ? 1 : 0);
}

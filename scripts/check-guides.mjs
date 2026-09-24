#!/usr/bin/env node
/**
 * Content checks for content/guides, run with `npm run check:guides`.
 *
 * These are deliberately NOT the same checks the build does. `next build`
 * already fails on a broken pairing, an unknown {{TOKEN}} and a future review
 * date, because those produce a broken page. What lives here is the editorial
 * layer — the things that make a guide bad rather than broken, which a build
 * has no opinion about.
 *
 * Zero dependencies on purpose. The site ships four runtime packages and this
 * script is not worth a fifth, so it reads the markdown and the registry as
 * text rather than importing the TypeScript. That means the registry parse is
 * a little literal; if it ever stops matching, the failure is loud rather than
 * silent, and `next build` is still the authority on pairing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUIDES_DIR = path.join(ROOT, "content", "guides");

/**
 * Word bounds.
 *
 * The FLOOR does the real work. A guide under this is usually a subject that
 * did not justify a page — the fix is to cut it, not to pad it.
 *
 * The CEILING is loose and only catches rambling. A guide running long because
 * it carries genuine material is not a failure and should not be trimmed to
 * fit: va-36-month-recoupment-rule is around 1,230 words because it maps the
 * Loan Estimate box by box, and that length is the reason it is useful.
 */
const MIN_WORDS = 380;
const MAX_WORDS = 1500;

const CATEGORIES = ["Home", "Debt", "Money", "Auto"];

/** Markdown the renderer does not implement — it would reach the page as text. */
const UNSUPPORTED = [
  [/^#\s+/m, "an h1 (`# `) — the page title already is the h1; use `## `"],
  [/^#{4,}\s+/m, "a heading deeper than h3"],
  [/^```/m, "a fenced code block"],
  [/!\[[^\]]*\]\(/, "an image"],
  [/~~[^~]+~~/, "strikethrough"],
  [/^(?:---|\*\*\*|___)\s*$/m, "a horizontal rule"],
];

const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** Frontmatter: `key: value`, quotes optional. Mirrors app/lib/guides.ts. */
function parse(raw) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const at = line.indexOf(":");
    if (at === -1) continue;
    let v = line.slice(at + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    data[line.slice(0, at).trim()] = v;
  }
  return { data, body: m[2] };
}

/** Calculator slugs, and the guide each one names, read out of the registry. */
function readRegistry() {
  const src = read(path.join(ROOT, "app", "lib", "calculators.ts"));
  const body = src.slice(src.indexOf("export const CALCULATORS"), src.indexOf("\n];"));
  const slugs = new Set();
  const guideOf = new Map();
  let current = null;
  for (const line of body.split("\n")) {
    let m;
    if ((m = /^ {4}slug: "([^"]+)",$/.exec(line))) {
      current = m[1];
      slugs.add(current);
    } else if (current && (m = /^ {6}slug: "([^"]+)",$/.exec(line))) {
      guideOf.set(current, m[1]);
    }
  }
  if (!slugs.size) throw new Error("Could not parse app/lib/calculators.ts — registry format changed?");
  return { slugs, guideOf };
}

/** Figures a guide is allowed to cite, read out of the token map. */
function readTokens() {
  const src = read(path.join(ROOT, "app", "lib", "guide-tokens.ts"));
  const body = src.slice(src.indexOf("export const GUIDE_TOKENS"), src.indexOf("const TOKEN ="));
  const keys = new Set();
  for (const m of body.matchAll(/^ {2}([A-Z][A-Z0-9_]*)\b/gm)) keys.add(m[1]);
  if (!keys.size) throw new Error("Could not parse app/lib/guide-tokens.ts — token map format changed?");
  return keys;
}

function main() {
  if (!fs.existsSync(GUIDES_DIR)) {
    console.log("No content/guides directory — nothing to check.");
    return 0;
  }

  const { slugs, guideOf } = readRegistry();
  const tokens = readTokens();
  const files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".md")).sort();
  const failures = [];
  const seen = new Map();
  const declared = new Map();

  for (const file of files) {
    const problems = [];
    const add = (msg) => problems.push(msg);
    const parsed = parse(read(path.join(GUIDES_DIR, file)));

    if (!parsed) {
      failures.push([file, ["no frontmatter block"]]);
      continue;
    }
    const { data, body } = parsed;

    for (const key of ["title", "slug", "description", "category", "reviewed"]) {
      if (!data[key]) add(`missing "${key}"`);
    }
    if (data.slug) {
      if (seen.has(data.slug)) add(`duplicate slug, also in ${seen.get(data.slug)}`);
      seen.set(data.slug, file);
    }
    if (data.category && !CATEGORIES.includes(data.category)) {
      add(`category "${data.category}" is not one of ${CATEGORIES.join(", ")}`);
    }
    if (data.reviewed) {
      const t = Date.parse(data.reviewed);
      if (Number.isNaN(t)) add(`reviewed "${data.reviewed}" does not parse`);
      else if (t > Date.now()) add(`reviewed ${data.reviewed} is in the future`);
    }

    // Pairing, both directions. The build enforces this too; it is here so a
    // content-only change gets the same answer without a full build.
    if (data.calculator) {
      declared.set(data.calculator, data.slug);
      if (!slugs.has(data.calculator)) {
        add(`pairs with "${data.calculator}", which is not a calculator slug`);
      } else if (guideOf.get(data.calculator) !== data.slug) {
        add(
          `pairs with "${data.calculator}", whose registry entry points at ` +
            `${guideOf.get(data.calculator) ? `"${guideOf.get(data.calculator)}"` : "no guide"}`,
        );
      }
      /* A paired guide links into its calculator at least twice. The second
       * is free: app/guides/[slug]/page.tsx always renders the CalculatorCta
       * card at the end of a paired guide. So what the BODY has to carry is
       * the mid-article link — the one that catches a reader who stops
       * halfway, before the closing card. */
      const links = (body.match(new RegExp(`\\]\\(/calculators/${data.calculator}\\)`, "g")) || []).length;
      if (links < 1) {
        add(
          `no link into /calculators/${data.calculator} in the body — the closing ` +
            `CTA is rendered for you, this is the one that catches a reader who stops halfway`,
        );
      }
    }

    // Prose, with links flattened to their text so URLs are not counted.
    const prose = body.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    const words = prose.split(/\s+/).filter(Boolean).length;
    if (words < MIN_WORDS) add(`${words} words — under the ${MIN_WORDS} floor, likely too thin to publish`);
    else if (words > MAX_WORDS) add(`${words} words — over the ${MAX_WORDS} ceiling, check it has not rambled`);

    for (const m of body.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) {
      if (!tokens.has(m[1])) add(`cites unknown figure {{${m[1]}}} — add it to app/lib/guide-tokens.ts`);
    }

    if (!/^Sources?:/m.test(body)) add("no Sources line — say what the guide rests on, even if it is arithmetic");

    for (const [re, what] of UNSUPPORTED) {
      if (re.test(body)) add(`uses ${what} — the renderer would print it literally`);
    }

    if (problems.length) failures.push([file, problems]);
    else console.log(`ok    ${file.replace(/\.md$/, "").padEnd(42)} ${String(words).padStart(4)} words`);
  }

  // The other direction: a registry entry promising a guide nobody wrote.
  for (const [calc, guide] of guideOf) {
    if (![...seen.keys()].includes(guide)) {
      failures.push([`app/lib/calculators.ts`, [`${calc} points at guide "${guide}", which has no file`]]);
    } else if (declared.get(calc) !== guide) {
      failures.push([`app/lib/calculators.ts`, [`${calc} points at "${guide}", which does not declare it back`]]);
    }
  }

  console.log("");
  if (!failures.length) {
    console.log(`All ${files.length} guides pass.`);
    return 0;
  }
  for (const [file, problems] of failures) {
    console.error(`FAIL  ${file}`);
    for (const p of problems) console.error(`        ${p}`);
  }
  console.error(`\n${failures.length} file${failures.length === 1 ? "" : "s"} with problems.`);
  return 1;
}

process.exit(main());

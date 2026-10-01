#!/usr/bin/env node
/**
 * Builds content/instagram-schedule.json: one fixed posting order for every
 * evergreen fact. Run with `node scripts/instagram/build-schedule.mjs`.
 *
 *   --posted <file>   JSON array of fact ids already posted, in posting order.
 *                     Defaults to content/instagram-posted.json if it exists.
 *   --facts <file>    facts file (default content/instagram-facts.json)
 *   --out <file>      where to write (default content/instagram-schedule.json)
 *
 * ALREADY-POSTED FACTS ARE A FIXED PREFIX. They keep their exact order and are
 * never moved; only the facts after them are ordered. Adding facts, or
 * changing one, can therefore reorder the future but never the past.
 *
 * RULES, checked again over every post after the prefix, including where the
 * prefix meets the new order:
 *   1. Categories rotate Home, Debt, Money, Auto (the CATEGORY_SECTIONS
 *      order). A category that has run out of facts drops out of the
 *      rotation and the rest keep their order.
 *   2. Two posts from the same guide are at least GUIDE_GAP apart: nothing
 *      from a guide appears again within the next four posts.
 *   3. No more than MAX_LAYOUT_RUN posts of the same layout in a row.
 * The prefix itself is not re-checked: it has already been posted.
 *
 * Rule 1 cannot hold strictly for the whole schedule while the categories
 * are uneven; the script says where the full four-way rotation ends.
 *
 * The order is found by depth-first search with backtracking. Statements are
 * the majority layout and can only go out MAX_LAYOUT_RUN at a time, so they
 * are spent whenever allowed, and a branch is abandoned as soon as the
 * statements left cannot be separated by the other layouts left. Ties go to
 * the guide with the most facts left, then to file order, so the output is
 * deterministic.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORDER = ["Home", "Debt", "Money", "Auto"];
const GUIDE_GAP = 5;
const MAX_LAYOUT_RUN = 2;

function parseArgs(argv) {
  const args = {
    facts: path.join(ROOT, "content", "instagram-facts.json"),
    out: path.join(ROOT, "content", "instagram-schedule.json"),
    posted: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--facts") args.facts = path.resolve(argv[++i]);
    else if (a === "--out") args.out = path.resolve(argv[++i]);
    else if (a === "--posted") args.posted = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!args.posted) {
    const dflt = path.join(ROOT, "content", "instagram-posted.json");
    if (fs.existsSync(dflt)) args.posted = dflt;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const allFacts = JSON.parse(fs.readFileSync(args.facts, "utf8")).facts;
const byId = new Map(allFacts.map((f) => [f.id, f]));

const postedIds = args.posted ? JSON.parse(fs.readFileSync(args.posted, "utf8")) : [];
if (!Array.isArray(postedIds)) throw new Error(`${args.posted} must be a JSON array of fact ids`);
if (new Set(postedIds).size !== postedIds.length) throw new Error("posted list repeats a fact id");
for (const id of postedIds) if (!byId.has(id)) throw new Error(`posted fact ${id} is not in ${args.facts}`);
const prefix = postedIds.map((id) => byId.get(id));

const facts = allFacts.filter((f) => !f.shelfLife && !postedIds.includes(f.id));
for (const f of [...prefix, ...facts]) if (!f.layout) throw new Error(`${f.id}: no layout`);

const remaining = Object.fromEntries(ORDER.map((c) => [c, facts.filter((f) => f.category === c)]));
const total = prefix.length + facts.length;
const posts = [...prefix];
const fileIndex = (f) => allFacts.indexOf(f);

/** The category the next post must be, given the rotation and what is left. */
function nextCategory() {
  const live = ORDER.filter((c) => remaining[c].length);
  if (!posts.length) return live[0];
  const last = ORDER.indexOf(posts[posts.length - 1].category);
  for (let k = 1; k <= ORDER.length; k++) {
    const c = ORDER[(last + k) % ORDER.length];
    if (remaining[c].length) return c;
  }
  return null;
}

function allowed(f) {
  for (let k = 1; k < GUIDE_GAP && k <= posts.length; k++) {
    if (posts[posts.length - k].guide === f.guide) return false;
  }
  if (posts.length >= MAX_LAYOUT_RUN) {
    const tail = posts.slice(-MAX_LAYOUT_RUN);
    if (tail.every((p) => p.layout === f.layout)) return false;
  }
  return true;
}

function feasible() {
  const left = ORDER.flatMap((c) => remaining[c]);
  const statements = left.filter((f) => f.layout === "statement").length;
  return statements <= MAX_LAYOUT_RUN * (left.length - statements + 1);
}

let steps = 0;
function solve() {
  if (posts.length === total) return true;
  if (++steps > 2_000_000) throw new Error("search limit reached");
  if (!feasible()) return false;
  const cat = nextCategory();
  const pool = remaining[cat];
  const guideCount = (g) => pool.filter((f) => f.guide === g).length;
  const candidates = pool
    .filter((f) => allowed(f))
    .sort((a, b) =>
      (b.layout === "statement") - (a.layout === "statement") ||
      guideCount(b.guide) - guideCount(a.guide) ||
      fileIndex(a) - fileIndex(b));
  for (const f of candidates) {
    pool.splice(pool.indexOf(f), 1);
    posts.push(f);
    if (solve()) return true;
    posts.pop();
    pool.push(f);
    pool.sort((a, b) => fileIndex(a) - fileIndex(b));
  }
  return false;
}
if (!solve()) throw new Error("No order satisfies the rules");

// ------------------------------------------------- independent verification
const failures = [];
const start = prefix.length;
for (let i = Math.max(1, start); i < posts.length; i++) {
  const left = ORDER.filter((c) => posts.slice(i).some((p) => p.category === c));
  const prev = ORDER.indexOf(posts[i - 1].category);
  let expect = null;
  for (let k = 1; k <= ORDER.length; k++) {
    const c = ORDER[(prev + k) % ORDER.length];
    if (left.includes(c)) { expect = c; break; }
  }
  if (posts[i].category !== expect) failures.push(`rotation at ${i + 1}: ${posts[i].category}, expected ${expect}`);
}
for (let j = start; j < posts.length; j++) {
  for (let k = 1; k < GUIDE_GAP && j - k >= 0; k++) {
    if (posts[j].guide === posts[j - k].guide) failures.push(`guide ${posts[j].guide} at ${j - k + 1} and ${j + 1}`);
  }
  if (j >= MAX_LAYOUT_RUN && posts.slice(j - MAX_LAYOUT_RUN, j + 1).every((p) => p.layout === posts[j].layout)) {
    failures.push(`layout ${posts[j].layout} ${MAX_LAYOUT_RUN + 1} in a row ending at ${j + 1}`);
  }
}
for (let i = 0; i < prefix.length; i++) if (posts[i].id !== postedIds[i]) failures.push(`prefix moved at ${i + 1}`);
if (new Set(posts.map((p) => p.id)).size !== total) failures.push("a fact is missing or repeated");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }

const fullRotationEnds = (() => {
  for (let i = 0; i < posts.length; i++) if (posts[i].category !== ORDER[i % ORDER.length]) return i;
  return posts.length;
})();
const out = {
  _about: "Fixed posting order for every evergreen fact in content/instagram-facts.json. Generated by scripts/instagram/build-schedule.mjs; edit the rules there, not this file. Posts marked posted are a fixed prefix and never move.",
  _rules: {
    rotation: `${ORDER.join(", ")}, repeating; a category with no facts left drops out`,
    guide_gap: `no guide repeats within the next ${GUIDE_GAP - 1} posts`,
    layout_run: `at most ${MAX_LAYOUT_RUN} of the same layout in a row`,
    prefix: "already-posted facts keep their order; rules are checked for every post after them",
  },
  _posted: prefix.length,
  _full_rotation_through: fullRotationEnds,
  posts: posts.map((f, i) => ({ n: i + 1, id: f.id, category: f.category, guide: f.guide, layout: f.layout, ...(i < prefix.length ? { posted: true } : {}) })),
};
fs.writeFileSync(args.out, JSON.stringify(out, null, 2) + "\n");
console.log(`Scheduled ${total} posts (${prefix.length} already posted, ${facts.length} ordered; search steps: ${steps}). All three rules verified for every post after the prefix.`);
console.log(`Strict ${ORDER.join("/")} rotation holds for posts 1-${fullRotationEnds}; after that the rotation continues over the categories still left.`);

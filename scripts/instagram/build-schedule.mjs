#!/usr/bin/env node
/**
 * Builds content/instagram-schedule.json: one fixed posting order for every
 * evergreen fact. Run with `node scripts/instagram/build-schedule.mjs`.
 *
 *   --posted <file>   JSON array of fact ids already posted, in posting order.
 *                     Defaults to content/instagram-posted.json if it exists.
 *   --keep <file>     JSON array of fact ids to keep in place whether or not
 *                     they are signed off. Defaults to
 *                     content/instagram-schedule-keep.json if it exists.
 *   --current <file>  the schedule whose positions kept facts keep. Defaults
 *                     to content/instagram-schedule.json; a path that does
 *                     not exist means there is no current schedule.
 *   --facts <file>    facts file (default content/instagram-facts.json)
 *   --out <file>      where to write (default content/instagram-schedule.json)
 *
 * ALREADY-POSTED FACTS ARE A FIXED PREFIX. They keep their exact order and are
 * never moved; only the facts after them are ordered. Adding facts, or
 * changing one, can therefore reorder the future but never the past.
 *
 * KEPT FACTS STAY WHERE THEY ARE. Every fact with a valid sign-off (a review
 * date and a hash that still matches its content, scripts/instagram/
 * review.mjs) and every fact in the keep list keeps its position in the
 * current schedule; the rest are ordered around them. So signing facts off
 * protects the posts already lined up: adding or editing other facts never
 * moves them. A fact whose content changed after it was signed off is no
 * longer kept and can move. Kept facts are checked against every rule like
 * any other post; if the facts around them cannot be arranged to satisfy the
 * rules, the build fails rather than moving a kept fact. A signed-off fact
 * that is not in the current schedule yet has no position to keep and is
 * placed like any other; a keep-list fact without one is an error.
 *
 * RULES, checked again over every post after the posted prefix:
 *   1. Categories rotate Home, Debt, Money, Auto (the CATEGORY_SECTIONS
 *      order). A category that has run out of facts drops out of the
 *      rotation and the rest keep their order.
 *   2. Two posts from the same guide are at least GUIDE_GAP apart: nothing
 *      from a guide appears again within the next four posts.
 *   3. No more than MAX_LAYOUT_RUN posts of the same layout in a row.
 * The posted prefix itself is not re-checked: it has already been posted.
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
import { reviewProblem } from "./review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORDER = ["Home", "Debt", "Money", "Auto"];
const GUIDE_GAP = 5;
const MAX_LAYOUT_RUN = 2;

function parseArgs(argv) {
  const args = {
    facts: path.join(ROOT, "content", "instagram-facts.json"),
    out: path.join(ROOT, "content", "instagram-schedule.json"),
    current: path.join(ROOT, "content", "instagram-schedule.json"),
    posted: null,
    keep: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--facts") args.facts = path.resolve(argv[++i]);
    else if (a === "--out") args.out = path.resolve(argv[++i]);
    else if (a === "--current") args.current = path.resolve(argv[++i]);
    else if (a === "--posted") args.posted = path.resolve(argv[++i]);
    else if (a === "--keep") args.keep = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!args.posted) {
    const dflt = path.join(ROOT, "content", "instagram-posted.json");
    if (fs.existsSync(dflt)) args.posted = dflt;
  }
  if (!args.keep) {
    const dflt = path.join(ROOT, "content", "instagram-schedule-keep.json");
    if (fs.existsSync(dflt)) args.keep = dflt;
  }
  return args;
}

const readIds = (file, what) => {
  const ids = file ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  if (!Array.isArray(ids)) throw new Error(`${file} must be a JSON array of fact ids`);
  if (new Set(ids).size !== ids.length) throw new Error(`${what} list repeats a fact id`);
  return ids;
};

const args = parseArgs(process.argv.slice(2));
const allFacts = JSON.parse(fs.readFileSync(args.facts, "utf8")).facts;
const byId = new Map(allFacts.map((f) => [f.id, f]));

const postedIds = readIds(args.posted, "posted");
for (const id of postedIds) if (!byId.has(id)) throw new Error(`posted fact ${id} is not in ${args.facts}`);
const prefix = postedIds.map((id) => byId.get(id));

const facts = allFacts.filter((f) => !f.shelfLife && !postedIds.includes(f.id));
for (const f of [...prefix, ...facts]) if (!f.layout) throw new Error(`${f.id}: no layout`);
const total = prefix.length + facts.length;

// ------------------------------------------------------------ kept positions
const current = fs.existsSync(args.current) ? JSON.parse(fs.readFileSync(args.current, "utf8")).posts : [];
const currentIndex = new Map(current.map((p, i) => [p.id, i]));
const listIds = readIds(args.keep, "keep");
for (const id of listIds) {
  if (!byId.has(id)) throw new Error(`kept fact ${id} is not in ${args.facts}`);
  if (byId.get(id).shelfLife) throw new Error(`kept fact ${id} is time-sensitive, so it is not scheduled`);
  if (postedIds.includes(id)) throw new Error(`kept fact ${id} is already in the posted list`);
  if (!currentIndex.has(id)) throw new Error(`kept fact ${id} is not in the current schedule, so it has no position to keep`);
}
const signedIds = facts.filter((f) => !reviewProblem(f)).map((f) => f.id);
const pins = new Map(); // index -> fact
const why = new Map(); // id -> "signed off" | "keep list"
const unplaced = [];
for (const id of [...new Set([...listIds, ...signedIds])]) {
  const i = currentIndex.get(id);
  if (i === undefined) { unplaced.push(id); continue; }
  if (i < prefix.length || i >= total) throw new Error(`kept fact ${id} is at #${i + 1} in the current schedule, outside the posts after the ${prefix.length} posted (1-${total})`);
  pins.set(i, byId.get(id));
  why.set(id, signedIds.includes(id) ? "signed off" : "keep list");
}
const pinnedIds = new Set([...pins.values()].map((f) => f.id));

// ------------------------------------------------------------------- search
const remaining = Object.fromEntries(ORDER.map((c) => [c, facts.filter((f) => f.category === c)]));
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

/** A free fact must not share a guide with a kept fact a few places ahead. */
function clearOfPinsAhead(f) {
  for (let k = 1; k < GUIDE_GAP; k++) if (pins.get(posts.length + k)?.guide === f.guide) return false;
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
  const pin = pins.get(posts.length);
  const guideCount = (g) => pool.filter((f) => f.guide === g).length;
  const candidates = pin
    ? pin.category === cat && allowed(pin) ? [pin] : []
    : pool
        .filter((f) => !pinnedIds.has(f.id) && allowed(f) && clearOfPinsAhead(f))
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
if (!solve()) {
  throw new Error(`No order satisfies the rules with the ${pins.size} kept fact(s) where they are. A kept fact cannot move; un-keep one (edit it, or take it off the keep list) or change the facts around it.`);
}

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
for (const [i, f] of pins) if (posts[i].id !== f.id) failures.push(`kept fact ${f.id} moved from ${i + 1}`);
if (new Set(posts.map((p) => p.id)).size !== total) failures.push("a fact is missing or repeated");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }

const fullRotationEnds = (() => {
  for (let i = 0; i < posts.length; i++) if (posts[i].category !== ORDER[i % ORDER.length]) return i;
  return posts.length;
})();
const keptBySignOff = [...why.values()].filter((w) => w === "signed off").length;
const out = {
  _about: "Fixed posting order for every evergreen fact in content/instagram-facts.json. Generated by scripts/instagram/build-schedule.mjs; edit the rules there, not this file. Posts marked posted have gone out and never move; posts marked kept (signed off, or in content/instagram-schedule-keep.json) keep their positions when the schedule is rebuilt.",
  _rules: {
    rotation: `${ORDER.join(", ")}, repeating; a category with no facts left drops out`,
    guide_gap: `no guide repeats within the next ${GUIDE_GAP - 1} posts`,
    layout_run: `at most ${MAX_LAYOUT_RUN} of the same layout in a row`,
    prefix: "already-posted facts keep their order and are not re-checked; kept facts keep their positions and are checked like every other post",
  },
  _posted: prefix.length,
  _kept: pins.size,
  _full_rotation_through: fullRotationEnds,
  posts: posts.map((f, i) => ({ n: i + 1, id: f.id, category: f.category, guide: f.guide, layout: f.layout, ...(i < prefix.length ? { posted: true } : pins.has(i) ? { kept: why.get(f.id) } : {}) })),
};
fs.writeFileSync(args.out, JSON.stringify(out, null, 2) + "\n");
console.log(`Scheduled ${total} posts (${prefix.length} already posted, ${pins.size} kept in place: ${keptBySignOff} signed off, ${pins.size - keptBySignOff} from the keep list; search steps: ${steps}). All three rules verified for every post after the posted prefix.`);
if (unplaced.length) console.log(`Signed off but new to the schedule, so placed like any other fact: ${unplaced.join(", ")}`);
console.log(`Strict ${ORDER.join("/")} rotation holds for posts 1-${fullRotationEnds}; after that the rotation continues over the categories still left.`);

#!/usr/bin/env node
/**
 * Holds any Instagram fact whose figures may have moved under it.
 *
 *   npm run check:facts                        check; exits 1 if any fact is HELD
 *   npm run check:facts -- --accept <id> ...   re-snapshot these facts after re-checking them
 *   npm run check:facts -- --init              snapshot facts that have none yet
 *
 * A fact's depends_on names the app/lib constants it states or relies on.
 * content/instagram-facts.lock.json records, per fact, the value of each of
 * those constants when the fact was last checked. This script loads the
 * current values from app/lib/*.ts (Node 24 imports TypeScript directly) and
 * compares:
 *
 *   HELD   a constant's value differs from the fact's snapshot (old and new
 *          shown), or the fact cannot be checked: a depends_on name that is
 *          not an exported constant of app/lib, a function, a module that
 *          will not load, no snapshot, or a snapshot listing names that
 *          depends_on no longer does
 *   WARN   the lock names a fact that is gone; a fact cites HUD, the VA or an
 *          IRS revenue procedure but has no depends_on, so nothing would
 *          catch its figures changing, unless it says why not in
 *          depends_on_none (it states no figure a constant holds); that
 *          reason must not be empty, and a fact cannot have both
 *
 * The command fails if any fact is HELD. The publisher imports checkFacts()
 * and refuses only the fact it is about to post if that one is HELD; the
 * others are reported as warnings.
 *
 * Accepting a fact is a statement that its text was checked against the new
 * values. If the text changes as a result, its review sign-off is voided too
 * (scripts/instagram/review.mjs), so it is re-reviewed before it can post.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Test overrides only.
const FACTS_FILE = process.env.CHECK_FACTS_FILE || path.join(ROOT, "content", "instagram-facts.json");
export const LOCK_FILE = process.env.CHECK_FACTS_LOCK || path.join(ROOT, "content", "instagram-facts.lock.json");
const LIB_DIR = process.env.CHECK_FACTS_LIB || path.join(ROOT, "app", "lib");
const CITES_A_SCHEDULE = /\bHUD\b|Mortgagee Letter|Handbook 4000\.1|\bVA\b|Veterans Affairs|Revenue Procedure|Rev\. Proc\./;

/** JSON with stable key order, and non-finite numbers kept (JSON would turn Infinity into null). */
function canonical(value) {
  if (typeof value === "number" && !Number.isFinite(value)) return { $number: String(value) };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  return value;
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const show = (v) => {
  const s = JSON.stringify(canonical(v));
  return s.length > 160 ? `${s.slice(0, 157)}...` : s;
};

/** Every `export const NAME` in app/lib, with the module that declares it, and the values of those named. */
async function loadConstants(names, libDir) {
  const declared = new Map();
  for (const file of fs.readdirSync(libDir).filter((f) => /\.tsx?$/.test(f))) {
    const text = fs.readFileSync(path.join(libDir, file), "utf8");
    for (const m of text.matchAll(/^export const ([A-Z][A-Z0-9_]*)\b/gm)) declared.set(m[1], file);
  }
  const values = new Map();
  const failed = new Map();
  const files = new Set([...names].map((n) => declared.get(n)).filter(Boolean));
  for (const file of files) {
    let mod;
    try {
      mod = await import(pathToFileURL(path.join(libDir, file)).href);
    } catch (e) {
      failed.set(file, e.message);
      continue;
    }
    for (const [k, v] of Object.entries(mod)) if (declared.get(k) === file) values.set(k, v);
  }
  return { declared, values, failed };
}

export function readLock(lockFile = LOCK_FILE) {
  if (!fs.existsSync(lockFile)) return { _about: "", facts: {} };
  return JSON.parse(fs.readFileSync(lockFile, "utf8"));
}

/**
 * Check every fact with depends_on against its snapshot.
 * Returns { checked, held: Map<id, string[]>, warnings: string[], current: Map<id, object> }.
 * `current` is each fact's dependency values now, for --init and --accept.
 */
export async function checkFacts(facts, { lock = readLock(), libDir = LIB_DIR } = {}) {
  const dependent = facts.filter((f) => f.depends_on?.length);
  const names = new Set(dependent.flatMap((f) => f.depends_on));
  const { declared, values, failed } = await loadConstants(names, libDir);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const held = new Map();
  const current = new Map();
  const warnings = [];
  const hold = (id, why) => held.set(id, [...(held.get(id) ?? []), why]);

  for (const f of dependent) {
    const now = {};
    for (const name of f.depends_on) {
      const file = declared.get(name);
      if (!file) hold(f.id, `depends_on names ${name}, which is not an exported constant in app/lib`);
      else if (failed.has(file)) hold(f.id, `${name}: could not load app/lib/${file}: ${failed.get(file)}`);
      else if (typeof values.get(name) === "function") hold(f.id, `depends_on names ${name}, which is a function; name constants only`);
      else now[name] = values.get(name);
    }
    current.set(f.id, now);
    const snap = lock.facts?.[f.id];
    if (!snap) {
      hold(f.id, `no snapshot in the lock. Check the fact, then: npm run check:facts -- --accept ${f.id}`);
      continue;
    }
    const extra = Object.keys(snap).filter((n) => !f.depends_on.includes(n));
    if (extra.length) hold(f.id, `snapshot lists ${extra.join(", ")}, which depends_on no longer names. Re-check, then: npm run check:facts -- --accept ${f.id}`);
    for (const [name, value] of Object.entries(now)) {
      if (!(name in snap)) hold(f.id, `${name}: no snapshot (newly listed); now ${show(value)}`);
      else if (!same(snap[name], value)) hold(f.id, `${name}: was ${show(snap[name])}, now ${show(value)}`);
    }
  }
  for (const id of Object.keys(lock.facts ?? {})) {
    if (!byId.get(id)?.depends_on?.length) warnings.push(`lock names ${id}, which is no longer a fact with depends_on; remove it from the lock`);
  }
  for (const f of facts) {
    // depends_on_none records that a fact states no figure a constant holds, with the reason.
    if ("depends_on_none" in f) {
      if (f.depends_on?.length) warnings.push(`${f.id}: has both depends_on and depends_on_none; keep one`);
      else if (typeof f.depends_on_none !== "string" || !f.depends_on_none.trim()) warnings.push(`${f.id}: depends_on_none needs a one-line reason`);
      continue;
    }
    if (!f.depends_on?.length && CITES_A_SCHEDULE.test(`${f.source} ${f.card_source ?? ""}`)) {
      warnings.push(`${f.id}${f.shelfLife ? " (time-sensitive)" : ""}: cites ${f.source.match(CITES_A_SCHEDULE)?.[0] ?? f.card_source.match(CITES_A_SCHEDULE)?.[0]} but has no depends_on`);
    }
  }
  return { checked: dependent.length, constants: names.size, held, warnings, current };
}

function writeLock(lock, lockFile) {
  const about =
    "Per fact, the value of each app/lib constant in its depends_on when the fact was last checked. Written by scripts/check-facts.mjs (--init, --accept); do not edit by hand. A difference from the current value holds the fact.";
  const facts = Object.fromEntries(Object.keys(lock.facts).sort().map((id) => [id, canonical(lock.facts[id])]));
  fs.writeFileSync(lockFile, JSON.stringify({ _about: about, facts }, null, 2) + "\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const init = argv.includes("--init");
  const accept = argv.includes("--accept") ? argv.slice(argv.indexOf("--accept") + 1).filter((a) => !a.startsWith("--")) : [];
  if (argv.includes("--accept") && !accept.length) throw new Error("--accept needs the fact ids to re-snapshot");

  const facts = JSON.parse(fs.readFileSync(FACTS_FILE, "utf8")).facts;
  const byId = new Map(facts.map((f) => [f.id, f]));
  const unknownAccept = accept.filter((id) => !byId.get(id)?.depends_on?.length);
  if (unknownAccept.length) throw new Error(`--accept: not a fact with depends_on: ${unknownAccept.join(", ")}`);

  const lock = readLock();
  lock.facts ??= {};
  let result = await checkFacts(facts, { lock });
  if (init || accept.length) {
    for (const f of facts.filter((x) => x.depends_on?.length)) {
      if ((init && !lock.facts[f.id]) || accept.includes(f.id)) lock.facts[f.id] = result.current.get(f.id);
    }
    writeLock(lock, LOCK_FILE);
    result = await checkFacts(facts, { lock: readLock() });
  }

  console.log(`check:facts: ${result.checked} facts with depends_on, ${result.constants} constants`);
  if (init) console.log(`  --init: snapshotted every fact that had none`);
  if (accept.length) console.log(`  --accept: re-snapshotted ${accept.join(", ")}`);
  for (const w of result.warnings) console.log(`  WARN  ${w}`);
  for (const [id, why] of result.held) {
    console.log(`  HELD  ${id}`);
    for (const c of why) console.log(`          ${c}`);
  }
  if (result.held.size) {
    console.log(`\nFAILED: ${result.held.size} fact${result.held.size === 1 ? "" : "s"} held. Re-check each against the new values and fix its text, then: npm run check:facts -- --accept <id>`);
    process.exit(1);
  }
  console.log(`  ok: every snapshot matches${result.warnings.length ? `; ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}` : ""}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`FAILED: ${e.message}`);
    process.exit(1);
  });
}

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
 *   HELD   a constant's value differs from the fact's snapshot (old and new shown)
 *   ERROR  a depends_on name is not an exported constant of app/lib, or is a
 *          function; a fact has no snapshot, or its snapshot lists names that
 *          depends_on no longer does; the lock names a fact that is gone
 *   WARN   a fact cites HUD, the VA or an IRS revenue procedure but has no
 *          depends_on, so nothing would catch its figures changing
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
const LOCK_FILE = process.env.CHECK_FACTS_LOCK || path.join(ROOT, "content", "instagram-facts.lock.json");
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

/** Every `export const NAME` in app/lib, with the module that declares it. */
async function loadConstants(names) {
  const declared = new Map();
  for (const file of fs.readdirSync(LIB_DIR).filter((f) => /\.tsx?$/.test(f))) {
    const text = fs.readFileSync(path.join(LIB_DIR, file), "utf8");
    for (const m of text.matchAll(/^export const ([A-Z][A-Z0-9_]*)\b/gm)) declared.set(m[1], file);
  }
  const values = new Map();
  const errors = [];
  const files = new Set([...names].map((n) => declared.get(n)).filter(Boolean));
  for (const file of files) {
    let mod;
    try {
      mod = await import(pathToFileURL(path.join(LIB_DIR, file)).href);
    } catch (e) {
      errors.push(`could not load app/lib/${file}: ${e.message}`);
      continue;
    }
    for (const [k, v] of Object.entries(mod)) if (declared.get(k) === file) values.set(k, v);
  }
  return { declared, values, errors };
}

function readLock() {
  if (!fs.existsSync(LOCK_FILE)) return { _about: "", facts: {} };
  return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
}
function writeLock(lock) {
  lock._about =
    "Per fact, the value of each app/lib constant in its depends_on when the fact was last checked. Written by scripts/check-facts.mjs (--init, --accept); do not edit by hand. A difference from the current value holds the fact.";
  lock.facts = Object.fromEntries(Object.keys(lock.facts).sort().map((id) => [id, canonical(lock.facts[id])]));
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ _about: lock._about, facts: lock.facts }, null, 2) + "\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const init = argv.includes("--init");
  const accept = argv.includes("--accept") ? argv.slice(argv.indexOf("--accept") + 1).filter((a) => !a.startsWith("--")) : [];
  if (argv.includes("--accept") && !accept.length) throw new Error("--accept needs the fact ids to re-snapshot");

  const facts = JSON.parse(fs.readFileSync(FACTS_FILE, "utf8")).facts;
  const byId = new Map(facts.map((f) => [f.id, f]));
  const dependent = facts.filter((f) => f.depends_on?.length);
  const names = new Set(dependent.flatMap((f) => f.depends_on));
  const { declared, values, errors } = await loadConstants(names);
  const lock = readLock();

  const unknownAccept = accept.filter((id) => !byId.has(id) || !byId.get(id).depends_on?.length);
  if (unknownAccept.length) throw new Error(`--accept: not a fact with depends_on: ${unknownAccept.join(", ")}`);

  const held = [];
  const warnings = [];
  for (const f of dependent) {
    const current = {};
    for (const name of f.depends_on) {
      if (!declared.has(name)) errors.push(`${f.id}: depends_on names ${name}, which is not an exported constant in app/lib`);
      else if (!values.has(name)) continue; // its module failed to load; reported above
      else if (typeof values.get(name) === "function") errors.push(`${f.id}: depends_on names ${name}, which is a function; name constants only`);
      else current[name] = values.get(name);
    }
    if (init && !lock.facts[f.id]) lock.facts[f.id] = current;
    if (accept.includes(f.id)) lock.facts[f.id] = current;
    const snap = lock.facts[f.id];
    if (!snap) {
      errors.push(`${f.id}: no snapshot in ${path.relative(ROOT, LOCK_FILE)}. Check the fact, then: npm run check:facts -- --accept ${f.id}`);
      continue;
    }
    const extra = Object.keys(snap).filter((n) => !f.depends_on.includes(n));
    if (extra.length) errors.push(`${f.id}: snapshot lists ${extra.join(", ")}, which depends_on no longer names. Re-check, then: npm run check:facts -- --accept ${f.id}`);
    const changes = [];
    for (const [name, value] of Object.entries(current)) {
      if (!(name in snap)) changes.push(`${name}: no snapshot (newly listed); now ${show(value)}`);
      else if (!same(snap[name], value)) changes.push(`${name}: was ${show(snap[name])}, now ${show(value)}`);
    }
    if (changes.length) held.push({ id: f.id, changes });
  }
  for (const id of Object.keys(lock.facts)) {
    if (!byId.get(id)?.depends_on?.length) errors.push(`lock names ${id}, which is no longer a fact with depends_on. Remove it from ${path.relative(ROOT, LOCK_FILE)}.`);
  }
  for (const f of facts) {
    if (!f.depends_on?.length && CITES_A_SCHEDULE.test(`${f.source} ${f.card_source ?? ""}`)) {
      warnings.push(`${f.id}${f.shelfLife ? " (time-sensitive)" : ""}: cites ${f.source.match(CITES_A_SCHEDULE)?.[0] ?? f.card_source.match(CITES_A_SCHEDULE)?.[0]} but has no depends_on`);
    }
  }

  if (init || accept.length) writeLock(lock);

  console.log(`check:facts: ${dependent.length} facts with depends_on, ${names.size} constants`);
  if (init) console.log(`  --init: snapshotted every fact that had none`);
  if (accept.length) console.log(`  --accept: re-snapshotted ${accept.join(", ")}`);
  for (const w of warnings) console.log(`  WARN  ${w}`);
  for (const h of held) {
    console.log(`  HELD  ${h.id}`);
    for (const c of h.changes) console.log(`          ${c}`);
  }
  for (const e of errors) console.log(`  ERROR ${e}`);
  if (held.length || errors.length) {
    console.log(`\nFAILED: ${held.length} held, ${errors.length} error${errors.length === 1 ? "" : "s"}.${held.length ? " Re-check each held fact against the new values and fix its text, then: npm run check:facts -- --accept <id>" : ""}`);
    process.exit(1);
  }
  console.log(`  ok: every snapshot matches${warnings.length ? `; ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}`);
}

main().catch((e) => {
  console.error(`FAILED: ${e.message}`);
  process.exit(1);
});

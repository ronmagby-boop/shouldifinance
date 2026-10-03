// Tests for scripts/check-facts.mjs against a temporary facts file, lock and
// app/lib stand-in. The real lock is checked once, read-only, at the end.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "..", "check-facts.mjs");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "check-facts-"));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

let n = 0;
function setup({ lib, facts, lock }) {
  const dir = path.join(TMP, String(n++));
  fs.mkdirSync(path.join(dir, "lib"), { recursive: true });
  for (const [file, text] of Object.entries(lib)) fs.writeFileSync(path.join(dir, "lib", file), text);
  fs.writeFileSync(path.join(dir, "facts.json"), JSON.stringify({ facts }));
  if (lock) fs.writeFileSync(path.join(dir, "lock.json"), JSON.stringify(lock));
  return dir;
}
function run(dir, args = []) {
  const r = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", SCRIPT, ...args], {
    env: { ...process.env, CHECK_FACTS_FILE: path.join(dir, "facts.json"), CHECK_FACTS_LOCK: path.join(dir, "lock.json"), CHECK_FACTS_LIB: path.join(dir, "lib") },
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout + r.stderr };
}
const fact = (id, depends_on, source = "Site model") => ({ id, source, card_source: source, depends_on });
const LIB = { "rates.ts": "export const RATE = 0.55;\nexport const BANDS: { upTo: number }[] = [{ upTo: 100 }, { upTo: Infinity }];\nexport function rateFor(x: number) { return x; }\n" };

test("--init snapshots, and an unchanged library passes", () => {
  const dir = setup({ lib: LIB, facts: [fact("a", ["RATE"]), fact("b", ["BANDS"])] });
  const init = run(dir, ["--init"]);
  assert.equal(init.code, 0, init.out);
  const lock = JSON.parse(fs.readFileSync(path.join(dir, "lock.json"), "utf8"));
  assert.deepEqual(lock.facts.a, { RATE: 0.55 });
  assert.deepEqual(lock.facts.b.BANDS[1], { upTo: { $number: "Infinity" } }, "Infinity survives the round trip");
  const again = run(dir);
  assert.equal(again.code, 0, again.out);
  assert.match(again.out, /ok: every snapshot matches/);
});

test("a changed constant holds only the facts that depend on it, showing old and new", () => {
  const dir = setup({ lib: LIB, facts: [fact("a", ["RATE"]), fact("b", ["BANDS"])], lock: { facts: { a: { RATE: 0.52 }, b: { BANDS: [{ upTo: 100 }, { upTo: { $number: "Infinity" } }] } } } });
  const r = run(dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /HELD {2}a\n +RATE: was 0\.52, now 0\.55/);
  assert.doesNotMatch(r.out, /HELD {2}b/);
  assert.match(r.out, /FAILED: 1 fact held/);
});

test("--accept re-snapshots only the named fact", () => {
  const dir = setup({ lib: LIB, facts: [fact("a", ["RATE"]), fact("c", ["RATE"])], lock: { facts: { a: { RATE: 0.52 }, c: { RATE: 0.52 } } } });
  const r = run(dir, ["--accept", "a"]);
  assert.equal(r.code, 1, "c is still held");
  assert.match(r.out, /HELD {2}c/);
  assert.doesNotMatch(r.out, /HELD {2}a/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "lock.json"), "utf8")).facts.a, { RATE: 0.55 });
});

test("a fact that cannot be checked is held: missing name, function, missing snapshot, stale snapshot, module that will not load", () => {
  const dir = setup({
    lib: { ...LIB, "broken.ts": "export const BROKEN = 1;\nthrow new Error('boom');\n" },
    facts: [fact("gone", ["NO_SUCH"]), fact("fn", ["rateFor"]), fact("new", ["RATE"]), fact("stale", ["RATE"]), fact("unloadable", ["BROKEN"])],
    lock: { facts: { gone: {}, fn: {}, stale: { RATE: 0.55, BANDS: [] }, unloadable: { BROKEN: 1 } } },
  });
  const r = run(dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /HELD {2}gone\n +depends_on names NO_SUCH, which is not an exported constant/);
  assert.match(r.out, /HELD {2}fn\n +depends_on names rateFor, which is not an exported constant/);
  assert.match(r.out, /HELD {2}new\n +no snapshot/);
  assert.match(r.out, /HELD {2}stale\n +snapshot lists BANDS, which depends_on no longer names/);
  assert.match(r.out, /HELD {2}unloadable\n +BROKEN: could not load app\/lib\/broken\.ts: boom/);
  assert.match(r.out, /FAILED: 5 facts held/);
});

test("an orphaned lock entry is a warning, not a hold", () => {
  const dir = setup({ lib: LIB, facts: [fact("a", ["RATE"])], lock: { facts: { a: { RATE: 0.55 }, orphan: { RATE: 0.55 } } } });
  const r = run(dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /WARN {2}lock names orphan, which is no longer a fact with depends_on/);
});

test("checkFacts() reports holds per fact, for the publisher to refuse only the one it posts", async () => {
  const dir = setup({ lib: LIB, facts: [], lock: { facts: { a: { RATE: 0.52 }, b: { RATE: 0.55 } } } });
  const { checkFacts } = await import(new URL("../check-facts.mjs", import.meta.url));
  const r = await checkFacts([fact("a", ["RATE"]), fact("b", ["RATE"])], { lock: JSON.parse(fs.readFileSync(path.join(dir, "lock.json"), "utf8")), libDir: path.join(dir, "lib") });
  assert.deepEqual([...r.held.keys()], ["a"]);
  assert.deepEqual(r.held.get("a"), ["RATE: was 0.52, now 0.55"]);
});

test("depends_on_none with a reason silences the warning; an empty reason, or both fields, is warned about", () => {
  const dir = setup({
    lib: LIB,
    facts: [
      fact("a", ["RATE"]),
      { id: "reasoned", source: "IRS Revenue Procedure 2025-32", card_source: "Source: IRS", depends_on_none: "States the statutory rates only." },
      { id: "empty", source: "HUD Mortgagee Letter 2023-05", card_source: "Source: HUD", depends_on_none: " " },
      { ...fact("both", ["RATE"]), depends_on_none: "Says none." },
    ],
    lock: { facts: { a: { RATE: 0.55 }, both: { RATE: 0.55 } } },
  });
  const r = run(dir);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /reasoned/);
  assert.match(r.out, /WARN {2}empty: depends_on_none needs a one-line reason/);
  assert.match(r.out, /WARN {2}both: has both depends_on and depends_on_none; keep one/);
});

test("a fact citing HUD, the VA or a revenue procedure with no depends_on is a warning, not a failure", () => {
  const dir = setup({ lib: LIB, facts: [fact("a", ["RATE"]), { id: "hud", source: "HUD Mortgagee Letter 2023-05", card_source: "Source: HUD" }], lock: { facts: { a: { RATE: 0.55 } } } });
  const r = run(dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /WARN {2}hud: cites HUD but has no depends_on/);
});

test("the committed lock matches app/lib today", () => {
  const r = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", SCRIPT], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

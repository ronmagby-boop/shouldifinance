// Tests for build-schedule.mjs: the posted prefix, and kept facts (signed off,
// or on the keep list) holding their positions. Runs on temporary copies of
// the committed facts, so real sign-offs do not affect the cases.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signOff } from "./review.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "build-schedule.mjs");
const ALL = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "content", "instagram-facts.json"), "utf8"));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-schedule-"));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

let n = 0;
const file = (name, data) => {
  const f = path.join(TMP, `${n++}-${name}`);
  fs.writeFileSync(f, JSON.stringify(data));
  return f;
};
/** A facts copy with no sign-offs, then `edit` applied to each fact. */
function factsWith(edit = (f) => f) {
  const data = structuredClone(ALL);
  data.facts = data.facts.map((f) => edit({ ...f, reviewed: null }));
  return data;
}
function build(facts, { current = null, posted = [], keep = [] } = {}) {
  const out = path.join(TMP, `${n++}-schedule.json`);
  const r = spawnSync(process.execPath, [
    SCRIPT, "--facts", file("facts.json", facts), "--out", out,
    "--current", current ? file("current.json", current) : path.join(TMP, "none.json"),
    "--posted", file("posted.json", posted), "--keep", file("keep.json", keep),
  ], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr, schedule: r.status === 0 ? JSON.parse(fs.readFileSync(out, "utf8")) : null };
}
const at = (schedule, id) => schedule.posts.find((p) => p.id === id);

const unsigned = factsWith();
const free = build(unsigned);
const evergreen = unsigned.facts.filter((f) => !f.shelfLife).length;
// Scattered positions, as real sign-offs are: #3, #8, #20.
const picks = [2, 7, 19].map((i) => free.schedule.posts[i].id);
const signPicks = (f) => (picks.includes(f.id) ? { ...f, reviewed: signOff(f, "2026-10-01") } : f);

test("with nothing posted, signed off or kept, every evergreen fact is scheduled once", () => {
  assert.equal(free.code, 0, free.out);
  assert.equal(free.schedule.posts.length, evergreen);
  assert.equal(free.schedule._kept, 0);
  assert.equal(new Set(free.schedule.posts.map((p) => p.id)).size, evergreen);
});

test("signed-off facts keep their positions when a fact is added; the rest are ordered around them", () => {
  const extra = unsigned.facts.find((f) => f.shelfLife);
  assert.ok(extra, "a time-sensitive fact to return to the rotation");
  const facts = factsWith((f) => (f.id === extra.id ? { ...signPicks(f), shelfLife: null, layout: f.layout ?? "statement" } : signPicks(f)));
  const r = build(facts, { current: free.schedule });
  assert.equal(r.code, 0, r.out);
  assert.equal(r.schedule.posts.length, evergreen + 1);
  for (const id of picks) {
    assert.equal(at(r.schedule, id).n, at(free.schedule, id).n, `${id} stayed at #${at(free.schedule, id).n}`);
    assert.equal(at(r.schedule, id).kept, "signed off");
  }
  assert.ok(at(r.schedule, extra.id), "the added fact is scheduled");
  assert.equal(r.schedule._kept, 3);
  assert.match(r.out, /3 kept in place: 3 signed off, 0 from the keep list/);
});

test("a fact edited after its sign-off is no longer kept", () => {
  const facts = factsWith((f) => {
    const s = signPicks(f);
    return f.id === picks[1] ? { ...s, card: `${s.card} Edited.` } : s;
  });
  const r = build(facts, { current: free.schedule });
  assert.equal(r.code, 0, r.out);
  assert.equal(at(r.schedule, picks[0]).kept, "signed off");
  assert.equal(at(r.schedule, picks[2]).kept, "signed off");
  assert.equal(at(r.schedule, picks[1]).kept, undefined, "stale sign-off: not kept");
  assert.equal(r.schedule._kept, 2);
});

test("facts on the keep list stay in place without a sign-off, and follow a posted prefix", () => {
  const ids = free.schedule.posts.map((p) => p.id);
  const keep = [ids[4], ids[10]];
  const r = build(unsigned, { current: free.schedule, posted: ids.slice(0, 2), keep });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.schedule.posts.slice(0, 2).map((p) => p.id), ids.slice(0, 2));
  assert.ok(r.schedule.posts.slice(0, 2).every((p) => p.posted === true));
  assert.equal(at(r.schedule, ids[4]).n, 5);
  assert.equal(at(r.schedule, ids[10]).n, 11);
  assert.equal(at(r.schedule, ids[4]).kept, "keep list");
});

test("kept positions that no order can satisfy fail the build instead of moving a kept fact", () => {
  // A current schedule with #1 and #2 swapped puts two facts out of rotation.
  const swapped = structuredClone(free.schedule);
  [swapped.posts[0], swapped.posts[1]] = [swapped.posts[1], swapped.posts[0]];
  const r = build(unsigned, { current: swapped, keep: [swapped.posts[0].id, swapped.posts[1].id] });
  assert.equal(r.code, 1);
  assert.match(r.out, /No order satisfies the rules with the 2 kept fact\(s\) where they are/);
});

test("a signed-off fact new to the schedule is placed like any other; a keep-list fact with no position is refused", () => {
  const current = structuredClone(free.schedule);
  const dropped = current.posts.splice(30, 1)[0];
  const facts = factsWith((f) => (f.id === dropped.id ? { ...f, reviewed: signOff(f, "2026-10-01") } : f));
  const r = build(facts, { current });
  assert.equal(r.code, 0, r.out);
  assert.ok(at(r.schedule, dropped.id));
  assert.equal(at(r.schedule, dropped.id).kept, undefined);
  assert.match(r.out, new RegExp(`new to the schedule, so placed like any other fact: ${dropped.id}`));
  assert.match(build(unsigned, { current, keep: [dropped.id] }).out, /is not in the current schedule, so it has no position to keep/);
});

test("a time-sensitive, unknown, repeated or already-posted keep-list fact is refused", () => {
  const first = free.schedule.posts[0].id;
  const timeSensitive = unsigned.facts.find((f) => f.shelfLife);
  if (timeSensitive) assert.match(build(unsigned, { current: free.schedule, keep: [timeSensitive.id] }).out, /is time-sensitive/);
  assert.match(build(unsigned, { current: free.schedule, keep: ["no-such-fact"] }).out, /is not in/);
  assert.match(build(unsigned, { current: free.schedule, keep: [first, first] }).out, /repeats a fact id/);
  assert.match(build(unsigned, { current: free.schedule, posted: [first], keep: [first] }).out, /already in the posted list/);
});

// Tests for build-schedule.mjs's fixed prefixes (--posted and --keep), on a
// temporary copy of the committed facts.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "build-schedule.mjs");
const FACTS = path.join(HERE, "..", "..", "content", "instagram-facts.json");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-schedule-"));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

let n = 0;
function build({ posted, keep } = {}) {
  const dir = path.join(TMP, String(n++));
  fs.mkdirSync(dir);
  const out = path.join(dir, "schedule.json");
  const args = [SCRIPT, "--facts", FACTS, "--out", out];
  // Explicit empty files, so the committed default keep list is not picked up.
  const write = (name, ids) => { const f = path.join(dir, name); fs.writeFileSync(f, JSON.stringify(ids)); return f; };
  args.push("--posted", write("posted.json", posted ?? []), "--keep", write("keep.json", keep ?? []));
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr, schedule: r.status === 0 ? JSON.parse(fs.readFileSync(out, "utf8")) : null };
}

const free = build();
const evergreen = JSON.parse(fs.readFileSync(FACTS, "utf8")).facts.filter((f) => !f.shelfLife).length;

test("with no prefix, every evergreen fact is scheduled once", () => {
  assert.equal(free.code, 0, free.out);
  assert.equal(free.schedule.posts.length, evergreen);
  assert.equal(free.schedule._kept, 0);
});

test("kept facts keep their order at the front, marked kept, not posted", () => {
  const keep = free.schedule.posts.slice(0, 6).map((p) => p.id);
  const r = build({ keep });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.schedule.posts.slice(0, 6).map((p) => p.id), keep);
  assert.ok(r.schedule.posts.slice(0, 6).every((p) => p.kept === true && !p.posted));
  assert.ok(r.schedule.posts.slice(6).every((p) => !p.kept && !p.posted));
  assert.equal(r.schedule._kept, 6);
  assert.equal(r.schedule._posted, 0);
  assert.equal(new Set(r.schedule.posts.map((p) => p.id)).size, evergreen);
  assert.match(r.out, /6 kept in order/);
});

test("kept facts follow posted ones, and only the posted ones are exempt from the rules", () => {
  const ids = free.schedule.posts.map((p) => p.id);
  const r = build({ posted: ids.slice(0, 2), keep: ids.slice(2, 5) });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.schedule.posts.slice(0, 5).map((p) => p.id), ids.slice(0, 5));
  assert.deepEqual(r.schedule.posts.slice(0, 5).map((p) => (p.posted ? "posted" : p.kept ? "kept" : "")), ["posted", "posted", "kept", "kept", "kept"]);
});

test("a kept order that breaks a rule fails the build instead of being rearranged", () => {
  // Two posts in a row from the same category break the rotation.
  const posts = free.schedule.posts;
  const a = posts[0];
  const b = posts.find((p, i) => i > 0 && p.category === a.category);
  const r = build({ keep: [a.id, b.id] });
  assert.equal(r.code, 1);
  assert.match(r.out, /rotation at 2/);
});

test("a time-sensitive, unknown, repeated or already-posted kept fact is refused", () => {
  const facts = JSON.parse(fs.readFileSync(FACTS, "utf8")).facts;
  const timeSensitive = facts.find((f) => f.shelfLife);
  const first = free.schedule.posts[0].id;
  if (timeSensitive) assert.match(build({ keep: [timeSensitive.id] }).out, /is time-sensitive/);
  assert.match(build({ keep: ["no-such-fact"] }).out, /is not in/);
  assert.match(build({ keep: [first, first] }).out, /repeats a fact id/);
  assert.match(build({ posted: [first], keep: [first] }).out, /already in the posted list/);
});

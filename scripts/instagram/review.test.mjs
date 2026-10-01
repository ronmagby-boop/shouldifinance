// Tests for the review sign-off (review.mjs) and the review helper. The
// helper runs against temporary copies; the real facts file is never written.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCaption } from "./caption.mjs";
import { HASHED_FIELDS, contentHash, reviewProblem, signOff } from "./review.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const HELPER = path.join(HERE, "review-helper.mjs");
const REAL_FACTS = path.join(ROOT, "content", "instagram-facts.json");
const all = JSON.parse(fs.readFileSync(REAL_FACTS, "utf8"));
const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
const byId = new Map(all.facts.map((f) => [f.id, f]));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-review-"));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

/** A temp copy of the facts, every fact unreviewed except those `signed` maps. */
function copy(signed = {}) {
  const data = structuredClone(all);
  data.facts = data.facts.map((f) => ({ ...f, reviewed: signed[f.id] ? signOff(f, signed[f.id]) : null }));
  const file = path.join(TMP, `facts-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return file;
}
function helper(args, factsFile, reviewDir = path.join(TMP, "sheets")) {
  const r = spawnSync(process.execPath, [HELPER, ...args], { env: { ...process.env, IG_FACTS_FILE: factsFile, IG_REVIEW_DIR: reviewDir }, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const today = new Date().toISOString().slice(0, 10);

test("the hash covers each field a reader sees, and nothing else", () => {
  const f = byId.get("half-point-cancelled");
  const h = contentHash(f);
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(contentHash({ ...f }), h, "stable");
  assert.deepEqual(HASHED_FIELDS, ["card", "caption", "alt_text", "hero", "hero_context", "myth", "card_source"]);
  for (const [field, value] of [["card", `${f.card}!`], ["caption", f.caption.replace("A full point", "One full point")], ["source", "another"], ["hero", "6%"], ["hero_context", "x"], ["myth", "It is easy to assume so."], ["card_source", "x"]]) {
    assert.notEqual(contentHash({ ...f, [field]: value }), h, `${field} changes the hash`);
  }
  for (const [field, value] of [["category", "Debt"], ["layout", "statement"], ["depends_on", ["X"]], ["reviewed", { date: "2026-01-01", hash: "0" }]]) {
    assert.equal(contentHash({ ...f, [field]: value }), h, `${field} does not change what is posted`);
  }
  assert.notEqual(buildCaption({ ...f, source: "another" }), buildCaption(f), "source is hashed through the caption as posted");
});

test("reviewProblem accepts only a current sign-off", () => {
  const f = byId.get("rule-of-72");
  assert.equal(reviewProblem({ ...f, reviewed: signOff(f, "2026-09-30") }, "2026-10-01"), null);
  assert.match(reviewProblem({ ...f, reviewed: null }), /has not been reviewed/);
  assert.match(reviewProblem({ ...f, reviewed: "2026-09-30" }), /not of the form/);
  assert.match(reviewProblem({ ...f, reviewed: { date: "2026-02-30", hash: contentHash(f) } }), /not a YYYY-MM-DD date/);
  assert.match(reviewProblem({ ...f, reviewed: { date: "2026-10-02", hash: contentHash(f) } }, "2026-10-01"), /after today/);
  assert.match(reviewProblem({ ...f, card: "Edited.", reviewed: signOff(f, "2026-09-30") }, "2026-10-01"), /has changed since it was reviewed on 2026-09-30/);
});

test("review:next picks the next N unreviewed facts in schedule order, skipping signed-off ones, plus named extras", () => {
  const file = copy({ [schedule[1].id]: "2026-09-30" });
  const dir = path.join(TMP, `sheets-${Date.now()}`);
  const r = helper(["next", "--count", "3", "--id", "principal-beats-interest-233"], file, dir);
  assert.equal(r.code, 0, r.out);
  const expected = [schedule[0].id, schedule[2].id, schedule[3].id];
  assert.ok(r.out.includes(`The next 3 unreviewed scheduled facts, plus principal-beats-interest-233.`), r.out);
  const html = fs.readFileSync(path.join(dir, `review-${today}-4-facts.html`), "utf8");
  const order = [...html.matchAll(/<section id="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(order, [...expected, "principal-beats-interest-233"]);
  const f = byId.get(schedule[0].id);
  const src = html.match(new RegExp(`<img src="([^"]*${f.id}\\.jpg)"`))?.[1];
  assert.ok(src && fs.existsSync(path.resolve(dir, src)), `the sheet links the committed card image: ${src}`);
  assert.ok(html.includes("npm run review:mark -- " + [...expected, "principal-beats-interest-233"].join(" ")));
  assert.ok(!html.includes(`id="${schedule[1].id}"`), "a signed-off fact is skipped");
  assert.equal(read(file).facts.find((x) => x.id === f.id).reviewed, null, "next writes nothing to the facts file");
});

test("review:next escapes text, so a caption cannot break the sheet", () => {
  const data = structuredClone(all);
  const victim = data.facts.find((x) => x.id === schedule[0].id);
  victim.caption = `<script>alert(1)</script> & "quoted" ${victim.caption}`;
  data.facts = data.facts.map((x) => ({ ...x, reviewed: null }));
  const file = path.join(TMP, "escape.json");
  fs.writeFileSync(file, JSON.stringify(data));
  const dir = path.join(TMP, "sheets-escape");
  assert.equal(helper(["next", "--count", "1"], file, dir).code, 0);
  const html = fs.readFileSync(path.join(dir, `review-${today}-${schedule[0].id}.html`), "utf8");
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot;"));
});

test("review:mark signs off the named facts as they stand, and the gate then passes", () => {
  const file = copy();
  const ids = [schedule[0].id, "principal-beats-interest-233"];
  const r = helper(["mark", ...ids], file);
  assert.equal(r.code, 0, r.out);
  const facts = new Map(read(file).facts.map((x) => [x.id, x]));
  for (const id of ids) {
    assert.deepEqual(facts.get(id).reviewed, { date: today, hash: contentHash(facts.get(id)) });
    assert.equal(reviewProblem(facts.get(id)), null);
  }
  assert.equal(facts.get(schedule[1].id).reviewed, null, "nothing else is touched");
});

test("review:mark refuses unknown ids, bad dates and future dates, and then writes nothing", () => {
  for (const [args, reason] of [[["no-such-fact", schedule[0].id], /not in .*no-such-fact/], [["--date", "2026-13-01", schedule[0].id], /not a YYYY-MM-DD date/], [["--date", "2999-01-01", schedule[0].id], /after today/], [[], /name the facts/]]) {
    const file = copy();
    const before = fs.readFileSync(file, "utf8");
    const r = helper(["mark", ...args], file);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, reason);
    assert.equal(fs.readFileSync(file, "utf8"), before, `${args.join(" ")}: file unchanged`);
  }
});

test("review:mark --date records an earlier review date", () => {
  const file = copy();
  assert.equal(helper(["mark", "--date", "2026-09-30", schedule[0].id], file).code, 0);
  assert.equal(read(file).facts.find((x) => x.id === schedule[0].id).reviewed.date, "2026-09-30");
});

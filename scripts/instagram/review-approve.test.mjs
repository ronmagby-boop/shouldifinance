// Tests for review-approve.mjs: approving facts by commenting on the Review
// needed issue. GitHub is a local stand-in; the facts file is a temporary copy.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startGitHub } from "./test-github.mjs";
import { buildAltText, buildCaption } from "./caption.mjs";
import { contentHash, reviewProblem } from "./review.mjs";
import { parseCommands } from "./review-approve.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SCRIPT = path.join(HERE, "review-approve.mjs");
const ISSUE_SCRIPT = path.join(HERE, "preview-issue.mjs");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-approve-"));
const all = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8"));
const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
const REVIEWER = "ronmagby-boop";
let gh;
before(async () => { gh = await startGitHub(); });
after(() => { gh.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

// Three facts nobody has signed off, from the committed facts file.
const listed = schedule.map((p) => all.facts.find((f) => f.id === p.id)).filter((f) => reviewProblem(f)).slice(0, 3);
const ids = listed.map((f) => f.id);

// Async: the GitHub stand-in runs in this process, so a blocking spawn would deadlock it.
function exec(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { env });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

/** A fresh facts copy, and the review issue listing the three facts as they stand in it. */
async function setup() {
  gh.reset();
  const factsFile = path.join(TMP, `facts-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(factsFile, JSON.stringify(all, null, 2) + "\n");
  const queue = listed.map((f, i) => ({ id: f.id, n: i + 20, category: f.category, layout: f.layout, card: f.card, myth: f.myth ?? null, hero: f.hero ?? null, hero_context: f.hero_context ?? null, card_source: f.card_source, source: f.source, guide: "g", image: "i", caption: buildCaption(f), alt: buildAltText(f), hash: contentHash(f), renderCurrent: true, renderWarnings: [] }));
  const previewFile = path.join(TMP, `preview-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(previewFile, JSON.stringify({ runway: { count: 0, blockedBy: ids[0], blockedAt: 20 }, reviewQueue: queue }));
  const r = await exec([ISSUE_SCRIPT, "review", "--preview", previewFile], { ...process.env, ...gh.env, REVIEWER, GITHUB_STEP_SUMMARY: "" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  gh.state.comments = [];
  gh.state.assigned = [];
  return factsFile;
}

async function comment(body, factsFile, { author = REVIEWER, commit = "abc1234def" } = {}) {
  const result = path.join(TMP, `result-${Math.random().toString(36).slice(2)}.json`);
  const env = { ...process.env, ...gh.env, REVIEWER, IG_FACTS_FILE: factsFile, ISSUE_NUMBER: "1", COMMENT_BODY: body, COMMENT_AUTHOR: author, COMMENT_URL: "https://github.example/c/1", IG_ACCESS_TOKEN: "", IG_USER_ID: "" };
  const apply = await exec([SCRIPT, "apply", "--out", result], env);
  const r = JSON.parse(fs.readFileSync(result, "utf8"));
  // The workflow commits only if the facts file changed; mimic that.
  const sha = r.signed?.length ? commit : "";
  const report = await exec([SCRIPT, "report", "--result", result, "--commit", sha], env);
  return { apply, report, r, facts: JSON.parse(fs.readFileSync(factsFile, "utf8")).facts };
}
const signed = (facts) => ids.filter((id) => facts.find((f) => f.id === id)?.reviewed);
const issue = () => gh.state.issues[0];

test("commands are read one per line; anything else is ignored", () => {
  assert.deepEqual(parseCommands("Looks good.\napprove all"), [{ kind: "approve", all: true, ids: [] }]);
  assert.deepEqual(parseCommands("approve `a-b`, c-d e"), [{ kind: "approve", all: false, ids: ["a-b", "c-d", "e"] }]);
  assert.deepEqual(parseCommands("- change a-b: say 30-year"), [{ kind: "change", id: "a-b", note: "say 30-year" }]);
  assert.deepEqual(parseCommands("I approve of this"), []);
});

test("approval from another account is ignored: nothing signed, no reply", async () => {
  const factsFile = await setup();
  const before = fs.readFileSync(factsFile, "utf8");
  const { apply, r } = await comment("approve all", factsFile, { author: "someone-else" });
  assert.equal(apply.status, 0, apply.stdout + apply.stderr);
  assert.equal(r.ignored, true);
  assert.equal(fs.readFileSync(factsFile, "utf8"), before);
  assert.equal(gh.state.comments.length, 0);
  assert.equal(issue().state, "open");
});

test("approve all signs off every pending fact as the issue showed it, replies, and closes the issue", async () => {
  const factsFile = await setup();
  const { apply, report, facts } = await comment("approve all", factsFile);
  assert.equal(apply.status, 0, apply.stderr);
  assert.equal(report.status, 0, report.stderr);
  assert.deepEqual(signed(facts), ids);
  for (const id of ids) assert.equal(reviewProblem(facts.find((f) => f.id === id)), null, id);
  const reply = gh.state.comments.at(-1).body;
  assert.match(reply, new RegExp(`\\*\\*Signed off\\*\\* \\(\\d{4}-\\d{2}-\\d{2}, commit abc1234\\): ${ids.map((id) => `\`${id}\``).join(", ")}`));
  assert.match(reply, /Runway now: \d+ signed-off post/);
  assert.match(reply, /closing it/);
  assert.equal(issue().state, "closed");
  for (const id of ids) assert.match(issue().body, new RegExp(`fact=${id} hash=[0-9a-f]+ status=approved date=`));
});

test("a fact changed since the issue listed it is refused, with the reason; the others are signed off", async () => {
  const factsFile = await setup();
  const data = JSON.parse(fs.readFileSync(factsFile, "utf8"));
  data.facts.find((f) => f.id === ids[1]).card += " Edited.";
  fs.writeFileSync(factsFile, JSON.stringify(data, null, 2) + "\n");
  const { r, facts } = await comment("approve all", factsFile);
  assert.deepEqual(r.signed, [ids[0], ids[2]]);
  assert.equal(r.refused.length, 1);
  assert.equal(r.refused[0].id, ids[1]);
  assert.match(r.refused[0].why, /changed since this issue listed it/);
  assert.deepEqual(signed(facts), [ids[0], ids[2]]);
  const reply = gh.state.comments.at(-1).body;
  assert.match(reply, new RegExp(`\\*\\*Refused:\\*\\*\\n- \`${ids[1]}\`: changed since this issue listed it`));
  assert.equal(issue().state, "open", "the refused fact is still pending");
});

test("a partial approval leaves the issue open, listing what is still pending", async () => {
  const factsFile = await setup();
  const { r } = await comment(`approve ${ids[0]}`, factsFile);
  assert.deepEqual(r.signed, [ids[0]]);
  assert.equal(issue().state, "open");
  assert.match(gh.state.comments.at(-1).body, new RegExp(`Still pending: \`${ids[1]}\`, \`${ids[2]}\``));
  // Approving it again is reported, not repeated.
  const again = await comment(`approve ${ids[0]}`, factsFile);
  assert.deepEqual(again.r.already, [ids[0]]);
  assert.deepEqual(again.r.signed, []);
});

test("change records the note without signing off; approve all then skips it, and the issue closes once nothing is pending", async () => {
  const factsFile = await setup();
  const first = await comment(`change ${ids[1]}: say which loan type`, factsFile);
  assert.deepEqual(first.r.changes, [{ id: ids[1], note: "say which loan type", wasApproved: false }]);
  assert.deepEqual(signed(first.facts), []);
  assert.match(gh.state.comments.at(-1).body, new RegExp(`\\*\\*Change requested\\*\\* for \`${ids[1]}\`: say which loan type \\(not signed off\\)`));
  assert.match(issue().body, new RegExp(`fact=${ids[1]} hash=[0-9a-f]+ status=change`));
  assert.equal(issue().state, "open");
  const second = await comment("approve all", factsFile);
  assert.deepEqual(second.r.signed, [ids[0], ids[2]]);
  assert.deepEqual(signed(second.facts), [ids[0], ids[2]]);
  assert.equal(issue().state, "closed", "every fact is approved or has a change requested");
});

test("ids not in the issue are refused", async () => {
  const factsFile = await setup();
  const { r } = await comment("approve no-such-fact", factsFile);
  assert.deepEqual(r.refused, [{ id: "no-such-fact", why: "not listed in this issue" }]);
});

test("report refuses to claim sign-offs were saved when there is no commit", async () => {
  const factsFile = await setup();
  const { report } = await comment("approve all", factsFile, { commit: "" });
  assert.equal(report.status, 1);
  assert.match(report.stderr, /no commit was given/);
  assert.equal(gh.state.comments.length, 0);
});

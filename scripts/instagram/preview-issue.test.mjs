// Tests for preview-issue.mjs against a local stand-in for the GitHub issues API.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startGitHub } from "./test-github.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "preview-issue.mjs");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-issue-"));
let gh;
before(async () => { gh = await startGitHub(); });
after(() => { gh.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

function run(args, env = {}) {
  const outputs = path.join(TMP, `out-${Math.random().toString(36).slice(2)}`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { env: { ...process.env, ...gh.env, GITHUB_OUTPUT: outputs, GITHUB_STEP_SUMMARY: "", REVIEWER: "ronmagby-boop", ...env } });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      const o = fs.existsSync(outputs) ? Object.fromEntries(fs.readFileSync(outputs, "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])) : {};
      resolve({ code, out, outputs: o });
    });
  });
}
const tmpFile = (name, data) => {
  const file = path.join(TMP, `${name}-${Math.random().toString(36).slice(2)}.json`);
  if (data !== undefined) fs.writeFileSync(file, JSON.stringify(data));
  return file;
};
const MON = "2026-10-12", WED = "2026-10-14", FRI = "2026-10-16";
const marker = (date, fact, hash = "0123456789abcdef", blocked = 0, cadence = "mwf") =>
  `<!-- ig-preview post=${date} fact=${fact} hash=${hash} blocked=${blocked}${cadence ? ` cadence=${cadence}` : ""} -->`;
const post = (id, over = {}) => ({
  id, n: 1, category: "Money", layout: "statement", guide: "g", card: `Card ${id}.`, caption: `Caption for ${id}.\n\nSource: x`, alt: `Alt for ${id}.`,
  image: `https://shouldifinance.com/ig/${id}.jpg`, imageCheck: "200 image/jpeg, 1 bytes", hash: `${id.length}`.padStart(16, "a"), reviewed: { date: "2026-10-01", hash: "f".repeat(16) }, quota: "0 of 100", ...over,
});
function previewFile(posts, extra = {}) {
  return tmpFile("preview", { previewDate: "2026-10-08", dates: [MON, WED, FRI], posts, heldWarnings: [], runway: { count: 9, blockedBy: null, blockedAt: null }, reviewQueue: [], ...extra });
}
const threePosts = () => [
  { date: MON, skipped: false, post: post("fact-a"), blockers: [] },
  { date: WED, skipped: false, post: post("fact-b"), blockers: [] },
  { date: FRI, skipped: false, post: post("fact-c"), blockers: [] },
];

// --------------------------------------------------------------------- plan

test("plan closes the old Tuesday issue #1 without posting it, so its fact comes back into the queue", async () => {
  gh.reset();
  gh.add({ title: "Instagram post 2026-10-06: points-purchase-vs-refi", body: `${marker("2026-10-06", "points-purchase-vs-refi", "abcdefabcdefabcd", 0, null)}\nold`, labels: ["instagram-preview"] });
  const out = tmpFile("plan");
  const r = await run(["plan", "--preview-date", "2026-10-08", "--out", out]);
  assert.equal(r.code, 0, r.out);
  assert.equal(gh.state.issues[0].state, "closed");
  assert.equal(gh.state.issues[0].state_reason, "not_planned");
  assert.match(gh.state.comments[0].body, /Replaced by the Monday, Wednesday and Friday schedule.*nothing will be posted from here.*`points-purchase-vs-refi` goes back into the queue/s);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, "utf8")), { previewDate: "2026-10-08", dates: [MON, WED, FRI], pinned: {}, reserved: [], skipped: [] });
});

test("plan pins open issues for these dates, reserves other open ones, skips closed ones, and closes ones whose date passed", async () => {
  gh.reset();
  gh.add({ body: marker(WED, "fact-b"), labels: ["instagram-preview"] }); // open, this week: pinned
  gh.add({ body: marker("2026-10-19", "fact-x"), labels: ["instagram-preview"] }); // open, later: reserved
  gh.add({ body: marker(MON, "fact-a"), labels: ["instagram-preview"], state: "closed", state_reason: "not_planned" }); // skipped
  gh.add({ body: marker("2026-10-05", "fact-old"), labels: ["instagram-preview"] }); // open, date passed
  gh.add({ body: marker(FRI, "fact-intruder"), labels: ["instagram-preview"], user: "someone" }); // not the workflow's
  const out = tmpFile("plan");
  const r = await run(["plan", "--preview-date", "2026-10-08", "--out", out]);
  assert.equal(r.code, 0, r.out);
  const plan = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.deepEqual(plan.pinned, { [WED]: "fact-b" });
  assert.deepEqual(plan.reserved, ["fact-x"]);
  assert.deepEqual(plan.skipped, [MON]);
  assert.equal(gh.state.issues[3].state, "closed");
  assert.match(gh.state.comments[0].body, /has passed without this posting.*`fact-old` goes back into the queue/s);
  assert.equal(gh.state.issues[4].state, "open", "someone else's issue is left alone");
});

// --------------------------------------------------------------------- open

test("open makes one issue per post, each with its own fact, card, caption, alt text and hash, assigned", async () => {
  gh.reset();
  const r = await run(["open", "--preview", previewFile(threePosts())], { PREVIEW_ASSIGNEE: "ronmagby-boop" });
  assert.equal(r.code, 0, r.out);
  assert.equal(gh.state.issues.length, 3);
  assert.deepEqual(gh.state.issues.map((i) => i.title), [`Instagram post Mon ${MON}: fact-a`, `Instagram post Wed ${WED}: fact-b`, `Instagram post Fri ${FRI}: fact-c`]);
  for (const [i, id] of ["fact-a", "fact-b", "fact-c"].entries()) {
    const b = gh.state.issues[i].body;
    assert.ok(b.startsWith(marker([MON, WED, FRI][i], id, post(id).hash)), b.slice(0, 120));
    assert.ok(b.includes(`(https://shouldifinance.com/ig/${id}.jpg)`));
    assert.ok(b.includes(`\`\`\`text\nCaption for ${id}.\n\nSource: x\n\`\`\``));
    assert.ok(b.includes(`\`\`\`text\nAlt for ${id}.\n\`\`\``));
  }
  assert.match(gh.state.issues[0].body, /Posts Monday 12 October 2026 at 15:00 UTC/);
  assert.equal(gh.state.assigned.length, 3);
  assert.deepEqual(gh.state.labels.map((l) => l.name).sort(), ["instagram-preview", "skip"]);
});

test("open again refreshes the same issues; a skipped date's closed issue stays closed and no new one opens", async () => {
  gh.reset();
  await run(["open", "--preview", previewFile(threePosts())]);
  gh.state.issues[1].state = "closed";
  const again = threePosts();
  again[1] = { date: WED, skipped: true, post: null, blockers: [] };
  again[0].post.hash = "1111111111111111";
  const r = await run(["open", "--preview", previewFile(again)]);
  assert.equal(r.code, 0, r.out);
  assert.equal(gh.state.issues.length, 3);
  assert.match(gh.state.issues[0].body, /hash=1111111111111111/);
  assert.equal(gh.state.issues[1].state, "closed");
});

test("a blocked queue is clear in the issue: BLOCKED in the title, and the fact that needs review named", async () => {
  gh.reset();
  const posts = threePosts();
  posts[1].blockers = ["Needs review: fact-b has no current sign-off (fact-b has not been reviewed: its \"reviewed\" field is empty.)."];
  posts[1].needsReview = ["fact-b"];
  posts[1].post.reviewed = null;
  posts[2].blockers = ["The queue is held behind fact-b, an earlier post this week that needs review; posts go out in schedule order."];
  posts[2].needsReview = ["fact-b"];
  await run(["open", "--preview", previewFile(posts)]);
  const [, wed, fri] = gh.state.issues;
  assert.equal(wed.title, `Instagram post Wed ${WED}: fact-b (BLOCKED)`);
  assert.equal(fri.title, `Instagram post Fri ${FRI}: fact-c (BLOCKED)`);
  for (const i of [wed, fri]) {
    assert.match(i.body, /blocked=1 cadence=mwf -->/);
    assert.match(i.body, /\*\*Blocked: this will not post/);
    assert.match(i.body, /> \*\*Review needed:\*\* `fact-b`\. Sign off with `npm run review:mark -- fact-b`/);
  }
  assert.match(fri.body, /- The queue is held behind fact-b/);
});

// --------------------------------------------------------------------- gate

test("gate posts each day's own pinned fact; a skipped Monday leaves Wednesday posting Wednesday's fact", async () => {
  gh.reset();
  await run(["open", "--preview", previewFile(threePosts())]);
  gh.state.issues[0].state = "closed"; // Monday skipped
  const mon = await run(["gate", "--post-date", MON]);
  assert.equal(mon.outputs.decision, "skip");
  assert.match(mon.outputs.reason, /is closed/);
  const wed = await run(["gate", "--post-date", WED]);
  assert.deepEqual(wed.outputs, { decision: "post", reason: wed.outputs.reason, issue: "2", expect_fact: "fact-b", expect_hash: post("fact-b").hash });
});

test("gate skips: no issue, labelled skip, blocked, two issues, someone else's, or an issue from before this schedule", async () => {
  const cases = {
    "no issue": () => { gh.state.issues = []; },
    "labelled skip": () => { gh.state.issues[0].labels.push({ name: "skip" }); },
    blocked: () => { gh.state.issues[0].body = gh.state.issues[0].body.replace("blocked=0", "blocked=1"); },
    "two issues": () => { gh.state.issues.push({ ...gh.state.issues[0], number: 9 }); },
    "someone else's": () => { gh.state.issues[0].user = { login: "someone" }; },
    "old schedule": () => { gh.state.issues[0].body = gh.state.issues[0].body.replace(" cadence=mwf", ""); },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    gh.reset();
    await run(["open", "--preview", previewFile(threePosts())]);
    mutate();
    const r = await run(["gate", "--post-date", MON]);
    assert.equal(r.code, 0, `${name}: ${r.out}`);
    assert.equal(r.outputs.decision, "skip", name);
    assert.equal(r.outputs.expect_fact, "", name);
  }
});

test("done comments the permalink and closes as completed; refused comments and leaves it open", async () => {
  gh.reset();
  await run(["open", "--preview", previewFile(threePosts())]);
  assert.equal((await run(["refused", "--issue", "1", "--run-url", "https://github.example/run/9"])).code, 0);
  assert.equal(gh.state.issues[0].state, "open");
  assert.match(gh.state.comments[0].body, /Not posted.*run\/9/);
  assert.equal((await run(["done", "--issue", "1", "--permalink", "https://instagram.example/p/new"])).code, 0);
  assert.equal(gh.state.issues[0].state, "closed");
  assert.equal(gh.state.issues[0].state_reason, "completed");
  assert.equal(gh.state.comments[1].body, "Posted: https://instagram.example/p/new");
});

// ------------------------------------------------------------------- review

const reviewFact = (id, hash = "a".repeat(16)) => ({
  id, n: 7, category: "Home", layout: "big-number", card: `Card ${id}.`, myth: null, hero: "5%", hero_context: "context", card_source: "Source: s", source: "Full source",
  guide: "https://shouldifinance.com/guides/g", image: `https://shouldifinance.com/ig/${id}.jpg`, caption: `Caption ${id}.`, alt: `Alt ${id}.`, hash, renderCurrent: true, renderWarnings: ["card text wraps to 4 lines with one word on the last"], problem: "x",
});

test("review opens one Review needed issue when fewer than six signed-off posts remain, listing each fact with its hash", async () => {
  gh.reset();
  const queue = ["r1", "r2", "r3"].map((id) => reviewFact(id));
  const r = await run(["review", "--preview", previewFile([], { runway: { count: 2, blockedBy: "r1", blockedAt: 7 }, reviewQueue: queue })]);
  assert.equal(r.code, 0, r.out);
  assert.equal(gh.state.issues.length, 1);
  const [issue] = gh.state.issues;
  assert.equal(issue.title, "Review needed: 2 signed-off Instagram posts left");
  assert.deepEqual(issue.labels.map((l) => l.name), ["instagram-review"]);
  assert.deepEqual(gh.state.assigned, [{ issue: 1, assignees: ["ronmagby-boop"] }]);
  for (const id of ["r1", "r2", "r3"]) assert.ok(issue.body.includes(`<!-- ig-review fact=${id} hash=${"a".repeat(16)} status=pending -->`));
  assert.match(issue.body, /\*\*Runway: 2 signed-off posts\*\* before the first unreviewed fact \(`r1`, schedule #7\)/);
  assert.match(issue.body, /\| Render warnings \| card text wraps to 4 lines with one word on the last \|/);
  assert.match(issue.body, /\| Hero \| \*\*5%\*\*: context \|/);
  assert.match(issue.body, /Only comments from @ronmagby-boop are acted on/);
});

test("review does nothing with six or more signed-off posts left", async () => {
  gh.reset();
  const r = await run(["review", "--preview", previewFile([], { runway: { count: 6, blockedBy: "r1", blockedAt: 9 }, reviewQueue: [reviewFact("r1")] })]);
  assert.equal(r.code, 0, r.out);
  assert.equal(gh.state.issues.length, 0);
});

test("review updates the open issue, keeping approvals whose content is unchanged and resetting changed ones", async () => {
  gh.reset();
  await run(["review", "--preview", previewFile([], { runway: { count: 1, blockedBy: "r1", blockedAt: 7 }, reviewQueue: [reviewFact("r1"), reviewFact("r2")] })]);
  const [issue] = gh.state.issues;
  issue.body = issue.body.replace(/(fact=r1 hash=a{16}) status=pending/, "$1 status=approved date=2026-10-08").replace(/(fact=r2 hash=a{16}) status=pending/, "$1 status=change");
  await run(["review", "--preview", previewFile([], { runway: { count: 1, blockedBy: "r1", blockedAt: 7 }, reviewQueue: [reviewFact("r1"), reviewFact("r2", "b".repeat(16))] })]);
  assert.equal(gh.state.issues.length, 1, "updated, not reopened");
  assert.ok(issue.body.includes(`fact=r1 hash=${"a".repeat(16)} status=approved date=2026-10-08`));
  assert.ok(issue.body.includes(`fact=r2 hash=${"b".repeat(16)} status=pending`), "edited since: back to pending");
});

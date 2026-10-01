// Tests for preview-issue.mjs against a local stand-in for the GitHub issues API.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nextPostDate } from "./preview-issue.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "preview-issue.mjs");
const REPO = "owner/site";
const TOKEN = "ghs_testtoken";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-issue-"));

let issues = [];
let labels = [];
let comments = [];
let assigned = [];
let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      const body = raw ? JSON.parse(raw) : null;
      const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: "Bad credentials" });
      const p = url.pathname.replace(`/repos/${REPO}`, "");
      let m;
      if (req.method === "GET" && (m = p.match(/^\/labels\/(.+)$/))) {
        const l = labels.find((x) => x.name === decodeURIComponent(m[1]));
        return l ? send(200, l) : send(404, { message: "Not Found" });
      }
      if (req.method === "POST" && p === "/labels") { labels.push(body); return send(201, body); }
      if (req.method === "GET" && p === "/issues") {
        const want = url.searchParams.get("labels");
        const page = Number(url.searchParams.get("page") || 1);
        const list = issues.filter((i) => i.labels.some((l) => l.name === want)).slice((page - 1) * 100, page * 100);
        return send(200, list);
      }
      if (req.method === "POST" && p === "/issues") {
        const issue = { number: issues.length + 1, title: body.title, body: body.body, state: "open", labels: body.labels.map((name) => ({ name })), user: { login: "github-actions[bot]" }, html_url: `https://github.example/${REPO}/issues/${issues.length + 1}` };
        issues.push(issue);
        return send(201, issue);
      }
      if ((m = p.match(/^\/issues\/(\d+)$/)) && req.method === "PATCH") {
        const issue = issues.find((i) => i.number === Number(m[1]));
        Object.assign(issue, body);
        return send(200, issue);
      }
      if ((m = p.match(/^\/issues\/(\d+)\/comments$/)) && req.method === "POST") { comments.push({ issue: Number(m[1]), body: body.body }); return send(201, {}); }
      if ((m = p.match(/^\/issues\/(\d+)\/assignees$/)) && req.method === "POST") { assigned.push({ issue: Number(m[1]), ...body }); return send(201, {}); }
      return send(404, { message: `unknown ${req.method} ${p}` });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(TMP, { recursive: true, force: true });
});
const reset = () => { issues = []; labels = []; comments = []; assigned = []; };

function run(args, env = {}) {
  const outputs = path.join(TMP, `out-${Math.random().toString(36).slice(2)}`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { env: { ...process.env, GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: REPO, GITHUB_API_URL: base, GITHUB_OUTPUT: outputs, GITHUB_STEP_SUMMARY: "", ...env } });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      const o = fs.existsSync(outputs) ? Object.fromEntries(fs.readFileSync(outputs, "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])) : {};
      resolve({ code, out, outputs: o });
    });
  });
}
function previewFile(overrides = {}, blockers = [], warnings = []) {
  const post = {
    id: "rule-of-72", n: 12, category: "Money", layout: "big-number", guide: "how-compound-interest-works",
    card: "Divide 72 by your rate…", caption: "At 3%, about 24 years.\n\nSource: x\n\nFull guide: link in bio\nhttps://shouldifinance.com/guides/how-compound-interest-works",
    alt: "Divide 72 by your rate for roughly the years it takes money to double.", image: "https://shouldifinance.com/ig/rule-of-72.jpg",
    imageCheck: "200 image/jpeg, 130175 bytes", hash: "0123456789abcdef", reviewed: { date: "2026-09-30", hash: "fedcba9876543210" }, quota: "0 of 100 used",
    ...overrides,
  };
  const file = path.join(TMP, `preview-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify({ post, blockers, warnings }));
  return file;
}
const DATE = "2026-10-06";

test("the post date is the next Tuesday after the preview", () => {
  assert.equal(nextPostDate("2026-10-02"), "2026-10-06"); // Friday preview, Tuesday post
  assert.equal(nextPostDate("2026-10-06"), "2026-10-13"); // never the same day
  assert.equal(new Date("2026-10-06T00:00:00Z").getUTCDay(), 2);
});

test("open creates the labels and one issue, with the caption, alt text, image and marker, assigned", async () => {
  reset();
  const r = await run(["open", "--preview", previewFile(), "--post-date", DATE], { PREVIEW_ASSIGNEE: "owner" });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(labels.map((l) => l.name).sort(), ["instagram-preview", "skip"]);
  assert.equal(issues.length, 1);
  const [i] = issues;
  assert.equal(i.title, `Instagram post ${DATE}: rule-of-72`);
  assert.ok(i.body.startsWith(`<!-- ig-preview post=${DATE} fact=rule-of-72 hash=0123456789abcdef blocked=0 -->`));
  assert.match(i.body, /Posts Tuesday 6 October 2026 at 15:00 UTC/);
  assert.ok(i.body.includes("```text\nAt 3%, about 24 years.\n\nSource: x"));
  assert.ok(i.body.includes("(https://shouldifinance.com/ig/rule-of-72.jpg)"));
  assert.deepEqual(assigned, [{ issue: 1, assignees: ["owner"] }]);
});

test("open again refreshes the same open issue instead of opening another", async () => {
  reset();
  await run(["open", "--preview", previewFile(), "--post-date", DATE]);
  const r = await run(["open", "--preview", previewFile({ hash: "1111111111111111" }), "--post-date", DATE]);
  assert.equal(r.code, 0, r.out);
  assert.equal(issues.length, 1);
  assert.match(issues[0].body, /hash=1111111111111111/);
});

test("open leaves a closed issue closed: closing is how a post is skipped", async () => {
  reset();
  await run(["open", "--preview", previewFile(), "--post-date", DATE]);
  issues[0].state = "closed";
  const r = await run(["open", "--preview", previewFile({ hash: "1111111111111111" }), "--post-date", DATE]);
  assert.equal(r.code, 0, r.out);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].state, "closed");
  assert.match(issues[0].body, /hash=0123456789abcdef/);
});

test("a blocked preview says so in the title and body", async () => {
  reset();
  const r = await run(["open", "--preview", previewFile({ reviewed: null }, ["rule-of-72 has not been reviewed.", "rule-of-72 is HELD by check:facts: X: was 1, now 2."]), "--post-date", DATE]);
  assert.equal(r.code, 0, r.out);
  assert.equal(issues[0].title, `Instagram post ${DATE}: rule-of-72 (BLOCKED)`);
  assert.match(issues[0].body, /blocked=2 -->/);
  assert.match(issues[0].body, /\*\*Blocked: this will not post/);
  assert.match(issues[0].body, /- rule-of-72 has not been reviewed\./);
  assert.match(issues[0].body, /\| check:facts \| \*\*held\*\* \|/);
});

test("other held facts are warnings in the issue: listed, but the post is not blocked", async () => {
  reset();
  const r = await run(["open", "--preview", previewFile({}, [], ["fha-nine-vs-ten is HELD by check:facts (not this post): X: was 1, now 2"]), "--post-date", DATE]);
  assert.equal(r.code, 0, r.out);
  assert.equal(issues[0].title, `Instagram post ${DATE}: rule-of-72`);
  assert.match(issues[0].body, /blocked=0 -->/);
  assert.match(issues[0].body, /\| check:facts \| not held; 1 other fact held \(warnings below\) \|/);
  assert.match(issues[0].body, /### Warnings\n\nThese do not stop this post\..*\n\n- fha-nine-vs-ten is HELD/);
  assert.equal((await run(["gate", "--post-date", DATE])).outputs.decision, "post");
});

test("gate posts an open, unlabelled preview, pinned to its fact and hash", async () => {
  reset();
  await run(["open", "--preview", previewFile(), "--post-date", DATE]);
  const r = await run(["gate", "--post-date", DATE]);
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.outputs, { decision: "post", reason: r.outputs.reason, issue: "1", expect_fact: "rule-of-72", expect_hash: "0123456789abcdef" });
});

test("gate skips: no issue, closed, labelled skip, blocked, two issues, or one not opened by the workflow", async () => {
  const cases = {
    "no issue": () => {},
    closed: () => { issues[0].state = "closed"; },
    "labelled skip": () => { issues[0].labels.push({ name: "skip" }); },
    blocked: () => { issues[0].body = issues[0].body.replace("blocked=0", "blocked=1"); },
    "two issues": () => { issues.push({ ...issues[0], number: 2 }); },
    "not the workflow's": () => { issues[0].user = { login: "someone" }; },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    reset();
    if (name !== "no issue") await run(["open", "--preview", previewFile(), "--post-date", DATE]);
    mutate();
    const r = await run(["gate", "--post-date", DATE]);
    assert.equal(r.code, 0, `${name}: ${r.out}`);
    assert.equal(r.outputs.decision, "skip", name);
    assert.equal(r.outputs.expect_fact, "", name);
  }
});

test("gate only looks at the given date", async () => {
  reset();
  await run(["open", "--preview", previewFile(), "--post-date", "2026-10-13"]);
  const r = await run(["gate", "--post-date", DATE]);
  assert.equal(r.outputs.decision, "skip");
  assert.match(r.outputs.reason, /no preview issue for 2026-10-06/);
});

test("done comments the permalink and closes the issue as completed; refused comments and leaves it open", async () => {
  reset();
  await run(["open", "--preview", previewFile(), "--post-date", DATE]);
  assert.equal((await run(["refused", "--issue", "1", "--run-url", "https://github.example/run/9"])).code, 0);
  assert.equal(issues[0].state, "open");
  assert.match(comments[0].body, /Not posted.*run\/9/);
  assert.equal((await run(["done", "--issue", "1", "--permalink", "https://instagram.example/p/new"])).code, 0);
  assert.equal(issues[0].state, "closed");
  assert.equal(issues[0].state_reason, "completed");
  assert.equal(comments[1].body, "Posted: https://instagram.example/p/new");
});

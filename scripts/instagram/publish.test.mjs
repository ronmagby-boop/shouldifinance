// End-to-end test of publish.mjs against a local stand-in for the Graph API
// and the image host. Run with: npm run test:instagram
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAltText, buildCaption, captionBody } from "./caption.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SCRIPT = path.join(HERE, "publish.mjs");
const TOKEN = "EAAtestTOKENxyz789neverprint";
const IG = "17841400000000000";
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8")).facts.filter((f) => !f.shelfLife);
const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
const byId = new Map(facts.map((f) => [f.id, f]));
const asPosted = (id, i) => ({ id: `m-${id}`, caption: buildCaption(byId.get(id)), alt_text: buildAltText(byId.get(id)), timestamp: `2026-10-0${i + 1}T12:00:00Z`, permalink: `https://instagram.example/p/${i}` });

// Mutable per test: the media on the account, and what the mock saw.
let accountMedia = [];
let seen = [];
let statusSequence = [];
let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      seen.push({ method: req.method, path: url.pathname, body, auth: req.headers.authorization, rawUrl: req.url });
      const send = (code, obj, headers = { "content-type": "application/json" }) => { res.writeHead(code, headers); res.end(obj === null ? "" : JSON.stringify(obj)); };
      if (url.pathname.startsWith("/ig/")) return send(200, null, { "content-type": "image/jpeg", "content-length": "123456" });
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(400, { error: { message: "bad auth", code: 190 } });
      const p = url.pathname.replace("/v26.0", "");
      if (req.method === "GET" && p === `/${IG}/media`) {
        // Two pages, the second reached through a next link that carries a token.
        const page = url.searchParams.get("after") === "p2" ? 2 : 1;
        const half = Math.ceil(accountMedia.length / 2);
        const data = page === 1 ? accountMedia.slice(0, half) : accountMedia.slice(half);
        const paging = page === 1 && accountMedia.length > half ? { next: `${base}/v26.0/${IG}/media?after=p2&access_token=${TOKEN}` } : {};
        return send(200, { data, paging });
      }
      if (p === `/${IG}/content_publishing_limit`) return send(200, { data: [{ config: { quota_total: 100, quota_duration: 86400 }, quota_usage: 3 }] });
      if (req.method === "POST" && p === `/${IG}/media`) return send(200, { id: "container-1" });
      if (req.method === "GET" && p === "/container-1") return send(200, { status_code: statusSequence.shift() ?? "FINISHED", id: "container-1" });
      if (req.method === "POST" && p === `/${IG}/media_publish`) return send(200, { id: "published-1" });
      if (req.method === "GET" && p === "/published-1") return send(200, { permalink: "https://instagram.example/p/new" });
      return send(404, { error: { message: `unknown ${req.method} ${p}`, code: 803 } });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, IG_ACCESS_TOKEN: TOKEN, IG_USER_ID: IG, GRAPH_BASE: base, IG_IMAGE_BASE: base, POLL_INTERVAL_MS: "10", GITHUB_STEP_SUMMARY: "", ...env },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}
const writes = () => seen.filter((s) => s.method === "POST");
const reset = (media = []) => { accountMedia = media; seen = []; statusSequence = []; };

test("dry run, nothing posted: picks the first scheduled fact and writes nothing", async () => {
  reset();
  const r = await run([]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`${schedule[0].id} \\(schedule #1 of ${schedule.length}\\)`));
  assert.match(r.out, /Dry run: no container created, nothing posted/);
  assert.equal(writes().length, 0);
  assert.ok(!r.out.includes(TOKEN));
});

test("dry run, three posted across two pages: picks the fourth and never prints the paging token", async () => {
  reset(schedule.slice(0, 3).map((p, i) => asPosted(p.id, i)).reverse());
  const r = await run(["--dry-run"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /matched to facts: 3 \(3 by alt-text\)/);
  assert.match(r.out, new RegExp(`${schedule[3].id} \\(schedule #4`));
  assert.ok(seen.some((s) => s.rawUrl.includes("after=p2")), "followed the next page");
  assert.ok(!r.out.includes(TOKEN));
  assert.equal(writes().length, 0);
});

test("live run: creates the container with the built caption and alt text, polls, publishes", async () => {
  reset();
  statusSequence = ["IN_PROGRESS", "IN_PROGRESS", "FINISHED"];
  const r = await run(["--live"]);
  assert.equal(r.code, 0, r.out);
  const [create, publish] = writes();
  const form = new URLSearchParams(create.body);
  const fact = byId.get(schedule[0].id);
  assert.equal(form.get("image_url"), `${base}/ig/${fact.id}.jpg`);
  assert.equal(form.get("caption"), buildCaption(fact));
  assert.equal(form.get("alt_text"), buildAltText(fact));
  assert.ok(!create.rawUrl.includes(TOKEN) && !create.body.includes(TOKEN), "token only in the header");
  assert.equal(new URLSearchParams(publish.body).get("creation_id"), "container-1");
  assert.match(r.out, /status check 3: FINISHED/);
  assert.match(r.out, /published: media published-1 https:\/\/instagram\.example\/p\/new/);
  assert.ok(!r.out.includes(TOKEN));
});

test("fact_id override that is already posted is refused", async () => {
  reset([asPosted(schedule[5].id, 0)]);
  const r = await run(["--fact-id", schedule[5].id, "--live"]);
  assert.equal(r.code, 1);
  assert.match(r.out, /is already posted/);
  assert.equal(writes().length, 0);
});

test("fact_id override posts that fact even out of schedule order", async () => {
  reset();
  const r = await run(["--fact-id", schedule[7].id]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`${schedule[7].id} \\(fact_id override\\)`));
});

test("a live run refuses when a post is ambiguous between two facts", async () => {
  const [a, b] = [byId.get(schedule[0].id), byId.get(schedule[1].id)];
  reset([{ id: "mixed", caption: `${captionBody(a)} ${captionBody(b)}`, alt_text: "", timestamp: "2026-10-01T00:00:00Z" }]);
  const r = await run(["--live"]);
  assert.equal(r.code, 1);
  assert.match(r.out, /match two facts equally/);
  assert.equal(writes().length, 0);
});

test("no token: fails without calling anything", async () => {
  reset();
  const r = await run([], { IG_ACCESS_TOKEN: "" });
  assert.equal(r.code, 1);
  assert.match(r.out, /IG_ACCESS_TOKEN is not set/);
  assert.equal(seen.length, 0);
});

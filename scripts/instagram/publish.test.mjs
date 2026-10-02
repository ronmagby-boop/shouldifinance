// End-to-end test of publish.mjs against a local stand-in for the Graph API
// and the image host. Run with: npm run test:instagram
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAltText, buildCaption, captionBody } from "./caption.mjs";
import { createGraph } from "./graph.mjs";
import { contentHash, signOff } from "./review.mjs";
import crypto from "node:crypto";
import { previewHash } from "./post-content.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SCRIPT = path.join(HERE, "publish.mjs");
const PREVIEW = path.join(HERE, "preview.mjs");
const TOKEN = "EAAtestTOKENxyz789neverprint";
const IG = "17841400000000000";
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8")).facts.filter((f) => !f.shelfLife);
const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
const byId = new Map(facts.map((f) => [f.id, f]));
// The real facts file as committed, but with every fact signed off, so the
// tests exercise everything after the review gate. The gate's own tests
// write their own copies.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ig-publish-"));
const factsFileWith = (reviewed, edit = (f) => f) => {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8"));
  all.facts = all.facts.map((f) => edit({ ...f, reviewed: typeof reviewed === "function" ? reviewed(f) : reviewed }));
  const file = path.join(TMP, `facts-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(all));
  return file;
};
const ok = (f) => signOff(f, "2026-09-30");
const REVIEWED_FACTS = factsFileWith(ok);
const asPosted =(id, i) => ({ id: `m-${id}`, caption: buildCaption(byId.get(id)), alt_text: buildAltText(byId.get(id)), timestamp: `2026-10-0${i + 1}T12:00:00Z`, permalink: `https://instagram.example/p/${i}` });

// Mutable per test: the media on the account, and what the mock saw.
let accountMedia = [];
let seen = [];
let statusSequence = [];
let pageCap = 100;
// What the image host serves; a test can swap it to simulate a redeployed card.
let imageBytes = Buffer.alloc(2048, 7);
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
      if (url.pathname.startsWith("/ig/")) { res.writeHead(200, { "content-type": "image/jpeg" }); return res.end(imageBytes); }
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(400, { error: { message: "bad auth", code: 190 } });
      const p = url.pathname.replace("/v26.0", "");
      if (req.method === "GET" && p === `/${IG}/media`) {
        // Cursor paging like Meta's: the requested limit, capped by pageCap
        // (Meta may return fewer than asked), and a next link that carries a
        // token, on every page but the last.
        const offset = Number(url.searchParams.get("after") || 0);
        const size = Math.min(Number(url.searchParams.get("limit") || 25), pageCap);
        const data = accountMedia.slice(offset, offset + size);
        const more = offset + size < accountMedia.length;
        const paging = more ? { cursors: { after: String(offset + size) }, next: `${base}/v26.0/${IG}/media?limit=${size}&after=${offset + size}&access_token=${TOKEN}` } : {};
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
after(() => {
  server.close();
  fs.rmSync(TMP, { recursive: true, force: true });
});

function run(args, env = {}, script = SCRIPT) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", script, ...args], {
      env: { ...process.env, IG_ACCESS_TOKEN: TOKEN, IG_USER_ID: IG, GRAPH_BASE: base, IG_IMAGE_BASE: base, POLL_INTERVAL_MS: "10", GITHUB_STEP_SUMMARY: "", IG_FACTS_FILE: REVIEWED_FACTS, ...env },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}
const writes = () => seen.filter((s) => s.method === "POST");
const reset = (media = [], cap = 100) => { accountMedia = media; seen = []; statusSequence = []; pageCap = cap; imageBytes = Buffer.alloc(2048, 7); };
const mediaReads = () => seen.filter((s) => s.method === "GET" && s.path === `/v26.0/${IG}/media`);

/**
 * An account history, newest first as the API returns it: the given
 * scheduled facts posted in schedule order, with manual posts mixed in.
 * The oldest posts, the earliest scheduled facts, land on the LAST page.
 */
function history(postedCount, manualCount) {
  const items = [];
  let t = Date.UTC(2026, 9, 1);
  const tick = () => new Date((t += 7 * 864e5)).toISOString();
  let manual = 0;
  for (let i = 0; i < postedCount; i++) {
    const f = byId.get(schedule[i].id);
    items.push({ id: `m-${f.id}`, caption: buildCaption(f), alt_text: buildAltText(f), timestamp: tick(), permalink: `https://instagram.example/p/${i}` });
    if (manual < manualCount && i % Math.max(1, Math.floor(postedCount / manualCount)) === 0) {
      items.push({ id: `manual-${manual}`, caption: `Behind the scenes, week ${manual}.`, alt_text: "", timestamp: tick() });
      manual += 1;
    }
  }
  while (manual < manualCount) items.push({ id: `manual-${manual++}`, caption: "An update.", alt_text: "", timestamp: tick() });
  return items.reverse();
}

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
  reset(schedule.slice(0, 3).map((p, i) => asPosted(p.id, i)).reverse(), 2);
  const r = await run(["--dry-run"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /matched to facts: 3 \(3 by alt-text\)/);
  assert.match(r.out, new RegExp(`${schedule[3].id} \\(schedule #4`));
  assert.equal(mediaReads().length, 2, "followed the next page");
  assert.ok(!r.out.includes(TOKEN));
  assert.equal(writes().length, 0);
});

test("dry run job Summary: media read with request count, image check, full caption, alt text, quota, no token", async () => {
  reset(schedule.slice(0, 3).map((p, i) => asPosted(p.id, i)).reverse(), 2);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ig-summary-")), "summary.md");
  const r = await run([], { GITHUB_STEP_SUMMARY: file });
  assert.equal(r.code, 0, r.out);
  const summary = fs.readFileSync(file, "utf8");
  const fact = byId.get(schedule[3].id);
  const caption = buildCaption(fact);
  const alt = buildAltText(fact);
  assert.match(summary, /^## Instagram dry run$/m);
  assert.match(summary, /^- Media read: 3, the whole history, in 2 requests \(page size 100\)$/m);
  assert.match(summary, /^- Matched to facts: 3 \(3 by alt-text\)$/m);
  assert.ok(summary.includes(`- Image: ${base}/ig/${fact.id}.jpg`), summary);
  assert.match(summary, /^- Image check: 200 image\/jpeg, 2048 bytes$/m);
  assert.ok(summary.includes(`- Caption (${caption.length} of 2200 characters):\n\n\`\`\`text\n${caption}\n\`\`\`\n`), summary);
  assert.ok(summary.includes(`- Alt text (${alt.length} of 1000 characters):\n\n\`\`\`text\n${alt}\n\`\`\`\n`), summary);
  assert.match(summary, /^- Quota: 3 of 100 used in the current 86400s window$/m);
  assert.match(summary, /\*\*Dry run\.\*\* Would post/);
  assert.ok(!summary.includes(TOKEN));
  assert.equal(writes().length, 0);
});

test("160 posts over 7 pages: reads the whole history, so the oldest posts still count", async () => {
  // Every scheduled fact posted, plus 23 manual posts: 160 in all. The mock
  // serves 25 a page although 100 are asked for, so this takes 7 requests,
  // and the earliest scheduled facts are only on the last page.
  const media = history(schedule.length, 160 - schedule.length);
  assert.equal(media.length, 160);
  reset(media, 25);
  const r = await run([]);
  assert.equal(r.code, 0, r.out);
  assert.equal(mediaReads().length, 7);
  assert.match(r.out, /media read: 160, the whole history, in 7 requests \(page size 100\)/);
  assert.match(r.out, new RegExp(`matched to facts: ${schedule.length} `));
  assert.match(r.out, /not matched to any fact: 23/);
  assert.match(r.out, /every scheduled fact is posted; nothing to do/);
  assert.ok(!r.out.includes(TOKEN));
  assert.equal(writes().length, 0);
});

test("150 posts at full pages: two requests, and the next fact is the first unposted one", async () => {
  // The first 130 scheduled facts posted, plus 20 manual posts. If the read
  // stopped at the first page, the oldest 50 would look unposted and schedule
  // #1 would be picked again.
  reset(history(130, 20), 100);
  const r = await run([]);
  assert.equal(r.code, 0, r.out);
  assert.equal(mediaReads().length, 2);
  assert.match(r.out, /media read: 150, the whole history, in 2 requests/);
  assert.match(r.out, new RegExp(`${schedule[130].id} \\(schedule #131 of ${schedule.length}\\)`));
});

test("1,050 posts: nothing past an item cap is dropped, so the oldest facts are not reposted", async () => {
  // The first 60 scheduled facts are the OLDEST posts, followed by 990 newer
  // manual posts: 1,050 in all, 11 requests at 100 a page. The earliest
  // facts sit in the last 50 items, which a 1,000-item cap would have cut,
  // making schedule #1 look unposted and post it again.
  const facts60 = history(60, 0);
  const manual = Array.from({ length: 990 }, (_, i) => ({ id: `manual-${i}`, caption: `Update ${i}.`, alt_text: "", timestamp: `2030-01-01T00:${String(i % 60).padStart(2, "0")}:00Z` }));
  reset([...manual, ...facts60], 100);
  const r = await run([]);
  assert.equal(r.code, 0, r.out);
  assert.equal(mediaReads().length, 11);
  assert.match(r.out, /media read: 1050, the whole history, in 11 requests/);
  assert.match(r.out, /matched to facts: 60 /);
  assert.match(r.out, new RegExp(`${schedule[60].id} \\(schedule #61 of`));
});

test("the page guard fails loudly instead of returning a partial history", async () => {
  // A next link on every page, forever: the guard must throw, not truncate.
  const looping = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [{ id: "x" }], paging: { next: `http://127.0.0.1:${looping.address().port}/v26.0/loop?access_token=${TOKEN}` } }));
  });
  await new Promise((r) => looping.listen(0, "127.0.0.1", r));
  const graph = createGraph({ token: TOKEN, base: `http://127.0.0.1:${looping.address().port}` });
  await assert.rejects(graph.all("/loop", {}, { maxPages: 5 }), (e) => {
    assert.match(e.message, /still had more pages after 5 requests \(5 items read\); refusing a partial read/);
    assert.ok(!e.message.includes(TOKEN));
    return true;
  });
  looping.close();
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

test("an unreviewed next fact is refused in a dry run, with the reason in the log and the Summary", async () => {
  reset();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ig-summary-")), "summary.md");
  const r = await run([], { IG_FACTS_FILE: factsFileWith(null), GITHUB_STEP_SUMMARY: file });
  assert.equal(r.code, 1, r.out);
  assert.ok(r.out.includes(`${schedule[0].id} has not been reviewed: its "reviewed" field is empty.`), r.out);
  assert.ok(r.out.includes(`then run: npm run review:mark -- ${schedule[0].id}`), r.out);
  assert.match(fs.readFileSync(file, "utf8"), /\*\*Failed:\*\* .* has not been reviewed/);
  assert.equal(writes().length, 0);
});

test("an unreviewed fact is refused in a live run, before anything is created", async () => {
  reset();
  const r = await run(["--live"], { IG_FACTS_FILE: factsFileWith((f) => (f.id === schedule[0].id ? undefined : ok(f))) });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /has not been reviewed/);
  assert.equal(writes().length, 0);
});

test("the review gate holds the schedule order instead of skipping to a reviewed fact", async () => {
  reset();
  const r = await run([], { IG_FACTS_FILE: factsFileWith((f) => (f.id === schedule[0].id ? null : ok(f))) });
  assert.equal(r.code, 1, r.out);
  assert.ok(r.out.includes(`${schedule[0].id} has not been reviewed`), r.out);
  assert.ok(!r.out.includes(`${schedule[1].id} (schedule #2`), "did not move on to the next fact");
});

test("a fact_id override gets no exemption from review", async () => {
  reset();
  const r = await run(["--fact-id", schedule[7].id, "--live"], { IG_FACTS_FILE: factsFileWith(null) });
  assert.equal(r.code, 1, r.out);
  assert.ok(r.out.includes(`${schedule[7].id} has not been reviewed`), r.out);
  assert.equal(writes().length, 0);
});

test("a malformed or future review date is refused, not guessed at", async () => {
  for (const [value, reason] of [["2026-13-01", /not a YYYY-MM-DD date/], ["30/09/2026", /not a YYYY-MM-DD date/], ["2026-02-30", /not a YYYY-MM-DD date/], ["2999-01-01", /after today/]]) {
    reset();
    const r = await run(["--live"], { IG_FACTS_FILE: factsFileWith((f) => ({ date: value, hash: contentHash(f) })) });
    assert.equal(r.code, 1, `${value}: ${r.out}`);
    assert.match(r.out, reason, value);
    assert.equal(writes().length, 0, value);
  }
});

test("a bare date, the old form, is refused: it does not say what was reviewed", async () => {
  reset();
  const r = await run(["--live"], { IG_FACTS_FILE: factsFileWith("2026-09-30") });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /is not of the form \{"date", "hash"\}/);
  assert.equal(writes().length, 0);
});

test("any edit after sign-off is refused, field by field, until it is reviewed again", async () => {
  const first = schedule[0].id;
  const edits = {
    card: (f) => ({ ...f, card: `${f.card} Really.` }),
    caption: (f) => ({ ...f, caption: f.caption.replace(/^(\S+)/, "$1 really") }),
    source: (f) => ({ ...f, source: `${f.source}; and another` }),
    card_source: (f) => ({ ...f, card_source: `${f.card_source} (rev.)` }),
    hero: (f) => ({ ...f, hero: "1", hero_context: "x" }),
    myth: (f) => ({ ...f, myth: "It is easy to assume otherwise." }),
  };
  for (const [field, edit] of Object.entries(edits)) {
    reset();
    // Signed off as it was, then edited: the stored hash is the old one.
    const r = await run(["--live"], { IG_FACTS_FILE: factsFileWith(ok, (f) => (f.id === first ? edit(f) : f)) });
    assert.equal(r.code, 1, `${field}: ${r.out}`);
    assert.ok(r.out.includes(`${first} has changed since it was reviewed on 2026-09-30`), `${field}: ${r.out}`);
    assert.match(r.out, new RegExp(`Review it again\. .*npm run review:mark -- ${first}`), field);
    assert.equal(writes().length, 0, field);
  }
});

test("a reviewed, unchanged fact passes the gate and the date and hash are reported", async () => {
  reset();
  const r = await run([]);
  assert.equal(r.code, 0, r.out);
  const fact = byId.get(schedule[0].id);
  assert.ok(r.out.includes(`reviewed: 2026-09-30, content unchanged since (hash ${contentHash(fact)})`), r.out);
});

/** The preview hash the post job is given, as the preview computes it from what the mock serves. */
const hashFor = (fact, bytes = imageBytes) =>
  previewHash({ id: fact.id, caption: buildCaption(fact), alt: buildAltText(fact), url: `${base}/ig/${fact.id}.jpg`, imageSha: crypto.createHash("sha256").update(bytes).digest("hex") });

test("a live run of the issue's fact with its preview hash posts, and reports the permalink to the workflow", async () => {
  reset();
  const fact = byId.get(schedule[2].id);
  const outputs = path.join(fs.mkdtempSync(path.join(TMP, "out-")), "github-output");
  const r = await run(["--live", "--fact-id", fact.id, "--expect-fact", fact.id, "--expect-hash", hashFor(fact)], { GITHUB_OUTPUT: outputs });
  assert.equal(r.code, 0, r.out);
  assert.equal(writes().length, 2);
  assert.equal(new URLSearchParams(writes()[0].body).get("caption"), buildCaption(fact));
  assert.equal(fs.readFileSync(outputs, "utf8"), `media_id=published-1\npermalink=https://instagram.example/p/new\nfact_id=${fact.id}\n`);
});

test("a skipped Monday does not move its fact: Wednesday posts its own previewed fact", async () => {
  // Monday's fact (schedule[0]) was skipped and is not on the account; Wednesday's issue showed schedule[1].
  reset();
  const wednesday = byId.get(schedule[1].id);
  const r = await run(["--live", "--fact-id", wednesday.id, "--expect-fact", wednesday.id, "--expect-hash", hashFor(wednesday)]);
  assert.equal(r.code, 0, r.out);
  assert.equal(new URLSearchParams(writes()[0].body).get("caption"), buildCaption(wednesday), "posted Wednesday's fact, not the skipped Monday one");
});

test("a live run refuses when the next fact is no longer the previewed one", async () => {
  reset([asPosted(schedule[0].id, 0)]);
  const r = await run(["--live", "--expect-fact", schedule[0].id, "--expect-hash", "0123456789abcdef"]);
  assert.equal(r.code, 1, r.out);
  assert.ok(r.out.includes(`the preview was for ${schedule[0].id}, but the fact to post now is ${schedule[1].id}`), r.out);
  assert.equal(writes().length, 0);
});

test("a previewed fact already on the account is never posted again", async () => {
  const fact = byId.get(schedule[0].id);
  reset([asPosted(fact.id, 0)]);
  const r = await run(["--live", "--fact-id", fact.id, "--expect-fact", fact.id, "--expect-hash", hashFor(fact)]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /is already posted/);
  assert.equal(writes().length, 0);
});

test("a live run refuses when the card image changed after the preview", async () => {
  reset();
  const fact = byId.get(schedule[0].id);
  const hash = hashFor(fact);
  imageBytes = Buffer.alloc(2048, 8); // redeployed card
  const r = await run(["--live", "--fact-id", fact.id, "--expect-fact", fact.id, "--expect-hash", hash]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /no longer matches its preview/);
  assert.equal(writes().length, 0);
});

test("a live run refuses when the caption changed after the preview, even with a fresh sign-off", async () => {
  reset();
  const fact = byId.get(schedule[0].id);
  const hash = hashFor(fact);
  // Edited and signed off again after the preview: the review gate passes, the preview check does not.
  const editedFact = { ...fact, caption: fact.caption.replace(/^(\S+)/, "$1 really") };
  const edited = factsFileWith(ok, (f) => (f.id === fact.id ? { ...editedFact, reviewed: signOff(editedFact, "2026-09-30") } : f));
  const r = await run(["--live", "--fact-id", fact.id, "--expect-fact", fact.id, "--expect-hash", hash], { IG_FACTS_FILE: edited });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /no longer matches its preview/);
  assert.equal(writes().length, 0);
});

/** The committed lock, with one fact's snapshot of one constant set to a stale value. */
function lockWithStale(id, name, stale) {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.lock.json"), "utf8"));
  assert.ok(lock.facts[id] && name in lock.facts[id], `${id} depends on ${name}`);
  lock.facts[id][name] = stale;
  const file = path.join(fs.mkdtempSync(path.join(TMP, "lock-")), "lock.json");
  fs.writeFileSync(file, JSON.stringify(lock));
  return file;
}

test("a live run refuses the fact it is about to post when check:facts holds it", async () => {
  reset();
  const r = await run(["--live", "--fact-id", "pmi-midpoint"], { CHECK_FACTS_LOCK: lockWithStale("pmi-midpoint", "PMI_TERMINATION_LTV", 0.8) });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /pmi-midpoint is HELD by check:facts: PMI_TERMINATION_LTV: was 0\.8, now 0\.78/);
  assert.match(r.out, /npm run check:facts -- --accept pmi-midpoint/);
  assert.equal(writes().length, 0);
});

test("another fact being held does not stop this post: it is a warning in the log and the Summary", async () => {
  reset();
  const file = path.join(fs.mkdtempSync(path.join(TMP, "summary-")), "summary.md");
  const r = await run(["--live"], { CHECK_FACTS_LOCK: lockWithStale("fha-nine-vs-ten", "FHA_MIP_DURATION_CLIFF_LTV", 95), GITHUB_STEP_SUMMARY: file });
  assert.equal(r.code, 0, r.out);
  assert.equal(writes().length, 2, "posted");
  assert.match(r.out, /WARNING: fha-nine-vs-ten is HELD by check:facts \(not this post\): FHA_MIP_DURATION_CLIFF_LTV: was 95, now 90/);
  assert.match(fs.readFileSync(file, "utf8"), /- \*\*Warning:\*\* fha-nine-vs-ten is HELD/);
});

// ------------------------------------------------- preview.mjs (Thursday run)

const MON = "2026-10-12", WED = "2026-10-14", FRI = "2026-10-16";
async function preview(planOver = {}, env = {}) {
  const dir = fs.mkdtempSync(path.join(TMP, "preview-"));
  const planFile = path.join(dir, "plan.json");
  const out = path.join(dir, "preview.json");
  fs.writeFileSync(planFile, JSON.stringify({ previewDate: "2026-10-08", dates: [MON, WED, FRI], pinned: {}, reserved: [], skipped: [], ...planOver }));
  const r = await run(["--plan", planFile, "--out", out], env, PREVIEW);
  return { ...r, p: r.code === 0 ? JSON.parse(fs.readFileSync(out, "utf8")) : null };
}
const ids = (p) => p.posts.map((x) => x.post?.id ?? (x.skipped ? "skipped" : null));

test("three previews ahead pick three distinct facts in schedule order, with their hashes, and post nothing", async () => {
  reset();
  const { code, out, p } = await preview();
  assert.equal(code, 0, out);
  assert.deepEqual(p.posts.map((x) => x.date), [MON, WED, FRI]);
  assert.deepEqual(ids(p), [schedule[0].id, schedule[1].id, schedule[2].id]);
  for (const x of p.posts) {
    assert.deepEqual(x.blockers, []);
    assert.equal(x.post.hash, hashFor(byId.get(x.post.id)), "the hash the post job will check");
  }
  assert.equal(writes().length, 0);
  assert.ok(!JSON.stringify(p).includes(TOKEN));
});

test("facts already posted, or shown in another open issue, are not previewed again; open issues keep their facts", async () => {
  reset([asPosted(schedule[0].id, 0)]);
  const { p } = await preview({ reserved: [schedule[1].id], pinned: { [WED]: schedule[5].id } });
  assert.deepEqual(ids(p), [schedule[2].id, schedule[5].id, schedule[3].id]);
  assert.equal(p.posts[1].pinned, true);
  assert.equal(new Set(ids(p)).size, 3);
});

test("a skipped date previews nothing and does not take a fact", async () => {
  reset();
  const { p } = await preview({ skipped: [WED] });
  assert.deepEqual(ids(p), [schedule[0].id, "skipped", schedule[1].id]);
});

test("a blocked queue shows clearly: the unreviewed fact and every later post this week, naming the fact to review", async () => {
  reset();
  const facts = factsFileWith((f) => (f.id === schedule[1].id ? null : ok(f)));
  const { p } = await preview({}, { IG_FACTS_FILE: facts });
  const [mon, wed, fri] = p.posts;
  assert.deepEqual(mon.blockers, []);
  assert.match(wed.blockers[0], new RegExp(`^Needs review: ${schedule[1].id} has no current sign-off`));
  assert.deepEqual(wed.needsReview, [schedule[1].id]);
  assert.match(fri.blockers[0], new RegExp(`The queue is held behind ${schedule[1].id}`));
  assert.deepEqual(fri.needsReview, [schedule[1].id]);
  assert.deepEqual(p.runway, { count: 1, blockedBy: schedule[1].id, blockedAt: 2 });
  assert.equal(p.reviewQueue[0].id, schedule[1].id);
});

test("the preview lists the next ten unreviewed facts for the review issue, with content hashes", async () => {
  reset();
  const facts = factsFileWith((f) => (schedule.slice(0, 4).some((s) => s.id === f.id) ? ok(f) : null));
  const { p } = await preview({}, { IG_FACTS_FILE: facts });
  assert.equal(p.runway.count, 4);
  assert.deepEqual(p.reviewQueue.map((f) => f.id), schedule.slice(4, 14).map((s) => s.id));
  const first = p.reviewQueue[0];
  assert.equal(first.hash, contentHash(byId.get(first.id)));
  assert.equal(first.caption, buildCaption(byId.get(first.id)));
  assert.equal(first.image, `${base}/ig/${first.id}.jpg`);
  assert.ok("renderWarnings" in first && "renderCurrent" in first);
});

test("a preview post held by check:facts is blocked; other held facts are warnings", async () => {
  reset();
  const lock = lockWithStale("pmi-midpoint", "PMI_TERMINATION_LTV", 0.8);
  const data = JSON.parse(fs.readFileSync(lock, "utf8"));
  data.facts["fha-nine-vs-ten"].FHA_MIP_DURATION_CLIFF_LTV = 95;
  fs.writeFileSync(lock, JSON.stringify(data));
  const { p } = await preview({ pinned: { [MON]: "pmi-midpoint" } }, { CHECK_FACTS_LOCK: lock });
  assert.ok(p.posts[0].blockers.some((b) => /pmi-midpoint is HELD by check:facts/.test(b)), p.posts[0].blockers.join("\n"));
  assert.deepEqual(p.heldWarnings.map((w) => w.split(" ")[0]), ["fha-nine-vs-ten"]);
});

test("no token: fails without calling anything", async () => {
  reset();
  const r = await run([], { IG_ACCESS_TOKEN: "" });
  assert.equal(r.code, 1);
  assert.match(r.out, /IG_ACCESS_TOKEN is not set/);
  assert.equal(seen.length, 0);
});

#!/usr/bin/env node
/**
 * Publishes the next scheduled Instagram card, or with --dry-run (the
 * default) shows what it would publish.
 *
 *   node scripts/instagram/publish.mjs                 dry run
 *   node scripts/instagram/publish.mjs --live          really post
 *   node scripts/instagram/publish.mjs --fact-id <id>  post this fact instead
 *
 * Environment: IG_ACCESS_TOKEN (required), IG_USER_ID (required),
 * IG_APP_SECRET (optional; adds appsecret_proof for apps that require it).
 *
 * WHAT IS ALREADY POSTED comes from the account itself: the publisher reads
 * the account's media (caption and alt text) and matches it to facts with
 * match.mjs. There is no state file and nothing is committed. The next post is
 * the first fact in content/instagram-schedule.json that is not matched.
 *
 * A DRY RUN does everything that only reads: reads and matches the media,
 * picks the fact, builds the caption and alt text, checks they are within
 * Meta's limits, checks the image URL is live, checks the publishing quota.
 * It creates no container and publishes nothing.
 *
 * A LIVE RUN then creates the container (image_url, caption, alt_text),
 * checks its status at once and then once a minute for up to five minutes,
 * as Meta recommends, and publishes it when it is FINISHED. It refuses to post
 * if any media item is ambiguous between two facts, since that is the one
 * case where a duplicate could slip through, or if the quota is used up.
 *
 * Graph API v26.0, the newest in Meta's changelog.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraph, VERSION } from "./graph.mjs";
import { buildAltText, buildCaption, captionProblems, imageUrl } from "./caption.mjs";
import { matchMedia, nextScheduled } from "./match.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60_000);
const POLL_CHECKS = 6; // at once, then once a minute for five minutes
const MAX_MEDIA = 1000;

function parseArgs(argv) {
  const args = { live: false, factId: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") args.live = true;
    else if (a === "--dry-run") args.live = false;
    else if (a === "--fact-id") args.factId = argv[++i]?.trim() || null;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const igUserId = process.env.IG_USER_ID?.trim();
let graph;
try {
  graph = createGraph({
    token: process.env.IG_ACCESS_TOKEN?.trim(),
    appSecret: process.env.IG_APP_SECRET?.trim() || null,
    base: process.env.GRAPH_BASE || undefined,
  });
} catch (e) {
  console.error(`FAILED: ${e.message}. Add it under Settings > Secrets and variables > Actions.`);
  process.exit(1);
}
const say = (s = "") => console.log(graph.scrub(s));
const summary = [];
const note = (s) => summary.push(graph.scrub(s));
function finish(code, tail) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) fs.appendFileSync(file, graph.scrub([`## Instagram ${args.live ? "post" : "dry run"}`, "", ...summary, "", tail].join("\n")) + "\n");
  process.exit(code);
}
function fail(message) {
  console.error(graph.scrub(`\nFAILED: ${message}`));
  finish(1, `**Failed:** ${message}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (s, n = 70) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t || "(empty)";
};

async function main() {
  if (!igUserId) fail("IG_USER_ID is not set.");
  say(`Graph API ${VERSION} · ${args.live ? "LIVE: this run will post" : "dry run: nothing will be posted"}`);

  const facts = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8")).facts;
  const evergreen = facts.filter((f) => !f.shelfLife);
  const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
  const byId = new Map(facts.map((f) => [f.id, f]));

  // ------------------------------------------------ what is already posted
  say("\n1. Reading the account's media");
  const media = await graph.all(`/${igUserId}/media`, { fields: "id,caption,alt_text,timestamp,permalink", limit: "100" }, MAX_MEDIA);
  const { posted, unmatched, ambiguous } = matchMedia(media, evergreen);
  const methods = [...posted.values()].reduce((a, v) => ((a[v.method] = (a[v.method] || 0) + 1), a), {});
  say(`  media read: ${media.length}`);
  say(`  matched to facts: ${posted.size}${posted.size ? ` (${Object.entries(methods).map(([k, v]) => `${v} by ${k}`).join(", ")})` : ""}`);
  note(`- Media read: ${media.length}; matched to facts: ${posted.size}`);
  for (const [id, v] of posted) {
    if (v.method === "fuzzy") say(`    ${id}: matched by fuzzy overlap ${(v.score * 100).toFixed(0)}%, caption edited? (${v.media.permalink ?? v.media.id})`);
    if (v.duplicates?.length) say(`    ${id}: posted ${v.duplicates.length + 1} times`);
  }
  say(`  not matched to any fact: ${unmatched.length}`);
  for (const m of unmatched) say(`    ${m.timestamp ?? "?"} ${m.permalink ?? m.id}: "${short(m.caption)}"`);
  if (unmatched.length) note(`- Not matched to any fact: ${unmatched.length} (manual posts, or captions and alt text both changed by hand)`);
  say(`  ambiguous between two facts: ${ambiguous.length}`);
  for (const a of ambiguous) say(`    ${a.media.permalink ?? a.media.id}: ${a.candidates.map((c) => `${c.id} ${(c.score * 100).toFixed(0)}%`).join(" vs ")}`);

  // ----------------------------------------------------------- which fact
  say("\n2. Choosing the fact");
  let fact;
  if (args.factId) {
    fact = byId.get(args.factId);
    if (!fact) fail(`fact_id "${args.factId}" is not in content/instagram-facts.json.`);
    if (fact.shelfLife) fail(`fact_id "${args.factId}" is time-sensitive and is not posted: ${fact.shelfLife.risk}`);
    if (posted.has(fact.id)) fail(`fact_id "${args.factId}" is already posted: ${posted.get(fact.id).media.permalink ?? posted.get(fact.id).media.id}`);
    say(`  ${fact.id} (fact_id override)`);
  } else {
    const next = nextScheduled(schedule, posted);
    if (!next) { say("  every scheduled fact is posted; nothing to do"); finish(0, "Every scheduled fact is already posted."); }
    fact = byId.get(next.id);
    say(`  ${fact.id} (schedule #${next.n} of ${schedule.length})`);
  }
  note(`- Fact: \`${fact.id}\` (${fact.category}, ${fact.layout})`);

  // ------------------------------------------------- caption, alt, image
  const caption = buildCaption(fact);
  const alt = buildAltText(fact);
  const problems = captionProblems(fact);
  if (problems.length) fail(`${fact.id}: ${problems.join("; ")}`);
  const url = imageUrl(fact);
  say("\n3. Post");
  say(`  image: ${url}`);
  let image;
  try {
    image = await fetch(url, { method: "HEAD" });
  } catch (e) {
    fail(`could not reach ${url}: ${e.cause?.code || e.message}`);
  }
  const type = image.headers.get("content-type") || "";
  if (!image.ok || !type.startsWith("image/jpeg")) {
    fail(`${url} returned ${image.status} ${type || "(no content type)"}; Meta needs a public JPEG. Is the card deployed under public/ig/?`);
  }
  say(`  image check: ${image.status} ${type}, ${image.headers.get("content-length") ?? "?"} bytes`);
  say(`  caption (${caption.length} of 2200 characters):`);
  for (const line of caption.split("\n")) say(`    | ${line}`);
  say(`  alt text (${alt.length} of 1000 characters): ${alt}`);

  // ----------------------------------------------------------------- quota
  const limit = await graph.get(`/${igUserId}/content_publishing_limit`, { fields: "config,quota_usage" });
  const row = limit.data?.[0] ?? {};
  const total = row.config?.quota_total;
  say(`\n4. Quota: ${row.quota_usage ?? "?"} of ${total ?? "?"} used in the current ${row.config?.quota_duration ?? "?"}s window`);
  if (total !== undefined && row.quota_usage >= total) fail("the publishing quota is used up for this window.");

  if (!args.live) {
    say("\nDry run: no container created, nothing posted.");
    finish(0, `**Dry run.** Would post \`${fact.id}\` with image ${url}. Nothing was posted.`);
  }

  // ------------------------------------------------------------- publish
  if (ambiguous.length) fail(`${ambiguous.length} media item(s) match two facts equally, so a duplicate cannot be ruled out. Edit or delete those posts' captions, then run again.`);
  say("\n5. Publishing");
  const container = await graph.post(`/${igUserId}/media`, { image_url: url, caption, alt_text: alt });
  say(`  container ${container.id} created`);
  let status = null;
  for (let check = 1; check <= POLL_CHECKS; check++) {
    if (check > 1) await sleep(POLL_INTERVAL_MS);
    status = (await graph.get(`/${container.id}`, { fields: "status_code" })).status_code;
    say(`  status check ${check}: ${status}`);
    if (status === "FINISHED" || status === "ERROR" || status === "EXPIRED" || status === "PUBLISHED") break;
  }
  if (status !== "FINISHED") fail(`container ${container.id} is ${status ?? "unknown"} after ${POLL_CHECKS} checks; not published. An unpublished container expires on its own after 24 hours.`);
  const published = await graph.post(`/${igUserId}/media_publish`, { creation_id: container.id });
  const link = (await graph.get(`/${published.id}`, { fields: "permalink" }).catch(() => ({}))).permalink;
  say(`  published: media ${published.id}${link ? ` ${link}` : ""}`);
  finish(0, `**Posted** \`${fact.id}\`: ${link ?? published.id}`);
}

main().catch((e) => fail(e.message));

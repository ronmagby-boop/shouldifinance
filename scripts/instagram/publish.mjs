#!/usr/bin/env node
/**
 * Publishes the next scheduled Instagram card, or with --dry-run (the
 * default) shows what it would publish.
 *
 *   node scripts/instagram/publish.mjs                 dry run
 *   node scripts/instagram/publish.mjs --live          really post
 *   node scripts/instagram/publish.mjs --fact-id <id>  post this fact instead
 *   node scripts/instagram/publish.mjs --preview --preview-out <file>
 *       what the next post would be, as JSON, with every reason it would be
 *       refused instead of stopping at the first; never posts
 *   --expect-fact <id> --expect-hash <hash>
 *       refuse unless the post is that fact with that preview hash, so what
 *       posts is exactly what a preview showed (instagram-post.yml uses this)
 *
 * Environment: IG_ACCESS_TOKEN (required), IG_USER_ID (required),
 * IG_APP_SECRET (optional; adds appsecret_proof for apps that require it).
 *
 * WHAT IS ALREADY POSTED comes from the account itself: the publisher reads
 * the account's media (caption and alt text) and matches it to facts with
 * match.mjs. There is no state file and nothing is committed. The next post is
 * the first fact in content/instagram-schedule.json that is not matched.
 *
 * REVIEW: a fact is posted only if its "reviewed" field holds the date a
 * person signed it off and a hash of what they signed off (review.mjs). With
 * no sign-off, or if the card, caption, alt text, hero, hero_context, myth or
 * card_source has changed since, a dry run and a live run both stop with the
 * reason. The next fact is not skipped to: the schedule order holds.
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
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraph, VERSION } from "./graph.mjs";
import { buildAltText, buildCaption, captionProblems, imageUrl } from "./caption.mjs";
import { matchMedia, nextScheduled } from "./match.mjs";
import { reviewProblem } from "./review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60_000);
const POLL_CHECKS = 6; // at once, then once a minute for five minutes
/**
 * Media are read in pages of MEDIA_PAGE_SIZE, following every next link: the
 * whole history, not a recent window, because the oldest posts are the
 * earliest scheduled facts. Meta's IG User Media reference: "Returns a maximum
 * of 10K of the most recently created media." MAX_MEDIA_PAGES (20,000 items at
 * full pages) sits above that, so it only ever trips on a runaway, and then
 * the run fails instead of posting from a partial history.
 */
const MEDIA_PAGE_SIZE = 100;
const MAX_MEDIA_PAGES = 200;
// IG_FACTS_FILE is a test override only; the workflow never sets it.
const FACTS_FILE = process.env.IG_FACTS_FILE || path.join(ROOT, "content", "instagram-facts.json");

function parseArgs(argv) {
  const args = { live: false, factId: null, preview: false, previewOut: null, expectFact: null, expectHash: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") args.live = true;
    else if (a === "--dry-run") args.live = false;
    else if (a === "--fact-id") args.factId = argv[++i]?.trim() || null;
    else if (a === "--preview") args.preview = true;
    else if (a === "--preview-out") args.previewOut = argv[++i];
    else if (a === "--expect-fact") args.expectFact = argv[++i]?.trim() || null;
    else if (a === "--expect-hash") args.expectHash = argv[++i]?.trim() || null;
    else throw new Error(`Unknown argument ${a}`);
  }
  if (args.preview && args.live) throw new Error("--preview never posts; drop --live");
  if (args.preview && !args.previewOut) throw new Error("--preview needs --preview-out <file>");
  return args;
}

/**
 * What a preview showed, as one hash: the fact, the caption and alt text as
 * posted, the image URL and the image bytes served there. The post job passes
 * it back as --expect-hash, so a redeployed card or an edited caption between
 * preview and post is refused rather than posted unseen.
 */
const previewHash = ({ id, caption, alt, url, imageSha }) =>
  crypto.createHash("sha256").update(JSON.stringify([id, caption, alt, url, imageSha])).digest("hex").slice(0, 16);

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
  if (file) fs.appendFileSync(file, graph.scrub([`## Instagram ${args.preview ? "preview" : args.live ? "post" : "dry run"}`, "", ...summary, "", tail].join("\n")) + "\n");
  process.exit(code);
}
function fail(message) {
  console.error(graph.scrub(`\nFAILED: ${message}`));
  finish(1, `**Failed:** ${message}`);
}
// A fence longer than any backtick run inside the text, so the job Summary
// shows it verbatim, line breaks included.
const fenced = (text) => {
  const fence = "`".repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}text\n${text}\n${fence}`;
};
// In a preview, every reason the post would be refused is collected and
// reported together; anywhere else the first one stops the run.
const blockers = [];
function block(message) {
  if (!args.preview) fail(message);
  blockers.push(message);
  say(`  BLOCKED: ${message}`);
}
function writePreview(post) {
  const out = { generated: new Date().toISOString(), post, blockers: blockers.map((b) => graph.scrub(b)) };
  fs.writeFileSync(args.previewOut, graph.scrub(JSON.stringify(out, null, 2)) + "\n");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (s, n = 70) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t || "(empty)";
};

async function main() {
  if (!igUserId) fail("IG_USER_ID is not set.");
  say(`Graph API ${VERSION} · ${args.preview ? "preview: nothing will be posted" : args.live ? "LIVE: this run will post" : "dry run: nothing will be posted"}`);

  const facts = JSON.parse(fs.readFileSync(FACTS_FILE, "utf8")).facts;
  const evergreen = facts.filter((f) => !f.shelfLife);
  const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
  const byId = new Map(facts.map((f) => [f.id, f]));

  // ------------------------------------------------ what is already posted
  say("\n1. Reading the account's media");
  const { items: media, requests } = await graph.all(
    `/${igUserId}/media`,
    { fields: "id,caption,alt_text,timestamp,permalink", limit: String(MEDIA_PAGE_SIZE) },
    { maxPages: MAX_MEDIA_PAGES },
  );
  const { posted, unmatched, ambiguous } = matchMedia(media, evergreen);
  const methods = [...posted.values()].reduce((a, v) => ((a[v.method] = (a[v.method] || 0) + 1), a), {});
  const mediaRead = `media read: ${media.length}, the whole history, in ${requests} request${requests === 1 ? "" : "s"} (page size ${MEDIA_PAGE_SIZE})`;
  const matched = `matched to facts: ${posted.size}${posted.size ? ` (${Object.entries(methods).map(([k, v]) => `${v} by ${k}`).join(", ")})` : ""}`;
  say(`  ${mediaRead}`);
  say(`  ${matched}`);
  note(`- M${mediaRead.slice(1)}`);
  note(`- ${matched[0].toUpperCase()}${matched.slice(1)}`);
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
  let scheduleN = null;
  if (args.factId) {
    fact = byId.get(args.factId);
    if (!fact) fail(`fact_id "${args.factId}" is not in content/instagram-facts.json.`);
    if (fact.shelfLife) fail(`fact_id "${args.factId}" is time-sensitive and is not posted: ${fact.shelfLife.risk}`);
    if (posted.has(fact.id)) fail(`fact_id "${args.factId}" is already posted: ${posted.get(fact.id).media.permalink ?? posted.get(fact.id).media.id}`);
    say(`  ${fact.id} (fact_id override)`);
  } else {
    const next = nextScheduled(schedule, posted);
    if (!next) {
      say("  every scheduled fact is posted; nothing to do");
      if (args.preview) writePreview(null);
      finish(0, "Every scheduled fact is already posted.");
    }
    fact = byId.get(next.id);
    scheduleN = next.n;
    say(`  ${fact.id} (schedule #${next.n} of ${schedule.length})`);
  }
  note(`- Fact: \`${fact.id}\` (${fact.category}, ${fact.layout})`);
  if (args.expectFact && fact.id !== args.expectFact) {
    fail(`the preview was for ${args.expectFact}, but the fact to post now is ${fact.id}: something was posted, edited or rescheduled since. Nothing was posted.`);
  }

  // A fact nobody has signed off is never posted, and a dry run says so too,
  // so a dry run that passes means the live run would post.
  const unreviewed = reviewProblem(fact);
  if (unreviewed) block(`${unreviewed} Nothing was posted.`);
  else {
    say(`  reviewed: ${fact.reviewed.date}, content unchanged since (hash ${fact.reviewed.hash})`);
    note(`- Reviewed: ${fact.reviewed.date}, content unchanged since (hash \`${fact.reviewed.hash}\`)`);
  }

  // ------------------------------------------------- caption, alt, image
  const caption = buildCaption(fact);
  const alt = buildAltText(fact);
  const problems = captionProblems(fact);
  if (problems.length) block(`${fact.id}: ${problems.join("; ")}`);
  const url = imageUrl(fact);
  say("\n3. Post");
  say(`  image: ${url}`);
  let image = null;
  let bytes = null;
  try {
    image = await fetch(url);
    bytes = Buffer.from(await image.arrayBuffer());
  } catch (e) {
    block(`could not reach ${url}: ${e.cause?.code || e.message}`);
  }
  const type = image?.headers.get("content-type") || "";
  let imageSha = null;
  if (image && (!image.ok || !type.startsWith("image/jpeg"))) {
    block(`${url} returned ${image.status} ${type || "(no content type)"}; Meta needs a public JPEG. Is the card deployed under public/ig/?`);
  } else if (bytes) {
    imageSha = crypto.createHash("sha256").update(bytes).digest("hex");
  }
  const imageCheck = image ? `${image.status} ${type}, ${bytes?.length ?? "?"} bytes` : "unreachable";
  const hash = imageSha ? previewHash({ id: fact.id, caption, alt, url, imageSha }) : null;
  say(`  image check: ${imageCheck}`);
  if (hash) say(`  preview hash: ${hash}`);
  if (args.expectHash && hash !== args.expectHash) {
    fail(`the post no longer matches its preview: hash ${hash ?? "(no image)"}, previewed ${args.expectHash}. The caption, alt text or card image changed after the preview issue was opened. Nothing was posted.`);
  }
  say(`  caption (${caption.length} of 2200 characters):`);
  for (const line of caption.split("\n")) say(`    | ${line}`);
  say(`  alt text (${alt.length} of 1000 characters): ${alt}`);
  note(`- Image: ${url}`);
  note(`- Image check: ${imageCheck}`);
  if (hash) note(`- Preview hash: \`${hash}\``);
  note(`- Caption (${caption.length} of 2200 characters):`);
  note("");
  note(fenced(caption));
  note("");
  note(`- Alt text (${alt.length} of 1000 characters):`);
  note("");
  note(fenced(alt));
  note("");

  // ----------------------------------------------------------------- quota
  const limit = await graph.get(`/${igUserId}/content_publishing_limit`, { fields: "config,quota_usage" });
  const row = limit.data?.[0] ?? {};
  const total = row.config?.quota_total;
  const quota = `${row.quota_usage ?? "?"} of ${total ?? "?"} used in the current ${row.config?.quota_duration ?? "?"}s window`;
  say(`\n4. Quota: ${quota}`);
  note(`- Quota: ${quota}`);
  if (total !== undefined && row.quota_usage >= total) block("the publishing quota is used up for this window.");
  if (args.preview && ambiguous.length) block(`${ambiguous.length} media item(s) match two facts equally, so a live run would refuse to post.`);

  if (args.preview) {
    writePreview({
      id: fact.id,
      n: scheduleN,
      category: fact.category,
      layout: fact.layout,
      guide: fact.guide,
      card: fact.card,
      caption,
      alt,
      image: url,
      imageCheck,
      hash,
      reviewed: unreviewed ? null : fact.reviewed,
      quota,
    });
    say(`\nPreview: written to ${args.previewOut}. ${blockers.length ? `${blockers.length} blocker(s).` : "Nothing blocks it."} Nothing was posted.`);
    finish(0, blockers.length ? `**Preview: blocked.** ${blockers.join(" ")}` : `**Preview.** Would post \`${fact.id}\`, preview hash \`${hash}\`. Nothing was posted.`);
  }

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
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `media_id=${published.id}\npermalink=${link ?? ""}\nfact_id=${fact.id}\n`);
  finish(0, `**Posted** \`${fact.id}\`: ${link ?? published.id}`);
}

main().catch((e) => fail(e.message));

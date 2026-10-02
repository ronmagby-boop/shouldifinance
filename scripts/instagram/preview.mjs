#!/usr/bin/env node
/**
 * The weekly preview: what posts on the next Monday, Wednesday and Friday,
 * and how much signed-off runway is left. Reads the account; never posts.
 *
 *   node scripts/instagram/preview.mjs --plan plan.json --out preview.json
 *
 * plan.json comes from `preview-issue.mjs plan`, which reads the open preview
 * issues: the dates to cover, facts pinned by open issues for those dates,
 * facts reserved by open issues for other dates, and dates already skipped.
 * Facts are assigned by plan.mjs: never one already posted or already shown
 * in an open issue, and never two the same in one run.
 *
 * For each post it records every reason it would be refused (not reviewed,
 * the queue held behind an unreviewed fact, held by check:facts, over Meta's
 * limits, image not served, already posted) instead of stopping at the first,
 * and the preview hash the post job will check.
 *
 * It also writes the runway (signed-off posts before the first unreviewed
 * one) and the next ten unreviewed facts, with everything the review issue
 * shows: card image, caption, alt text, hero, context, card_source, source,
 * guide, content hash and the render warnings recorded when the card was
 * published (content/instagram-public-cards.json).
 *
 * Environment: IG_ACCESS_TOKEN, IG_USER_ID (and IG_APP_SECRET), as publish.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraph, VERSION } from "./graph.mjs";
import { buildAltText, buildCaption, captionProblems, guideUrl, imageUrl } from "./caption.mjs";
import { contentHash, reviewProblem } from "./review.mjs";
import { checkFacts } from "../check-facts.mjs";
import { readAccount } from "./account.mjs";
import { fetchImage, previewHash } from "./post-content.mjs";
import { assignPosts, queueHolds, runway, unreviewedQueue } from "./plan.mjs";
import { categoryColours, designHash, inputHash } from "./render-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Test overrides only.
const FACTS_FILE = process.env.IG_FACTS_FILE || path.join(ROOT, "content", "instagram-facts.json");
const PUBLIC_RECORD = process.env.IG_PUBLIC_CARDS || path.join(ROOT, "content", "instagram-public-cards.json");

function parseArgs(argv) {
  const out = { plan: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--plan") out.plan = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  if (!out.plan || !out.out) throw new Error("usage: preview.mjs --plan plan.json --out preview.json");
  return out;
}

/** Render warnings for a fact's card, if the published card is from the fact as it stands. */
function renderWarningsFor(fact, record, colours, design) {
  const entry = record[fact.id];
  if (!entry) return { current: false, warnings: [] };
  const hash = typeof entry === "string" ? entry : entry.hash;
  if (hash !== inputHash(fact, colours, design)) return { current: false, warnings: [] };
  return { current: true, warnings: typeof entry === "string" ? [] : entry.warnings ?? [] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = JSON.parse(fs.readFileSync(args.plan, "utf8"));
  const igUserId = process.env.IG_USER_ID?.trim();
  if (!igUserId) throw new Error("IG_USER_ID is not set.");
  const graph = createGraph({ token: process.env.IG_ACCESS_TOKEN?.trim(), appSecret: process.env.IG_APP_SECRET?.trim() || null, base: process.env.GRAPH_BASE || undefined });
  const say = (s = "") => console.log(graph.scrub(s));

  const facts = JSON.parse(fs.readFileSync(FACTS_FILE, "utf8")).facts;
  const evergreen = facts.filter((f) => !f.shelfLife);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;

  say(`Graph API ${VERSION} · preview for ${plan.dates.join(", ")}: nothing will be posted`);
  const account = await readAccount(graph, igUserId, evergreen);
  const posted = new Set(account.posted.keys());
  say(`  media read: ${account.media.length}; matched to facts: ${posted.size}`);

  const assignments = assignPosts({ schedule, posted, dates: plan.dates, pinned: plan.pinned ?? {}, reserved: plan.reserved ?? [], skipped: plan.skipped ?? [] });
  const holds = queueHolds(assignments, byId);
  const factCheck = await checkFacts(facts);
  const limit = await graph.get(`/${igUserId}/content_publishing_limit`, { fields: "config,quota_usage" });
  const row = limit.data?.[0] ?? {};
  const quota = `${row.quota_usage ?? "?"} of ${row.config?.quota_total ?? "?"} used in the current ${row.config?.quota_duration ?? "?"}s window`;

  const posts = [];
  for (const [i, a] of assignments.entries()) {
    if (a.skipped) {
      posts.push({ date: a.date, skipped: true, post: null, blockers: [] });
      say(`  ${a.date}: skipped (its preview issue is closed)`);
      continue;
    }
    if (!a.id) {
      posts.push({ date: a.date, skipped: false, post: null, blockers: ["Every scheduled fact is posted or already previewed; nothing is left to post on this date."] });
      continue;
    }
    const fact = byId.get(a.id);
    const blockers = [];
    const needsReview = [];
    const own = reviewProblem(fact);
    if (holds[i] === fact.id) {
      blockers.push(`Needs review: ${fact.id} has no current sign-off (${own.replace(/ Check its card.*$/, "")}).`);
      needsReview.push(fact.id);
    } else if (holds[i]) {
      blockers.push(`The queue is held behind ${holds[i]}, an earlier post this week that needs review; posts go out in schedule order.${own ? ` ${fact.id} also needs review.` : ""}`);
      needsReview.push(holds[i], ...(own ? [fact.id] : []));
    }
    if (posted.has(fact.id)) blockers.push(`${fact.id} is already on the account, so it will not be posted again.`);
    const held = factCheck.held.get(fact.id);
    if (held) blockers.push(`${fact.id} is HELD by check:facts: ${held.join("; ")}.`);
    const problems = captionProblems(fact);
    if (problems.length) blockers.push(`${fact.id}: ${problems.join("; ")}`);
    const caption = buildCaption(fact);
    const alt = buildAltText(fact);
    const url = imageUrl(fact);
    const image = await fetchImage(url);
    if (image.problem) blockers.push(image.problem);
    const hash = image.sha ? previewHash({ id: fact.id, caption, alt, url, imageSha: image.sha }) : null;
    posts.push({
      date: a.date,
      skipped: false,
      pinned: a.pinned,
      post: { id: fact.id, n: a.n, category: fact.category, layout: fact.layout, guide: fact.guide, card: fact.card, caption, alt, image: url, imageCheck: image.check, hash, reviewed: own ? null : fact.reviewed, quota },
      blockers: blockers.map((b) => graph.scrub(b)),
      needsReview: [...new Set(needsReview)],
    });
    say(`  ${a.date}: ${fact.id}${a.pinned ? " (kept from its open issue)" : ""}${blockers.length ? ` BLOCKED: ${blockers.join(" ")}` : `, hash ${hash}`}`);
  }

  const heldWarnings = [...factCheck.held]
    .filter(([id]) => !posts.some((p) => p.post?.id === id))
    .map(([id, why]) => `${id} is HELD by check:facts (not one of these posts): ${why.join("; ")}`);

  const left = runway({ schedule, posted, byId });
  const record = fs.existsSync(PUBLIC_RECORD) ? JSON.parse(fs.readFileSync(PUBLIC_RECORD, "utf8")).cards : {};
  const colours = categoryColours();
  const design = designHash();
  const reviewQueue = unreviewedQueue({ schedule, posted, byId }).map((p) => {
    const f = byId.get(p.id);
    const rw = renderWarningsFor(f, record, colours, design);
    return {
      id: f.id, n: p.n, category: f.category, layout: f.layout, card: f.card, myth: f.myth ?? null, hero: f.hero ?? null, hero_context: f.hero_context ?? null,
      card_source: f.card_source, source: f.source, guide: guideUrl(f), image: imageUrl(f), caption: buildCaption(f), alt: buildAltText(f),
      hash: contentHash(f), renderCurrent: rw.current, renderWarnings: rw.warnings, problem: reviewProblem(f),
    };
  });
  say(`  runway: ${left.count} signed-off post(s) before ${left.blockedBy ?? "the end of the schedule"}`);

  const out = { generated: new Date().toISOString(), previewDate: plan.previewDate, dates: plan.dates, posts, heldWarnings, quota, runway: left, reviewQueue };
  fs.writeFileSync(args.out, graph.scrub(JSON.stringify(out, null, 2)) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ["## Instagram preview", "", ...posts.map((p) => `- ${p.date}: ${p.skipped ? "skipped" : p.post ? `\`${p.post.id}\`${p.blockers.length ? ` **blocked**: ${p.blockers.join(" ")}` : `, hash \`${p.post.hash}\``}` : p.blockers.join(" ")}`), ...heldWarnings.map((w) => `- **Warning:** ${w}`), `- Runway: ${left.count} signed-off post(s)${left.blockedBy ? ` before \`${left.blockedBy}\` (#${left.blockedAt})` : ""}`, ""];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, graph.scrub(lines.join("\n")) + "\n");
  }
}

main().catch((e) => {
  console.error(`FAILED: ${e.message}`);
  process.exit(1);
});

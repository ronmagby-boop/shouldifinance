#!/usr/bin/env node
/**
 * The GitHub issues around posting: one preview issue per post, and one
 * "Review needed" issue when the signed-off runway runs short. Used by
 * instagram-preview.yml, instagram-post.yml and instagram-review.yml.
 *
 *   plan --preview-date YYYY-MM-DD --out plan.json
 *       read the preview issues and decide what the preview covers: the next
 *       Monday, Wednesday and Friday; facts pinned by open issues for those
 *       dates (kept as they are); facts reserved by open issues for other
 *       dates; dates whose issue was closed (skipped). Closes issues that can
 *       never post: those from before the Mon/Wed/Fri cadence, and open ones
 *       whose date has passed. Their facts go back into the queue.
 *   open --preview preview.json
 *       open one issue per post, or refresh it if it is still open. A closed
 *       issue is left closed: closing it is how a post is skipped.
 *   review --preview preview.json
 *       if fewer than MIN_RUNWAY signed-off posts remain, open or update the
 *       "Review needed" issue with the next ten unreviewed facts.
 *   gate --post-date YYYY-MM-DD
 *       decide whether that date's post goes out, and with what. Writes
 *       decision=post|skip, reason, issue, expect_fact, expect_hash to
 *       GITHUB_OUTPUT and the reason to the job Summary.
 *   done --issue N --permalink <url> [--media-id <id>]
 *   refused --issue N --run-url <url>
 *
 * Opt-out: a post goes out unless its issue is closed or labelled "skip".
 * Everything else fails closed and skips: no issue for the date, more than
 * one, an issue not opened by the workflow or from before this cadence, or a
 * blocked preview. What posts is pinned to what its issue showed (fact and
 * preview hash), so a skipped Monday never moves its fact into Wednesday:
 * Wednesday posts Wednesday's previewed fact, and the skipped fact is
 * previewed again the next Thursday.
 *
 * Environment: GITHUB_TOKEN (issues: write), GITHUB_REPOSITORY. Optional:
 * GITHUB_API_URL, PREVIEW_ASSIGNEE and REVIEWER (who is assigned),
 * PREVIEW_BOT_LOGIN (whose issues count; default github-actions[bot]).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIN_RUNWAY, POSTS_PER_WEEK, nextPostDates } from "./plan.mjs";

export const PREVIEW_LABEL = "instagram-preview";
export const REVIEW_LABEL = "instagram-review";
export const SKIP_LABEL = "skip";
export const CADENCE = "mwf";
export const POST_TIME_UTC = "15:00";
const BOT = process.env.PREVIEW_BOT_LOGIN || "github-actions[bot]";
const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;

const MARKER = /<!-- ig-preview post=(\d{4}-\d{2}-\d{2}) fact=(\S+) hash=(\S+) blocked=(\d+)(?: cadence=(\S+))? -->/;
export const REVIEW_ISSUE_MARKER = "<!-- ig-review-issue -->";
export const REVIEW_FACT = /<!-- ig-review fact=(\S+) hash=([0-9a-f]+) status=(pending|approved|change)(?: date=(\S+))? -->/g;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "Monday 12 October 2026", built by hand so it does not depend on the runtime's locale data. */
export const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const shortDay = (iso) => DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()].slice(0, 3);
export const fenced = (text) => {
  const fence = "`".repeat(Math.max(3, ...[...String(text).matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}text\n${text}\n${fence}`;
};
const today = () => new Date().toISOString().slice(0, 10);

function fail(message) {
  console.error(`FAILED: ${message}`);
  process.exit(1);
}

export async function gh(method, p, body) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(`${method} ${p} returned ${res.status}: ${data?.message ?? "no message"}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

export async function ensureLabel(name, color, description) {
  try {
    await gh("GET", `/repos/${REPO}/labels/${encodeURIComponent(name)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
    await gh("POST", `/repos/${REPO}/labels`, { name, color, description });
  }
}

async function assign(number, who) {
  if (!who) return;
  try {
    await gh("POST", `/repos/${REPO}/issues/${number}/assignees`, { assignees: [who] });
  } catch (e) {
    console.log(`  could not assign ${who}: ${e.message}`);
  }
}

/** Every issue with a label, opened by the workflow. */
export async function botIssues(label) {
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh("GET", `/repos/${REPO}/issues?labels=${encodeURIComponent(label)}&state=all&per_page=100&page=${page}`);
    for (const i of batch) if (!i.pull_request && i.user?.login === BOT) found.push(i);
    if (batch.length < 100) break;
  }
  return found;
}

/** Preview issues with their marker parsed; others (not the workflow's, or no marker) are left out. */
async function previewIssues() {
  return (await botIssues(PREVIEW_LABEL))
    .map((i) => {
      const m = MARKER.exec(i.body ?? "");
      return m ? { ...i, marker: { date: m[1], fact: m[2], hash: m[3], blocked: Number(m[4]), cadence: m[5] ?? null } } : null;
    })
    .filter(Boolean);
}

async function comment(number, body) {
  await gh("POST", `/repos/${REPO}/issues/${number}/comments`, { body });
}
async function close(number, reason = "not_planned") {
  await gh("PATCH", `/repos/${REPO}/issues/${number}`, { state: "closed", state_reason: reason });
}
function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}
function parse(argv, known) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!known.includes(argv[i])) fail(`unknown argument ${argv[i]}`);
    out[argv[i]] = argv[++i];
  }
  return out;
}

// --------------------------------------------------------------------- plan

async function plan(argv) {
  const opt = parse(argv, ["--preview-date", "--out"]);
  const previewDate = opt["--preview-date"] || today();
  if (!opt["--out"]) fail("plan needs --out <file>");
  const dates = nextPostDates(previewDate);
  const pinned = {};
  const reserved = [];
  const skipped = [];
  const closedNow = [];
  for (const i of await previewIssues()) {
    const { date, fact, cadence } = i.marker;
    if (i.state === "open" && cadence !== CADENCE) {
      await comment(i.number, `Replaced by the Monday, Wednesday and Friday schedule. This issue's date (${longDate(date)}) is not a posting day any more, and the post job only acts on issues opened for that schedule, so nothing will be posted from here. \`${fact}\` goes back into the queue and is previewed again in its own issue.`);
      await close(i.number);
      closedNow.push(`#${i.number} (${date}, ${fact}): from before this schedule`);
      continue;
    }
    if (cadence !== CADENCE) continue;
    if (i.state === "open" && date < previewDate) {
      await comment(i.number, `${longDate(date)} has passed without this posting. Closing it so \`${fact}\` goes back into the queue; it will be previewed again in a new issue.`);
      await close(i.number);
      closedNow.push(`#${i.number} (${date}, ${fact}): date passed`);
      continue;
    }
    if (dates.includes(date)) {
      if (i.state === "open") pinned[date] = fact;
      else if (i.state_reason !== "completed") skipped.push(date);
    } else if (i.state === "open") {
      reserved.push(fact);
    }
  }
  const out = { previewDate, dates, pinned, reserved, skipped };
  fs.writeFileSync(opt["--out"], JSON.stringify(out, null, 2) + "\n");
  console.log(`Plan for ${dates.join(", ")}: pinned ${JSON.stringify(pinned)}, reserved [${reserved.join(", ")}], skipped [${skipped.join(", ")}]`);
  for (const c of closedNow) console.log(`  closed ${c}`);
  for (const c of closedNow) summary(`- Closed ${c}`);
}

// --------------------------------------------------------------------- open

export function previewBody({ date, post, blockers, needsReview = [] }, heldWarnings = []) {
  const lines = [
    `<!-- ig-preview post=${date} fact=${post.id} hash=${post.hash ?? "none"} blocked=${blockers.length} cadence=${CADENCE} -->`,
    blockers.length
      ? `**Blocked: this will not post on ${longDate(date)}** until every item below is fixed and the preview is run again.`
      : `**Posts ${longDate(date)} at ${POST_TIME_UTC} UTC** unless this issue is closed or labelled \`${SKIP_LABEL}\`. To let it post, do nothing.`,
  ];
  if (needsReview.length) {
    lines.push("", `> **Review needed:** ${needsReview.map((id) => `\`${id}\``).join(", ")}. Sign off with \`npm run review:mark -- ${needsReview.join(" ")}\` or approve in the Review needed issue, then run the Instagram preview workflow again.`);
  }
  lines.push(
    "",
    `![${post.alt.replace(/[[\]]/g, "")}](${post.image})`,
    "",
    "| | |",
    "|---|---|",
    `| Fact | \`${post.id}\`${post.n ? ` · schedule #${post.n}` : ""} · ${post.category} · ${post.layout} |`,
    `| Guide | https://shouldifinance.com/guides/${post.guide} |`,
    `| Reviewed | ${post.reviewed ? `${post.reviewed.date} (content hash \`${post.reviewed.hash}\`)` : "**not reviewed**"} |`,
    `| Image | ${post.image} (${post.imageCheck}) |`,
    `| Preview hash | \`${post.hash ?? "none"}\` |`,
    `| Quota | ${post.quota} |`,
    "",
    `**Caption** (${post.caption.length} of 2200 characters)`,
    "",
    fenced(post.caption),
    "",
    `**Alt text** (${post.alt.length} of 1000 characters)`,
    "",
    fenced(post.alt),
  );
  if (blockers.length) lines.push("", "### Blocked", "", ...blockers.map((b) => `- ${b}`));
  if (heldWarnings.length) lines.push("", "### Warnings", "", "These do not stop this post. Each needs re-checking before it can post itself.", "", ...heldWarnings.map((w) => `- ${w}`));
  lines.push(
    "",
    "---",
    `To skip this post: close this issue, or add the \`${SKIP_LABEL}\` label. The other posts this week still go out with their own previewed facts; this fact is previewed again next Thursday.`,
    "Any change to the caption, alt text or card image after this preview stops the post. Run the Instagram preview workflow again to refresh this issue.",
  );
  return lines.join("\n");
}

async function open(argv) {
  const opt = parse(argv, ["--preview"]);
  if (!opt["--preview"]) fail("open needs --preview <file>");
  const preview = JSON.parse(fs.readFileSync(opt["--preview"], "utf8"));
  await ensureLabel(PREVIEW_LABEL, "1d76db", "Instagram post preview");
  await ensureLabel(SKIP_LABEL, "e4e669", "Skip this Instagram post");
  const existing = (await previewIssues()).filter((i) => i.marker.cadence === CADENCE);
  for (const p of preview.posts) {
    if (p.skipped) {
      console.log(`${p.date}: skipped (issue closed); left closed.`);
      summary(`- ${p.date}: skipped; its issue stays closed.`);
      continue;
    }
    if (!p.post) {
      console.log(`${p.date}: ${p.blockers.join(" ")}`);
      summary(`- ${p.date}: ${p.blockers.join(" ")}`);
      continue;
    }
    const title = `Instagram post ${shortDay(p.date)} ${p.date}: ${p.post.id}${p.blockers.length ? " (BLOCKED)" : ""}`;
    const body = previewBody(p, preview.heldWarnings ?? []);
    const live = existing.find((i) => i.state === "open" && i.marker.date === p.date);
    const issue = live
      ? await gh("PATCH", `/repos/${REPO}/issues/${live.number}`, { title, body })
      : await gh("POST", `/repos/${REPO}/issues`, { title, body, labels: [PREVIEW_LABEL] });
    await assign(issue.number, process.env.PREVIEW_ASSIGNEE);
    console.log(`${live ? "Refreshed" : "Opened"} #${issue.number} for ${p.date}: ${p.post.id}${p.blockers.length ? " (BLOCKED)" : ""}`);
    summary(`- ${p.date}: [#${issue.number}](${issue.html_url}) \`${p.post.id}\`${p.blockers.length ? `, **blocked**: ${p.blockers.join(" ")}` : ", will post unless closed or labelled skip"}`);
  }
}

// ------------------------------------------------------------------- review

const statusLine = (s) => (s.status === "approved" ? `approved${s.date ? ` ${s.date}` : ""}` : s.status === "change" ? "change requested (see comments)" : "pending");

export function reviewBody({ runway, reviewQueue }, statuses = new Map()) {
  const weeks = (runway.count / POSTS_PER_WEEK).toFixed(1);
  const lines = [
    REVIEW_ISSUE_MARKER,
    `**Runway: ${runway.count} signed-off post${runway.count === 1 ? "" : "s"}** before the first unreviewed fact${runway.blockedBy ? ` (\`${runway.blockedBy}\`, schedule #${runway.blockedAt})` : ""}, about ${weeks} week${weeks === "1.0" ? "" : "s"} at ${POSTS_PER_WEEK} posts a week. Below are the next ${reviewQueue.length} facts that need a review, in schedule order.`,
    "",
    "To act on them, comment on this issue:",
    "- `approve all`: sign off every fact below that is still pending",
    "- `approve <id>, <id>`: sign off those facts",
    "- `change <id>: <what to change>`: record the note; the fact is not signed off",
    "",
    `Only comments from @${process.env.REVIEWER || "the reviewer"} are acted on. A fact edited after it was listed here is refused, not signed off; the next preview run lists it again with its new content.`,
  ];
  reviewQueue.forEach((f, i) => {
    const s = statuses.get(f.id);
    const status = s && s.hash === f.hash ? s : { status: "pending" };
    lines.push(
      "",
      `### ${i + 1}. \`${f.id}\` (schedule #${f.n}): ${statusLine(status)}`,
      `<!-- ig-review fact=${f.id} hash=${f.hash} status=${status.status}${status.date ? ` date=${status.date}` : ""} -->`,
      "",
      `![${f.alt.replace(/[[\]]/g, "")}](${f.image})`,
      "",
      "| | |",
      "|---|---|",
      `| Card | ${f.card} |`,
      ...(f.myth ? [`| Myth | ${f.myth} |`] : []),
      ...(f.hero ? [`| Hero | **${f.hero}**: ${f.hero_context} |`] : []),
      `| Card source | ${f.card_source} |`,
      `| Source | ${f.source} |`,
      `| Guide | ${f.guide} |`,
      `| Render warnings | ${!f.renderCurrent ? "**not rendered since the card last changed**" : f.renderWarnings.length ? f.renderWarnings.join("; ") : "none"} |`,
      `| Content hash | \`${f.hash}\` |`,
      "",
      `**Caption** (${f.caption.length} of 2200)`,
      "",
      fenced(f.caption),
      "",
      `**Alt text** (${f.alt.length} of 1000)`,
      "",
      fenced(f.alt),
    );
  });
  return lines.join("\n");
}

/** Statuses recorded in a review issue's body: Map id -> { hash, status, date }. */
export function readStatuses(body) {
  const out = new Map();
  for (const m of String(body ?? "").matchAll(REVIEW_FACT)) out.set(m[1], { hash: m[2], status: m[3], date: m[4] ?? null });
  return out;
}

async function review(argv) {
  const opt = parse(argv, ["--preview"]);
  if (!opt["--preview"]) fail("review needs --preview <file>");
  const preview = JSON.parse(fs.readFileSync(opt["--preview"], "utf8"));
  const { runway } = preview;
  const open = (await botIssues(REVIEW_LABEL)).find((i) => i.state === "open" && (i.body ?? "").includes(REVIEW_ISSUE_MARKER));
  if (runway.count >= MIN_RUNWAY) {
    console.log(`Runway ${runway.count} (at least ${MIN_RUNWAY}): no review issue needed.`);
    summary(`- Runway: ${runway.count} signed-off posts; no review needed.`);
    return;
  }
  if (!preview.reviewQueue.length) {
    console.log(`Runway ${runway.count}, but nothing is left to review.`);
    return;
  }
  await ensureLabel(REVIEW_LABEL, "d93f0b", "Instagram facts waiting for review");
  const title = `Review needed: ${runway.count} signed-off Instagram post${runway.count === 1 ? "" : "s"} left`;
  const body = reviewBody(preview, readStatuses(open?.body));
  const issue = open
    ? await gh("PATCH", `/repos/${REPO}/issues/${open.number}`, { title, body })
    : await gh("POST", `/repos/${REPO}/issues`, { title, body, labels: [REVIEW_LABEL] });
  await assign(issue.number, process.env.REVIEWER);
  console.log(`${open ? "Updated" : "Opened"} review issue #${issue.number}: runway ${runway.count}, ${preview.reviewQueue.length} facts listed.`);
  summary(`- Review needed: [#${issue.number}](${issue.html_url}), runway ${runway.count}.`);
}

// --------------------------------------------------------------------- gate

async function gate(argv) {
  const opt = parse(argv, ["--post-date"]);
  const postDate = opt["--post-date"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postDate ?? "")) fail("gate needs --post-date YYYY-MM-DD");
  const mine = (await previewIssues()).filter((i) => i.marker.date === postDate && i.marker.cadence === CADENCE);
  const decide = (decision, reason, issue = null) => {
    const out = { decision, reason, issue: issue?.number ?? "", expect_fact: decision === "post" ? issue.marker.fact : "", expect_hash: decision === "post" ? issue.marker.hash : "" };
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${String(v).replace(/\n/g, " ")}\n`).join(""));
    console.log(`${decision.toUpperCase()}: ${reason}`);
    summary(`**${decision === "post" ? "Posting" : "Skipped"}** (${postDate}): ${reason}`);
  };
  if (!mine.length) return decide("skip", `no preview issue for ${postDate}, so nothing was shown in advance. Run the Instagram preview workflow first.`);
  if (mine.length > 1) return decide("skip", `${mine.length} preview issues for ${postDate} (${mine.map((i) => `#${i.number}`).join(", ")}); close all but one.`);
  const issue = mine[0];
  if (issue.state === "closed") return decide("skip", `#${issue.number} is closed.`, issue);
  if (issue.labels.some((l) => (typeof l === "string" ? l : l.name) === SKIP_LABEL)) return decide("skip", `#${issue.number} is labelled ${SKIP_LABEL}.`, issue);
  if (issue.marker.blocked || issue.marker.hash === "none") return decide("skip", `#${issue.number} shows a blocked preview. Fix it and run the preview again.`, issue);
  return decide("post", `#${issue.number} is open and not labelled ${SKIP_LABEL}: posting ${issue.marker.fact}, preview hash ${issue.marker.hash}.`, issue);
}

async function done(argv) {
  const opt = parse(argv, ["--issue", "--permalink", "--media-id"]);
  if (!opt["--issue"]) fail("done needs --issue N");
  await comment(opt["--issue"], `Posted: ${opt["--permalink"] || `media ${opt["--media-id"] ?? "?"}`}`);
  await close(opt["--issue"], "completed");
  console.log(`Closed #${opt["--issue"]} as posted.`);
}

async function refused(argv) {
  const opt = parse(argv, ["--issue", "--run-url"]);
  if (!opt["--issue"]) fail("refused needs --issue N");
  await comment(opt["--issue"], `**Not posted.** The post job stopped before publishing: ${opt["--run-url"] ?? "see the workflow run"}. The issue stays open until its date passes; the next Thursday preview then closes it and previews the fact again.`);
  console.log(`Commented on #${opt["--issue"]}.`);
}

const commands = { plan, open, review, gate, done, refused };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  if (!commands[command]) fail("usage: preview-issue.mjs plan|open|review|gate|done|refused ...");
  if (!TOKEN || !REPO) fail("GITHUB_TOKEN and GITHUB_REPOSITORY must be set.");
  commands[command](rest).catch((e) => fail(e.message));
}

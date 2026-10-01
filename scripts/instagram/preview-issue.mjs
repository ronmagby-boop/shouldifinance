#!/usr/bin/env node
/**
 * The weekly preview issue: the one place a post can be looked at, and
 * stopped, before it goes out. Used by .github/workflows/instagram-preview.yml
 * and instagram-post.yml.
 *
 *   open --preview <file> [--post-date YYYY-MM-DD]
 *       open the issue for that post date, or refresh it if it is still open.
 *       A closed issue is left closed: closing it is how a post is skipped.
 *       Blockers (this post would be refused) and warnings (other facts that
 *       check:facts holds) both come from publish.mjs --preview.
 *   gate --post-date YYYY-MM-DD
 *       decide whether that date's post goes out, and with what. Writes
 *       decision=post|skip, reason, issue, expect_fact, expect_hash to
 *       GITHUB_OUTPUT and the reason to the job Summary.
 *   done --issue N --permalink <url> [--media-id <id>]
 *       comment the permalink and close the issue as completed.
 *   refused --issue N --run-url <url>
 *       comment that the post was refused, with a link to the run.
 *
 * Opt-out: the post goes out unless the issue is closed or labelled "skip".
 * Everything else fails closed and skips: no issue for the date, more than
 * one, an issue not opened by the workflow, or a preview that was blocked.
 * What posts is pinned to what the issue showed by --expect-fact and
 * --expect-hash (publish.mjs), so any change after the preview refuses the
 * post rather than slipping through.
 *
 * Environment: GITHUB_TOKEN (issues: write), GITHUB_REPOSITORY. Optional:
 * GITHUB_API_URL, PREVIEW_ASSIGNEE (who is assigned, and so notified),
 * PREVIEW_BOT_LOGIN (whose issues count; default github-actions[bot]).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PREVIEW_LABEL = "instagram-preview";
export const SKIP_LABEL = "skip";
export const POST_WEEKDAY = 2; // Tuesday
export const POST_TIME_UTC = "15:00";
const BOT = process.env.PREVIEW_BOT_LOGIN || "github-actions[bot]";
const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;

const MARKER = /<!-- ig-preview post=(\d{4}-\d{2}-\d{2}) fact=(\S+) hash=(\S+) blocked=(\d+) -->/;

/** The first post date strictly after `from` (YYYY-MM-DD, UTC) that falls on the post weekday. */
export function nextPostDate(from = new Date().toISOString().slice(0, 10)) {
  const d = new Date(`${from}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== POST_WEEKDAY);
  return d.toISOString().slice(0, 10);
}
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "Tuesday 6 October 2026", built by hand so it does not depend on the runtime's locale data. */
const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const fenced = (text) => {
  const fence = "`".repeat(Math.max(3, ...[...String(text).matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}text\n${text}\n${fence}`;
};

function fail(message) {
  console.error(`FAILED: ${message}`);
  process.exit(1);
}

async function gh(method, p, body) {
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

async function ensureLabel(name, color, description) {
  try {
    await gh("GET", `/repos/${REPO}/labels/${encodeURIComponent(name)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
    await gh("POST", `/repos/${REPO}/labels`, { name, color, description });
  }
}

/** Every issue the workflow opened with the preview label and a marker for this date. */
async function issuesFor(postDate) {
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh("GET", `/repos/${REPO}/issues?labels=${PREVIEW_LABEL}&state=all&per_page=100&page=${page}`);
    for (const i of batch) {
      if (i.pull_request) continue;
      const m = MARKER.exec(i.body ?? "");
      if (m && m[1] === postDate) found.push({ ...i, marker: { fact: m[2], hash: m[3], blocked: Number(m[4]) }, fromBot: i.user?.login === BOT });
    }
    if (batch.length < 100) break;
  }
  return found;
}

function body({ post, blockers, warnings = [] }, postDate) {
  const blocked = [...blockers];
  const lines = [
    `<!-- ig-preview post=${postDate} fact=${post.id} hash=${post.hash ?? "none"} blocked=${blocked.length} -->`,
    blocked.length
      ? `**Blocked: this will not post on ${longDate(postDate)}** until every item below is fixed and the preview is run again.`
      : `**Posts ${longDate(postDate)} at ${POST_TIME_UTC} UTC** unless this issue is closed or labelled \`${SKIP_LABEL}\`. To let it post, do nothing.`,
    "",
    `![${post.alt.replace(/[[\]]/g, "")}](${post.image})`,
    "",
    "| | |",
    "|---|---|",
    `| Fact | \`${post.id}\`${post.n ? ` · schedule #${post.n}` : ""} · ${post.category} · ${post.layout} |`,
    `| Guide | https://shouldifinance.com/guides/${post.guide} |`,
    `| Reviewed | ${post.reviewed ? `${post.reviewed.date} (content hash \`${post.reviewed.hash}\`)` : "**not reviewed**"} |`,
    `| check:facts | ${blocked.some((b) => b.includes("HELD by check:facts")) ? "**held**" : "not held"}${warnings.length ? `; ${warnings.length} other fact${warnings.length === 1 ? "" : "s"} held (warnings below)` : ""} |`,
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
  ];
  if (blocked.length) lines.push("", "### Blocked", "", ...blocked.map((b) => `- ${b}`));
  if (warnings.length) lines.push("", "### Warnings", "", "These do not stop this post. Each needs re-checking before it can post itself.", "", ...warnings.map((w) => `- ${w}`));
  lines.push(
    "",
    "---",
    `To skip this week: close this issue, or add the \`${SKIP_LABEL}\` label. The fact stays next in line and is previewed again next week.`,
    "Any change to the caption, alt text or card image after this preview stops the post. Run the Instagram preview workflow again to refresh this issue.",
  );
  return { text: lines.join("\n"), blocked: blocked.length };
}

async function open(argv) {
  const opt = parse(argv, ["--preview", "--post-date"]);
  if (!opt["--preview"]) fail("open needs --preview <file>");
  const preview = JSON.parse(fs.readFileSync(opt["--preview"], "utf8"));
  const postDate = opt["--post-date"] || nextPostDate();
  if (!preview.post) {
    console.log("Every scheduled fact is posted; no preview issue.");
    return;
  }
  await ensureLabel(PREVIEW_LABEL, "1d76db", "Weekly Instagram post preview");
  await ensureLabel(SKIP_LABEL, "e4e669", "Skip this Instagram post");
  const { text, blocked } = body(preview, postDate);
  const title = `Instagram post ${postDate}: ${preview.post.id}${blocked ? " (BLOCKED)" : ""}`;
  const existing = (await issuesFor(postDate)).filter((i) => i.fromBot);
  const closed = existing.find((i) => i.state === "closed");
  const live = existing.find((i) => i.state === "open");
  let issue;
  if (live) {
    issue = await gh("PATCH", `/repos/${REPO}/issues/${live.number}`, { title, body: text });
    console.log(`Refreshed #${issue.number}: ${issue.html_url}`);
  } else if (closed) {
    console.log(`#${closed.number} for ${postDate} is closed, so that post is skipped; leaving it closed.`);
    summary(`Preview for ${postDate}: #${closed.number} is closed, so this post is skipped. Nothing changed.`);
    return;
  } else {
    issue = await gh("POST", `/repos/${REPO}/issues`, { title, body: text, labels: [PREVIEW_LABEL] });
    console.log(`Opened #${issue.number}: ${issue.html_url}`);
  }
  if (process.env.PREVIEW_ASSIGNEE) {
    try {
      await gh("POST", `/repos/${REPO}/issues/${issue.number}/assignees`, { assignees: [process.env.PREVIEW_ASSIGNEE] });
    } catch (e) {
      console.log(`  could not assign ${process.env.PREVIEW_ASSIGNEE}: ${e.message}`);
    }
  }
  summary(`Preview for ${postDate}: [#${issue.number}](${issue.html_url}) \`${preview.post.id}\`${blocked ? `, **blocked** (${blocked})` : ", will post unless closed or labelled skip"}.`);
  for (const w of preview.warnings ?? []) summary(`- **Warning:** ${w}`);
}

async function gate(argv) {
  const opt = parse(argv, ["--post-date"]);
  const postDate = opt["--post-date"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postDate ?? "")) fail("gate needs --post-date YYYY-MM-DD");
  const all = await issuesFor(postDate);
  const mine = all.filter((i) => i.fromBot);
  const decide = (decision, reason, issue = null) => {
    const out = { decision, reason, issue: issue?.number ?? "", expect_fact: decision === "post" ? issue.marker.fact : "", expect_hash: decision === "post" ? issue.marker.hash : "" };
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${String(v).replace(/\n/g, " ")}\n`).join(""));
    console.log(`${decision.toUpperCase()}: ${reason}`);
    summary(`**${decision === "post" ? "Posting" : "Skipped"}** (${postDate}): ${reason}`);
  };
  if (all.length > mine.length) console.log(`  ignoring ${all.length - mine.length} issue(s) for ${postDate} not opened by ${BOT}`);
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
  await gh("POST", `/repos/${REPO}/issues/${opt["--issue"]}/comments`, { body: `Posted: ${opt["--permalink"] || `media ${opt["--media-id"] ?? "?"}`}` });
  await gh("PATCH", `/repos/${REPO}/issues/${opt["--issue"]}`, { state: "closed", state_reason: "completed" });
  console.log(`Closed #${opt["--issue"]} as posted.`);
}

async function refused(argv) {
  const opt = parse(argv, ["--issue", "--run-url"]);
  if (!opt["--issue"]) fail("refused needs --issue N");
  await gh("POST", `/repos/${REPO}/issues/${opt["--issue"]}/comments`, { body: `**Not posted.** The post job stopped before publishing: ${opt["--run-url"] ?? "see the workflow run"}. The issue stays open; the fact is still next in line.` });
  console.log(`Commented on #${opt["--issue"]}.`);
}

function parse(argv, known) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!known.includes(argv[i])) fail(`unknown argument ${argv[i]}`);
    out[argv[i]] = argv[++i];
  }
  return out;
}
function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

const commands = { open, gate, done, refused };
const [command, ...rest] = process.argv.slice(2);
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!commands[command]) fail("usage: preview-issue.mjs open|gate|done|refused ...");
  if (!TOKEN || !REPO) fail("GITHUB_TOKEN and GITHUB_REPOSITORY must be set.");
  commands[command](rest).catch((e) => fail(e.message));
}

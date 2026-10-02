#!/usr/bin/env node
/**
 * Sign off Instagram facts from a comment on the "Review needed" issue.
 * Used by .github/workflows/instagram-review.yml.
 *
 *   apply --out result.json
 *       read the comment and the issue, sign off what may be signed off in
 *       content/instagram-facts.json, and write what happened to result.json
 *   report --result result.json [--commit <sha>]
 *       after the workflow has committed the sign-offs: reply on the issue,
 *       update each fact's status in the issue body, and close the issue once
 *       no fact in it is pending
 *
 * Commands, one per line of the comment (other lines are ignored):
 *   approve all              every fact in the issue still pending
 *   approve <id>, <id> ...   those facts
 *   change <id>: <note>      record the note; the fact is not signed off
 *
 * Only comments by REVIEWER are acted on; anyone else's are ignored without a
 * reply. A fact is signed off only if its content hash now is the one the
 * issue recorded when it listed the fact, so what is signed off is what the
 * issue showed. A fact edited since is refused, and listed with its new
 * content at the next preview run.
 *
 * Environment: GITHUB_TOKEN, GITHUB_REPOSITORY, ISSUE_NUMBER, COMMENT_BODY,
 * COMMENT_AUTHOR, COMMENT_URL, REVIEWER. For the runway in the reply,
 * IG_ACCESS_TOKEN and IG_USER_ID (read-only); without them the runway counts
 * from the start of the schedule.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentHash, reviewProblem, signOff, today } from "./review.mjs";
import { REVIEW_ISSUE_MARKER, REVIEW_LABEL, gh, readStatuses } from "./preview-issue.mjs";
import { runway } from "./plan.mjs";
import { createGraph } from "./graph.mjs";
import { readAccount } from "./account.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FACTS_FILE = process.env.IG_FACTS_FILE || path.join(ROOT, "content", "instagram-facts.json");
const SCHEDULE_FILE = path.join(ROOT, "content", "instagram-schedule.json");
const BOT = process.env.PREVIEW_BOT_LOGIN || "github-actions[bot]";
const REPO = process.env.GITHUB_REPOSITORY;

/** The commands in a comment, in order. */
export function parseCommands(text) {
  const out = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-*]\s+/, "");
    let m;
    if (/^approve\s+all\.?$/i.test(line)) out.push({ kind: "approve", all: true, ids: [] });
    else if ((m = line.match(/^approve\s+(.+)$/i))) out.push({ kind: "approve", all: false, ids: m[1].split(/[\s,]+/).map((s) => s.replace(/[`.]/g, "")).filter(Boolean) });
    else if ((m = line.match(/^change\s+`?([a-z0-9-]+)`?\s*:\s*(.+)$/i))) out.push({ kind: "change", id: m[1], note: m[2].trim() });
  }
  return out;
}

/**
 * Decide what a comment does, against the issue's recorded statuses and the
 * facts as they stand. Returns { signed, already, refused, changes } and
 * signs off in `facts` (mutated) those that may be.
 */
export function decide(commands, statuses, facts, date = today()) {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const result = { signed: [], already: [], refused: [], changes: [] };
  const seen = new Set();
  for (const c of commands) {
    if (c.kind === "change") {
      if (!statuses.has(c.id)) result.refused.push({ id: c.id, why: "not listed in this issue" });
      else result.changes.push({ id: c.id, note: c.note, wasApproved: statuses.get(c.id).status === "approved" });
      continue;
    }
    // "all" is every fact still pending: not one with a change requested.
    const ids = c.all ? [...statuses].filter(([, s]) => s.status === "pending").map(([id]) => id) : c.ids;
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const listed = statuses.get(id);
      const fact = byId.get(id);
      if (!listed) result.refused.push({ id, why: "not listed in this issue" });
      else if (listed.status === "approved") result.already.push(id);
      else if (!fact) result.refused.push({ id, why: "no longer in content/instagram-facts.json" });
      else if (contentHash(fact) !== listed.hash) {
        result.refused.push({ id, why: `changed since this issue listed it (listed ${listed.hash}, now ${contentHash(fact)}); the next preview run lists it again with its new content` });
      } else {
        fact.reviewed = signOff(fact, date);
        if (reviewProblem(fact)) result.refused.push({ id, why: reviewProblem(fact) });
        else result.signed.push(id);
      }
    }
  }
  return result;
}

/** The issue body with these facts' statuses changed. */
export function withStatuses(body, updates, date) {
  let out = body;
  for (const [id, status] of updates) {
    out = out.replace(new RegExp(`<!-- ig-review fact=${id} hash=([0-9a-f]+) status=\\S+(?: date=\\S+)? -->`), (_, hash) => `<!-- ig-review fact=${id} hash=${hash} status=${status}${status === "approved" ? ` date=${date}` : ""} -->`);
    const label = status === "approved" ? `approved ${date}` : status === "change" ? "change requested (see comments)" : "pending";
    out = out.replace(new RegExp(`(### \\d+\\. \`${id}\` \\(schedule #\\d+\\)): [^\\n]*`), `$1: ${label}`);
  }
  return out;
}

async function loadIssue() {
  const n = process.env.ISSUE_NUMBER;
  const issue = await gh("GET", `/repos/${REPO}/issues/${n}`);
  const labelled = issue.labels.some((l) => (typeof l === "string" ? l : l.name) === REVIEW_LABEL);
  const ok = labelled && issue.user?.login === BOT && (issue.body ?? "").includes(REVIEW_ISSUE_MARKER);
  return { issue, ok };
}

async function apply(argv) {
  const out = argv[argv.indexOf("--out") + 1];
  if (!argv.includes("--out") || !out) throw new Error("apply needs --out <file>");
  const write = (r) => fs.writeFileSync(out, JSON.stringify(r, null, 2) + "\n");
  const author = process.env.COMMENT_AUTHOR;
  const reviewer = process.env.REVIEWER;
  if (!reviewer || author !== reviewer) {
    console.log(`Ignored: comment by ${author}, not ${reviewer}.`);
    return write({ ignored: true, reason: `comment by ${author}, not the reviewer` });
  }
  const commands = parseCommands(process.env.COMMENT_BODY);
  if (!commands.length) {
    console.log("Ignored: no approve or change command in the comment.");
    return write({ ignored: true, reason: "no command" });
  }
  const { issue, ok } = await loadIssue();
  if (!ok) {
    console.log(`Ignored: #${issue.number} is not a review issue opened by the workflow.`);
    return write({ ignored: true, reason: "not a review issue" });
  }
  const raw = fs.readFileSync(FACTS_FILE, "utf8");
  const data = JSON.parse(raw);
  const date = today();
  const result = decide(commands, readStatuses(issue.body), data.facts, date);
  if (result.signed.length) fs.writeFileSync(FACTS_FILE, JSON.stringify(data, null, 2) + (raw.endsWith("\n") ? "\n" : ""));
  console.log(`Signed ${result.signed.length}, already ${result.already.length}, refused ${result.refused.length}, changes ${result.changes.length}.`);
  write({ ignored: false, date, ...result });
}

async function currentRunway() {
  const facts = JSON.parse(fs.readFileSync(FACTS_FILE, "utf8")).facts;
  const byId = new Map(facts.map((f) => [f.id, f]));
  const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf8")).posts;
  let posted = new Set();
  let note = "";
  if (process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID) {
    const graph = createGraph({ token: process.env.IG_ACCESS_TOKEN.trim(), appSecret: process.env.IG_APP_SECRET?.trim() || null, base: process.env.GRAPH_BASE || undefined });
    posted = new Set((await readAccount(graph, process.env.IG_USER_ID.trim(), facts.filter((f) => !f.shelfLife))).posted.keys());
  } else {
    note = " (posted facts not read, so counted from the start of the schedule)";
  }
  return { ...runway({ schedule, posted, byId }), note };
}

async function report(argv) {
  const file = argv[argv.indexOf("--result") + 1];
  if (!argv.includes("--result") || !file) throw new Error("report needs --result <file>");
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  if (r.ignored) return console.log(`Nothing to report: ${r.reason}.`);
  const commit = argv.includes("--commit") ? argv[argv.indexOf("--commit") + 1] : "";
  if (r.signed.length && !commit) throw new Error("sign-offs were made but no commit was given; refusing to report them as saved");
  const { issue } = await loadIssue();
  const updates = [...r.signed.map((id) => [id, "approved"]), ...r.changes.map((c) => [c.id, "change"])];
  const body = withStatuses(issue.body, updates, r.date);
  const pending = [...readStatuses(body)].filter(([, s]) => s.status === "pending").map(([id]) => id);
  const left = await currentRunway();
  const lines = [];
  if (r.signed.length) lines.push(`**Signed off** (${r.date}, commit ${commit.slice(0, 7)}): ${r.signed.map((id) => `\`${id}\``).join(", ")}`);
  if (r.already.length) lines.push(`Already signed off here: ${r.already.map((id) => `\`${id}\``).join(", ")}`);
  if (r.refused.length) lines.push("**Refused:**", ...r.refused.map((x) => `- \`${x.id}\`: ${x.why}`));
  for (const c of r.changes) lines.push(`**Change requested** for \`${c.id}\`: ${c.note}${c.wasApproved ? " (it was already signed off here; the sign-off stands until the fact is edited, which voids it)" : " (not signed off)"}`);
  lines.push("", `Runway now: ${left.count} signed-off post${left.count === 1 ? "" : "s"}${left.blockedBy ? ` before \`${left.blockedBy}\` (schedule #${left.blockedAt})` : ""}${left.note}.`);
  if (process.env.COMMENT_URL) lines.push(`In reply to ${process.env.COMMENT_URL}.`);
  if (!pending.length) lines.push("", "Every fact in this issue is now signed off or has a change requested; closing it.");
  else lines.push("", `Still pending: ${pending.map((id) => `\`${id}\``).join(", ")}.`);
  await gh("PATCH", `/repos/${REPO}/issues/${issue.number}`, { body, ...(pending.length ? {} : { state: "closed", state_reason: "completed" }) });
  await gh("POST", `/repos/${REPO}/issues/${issue.number}/comments`, { body: lines.join("\n") });
  console.log(lines.join("\n"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  const run = { apply, report }[command];
  if (!run) {
    console.error("usage: review-approve.mjs apply --out result.json | report --result result.json [--commit sha]");
    process.exit(1);
  }
  run(rest).catch((e) => {
    console.error(`FAILED: ${e.message}`);
    process.exit(1);
  });
}

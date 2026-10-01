#!/usr/bin/env node
/**
 * Review helper for Instagram facts.
 *
 *   npm run review:next -- --count N             sheet for the next N unreviewed scheduled facts
 *   npm run review:next -- --count N --id <id>   ...plus these facts, wherever they are scheduled
 *   npm run review:mark -- <id> [<id> ...]       sign these facts off as they stand today
 *   npm run review:mark -- --date 2026-10-01 <id> ...   with an earlier review date
 *
 * The sheet is an HTML page in .instagram-review/ (not committed) showing,
 * for each fact, exactly what would be posted: the card image from public/ig,
 * the caption as posted, the alt text, the hero, the source and a link to
 * the guide, with the checklist to review against.
 *
 * "Unreviewed" means the publisher would refuse the fact today: never signed
 * off, or changed since (review.mjs). Marking writes {date, hash} into
 * content/instagram-facts.json for the fact as it stands, so mark only after
 * reading the current sheet: any later edit voids the sign-off.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALT_LIMIT, CAPTION_LIMIT, buildAltText, buildCaption, guideUrl, imageUrl } from "./caption.mjs";
import { contentHash, reviewProblem, signOff, today } from "./review.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// IG_FACTS_FILE and IG_REVIEW_DIR are test overrides only.
const FACTS_FILE = process.env.IG_FACTS_FILE || path.join(ROOT, "content", "instagram-facts.json");
const SCHEDULE_FILE = path.join(ROOT, "content", "instagram-schedule.json");
const OUT_DIR = process.env.IG_REVIEW_DIR || path.join(ROOT, ".instagram-review");

const CHECKLIST = [
  "Every condition the claim depends on is stated: itemizing, being current on payments, income limits, plan rules, account type.",
  "Every figure says what it assumes: rate, term, price, loan type, filing status.",
  "The scope is right: Roth IRA vs Roth 401(k), FHA vs conventional, purchase vs refinance, federal vs state.",
  "No absolute the source does not support: always, never, exactly, every, nobody.",
  "Nothing dated or likely to change without a date or a hedge.",
  "The card image shows the current text.",
];

function fail(message) {
  console.error(`FAILED: ${message}`);
  process.exit(1);
}

const loadFacts = () => JSON.parse(fs.readFileSync(FACTS_FILE, "utf8"));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function factBlock(fact, scheduled) {
  const caption = buildCaption(fact);
  const alt = buildAltText(fact);
  const problem = reviewProblem(fact);
  const imageFile = path.join(ROOT, "public", "ig", `${fact.id}.jpg`);
  const image = fs.existsSync(imageFile)
    ? `<img src="${esc(path.relative(OUT_DIR, imageFile).split(path.sep).join("/"))}" alt="${esc(alt)}" width="432" height="540">`
    : `<p class="warn">No card in public/ig/${esc(fact.id)}.jpg. Run npm run cards, then npm run cards:public.</p>`;
  const row = (label, value) => (value === undefined || value === null || value === "" ? "" : `<tr><th>${label}</th><td>${value}</td></tr>`);
  return `
<section id="${esc(fact.id)}">
  <h2>${scheduled ? `#${scheduled.n} · ` : ""}<code>${esc(fact.id)}</code></h2>
  <p class="meta">${esc(fact.category)} · ${esc(fact.layout)}${scheduled ? "" : " · not in the schedule"}${fact.shelfLife ? " · time-sensitive, not posted" : ""}</p>
  <div class="grid">
    <div class="card">${image}</div>
    <table>
      ${row("Card", esc(fact.card))}
      ${row("Myth", esc(fact.myth))}
      ${row("Hero", fact.hero ? `<strong>${esc(fact.hero)}</strong> — ${esc(fact.hero_context)}` : "")}
      ${row("Card source", esc(fact.card_source))}
      ${row("Source", esc(fact.source))}
      ${row("Depends on", fact.depends_on ? esc(fact.depends_on.join(", ")) : "")}
      ${row("Guide", `<a href="${esc(guideUrl(fact))}">${esc(guideUrl(fact))}</a> · content/guides/${esc(fact.guide)}.md`)}
      ${row("Image URL", esc(imageUrl(fact)))}
      ${row(`Caption<br><small>${caption.length} of ${CAPTION_LIMIT}</small>`, `<pre>${esc(caption)}</pre>`)}
      ${row(`Alt text<br><small>${alt.length} of ${ALT_LIMIT}</small>`, `<pre>${esc(alt)}</pre>`)}
      ${row("Status", problem ? `<span class="warn">${esc(problem)}</span>` : `Reviewed ${esc(fact.reviewed.date)}, unchanged since`)}
      ${row("Sign off", `<code>npm run review:mark -- ${esc(fact.id)}</code><br><small>content hash now ${esc(contentHash(fact))}</small>`)}
    </table>
  </div>
</section>`;
}

function sheet(facts, scheduleById, note) {
  const ids = facts.map((f) => f.id).join(" ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instagram review sheet</title>
<style>
  :root { --bg: #ffffff; --fg: #1f2937; --muted: #6b7280; --line: #e5e7eb; --warn: #b91c1c; --code: #f3f4f6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111827; --fg: #e5e7eb; --muted: #9ca3af; --line: #374151; --warn: #f87171; --code: #1f2937; } }
  body { background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 1100px; padding: 16px; }
  section { border-top: 1px solid var(--line); padding: 16px 0; }
  .grid { display: grid; grid-template-columns: minmax(0, 432px) minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 760px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  img { width: 100%; height: auto; border: 1px solid var(--line); }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; vertical-align: top; color: var(--muted); font-weight: 500; padding: 4px 12px 4px 0; width: 8.5em; }
  td { padding: 4px 0; overflow-wrap: anywhere; }
  pre { white-space: pre-wrap; margin: 0; font: inherit; background: var(--code); padding: 8px; }
  code { background: var(--code); padding: 1px 4px; }
  .meta, small { color: var(--muted); }
  .warn { color: var(--warn); }
</style>
</head>
<body>
<h1>Instagram review sheet</h1>
<p class="meta">Generated ${esc(today())}. ${esc(note)}</p>
<p>Check each fact against its guide and source:</p>
<ol>${CHECKLIST.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>
<p>Sign off only what you have read on this sheet as it stands: an edit to the card, caption, alt text, hero, myth or source line afterwards voids the sign-off. To sign off every fact here:</p>
<pre>npm run review:mark -- ${esc(ids)}</pre>
${facts.map((f) => factBlock(f, scheduleById.get(f.id))).join("\n")}
</body>
</html>
`;
}

function next(argv) {
  let count = null;
  const extra = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--count") count = Number(argv[++i]);
    else if (a === "--id") extra.push(argv[++i]);
    else if (!a.startsWith("--")) extra.push(a);
    else fail(`unknown argument ${a}`);
  }
  if (count === null && !extra.length) fail("say how many: --count N (and/or --id <id>)");
  if (count !== null && (!Number.isInteger(count) || count < 0)) fail("--count must be a whole number");
  const { facts } = loadFacts();
  const byId = new Map(facts.map((f) => [f.id, f]));
  const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf8")).posts;
  const scheduleById = new Map(schedule.map((p) => [p.id, p]));
  const missing = extra.filter((id) => !byId.has(id));
  if (missing.length) fail(`not in content/instagram-facts.json: ${missing.join(", ")}`);

  const picked = [];
  for (const p of schedule) {
    if (count === null || picked.length >= count) break;
    const f = byId.get(p.id);
    if (reviewProblem(f)) picked.push(f);
  }
  const fromSchedule = picked.length;
  for (const id of extra) if (!picked.some((f) => f.id === id)) picked.push(byId.get(id));

  const note = [
    count !== null ? `The next ${fromSchedule} unreviewed scheduled fact${fromSchedule === 1 ? "" : "s"}${fromSchedule < count ? ` (only ${fromSchedule} left)` : ""}` : "",
    picked.length > fromSchedule ? `plus ${picked.slice(fromSchedule).map((f) => f.id).join(", ")}` : "",
  ].filter(Boolean).join(", ") + ".";
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Named by what it holds, so a sheet for one fact does not overwrite a batch.
  const file = path.join(OUT_DIR, `review-${today()}-${picked.length === 1 ? picked[0].id : `${picked.length}-facts`}.html`);
  fs.writeFileSync(file, sheet(picked, scheduleById, note));
  console.log(`Wrote ${path.relative(ROOT, file)}: ${picked.length} fact${picked.length === 1 ? "" : "s"}. ${note}`);
  for (const f of picked) console.log(`  ${scheduleById.has(f.id) ? `#${scheduleById.get(f.id).n}`.padEnd(5) : "  -  "} ${f.id}`);
}

function mark(argv) {
  let date = today();
  const ids = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date") date = argv[++i];
    else if (a.startsWith("--")) fail(`unknown argument ${a}`);
    else ids.push(...a.split(",").map((s) => s.trim()).filter(Boolean));
  }
  if (!ids.length) fail("name the facts to sign off: npm run review:mark -- <id> [<id> ...]");
  const raw = fs.readFileSync(FACTS_FILE, "utf8");
  const data = JSON.parse(raw);
  const byId = new Map(data.facts.map((f) => [f.id, f]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) fail(`not in content/instagram-facts.json: ${missing.join(", ")}. Nothing was marked.`);
  // Check the date the same way the publisher will, before writing anything.
  const probe = { ...byId.get(ids[0]), reviewed: signOff(byId.get(ids[0]), date) };
  const bad = reviewProblem(probe);
  if (bad) fail(`${bad.replace(/ Check its card.*$/, "")} Nothing was marked.`);
  for (const id of ids) {
    const f = byId.get(id);
    const before = f.reviewed;
    f.reviewed = signOff(f, date);
    const was = before?.hash ? (before.hash === f.reviewed.hash ? ` (was ${before.date}, same content)` : ` (was ${before.date}, content had changed)`) : "";
    console.log(`  ${id}: reviewed ${date}, hash ${f.reviewed.hash}${was}${f.shelfLife ? " — time-sensitive, so still not posted" : ""}`);
  }
  fs.writeFileSync(FACTS_FILE, JSON.stringify(data, null, 2) + (raw.endsWith("\n") ? "\n" : ""));
  console.log(`Signed off ${ids.length} fact${ids.length === 1 ? "" : "s"} in ${path.relative(ROOT, FACTS_FILE)}. Commit it for the publisher to see.`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === "next") next(rest);
else if (command === "mark") mark(rest);
else fail("usage: review-helper.mjs next --count N [--id <id> ...] | mark [--date YYYY-MM-DD] <id> ...");

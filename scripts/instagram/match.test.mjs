// Run with: npm run test:instagram
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAltText, buildCaption, captionBody } from "./caption.mjs";
import { matchMedia, nextScheduled } from "./match.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8")).facts.filter((f) => !f.shelfLife);
const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-schedule.json"), "utf8")).posts;
const byId = new Map(facts.map((f) => [f.id, f]));

// A media item exactly as the publisher creates it. Newest first, like the API.
let clock = 0;
const asPosted = (fact, overrides = {}) => ({
  id: `media-${fact.id}`,
  caption: buildCaption(fact),
  alt_text: buildAltText(fact),
  timestamp: new Date(Date.UTC(2026, 9, 1) + (clock += 3600e3)).toISOString(),
  ...overrides,
});
const newestFirst = (list) => [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

test("none posted: the first scheduled fact is next", () => {
  const r = matchMedia([], facts);
  assert.equal(r.posted.size, 0);
  assert.equal(nextScheduled(schedule, r.posted).id, schedule[0].id);
});

test("some posted, plus a manual post: the posted ones match and the next one follows them", () => {
  const first5 = schedule.slice(0, 5).map((p) => asPosted(byId.get(p.id)));
  const manual = { id: "manual-1", caption: "We are on Instagram now. Follow for one fact a day.", alt_text: "", timestamp: "2026-10-01T09:00:00Z" };
  const r = matchMedia(newestFirst([...first5, manual]), facts);
  assert.equal(r.posted.size, 5);
  for (const p of schedule.slice(0, 5)) assert.equal(r.posted.get(p.id).method, "alt-text");
  assert.deepEqual(r.unmatched.map((m) => m.id), ["manual-1"]);
  assert.equal(r.ambiguous.length, 0);
  assert.equal(nextScheduled(schedule, r.posted).id, schedule[5].id);
});

test("posted out of order (the fact_id override): the earliest unposted scheduled fact is next", () => {
  const r = matchMedia([asPosted(byId.get(schedule[3].id))], facts);
  assert.equal(nextScheduled(schedule, r.posted).id, schedule[0].id);
});

test("caption edited by hand, alt text intact: still matched, by alt text", () => {
  const f = byId.get(schedule[0].id);
  const m = asPosted(f, { caption: "Totally rewritten by hand. Nothing of the original is left here at all." });
  const r = matchMedia([m], facts);
  assert.equal(r.posted.get(f.id)?.method, "alt-text");
});

test("caption lightly edited and alt text gone: matched by caption", () => {
  // Typical hand edits: a hashtag line added, the source line cut, an emoji, extra spacing.
  const f = byId.get(schedule[1].id);
  const edited = `${captionBody(f).replace(/\s+/g, "  ")} 👀\n\n#personalfinance #money`;
  const r = matchMedia([asPosted(f, { caption: edited, alt_text: "" })], facts);
  assert.equal(r.posted.get(f.id)?.method, "caption");
});

test("caption reworded in places and alt text gone: matched by fuzzy overlap", () => {
  const f = byId.get(schedule[2].id);
  const body = captionBody(f).split(" ");
  // Change roughly one word in eight and drop the source and guide lines.
  const reworded = body.map((w, i) => (i % 8 === 3 ? "changed" : w)).join(" ");
  const r = matchMedia([asPosted(f, { caption: reworded, alt_text: "" })], facts);
  const hit = r.posted.get(f.id);
  assert.equal(hit?.method, "fuzzy");
  assert.ok(hit.score >= 0.6);
});

test("caption rewritten from scratch and alt text gone: unmatched, and reported", () => {
  const f = byId.get(schedule[4].id);
  const m = asPosted(f, { caption: "New post! Swipe to learn something about money today.", alt_text: "" });
  const r = matchMedia([m], facts);
  assert.equal(r.posted.has(f.id), false);
  assert.equal(r.unmatched.length, 1);
});

test("the same fact posted twice: counted once, the duplicate recorded", () => {
  const f = byId.get(schedule[0].id);
  const r = matchMedia(newestFirst([asPosted(f), asPosted(f, { id: "dup" })]), facts);
  assert.equal(r.posted.size, 1);
  assert.equal(r.posted.get(f.id).duplicates.length, 1);
});

test("a caption carrying two facts' text equally: ambiguous, counted as neither", () => {
  const [a, b] = [byId.get(schedule[0].id), byId.get(schedule[1].id)];
  const m = { id: "mixed", caption: `${captionBody(a)} ${captionBody(b)}`, alt_text: "", timestamp: "2026-10-02T00:00:00Z" };
  const r = matchMedia([m], facts);
  assert.equal(r.posted.size, 0);
  assert.equal(r.ambiguous.length, 1);
  assert.deepEqual(r.ambiguous[0].candidates.map((c) => c.id).sort(), [a.id, b.id].sort());
});

test("every fact's own posted caption matches itself and nothing else, even without alt text", () => {
  const media = facts.map((f, i) => ({ id: `m${i}`, caption: buildCaption(f), alt_text: "", timestamp: String(i).padStart(4, "0") }));
  const r = matchMedia(media, facts);
  assert.equal(r.posted.size, facts.length);
  assert.equal(r.unmatched.length + r.ambiguous.length, 0);
  for (const [id, v] of r.posted) assert.equal(v.media.caption, buildCaption(byId.get(id)));
});

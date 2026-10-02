// Tests for plan.mjs: dates, assignment, queue holds and runway.
import { test } from "node:test";
import assert from "node:assert/strict";
import { signOff } from "./review.mjs";
import { assignPosts, nextPostDates, queueHolds, runway, unreviewedQueue } from "./plan.mjs";

// Six facts, scheduled 1..6. `signed` picks which are signed off.
const ids = ["a", "b", "c", "d", "e", "f"];
const schedule = ids.map((id, i) => ({ n: i + 1, id }));
function world(signed) {
  const byId = new Map(ids.map((id) => {
    const f = { id, card: `Card ${id}.`, caption: `Caption ${id}. https://shouldifinance.com/guides/g`, guide: "g", source: "s", card_source: "Source: s", layout: "statement", category: "Home", reviewed: null };
    if (signed.includes(id)) f.reviewed = signOff(f, "2026-10-01");
    return [id, f];
  }));
  return byId;
}

test("a Thursday preview covers the following Monday, Wednesday and Friday", () => {
  assert.deepEqual(nextPostDates("2026-10-08"), ["2026-10-12", "2026-10-14", "2026-10-16"]); // Thursday
  assert.deepEqual(nextPostDates("2026-10-02"), ["2026-10-05", "2026-10-07", "2026-10-09"]); // a Friday, manual run
  assert.deepEqual(nextPostDates("2026-10-12"), ["2026-10-19", "2026-10-21", "2026-10-23"]); // never the same Monday
  for (const d of nextPostDates("2026-10-08")) assert.ok([1, 3, 5].includes(new Date(`${d}T00:00:00Z`).getUTCDay()));
});

test("three dates get three distinct facts, skipping posted, reserved and pinned ones", () => {
  const dates = ["M", "W", "F"];
  const plain = assignPosts({ schedule, posted: new Set(), dates });
  assert.deepEqual(plain.map((a) => a.id), ["a", "b", "c"]);
  const busy = assignPosts({ schedule, posted: new Set(["a"]), dates, reserved: ["b"], pinned: { W: "e" } });
  assert.deepEqual(busy.map((a) => a.id), ["c", "e", "d"]);
  assert.deepEqual(busy.map((a) => a.pinned), [false, true, false]);
  assert.equal(new Set(busy.map((a) => a.id)).size, 3);
});

test("a skipped date takes no fact; the skipped fact is free again next time", () => {
  const dates = ["M", "W", "F"];
  // This week: Monday's issue (a) was closed. Wednesday and Friday keep b and c.
  const thisWeek = assignPosts({ schedule, posted: new Set(), dates, pinned: { W: "b", F: "c" }, skipped: ["M"] });
  assert.deepEqual(thisWeek.map((a) => a.id ?? (a.skipped ? "skip" : null)), ["skip", "b", "c"]);
  // Next week, b and c posted; a was never posted, so it comes first.
  const nextWeek = assignPosts({ schedule, posted: new Set(["b", "c"]), dates });
  assert.deepEqual(nextWeek.map((a) => a.id), ["a", "d", "e"]);
});

test("when the schedule runs out, a date has no fact", () => {
  const out = assignPosts({ schedule: schedule.slice(0, 2), posted: new Set(), dates: ["M", "W", "F"] });
  assert.deepEqual(out.map((a) => a.id), ["a", "b", null]);
});

test("the queue holds at the first unreviewed fact: it and every later post this run", () => {
  const byId = world(["a", "c"]);
  const a = assignPosts({ schedule, posted: new Set(), dates: ["M", "W", "F"] });
  assert.deepEqual(queueHolds(a, byId), [null, "b", "b"]);
});

test("runway counts signed-off posts left before the first unreviewed one, skipping posted facts", () => {
  assert.deepEqual(runway({ schedule, posted: new Set(), byId: world(ids) }), { count: 6, blockedBy: null, blockedAt: null });
  assert.deepEqual(runway({ schedule, posted: new Set(), byId: world(["a", "b", "d", "e"]) }), { count: 2, blockedBy: "c", blockedAt: 3 });
  // a and b posted: they no longer count, and the queue is blocked at c straight away.
  assert.deepEqual(runway({ schedule, posted: new Set(["a", "b"]), byId: world(["a", "b", "d", "e"]) }), { count: 0, blockedBy: "c", blockedAt: 3 });
  // A fact edited after sign-off counts as unreviewed.
  const byId = world(ids);
  byId.get("b").card = "Edited.";
  assert.deepEqual(runway({ schedule, posted: new Set(), byId }), { count: 1, blockedBy: "b", blockedAt: 2 });
});

test("the review queue is the next unposted unreviewed facts in schedule order", () => {
  const byId = world(["a", "c", "e"]);
  assert.deepEqual(unreviewedQueue({ schedule, posted: new Set(["b"]), byId }, 10).map((p) => p.id), ["d", "f"]);
  assert.deepEqual(unreviewedQueue({ schedule, posted: new Set(), byId }, 2).map((p) => p.id), ["b", "d"]);
});

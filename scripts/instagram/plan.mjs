/**
 * Which fact goes out on which day, and how much signed-off runway is left.
 * Pure functions, shared by preview.mjs (the Thursday preview), the review
 * issue and the review-approval workflow, so each is testable without the
 * Graph API or GitHub.
 *
 * Posting is Monday, Wednesday and Friday. A preview run covers the next
 * Monday after its date and that week's Wednesday and Friday.
 *
 * A preview issue pins its fact: the post job publishes exactly that fact,
 * by id and preview hash. So facts already shown in open preview issues are
 * taken, and are never previewed twice; a skipped (closed) issue's fact is
 * free again and comes back at the next preview in schedule order.
 */
import { reviewProblem } from "./review.mjs";

export const POST_WEEKDAYS = [1, 3, 5]; // Monday, Wednesday, Friday (UTC)
export const POSTS_PER_WEEK = POST_WEEKDAYS.length;
export const MIN_RUNWAY = 6; // two weeks of posts
export const REVIEW_BATCH = 10;

const iso = (d) => d.toISOString().slice(0, 10);
const day = (s) => new Date(`${s}T00:00:00Z`);

/** The Monday, Wednesday and Friday of the first week starting after `previewDate`. */
export function nextPostDates(previewDate) {
  const d = day(previewDate);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 1);
  return POST_WEEKDAYS.map((w) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + (w - 1));
    return iso(x);
  });
}

/**
 * One assignment per date, in date order.
 *
 *   posted    Set of fact ids already on the account
 *   pinned    { date: id } open preview issues for these dates (kept as they are)
 *   reserved  ids in open preview issues for other dates
 *   skipped   dates whose issue was closed: nothing is previewed or posted
 *
 * Returns [{ date, id, n, pinned, skipped }], with id null when the schedule
 * has nothing left to offer.
 */
export function assignPosts({ schedule, posted, dates, pinned = {}, reserved = [], skipped = [] }) {
  const taken = new Set([...posted, ...reserved, ...Object.values(pinned)]);
  const nOf = new Map(schedule.map((p) => [p.id, p.n]));
  return dates.map((date) => {
    if (skipped.includes(date)) return { date, id: null, n: null, pinned: false, skipped: true };
    if (pinned[date]) return { date, id: pinned[date], n: nOf.get(pinned[date]) ?? null, pinned: true, skipped: false };
    const next = schedule.find((p) => !taken.has(p.id));
    if (!next) return { date, id: null, n: null, pinned: false, skipped: false };
    taken.add(next.id);
    return { date, id: next.id, n: next.n, pinned: false, skipped: false };
  });
}

/**
 * The queue holds at the first unreviewed fact: that post is blocked, and so
 * is every later post in the same run, so the schedule order is kept. Returns,
 * per assignment, the id of the fact holding it (its own or an earlier one),
 * or null.
 */
export function queueHolds(assignments, byId) {
  let holder = null;
  return assignments.map((a) => {
    if (a.skipped || !a.id) return null;
    if (!holder && reviewProblem(byId.get(a.id))) holder = a.id;
    return holder;
  });
}

/**
 * Signed-off posts left before the first unreviewed one, counting through the
 * schedule from the first unposted fact (facts already previewed count: they
 * have not posted yet).
 */
export function runway({ schedule, posted, byId }) {
  let count = 0;
  for (const p of schedule) {
    if (posted.has(p.id)) continue;
    if (reviewProblem(byId.get(p.id))) return { count, blockedBy: p.id, blockedAt: p.n };
    count += 1;
  }
  return { count, blockedBy: null, blockedAt: null };
}

/** The next `n` unposted facts in schedule order that need a review. */
export function unreviewedQueue({ schedule, posted, byId }, n = REVIEW_BATCH) {
  return schedule.filter((p) => !posted.has(p.id) && reviewProblem(byId.get(p.id))).slice(0, n);
}

/**
 * Works out which facts are already posted, from the account's own media.
 * There is no state file: the Instagram account is the record.
 *
 * Each media item is matched to at most one fact, trying the strongest
 * evidence first:
 *   1. alt-text   the media's alt_text equals the fact's alt text. Alt text
 *                 is the card text and is rarely touched by hand, so this
 *                 survives any caption edit.
 *   2. caption    the media caption still contains the fact's caption body
 *                 (normalized: case, punctuation, whitespace and URLs ignored).
 *   3. fuzzy      word overlap between the media caption and one fact's
 *                 caption body is at least FUZZY_MIN, and beats the runner-up
 *                 by FUZZY_MARGIN. This is what catches a lightly edited
 *                 caption whose alt text was also changed or removed.
 * A media item that clears none of these is "unmatched" (a manual post, or an
 * edit so heavy nothing recognisable is left). One whose fuzzy score is close
 * for two facts is "ambiguous" and is not counted as either.
 */
import { buildAltText, captionBody, normalize } from "./caption.mjs";

export const FUZZY_MIN = 0.6;
export const FUZZY_MARGIN = 0.15;

const words = (s) => new Set(normalize(s).split(" ").filter((w) => w.length > 2));
function overlap(a, b) {
  // Share of the fact's words that survive in the media caption, so an
  // added sentence does not dilute the score but a rewrite does.
  if (!b.size) return 0;
  let hit = 0;
  for (const w of b) if (a.has(w)) hit += 1;
  return hit / b.size;
}

export function matchMedia(media, facts) {
  const prepared = facts.map((f) => ({
    fact: f,
    alt: normalize(buildAltText(f)),
    body: normalize(captionBody(f)),
    bodyWords: words(captionBody(f)),
  }));
  const posted = new Map(); // fact id -> { media, method, score }
  const unmatched = [];
  const ambiguous = [];

  for (const m of media) {
    const alt = normalize(m.alt_text);
    const cap = normalize(m.caption);
    let hit = null;

    if (alt) {
      const byAlt = prepared.filter((p) => p.alt === alt);
      if (byAlt.length === 1) hit = { p: byAlt[0], method: "alt-text", score: 1 };
    }
    if (!hit && cap) {
      const byCaption = prepared.filter((p) => p.body && cap.includes(p.body));
      if (byCaption.length === 1) hit = { p: byCaption[0], method: "caption", score: 1 };
    }
    if (!hit && cap) {
      const capWords = words(m.caption);
      const scored = prepared
        .map((p) => ({ p, score: overlap(capWords, p.bodyWords) }))
        .sort((a, b) => b.score - a.score);
      const [best, next] = scored;
      if (best && best.score >= FUZZY_MIN) {
        if (!next || best.score - next.score >= FUZZY_MARGIN) {
          hit = { p: best.p, method: "fuzzy", score: best.score };
        } else {
          ambiguous.push({ media: m, candidates: [best, next].map((s) => ({ id: s.p.fact.id, score: s.score })) });
          continue;
        }
      }
    }

    if (!hit) { unmatched.push(m); continue; }
    const id = hit.p.fact.id;
    // The same fact matched twice means it was posted twice; keep the oldest.
    const prev = posted.get(id);
    if (!prev || String(m.timestamp) < String(prev.media.timestamp)) {
      posted.set(id, { media: m, method: hit.method, score: hit.score, duplicates: prev ? [prev.media, ...(prev.duplicates || [])] : [] });
    } else {
      prev.duplicates = [...(prev.duplicates || []), m];
    }
  }
  return { posted, unmatched, ambiguous };
}

/** The first scheduled fact not yet posted, or null when the schedule is done. */
export function nextScheduled(schedule, posted) {
  return schedule.find((p) => !posted.has(p.id)) ?? null;
}

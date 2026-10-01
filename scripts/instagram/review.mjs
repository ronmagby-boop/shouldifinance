/**
 * The review sign-off on a fact, shared by publish.mjs and review-helper.mjs.
 *
 * A fact's "reviewed" field is null until a person signs it off, and then
 * { date, hash }: the date of the review (YYYY-MM-DD) and a hash of exactly
 * what was reviewed. The hash covers everything a reader sees: the card text,
 * the caption as posted (so its source line and guide link too), the alt text,
 * hero, hero_context, myth and card_source. Any edit to any of them, or to the
 * caption builder, changes the hash, and the sign-off no longer applies.
 */
import crypto from "node:crypto";
import { buildAltText, buildCaption } from "./caption.mjs";

/** The fields the hash covers, in the order they are hashed. */
export const HASHED_FIELDS = ["card", "caption", "alt_text", "hero", "hero_context", "myth", "card_source"];

/** First 16 hex characters of a SHA-256: enough to catch any edit, short enough to read. */
export function contentHash(fact) {
  const seen = {
    card: fact.card ?? null,
    caption: buildCaption(fact),
    alt_text: buildAltText(fact),
    hero: fact.hero ?? null,
    hero_context: fact.hero_context ?? null,
    myth: fact.myth ?? null,
    card_source: fact.card_source ?? null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(HASHED_FIELDS.map((k) => [k, seen[k]]))).digest("hex").slice(0, 16);
}

export const today = () => new Date().toISOString().slice(0, 10);

function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Why a fact may not be posted for want of review, or null if it may.
 * Malformed values are refused rather than guessed at.
 */
export function reviewProblem(fact, now = today()) {
  const r = fact.reviewed;
  const how = `Check its card, caption and alt text against the guide and source, then run: npm run review:mark -- ${fact.id}`;
  if (r === undefined || r === null || r === "") return `${fact.id} has not been reviewed: its "reviewed" field is empty. ${how}`;
  if (typeof r !== "object" || Array.isArray(r) || !("date" in r) || !("hash" in r)) {
    return `${fact.id} has "reviewed": ${JSON.stringify(r)}, which is not of the form {"date", "hash"}. ${how}`;
  }
  if (!validDate(r.date)) return `${fact.id} has a review date of ${JSON.stringify(r.date)}, which is not a YYYY-MM-DD date. ${how}`;
  if (r.date > now) return `${fact.id} has a review date of ${r.date}, which is after today (${now}). ${how}`;
  const hash = contentHash(fact);
  if (r.hash !== hash) {
    return `${fact.id} has changed since it was reviewed on ${r.date}: its card, caption, alt text, hero, hero_context, myth or card_source no longer match what was signed off (hash ${hash}, reviewed ${JSON.stringify(r.hash)}). Review it again. ${how}`;
  }
  return null;
}

/** The sign-off for a fact as it stands now. */
export const signOff = (fact, date = today()) => ({ date, hash: contentHash(fact) });

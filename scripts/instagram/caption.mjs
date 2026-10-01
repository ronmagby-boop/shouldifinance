/**
 * The post caption and alt text for one fact, shared by the publisher and its
 * tests so the text that is posted and the text that is matched against are
 * built by one function.
 *
 * CAPTION, in this order:
 *   the fact's caption, without the guide URL it ends with
 *   "Source: " + the fact's full source citation
 *   "Full guide: link in bio"
 *   the guide URL
 * A caption that led into its URL with a sentence ending in a colon ("Read
 * how ... work:") loses that sentence, because "Full guide: link in bio" now
 * does its job. Only one fact does this today.
 *
 * ALT TEXT is the card text; for a myth-fact card it is the labelled
 * assumption followed by the labelled fact, in the order the card shows them.
 *
 * Limits from Meta's IG User Media reference: caption "Maximum 2200
 * characters, 30 hashtags, and 20 @ tags"; alt text "up to 1000 character".
 */
export const SITE = "https://shouldifinance.com";
export const CAPTION_LIMIT = 2200;
export const HASHTAG_LIMIT = 30;
export const MENTION_LIMIT = 20;
export const ALT_LIMIT = 1000;

export const guideUrl = (fact) => `${SITE}/guides/${fact.guide}`;
// IG_IMAGE_BASE exists only so tests can serve the image locally; the
// workflow never sets it, so posts always use the public site URL.
export const imageUrl = (fact) => `${process.env.IG_IMAGE_BASE || SITE}/ig/${fact.id}.jpg`;

/** The fact's own caption without its trailing guide URL or a lead-in to it. */
export function captionBody(fact) {
  const url = guideUrl(fact);
  let body = fact.caption.trim();
  if (!body.endsWith(url)) throw new Error(`${fact.id}: caption does not end with ${url}`);
  body = body.slice(0, -url.length).trim();
  if (body.endsWith(":")) {
    // Drop the lead-in sentence: everything after the last sentence end.
    const cut = Math.max(body.lastIndexOf(". "), body.lastIndexOf("? "), body.lastIndexOf("! "));
    body = cut >= 0 ? body.slice(0, cut + 1).trim() : "";
    if (!body) throw new Error(`${fact.id}: caption is only a lead-in to its link`);
  }
  return body;
}

export function buildCaption(fact) {
  if (!fact.source) throw new Error(`${fact.id}: no source`);
  return [captionBody(fact), `Source: ${fact.source}`, `Full guide: link in bio\n${guideUrl(fact)}`].join("\n\n");
}

export function buildAltText(fact) {
  if (fact.layout === "myth-fact") {
    if (!fact.myth) throw new Error(`${fact.id}: myth-fact with no myth`);
    return `Assumption: ${fact.myth} Fact: ${fact.card}`;
  }
  return fact.card;
}

/** Problems that would make Meta reject the post, as strings. */
export function captionProblems(fact) {
  const caption = buildCaption(fact);
  const alt = buildAltText(fact);
  const problems = [];
  if (caption.length > CAPTION_LIMIT) problems.push(`caption ${caption.length} chars > ${CAPTION_LIMIT}`);
  const tags = (caption.match(/(^|\s)#\w+/g) || []).length;
  const mentions = (caption.match(/(^|\s)@\w+/g) || []).length;
  if (tags > HASHTAG_LIMIT) problems.push(`${tags} hashtags > ${HASHTAG_LIMIT}`);
  if (mentions > MENTION_LIMIT) problems.push(`${mentions} @ tags > ${MENTION_LIMIT}`);
  if (alt.length > ALT_LIMIT) problems.push(`alt text ${alt.length} chars > ${ALT_LIMIT}`);
  return problems;
}

/**
 * Comparison form of a caption or alt text: lowercased, curly quotes and
 * dashes folded, punctuation dropped, whitespace collapsed. Instagram can
 * reflow whitespace, and a hand edit often only touches punctuation.
 */
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9$%'.\- ]+/g, " ")
    .replace(/(?<![0-9])[.](?![0-9])/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

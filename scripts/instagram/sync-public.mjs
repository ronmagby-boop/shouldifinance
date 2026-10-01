#!/usr/bin/env node
/**
 * Copies evergreen facts' rendered cards into public/ig/<fact-id>.jpg, so each
 * has a stable public URL: https://shouldifinance.com/ig/<id>.jpg, which is
 * what the publisher hands Meta as image_url. Run after `npm run cards`, with
 * `npm run cards:public`.
 *
 * A card is copied only when what it is rendered FROM changed, not when its
 * bytes did. Rendering is not byte-for-byte repeatable (antialiasing and JPEG
 * encoding wobble by a few levels), so comparing bytes would republish cards
 * nobody changed, and every republish changes the image a preview showed.
 *
 * What a card is rendered from is its input hash (render-cards.mjs): the
 * fact's visible fields (layout, category, card, hero, hero_context, myth,
 * card_source), its category's resolved colours, and the design (page
 * template and fitting code, size and brand constants, JPEG settings, font
 * and wordmark files). content/instagram-public-cards.json records the input
 * hash of each card in public/ig. For each evergreen fact this script
 * computes the input hash now and:
 *
 *   same as recorded, file present   leaves it alone
 *   different, or not yet recorded   copies the rendered card, which must
 *                                    have been rendered from exactly these
 *                                    inputs (.instagram-cards/input-hashes.json);
 *                                    if not, nothing is written and it fails
 *
 * Cards whose fact is no longer evergreen are removed, with their record.
 *
 *   --adopt   for a card whose recorded hash differs only because the design
 *             hash moved without the look changing (a refactor), keep the
 *             published file if the fresh render matches it to within
 *             rendering noise, and just record the new hash. A card that
 *             differs visibly is copied as usual.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { RENDERED_HASHES, categoryColours, designHash, inputHash } from "./render-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FROM = path.join(ROOT, ".instagram-cards");
const TO = path.join(ROOT, "public", "ig");
const RECORD = path.join(ROOT, "content", "instagram-public-cards.json");
/** Rendering noise: no channel of any pixel further apart than this (out of 255). */
const NOISE = 24;

const adopt = process.argv.includes("--adopt");
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8")).facts.filter((f) => !f.shelfLife);
const record = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, "utf8")).cards : {};
const rendered = fs.existsSync(RENDERED_HASHES) ? JSON.parse(fs.readFileSync(RENDERED_HASHES, "utf8")) : {};
const colours = categoryColours();
const design = designHash();

async function sameLook(a, b) {
  const [x, y] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()]);
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > NOISE) return false;
  return true;
}

async function main() {
  const plan = [];
  const stale = [];
  for (const f of facts) {
    const want = inputHash(f, colours, design);
    const dst = path.join(TO, `${f.id}.jpg`);
    if (record[f.id] === want && fs.existsSync(dst)) {
      plan.push({ f, want, action: "unchanged" });
      continue;
    }
    const src = path.join(FROM, `${f.id}.jpg`);
    if (!fs.existsSync(src) || rendered[f.id] !== want) {
      stale.push(`${f.id}: ${fs.existsSync(src) ? "the rendered card is from other inputs" : "no rendered card"}`);
      continue;
    }
    plan.push({ f, want, src, dst, action: adopt && fs.existsSync(dst) && (await sameLook(src, dst)) ? "adopted" : "copied" });
  }
  if (stale.length) {
    console.error(`FAILED: ${stale.length} card(s) changed but have no matching render in .instagram-cards/. Run npm run cards first. Nothing was written.\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }

  fs.mkdirSync(TO, { recursive: true });
  const keep = new Set(facts.map((f) => `${f.id}.jpg`));
  const removed = [];
  for (const file of fs.readdirSync(TO)) {
    if (file.endsWith(".jpg") && !keep.has(file)) {
      fs.rmSync(path.join(TO, file));
      removed.push(file.replace(/\.jpg$/, ""));
    }
  }
  const next = {};
  for (const p of plan) {
    if (p.action === "copied") fs.copyFileSync(p.src, p.dst);
    next[p.f.id] = p.want;
  }
  fs.writeFileSync(
    RECORD,
    JSON.stringify(
      {
        _about: "The input hash each card in public/ig was rendered from (scripts/instagram/render-cards.mjs inputHash). Written by npm run cards:public; a card is republished only when this changes.",
        cards: Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]])),
      },
      null,
      2,
    ) + "\n",
  );
  const count = (a) => plan.filter((p) => p.action === a);
  console.log(`public/ig: ${facts.length} cards (${count("copied").length} copied, ${count("adopted").length} adopted, ${count("unchanged").length} unchanged, ${removed.length} removed)`);
  for (const p of count("copied")) console.log(`  copied   ${p.f.id}`);
  for (const id of removed) console.log(`  removed  ${id}`);
}

main().catch((e) => {
  console.error(`FAILED: ${e.message}`);
  process.exit(1);
});

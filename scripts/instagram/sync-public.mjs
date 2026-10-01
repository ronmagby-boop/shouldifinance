#!/usr/bin/env node
/**
 * Copies every evergreen fact's rendered card into public/ig/<fact-id>.jpg,
 * so each has a stable public URL: https://shouldifinance.com/ig/<id>.jpg,
 * which is what the publisher hands Meta as image_url. Run after
 * `npm run cards`, with `npm run cards:public`.
 *
 * Removes any public/ig/*.jpg whose fact is no longer evergreen, and fails
 * if an evergreen fact has no rendered card, rather than publishing a set
 * with gaps. Only the card JPEGs are copied, never the contact sheets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FROM = path.join(ROOT, ".instagram-cards");
const TO = path.join(ROOT, "public", "ig");

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "instagram-facts.json"), "utf8")).facts.filter((f) => !f.shelfLife);
const missing = facts.filter((f) => !fs.existsSync(path.join(FROM, `${f.id}.jpg`))).map((f) => f.id);
if (missing.length) {
  console.error(`FAILED: ${missing.length} evergreen fact(s) have no rendered card in .instagram-cards/. Run npm run cards first.\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

fs.mkdirSync(TO, { recursive: true });
const keep = new Set(facts.map((f) => `${f.id}.jpg`));
let removed = 0;
for (const file of fs.readdirSync(TO)) {
  if (file.endsWith(".jpg") && !keep.has(file)) { fs.rmSync(path.join(TO, file)); removed += 1; }
}
let copied = 0, unchanged = 0, bytes = 0;
for (const f of facts) {
  const src = path.join(FROM, `${f.id}.jpg`);
  const dst = path.join(TO, `${f.id}.jpg`);
  const data = fs.readFileSync(src);
  bytes += data.length;
  if (fs.existsSync(dst) && fs.readFileSync(dst).equals(data)) { unchanged += 1; continue; }
  fs.writeFileSync(dst, data);
  copied += 1;
}
console.log(`public/ig: ${facts.length} cards (${copied} written, ${unchanged} unchanged, ${removed} removed), ${(bytes / 1024 / 1024).toFixed(1)} MB`);

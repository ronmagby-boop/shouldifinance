#!/usr/bin/env node
/**
 * Makes sure the site's build-time rate data exists, without touching git.
 *
 * scripts/fetch-pmms.mjs and scripts/fetch-fred.mjs write what they fetch to
 * app/lib/generated/, which is gitignored, so a local build never leaves a
 * modified tracked file behind. lib/pmms.ts and lib/rates.ts import from
 * there. The committed app/lib/*.fallback.json files are the seed: copied in
 * whenever a generated file is missing (a fresh clone, or a fetch that failed
 * or had no key on a clean build machine), and never overwrite a fetched one.
 * The staleness gates in lib/pmms.ts and lib/rates.ts hide a fallback figure
 * once it is old, exactly as they hid an old committed figure before.
 *
 * Runs on `npm install` (postinstall), so type-checking, lint, tests and
 * `next dev` work on a fresh clone, and at the start of each fetch script, so
 * every build has the files whether or not the fetch succeeds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIB = path.join(ROOT, "app", "lib");
export const GENERATED_DIR = path.join(LIB, "generated");

/** The generated file for `name` ("pmms" or "fred"), and the committed fallback that seeds it. */
export const ratesPaths = (name) => ({
  out: path.join(GENERATED_DIR, `${name}.json`),
  fallback: path.join(LIB, `${name}.fallback.json`),
});

/** Copies the fallback into place if the generated file is missing. Returns true if it did. */
export function seedRates(name) {
  const { out, fallback } = ratesPaths(name);
  if (fs.existsSync(out)) return false;
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.copyFileSync(fallback, out);
  console.log(`[rates] seeded app/lib/generated/${name}.json from app/lib/${name}.fallback.json`);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const name of ["pmms", "fred"]) seedRates(name);
}

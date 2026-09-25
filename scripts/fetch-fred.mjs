/**
 * Pulls the FRED half of the rates page at BUILD time and writes
 * app/lib/fred.json, which the site imports as a static constant.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DO NOT ALTER THE RATES.                                              │
 * │                                                                      │
 * │ Every figure here is published by a federal agency and is shown      │
 * │ exactly as it arrives. Do not round it, average it across periods,   │
 * │ interpolate a missing month, or reformat it to a fixed number of     │
 * │ decimals — 6.9 and 6.90 are different claims about precision.        │
 * │                                                                      │
 * │ Each series also carries its own observation date, and the page      │
 * │ shows it. They update on completely different schedules — Treasuries │
 * │ daily, the G.19 consumer-credit rates quarterly — so a single "as    │
 * │ of" for the page would be wrong for six of the seven cards.          │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * WHY BUILD TIME: the same reason as the mortgage rate. A visitor's browser
 * never contacts FRED, so the rates page adds no third party to the page and
 * no request that could carry a reader's identity to a data provider.
 *
 * NO KEY, NO PROBLEM. Without FRED_API_KEY this writes nothing and exits 0,
 * leaving whatever was committed in place. A build must never fail because a
 * rate provider is down — the staleness gate in lib/rates.ts hides a card
 * whose data has gone old, which is the correct behaviour for a missing
 * figure and is already how the mortgage banner works.
 *
 * SETUP: create a free key at https://fredaccount.stlouisfed.org/apikeys and
 * add it to Vercel as FRED_API_KEY. It is read here, at build time, on the
 * build machine — it must NOT be NEXT_PUBLIC_, which would inline it into the
 * JavaScript every visitor downloads.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app", "lib", "fred.json");
const KEY = process.env.FRED_API_KEY;

/**
 * The series, and nothing else.
 *
 * Deliberately a closed list. Anything added here appears on the rates page,
 * so a series whose licence forbids redisplay must never be added — see the
 * note on SP500 in lib/rates.ts.
 */
const SERIES = [
  { id: "DGS10", key: "treasury10" },
  { id: "DGS30", key: "treasury30" },
  { id: "TERMCBCCALLNS", key: "creditCard" },
  { id: "TERMCBPER24NS", key: "personalLoan" },
  { id: "TERMCBAUTO48NS", key: "autoNew48" },
  { id: "NDR12MCD", key: "cd12" },
];

async function latest(id) {
  // Ask for the tail of the series, newest first, and take the first
  // observation that carries a real value. FRED writes "." for a day with no
  // publication — a bank holiday on a daily Treasury series, most often — and
  // those must be skipped rather than parsed as zero.
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${encodeURIComponent(id)}&api_key=${encodeURIComponent(KEY)}` +
    `&file_type=json&sort_order=desc&limit=12`;

  const res = await fetch(url, {
    headers: { "user-agent": "shouldifinance.com build (contact shouldifinance@gmail.com)" },
  });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);

  const body = await res.json();
  const obs = Array.isArray(body?.observations) ? body.observations : [];
  const hit = obs.find((o) => o && o.value !== "." && Number.isFinite(Number(o.value)));
  if (!hit) throw new Error(`${id}: no usable observation in the last ${obs.length}`);

  const value = Number(hit.value);
  // A rate outside this band means the series changed units or we asked for
  // the wrong thing. Better to drop the series than to publish nonsense.
  if (!(value > 0 && value < 100)) throw new Error(`${id}: ${value} is out of range`);

  return { value, date: hit.date };
}

async function main() {
  if (!KEY) {
    console.warn("[fred] FRED_API_KEY is not set — leaving app/lib/fred.json as committed.");
    return 0;
  }

  const out = {};
  let failed = 0;
  for (const s of SERIES) {
    try {
      out[s.key] = { ...(await latest(s.id)), series: s.id };
      console.log(`[fred] ${s.id} ${out[s.key].value} (${out[s.key].date})`);
    } catch (err) {
      // One bad series must not cost the other five. The card for it simply
      // does not render.
      failed++;
      console.warn(`[fred] ${err.message} — skipping this series.`);
    }
  }

  if (!Object.keys(out).length) {
    console.warn("[fred] nothing usable fetched. Leaving existing data in place.");
    return 0;
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify({ ok: true, fetchedAt: new Date().toISOString(), series: out }, null, 2) + "\n",
  );
  console.log(`[fred] wrote ${Object.keys(out).length} series (${failed} skipped) → app/lib/fred.json`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // Never fail the build over a rate feed.
    console.warn(`[fred] unexpected: ${err.message}. Leaving existing data in place.`);
    process.exit(0);
  });

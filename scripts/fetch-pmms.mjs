#!/usr/bin/env node
/**
 * Fetches Freddie Mac's Primary Mortgage Market Survey at BUILD TIME and
 * writes app/lib/pmms.json, which the site imports as a static constant.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DO NOT ALTER THE RATE.                                               │
 * │                                                                      │
 * │ Freddie Mac's terms permit use of this data with attribution and say │
 * │ "Alteration of this document or its content is strictly prohibited." │
 * │ The 30-year figure is stored and displayed exactly as published — do │
 * │ not round it, average it, convert it, recompute it from the 15-year, │
 * │ or "clean it up" for display. If it reads 6.95, it shows 6.95.       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Why build time: a weekly figure does not need fetching on every page view,
 * and baking it in means one less third party in the page. The visitor receives
 * a number already in the HTML. This is not what upholds the privacy policy —
 * that rests on the narrower and unconditional claim that figures typed into a
 * calculator are never transmitted, which nothing here touches.
 *
 * Why Freddie Mac directly rather than FRED: FRED is a redistributor. Going to
 * the owner means one set of terms instead of two, no API key to keep secret,
 * and no obligation to display the Federal Reserve's non-endorsement notice.
 *
 * Zero dependencies. An .xlsx is a zip of XML, and node:zlib can inflate it.
 *
 * On failure this writes NOTHING and exits 0. A failed fetch must never fail a
 * build, and must never overwrite good data with nothing — yesterday's figure
 * plus the staleness gate in app/lib/pmms.ts is a better outcome than a blank.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app", "lib", "pmms.json");
const SOURCE = "https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx";

/** Pulls one file out of a zip buffer via the central directory. */
function unzip(buf, wanted) {
  // End of central directory: signature PK\x05\x06, scanned from the back.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("not a zip: no end-of-central-directory record");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory entry");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    if (name === wanted) {
      // Local header: name and extra lengths differ from the central copy.
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      return method === 0 ? raw : zlib.inflateRawSync(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in archive`);
}

/** Excel serial (1900 date system) to an ISO date, in UTC. */
function serialToISO(serial) {
  const ms = (serial - 25569) * 86400000; // 25569 = days from 1899-12-30 to epoch
  return new Date(Math.round(ms)).toISOString().slice(0, 10);
}

async function main() {
  let buf;
  try {
    const res = await fetch(SOURCE, {
      headers: { "user-agent": "shouldifinance.com build (contact shouldifinance@gmail.com)" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.warn(`[pmms] fetch failed (${err.message}). Leaving existing data in place.`);
    return 0;
  }

  let rows;
  try {
    const xml = unzip(buf, "xl/worksheets/sheet1.xml").toString("utf8");
    rows = [];
    // Column A is the week-ending date as an Excel serial, column B the
    // 30-year fixed average. Rows above the data carry headings and parse
    // away harmlessly; the guards below are what separate data from furniture.
    for (const m of xml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)) {
      const cells = {};
      for (const c of m[1].matchAll(/<c r="([A-Z]+)\d+"[^>]*>(?:<v>([^<]*)<\/v>)?/g)) {
        if (c[2] !== undefined) cells[c[1]] = c[2];
      }
      const serial = Number(cells.A);
      const rate = Number(cells.B);
      if (!Number.isFinite(serial) || !Number.isFinite(rate)) continue;
      if (serial < 20000 || rate <= 0 || rate >= 30) continue;
      /* Column D is the 15-year, confirmed from the sheet's own headings in
         rows 5-7: A Week, B 30 yr FRM, C 30 yr fees & points, D 15 yr FRM,
         E 15 yr fees & points. It is absent on the oldest rows — the 15-year
         series starts in 1991, the 30-year in 1971 — so it is optional and
         the 30-year alone still makes a usable row. */
      const rate15raw = Number(cells.D);
      const rate15 = Number.isFinite(rate15raw) && rate15raw > 0 && rate15raw < 30 ? rate15raw : null;
      rows.push({ week: serialToISO(serial), rate, rate15 });
    }
  } catch (err) {
    console.warn(`[pmms] parse failed (${err.message}). Leaving existing data in place.`);
    return 0;
  }

  if (rows.length < 100) {
    console.warn(`[pmms] only ${rows.length} rows parsed — sheet layout may have changed. Not writing.`);
    return 0;
  }

  rows.sort((a, b) => (a.week < b.week ? -1 : 1));
  const latest = rows[rows.length - 1];

  const payload = {
    ok: true,
    /* Exactly as published. See the alteration note at the top of this file. */
    rate30: latest.rate,
    /* Null rather than absent when the sheet has no 15-year for that week, so
       the consumer can tell "not published" from "not parsed". */
    rate15: latest.rate15,
    week: latest.week,
    fetchedAt: new Date().toISOString(),
    source: SOURCE,
    attribution: "Freddie Mac Primary Mortgage Market Survey",
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `[pmms] 30yr ${payload.rate30}%, 15yr ${payload.rate15 ?? "n/a"}% for week ending ${payload.week} → app/lib/pmms.json`,
  );
  return 0;
}

process.exit(await main());

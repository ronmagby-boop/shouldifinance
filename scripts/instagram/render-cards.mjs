#!/usr/bin/env node
/**
 * Renders Instagram cards from content/instagram-facts.json, run with
 * `npm run cards`.
 *
 *   npm run cards                      every evergreen fact
 *   npm run cards -- --all             time-sensitive facts too
 *   npm run cards -- --id <fact-id>    one fact, whatever its flag
 *   npm run cards -- --out <dir>       somewhere other than .instagram-cards/
 *   npm run cards -- --facts <file>    another facts file, e.g. to test overflow
 *
 * WHAT INSTAGRAM ACCEPTS, from Meta's Content Publishing docs (checked
 * 2026-10-01): "JPEG is the only image format supported. Extended JPEG formats
 * such as MPO and JPS are not supported." The IG User Media reference adds
 * "File size: 8 MB maximum", "Aspect ratio: Must be within a 4:5 to 1.91:1
 * range", "Minimum width: 320", "Maximum width: 1440", and "Color Space: sRGB".
 * So the output is a 1080 x 1080 baseline JPEG with an sRGB profile, and every
 * file is read back afterwards to prove it.
 *
 * TIME-SENSITIVE FACTS ARE LEFT OUT BY DEFAULT. A fact with a shelfLife states
 * a figure that can change, and the card is the one place a reader sees it
 * with no caption and no date. They render only when asked for.
 *
 * NOTHING IS SHORTENED. The card text is fitted by stepping the font size down
 * to a floor; a fact that still does not fit at the floor is rendered as it
 * is, recorded as overflowing in the manifest, and listed at the end.
 *
 * THE SOURCE LINE IS card_source, written for the card: one line, labelled by
 * the kind of support it is. It is set at a fixed size and never wrapped or
 * shrunk — a line that does not fit is reported, because the fix is a shorter
 * card_source, not smaller type. The full citation stays in the fact's source
 * field. A fact with no card_source stops the run rather than falling back to
 * the long citation, which was written for the caption and would wrap.
 *
 * BRAND VALUES ARE READ, NOT RETYPED. The category accent comes from
 * CATEGORY_SECTIONS in app/lib/calculators.ts and the colour each class names
 * from Tailwind's own theme.css, so a card always matches the site's category
 * colour. The background, heading and rule colours are the ones the share card
 * (public/og-image.png) uses, and the wordmark is public/logo-wide.png itself.
 *
 * Layout is done in Chrome (playwright-core) because overflow is a measured
 * fact, not an estimate; encoding is done by sharp so the JPEG flavour is
 * controlled rather than whatever a screenshot produces. Chrome is found from
 * CHROME_PATH, or the installed Chrome channel.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FONTS = path.join(ROOT, "scripts", "instagram", "fonts");

const SIZE = 1080;
/** Card text steps down from MAX to MIN; MIN is about 20px on a 390px-wide phone. */
const CARD_FONT_MAX = 88;
const CARD_FONT_MIN = 56;
/** Fixed. At least 32px, so it reads at phone width (about 12px on a 390px screen). */
const SOURCE_FONT = 32;
const JPEG_QUALITY = 90;

/** From public/og-image.png, sampled rather than guessed. */
const BRAND = {
  background: "#cceee7",
  heading: "#0f2e26",
  accent: "#15803d",
  body: "#375950",
  panel: "#ffffff",
  /** Darker than body, for the source line. Contrast is computed and printed. */
  source: "#1f3d35",
};

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const args = {
    all: false, id: null,
    out: path.join(ROOT, ".instagram-cards"),
    facts: path.join(ROOT, "content", "instagram-facts.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") args.all = true;
    else if (a === "--id") args.id = argv[++i];
    else if (a === "--out") args.out = path.resolve(argv[++i]);
    else if (a === "--facts") args.facts = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

// ------------------------------------------------------------- brand inputs

const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** Category -> { text, tint } as CSS colours, from the registry and Tailwind. */
function categoryColours() {
  const src = read(path.join(ROOT, "app", "lib", "calculators.ts"));
  const theme = read(path.join(ROOT, "node_modules", "tailwindcss", "theme.css"));
  const colour = (cls) => {
    const name = cls.replace(/^(text|bg)-/, "");
    const m = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(theme);
    if (!m) throw new Error(`Tailwind theme has no --color-${name}`);
    return m[1].trim();
  };
  const out = {};
  for (const m of src.matchAll(/category:\s*"(\w+)"[^\n]*?text:\s*"([^"]+)",\s*tint:\s*"([^"]+)"/g)) {
    out[m[1]] = { text: colour(m[2]), tint: colour(m[3]) };
  }
  if (Object.keys(out).length !== 4) {
    throw new Error("Could not read four categories from CATEGORY_SECTIONS — registry format changed?");
  }
  return out;
}

const dataUrl = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;

// ----------------------------------------------------------------- template

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(fonts, logo) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Geist; font-weight: 500; src: url(${fonts.medium}) format("woff2"); }
@font-face { font-family: Geist; font-weight: 700; src: url(${fonts.bold}) format("woff2"); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${SIZE}px; height: ${SIZE}px; background: ${BRAND.background}; }
.card {
  width: ${SIZE}px; height: ${SIZE}px; padding: 84px 88px 76px;
  display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto;
  font-family: Geist, sans-serif; color: ${BRAND.heading};
}
.pill {
  justify-self: start; font-weight: 700; font-size: 26px; letter-spacing: 0.14em;
  text-transform: uppercase; padding: 14px 26px; border-radius: 999px;
  /* Reserved, so a card that fills its box still clears the pill. */
  margin-bottom: 32px;
}
/* The fit box. The text inside it is measured against this, never clipped.
   min-width: 0 because a grid item otherwise widens to its longest word. */
.fit { min-height: 0; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.text {
  /* min-width: 0, or a flex item grows to its longest word and a word too
     wide for the card never registers as overflow. */
  min-width: 0;
  font-weight: 700; line-height: 1.12; letter-spacing: -0.015em;
  overflow-wrap: normal; word-break: normal; hyphens: none;
}
.rule { width: 128px; height: 8px; border-radius: 4px; background: ${BRAND.accent}; margin: 40px 0 28px; }
/* min-width: 0, or an over-long source line widens the grid column and the
   card text above it is wrongly measured as overflowing. */
.foot { display: flex; flex-direction: column; gap: 30px; min-width: 0; }
/* One line, fixed size: overflow is reported, never wrapped or shrunk. */
.source {
  font-weight: 500; font-size: ${SOURCE_FONT}px; line-height: 1.25;
  color: ${BRAND.source}; white-space: nowrap; min-width: 0;
}
.mark {
  align-self: flex-start; background: ${BRAND.panel}; border-radius: 22px;
  padding: 18px 28px; display: flex;
}
.mark img { height: 58px; width: auto; display: block; }
</style></head>
<body><div class="card">
  <span class="pill" id="pill"></span>
  <div class="fit" id="fit"><p class="text" id="text"></p></div>
  <div class="rule"></div>
  <div class="foot">
    <p class="source" id="source"></p>
    <div class="mark"><img src="${logo}" alt="shouldifinance.com"></div>
  </div>
</div></body></html>`;
}

/**
 * Runs in the page. Fills one fact in and fits it, source first because the
 * card text gets whatever height the source leaves.
 */
function fitInPage({ fact, colours, sizes }) {
  const $ = (id) => document.getElementById(id);
  const pill = $("pill"), fit = $("fit"), text = $("text"), source = $("source");
  // Width is checked against the card's content box, not against an element
  // that could have stretched to fit the text it is meant to contain.
  const card = document.querySelector(".card");
  const cs = getComputedStyle(card);
  const contentWidth = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  pill.textContent = fact.category;
  pill.style.color = colours.text;
  pill.style.background = colours.tint;
  text.textContent = fact.card;
  source.textContent = fact.card_source;
  // The painted width of the text itself. The paragraph's own scrollWidth is
  // its box width whenever the text is shorter, so it can only ever say "fits".
  const range = document.createRange();
  range.selectNodeContents(source);
  const sourceWidth = Math.ceil(range.getBoundingClientRect().width);
  const sourceOverflow = sourceWidth > contentWidth;

  let cardSize = sizes.cardMax;
  // Overflow both ways: taller than the box, or a single word wider than it.
  const cardFits = () => text.scrollHeight <= fit.clientHeight && text.scrollWidth <= contentWidth;
  for (; cardSize >= sizes.cardMin; cardSize -= 2) {
    text.style.fontSize = `${cardSize}px`;
    if (cardFits()) break;
  }
  const cardOverflow = !cardFits();
  if (cardOverflow) cardSize = sizes.cardMin;

  const lines = Math.round(text.scrollHeight / parseFloat(getComputedStyle(text).lineHeight));
  const pageOverflow =
    document.documentElement.scrollHeight > window.innerHeight ||
    document.documentElement.scrollWidth > window.innerWidth;

  return {
    cardSize, cardOverflow, lines, sourceWidth, contentWidth, sourceOverflow, pageOverflow,
    boxHeight: fit.clientHeight, textHeight: text.scrollHeight,
  };
}

// ------------------------------------------------------------------- render

async function launch() {
  const executablePath = process.env.CHROME_PATH;
  return executablePath
    ? chromium.launch({ executablePath })
    : chromium.launch({ channel: "chrome" });
}

async function verify(file) {
  const meta = await sharp(file).metadata();
  const bytes = fs.statSync(file).size;
  // Baseline JPEG starts its frame with SOF0 (FFC0); progressive uses FFC2.
  const buf = fs.readFileSync(file);
  let sof = null;
  for (let i = 2; i < buf.length - 1; ) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) { sof = marker; break; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return {
    bytes, width: meta.width, height: meta.height, format: meta.format,
    space: meta.space, icc: Boolean(meta.icc), progressive: meta.isProgressive,
    baseline: sof === 0xc0,
  };
}

async function contactSheet(rows, outDir) {
  const COLS = 12, THUMB = 200, LABEL = 34, GAP = 12, PAD = 24;
  const rowsCount = Math.ceil(rows.length / COLS);
  const width = PAD * 2 + COLS * THUMB + (COLS - 1) * GAP;
  const height = PAD * 2 + rowsCount * (THUMB + LABEL) + (rowsCount - 1) * GAP;
  const layers = [];
  for (const [i, r] of rows.entries()) {
    const x = PAD + (i % COLS) * (THUMB + GAP);
    const y = PAD + Math.floor(i / COLS) * (THUMB + LABEL + GAP);
    layers.push({ input: await sharp(r.path).resize(THUMB, THUMB).toBuffer(), left: x, top: y });
    const flag = r.cardOverflow || r.sourceOverflow ? "#dc2626" : "#375950";
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB}" height="${LABEL}">
      <text x="2" y="15" font-family="Arial" font-size="12" fill="${flag}">${escape(String(i + 1).padStart(3, "0"))} ${escape(r.id.slice(0, 26))}</text>
      <text x="2" y="30" font-family="Arial" font-size="11" fill="#6b7280">${r.cardSize}px · ${r.lines} lines${r.cardOverflow ? " · OVERFLOW" : ""}${r.sourceOverflow ? " · SOURCE TOO LONG" : ""}</text>
    </svg>`;
    layers.push({ input: Buffer.from(label), left: x, top: y + THUMB });
  }
  const file = path.join(outDir, "contact-sheet.jpg");
  await sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .jpeg({ quality: 85, progressive: false })
    .toFile(file);
  return { file, width, height };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const facts = JSON.parse(read(args.facts)).facts;
  const chosen = args.id
    ? facts.filter((f) => f.id === args.id)
    : facts.filter((f) => args.all || !f.shelfLife);
  if (!chosen.length) throw new Error(args.id ? `No fact with id ${args.id}` : "No facts selected");

  const colours = categoryColours();
  const fonts = {
    medium: dataUrl(path.join(FONTS, "Geist-Medium.woff2"), "font/woff2"),
    bold: dataUrl(path.join(FONTS, "Geist-Bold.woff2"), "font/woff2"),
  };
  const logo = dataUrl(path.join(ROOT, "public", "logo-wide.png"), "image/png");
  fs.mkdirSync(args.out, { recursive: true });

  const browser = await launch();
  const tab = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
  const rows = [];
  try {
    for (const fact of chosen) {
      if (!colours[fact.category]) throw new Error(`${fact.id}: unknown category ${fact.category}`);
      if (!fact.card_source) throw new Error(`${fact.id}: no card_source — write one before rendering this fact`);
      await tab.setContent(page(fonts, logo), { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);
      const fitted = await tab.evaluate(fitInPage, {
        fact, colours: colours[fact.category],
        sizes: {
          cardMax: CARD_FONT_MAX, cardMin: CARD_FONT_MIN,
        },
      });
      const png = await tab.screenshot({ type: "png", clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
      const file = path.join(args.out, `${fact.id}.jpg`);
      await sharp(png)
        .toColorspace("srgb")
        .jpeg({ quality: JPEG_QUALITY, progressive: false, chromaSubsampling: "4:4:4", mozjpeg: false })
        .withIccProfile("srgb")
        .toFile(file);
      rows.push({
        id: fact.id, category: fact.category, card_source: fact.card_source, path: file,
        words: fact.card.split(/\s+/).filter(Boolean).length,
        ...fitted, ...(await verify(file)),
      });
    }
  } finally {
    await browser.close();
  }

  const failures = rows.filter(
    (r) => r.format !== "jpeg" || !r.baseline || r.progressive || r.width !== SIZE || r.height !== SIZE ||
      r.space !== "srgb" || r.bytes > 8 * 1024 * 1024,
  );
  const sheet = rows.length > 1 ? await contactSheet(rows, args.out) : null;
  fs.writeFileSync(
    path.join(args.out, "manifest.json"),
    JSON.stringify({ rendered: new Date().toISOString(), size: SIZE, cards: rows.map(({ path: p, ...r }) => ({ ...r, file: path.basename(p) })) }, null, 2) + "\n",
  );

  const bytes = rows.map((r) => r.bytes).sort((a, b) => a - b);
  const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
  console.log(`Rendered ${rows.length} card${rows.length === 1 ? "" : "s"} to ${path.relative(ROOT, args.out) || "."}`);
  console.log(`  dimensions: ${[...new Set(rows.map((r) => `${r.width}x${r.height}`))].join(", ")}`);
  console.log(`  format: ${[...new Set(rows.map((r) => `${r.format}${r.baseline ? " baseline" : ""}${r.progressive ? " progressive" : ""}, ${r.space}${r.icc ? " + ICC" : ""}`))].join("; ")}`);
  console.log(`  file size: min ${kb(bytes[0])}, median ${kb(bytes[Math.floor(bytes.length / 2)])}, max ${kb(bytes.at(-1))}`);
  const sizes = rows.map((r) => r.cardSize);
  console.log(`  card text size: ${Math.min(...sizes)}px to ${Math.max(...sizes)}px`);
  if (sheet) console.log(`  contact sheet: ${path.relative(ROOT, sheet.file)} (${sheet.width}x${sheet.height}, ${kb(fs.statSync(sheet.file).size)})`);

  console.log(`  source line: ${SOURCE_FONT}px ${BRAND.source} on ${BRAND.background}, contrast ${contrast(BRAND.source, BRAND.background).toFixed(2)}:1 (WCAG AA needs 4.5:1)`);
  const widest = rows.reduce((a, r) => (r.sourceWidth > a.sourceWidth ? r : a));
  console.log(`  widest source line: ${widest.sourceWidth}px of ${widest.contentWidth}px (${widest.id})`);

  // A page overflow counts against the card text only when an over-long
  // source line does not already explain it; that one is reported below.
  const cardOver = rows.filter((r) => r.cardOverflow || (r.pageOverflow && !r.sourceOverflow));
  console.log(`\nCard text overflowing at the ${CARD_FONT_MIN}px floor: ${cardOver.length}`);
  for (const r of cardOver) console.log(`  ${r.id} — ${r.words} words, ${r.lines} lines at ${r.cardSize}px`);
  const sourceOver = rows.filter((r) => r.sourceOverflow);
  console.log(`card_source lines too long for one line at ${SOURCE_FONT}px: ${sourceOver.length}`);
  for (const r of sourceOver) console.log(`  ${r.id} — ${r.sourceWidth}px of ${r.contentWidth}px — "${r.card_source}"`);
  if (failures.length) {
    console.error(`\n${failures.length} file(s) fail Instagram's requirements:`);
    for (const r of failures) console.error(`  ${r.id}: ${JSON.stringify(r)}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

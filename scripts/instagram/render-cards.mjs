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
 * So the output is a 1080 x 1350 (4:5) baseline JPEG with an sRGB profile, and
 * every file is read back afterwards to prove it. The profile grid crops each
 * post to 3:4, so content is kept inside that safe area; see WIDTH and HEIGHT.
 *
 * LAYOUTS come from each fact's layout field: statement, big-number (hero,
 * hero_context, then the card text) and myth-fact (the labelled assumption,
 * smaller, then the fact). Every fact is validated before anything renders.
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

/**
 * 4:5 portrait, the tallest ratio the Content Publishing API accepts ("4:5 to
 * 1.91:1"). The profile grid shows every post as a 3:4 tile, which for a 4:5
 * post keeps the full height and the middle SAFE_WIDTH. All content stays
 * inside that safe area with at least SAFE_MARGIN to spare, measured on the
 * rendered pixels and reported on every run.
 */
const WIDTH = 1080;
const HEIGHT = 1350;
const SAFE_WIDTH = (HEIGHT * 3) / 4; // 1012.5
const SAFE_LEFT = (WIDTH - SAFE_WIDTH) / 2; // 33.75
const SAFE_MARGIN = 60;
const PAD = { top: 96, side: 104, bottom: 90 };
/** Card text steps down from MAX to MIN; MIN is about 20px on a 390px-wide phone. */
const CARD_FONT_MAX = 88;
const CARD_FONT_MIN = 56;
/** big-number: the hero shrinks only to fit the width; the card text below it is fitted. */
const HERO_FONT_MAX = 220;
const HERO_FONT_MIN = 120;
const HERO_CONTEXT_FONT = 40;
const BIG_TEXT_FONT_MAX = 64;
const BIG_TEXT_FONT_MIN = 44;
/** myth-fact: the myth line is fixed and must stay below the fact's floor. */
const MYTH_FONT = 40;
const LABEL_FONT = 24;
if (MYTH_FONT >= CARD_FONT_MIN) throw new Error("MYTH_FONT must be smaller than CARD_FONT_MIN so the fact dominates");
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
  /** Category pill background on every tint; the text keeps the category colour. */
  pill: "#ffffff",
};

/**
 * Card background shade within each category's own Tailwind family (green for
 * Home, amber for Debt, blue for Money, teal for Auto, read from
 * CATEGORY_SECTIONS). 50 is the category pill's background and would hide it;
 * 200 is loud (amber-200 is a strong yellow). Contrast is printed per tint.
 */
const CARD_TINT_SHADE = 100;
/** Minimum contrast for the category word on the white pill. */
const PILL_TEXT_CONTRAST = 4.5;

/** oklch(L% C h) -> #rrggbb, using the CSS Color 4 matrices, clipped to sRGB. */
function oklchToHex(css) {
  const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(css);
  if (!m) throw new Error(`Not an oklch() colour: ${css}`);
  const [L, C, h] = [m[1] / 100, +m[2], +m[3]];
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const enc = (v) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  };
  return "#" + rgb.map(enc).map((x) => x.toString(16).padStart(2, "0")).join("");
}

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

/**
 * Category -> { text, tint, card } from the registry and Tailwind. text and
 * tint are the pill's colours as the site defines them; card is the card
 * background, the CARD_TINT_SHADE of the same colour family, as a hex so its
 * contrast can be measured.
 */
function categoryColours() {
  const src = read(path.join(ROOT, "app", "lib", "calculators.ts"));
  const theme = read(path.join(ROOT, "node_modules", "tailwindcss", "theme.css"));
  const colour = (name) => {
    const m = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(theme);
    if (!m) throw new Error(`Tailwind theme has no --color-${name}`);
    return m[1].trim();
  };
  const out = {};
  for (const m of src.matchAll(/category:\s*"(\w+)"[^\n]*?text:\s*"([^"]+)",\s*tint:\s*"([^"]+)"/g)) {
    const text = m[2].replace(/^text-/, "");
    const family = text.replace(/-\d+$/, "");
    // Pill text on the white pill: the site's category shade, or the first
    // darker shade of the same family that reaches PILL_TEXT_CONTRAST.
    let shade = Number(text.match(/-(\d+)$/)[1]);
    let pillText = oklchToHex(colour(`${family}-${shade}`));
    while (contrast(pillText, BRAND.pill) < PILL_TEXT_CONTRAST) {
      shade += 100;
      if (shade > 950) throw new Error(`No ${family} shade reaches ${PILL_TEXT_CONTRAST}:1 on ${BRAND.pill}`);
      pillText = oklchToHex(colour(`${family}-${shade}`));
    }
    out[m[1]] = {
      text: colour(text),
      tint: colour(m[3].replace(/^bg-/, "")),
      card: oklchToHex(colour(`${family}-${CARD_TINT_SHADE}`)),
      cardName: `${family}-${CARD_TINT_SHADE}`,
      pillText,
      pillTextName: `${family}-${shade}`,
    };
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
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; background: ${BRAND.background}; }
.card {
  width: ${WIDTH}px; height: ${HEIGHT}px; padding: ${PAD.top}px ${PAD.side}px ${PAD.bottom}px;
  display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto;
  font-family: Geist, sans-serif; color: ${BRAND.heading};
}
.pill {
  justify-self: start; font-weight: 700; font-size: 26px; letter-spacing: 0.14em;
  text-transform: uppercase; padding: 14px 26px; border-radius: 999px;
  background: ${BRAND.pill};
  /* Reserved, so a card that fills its box still clears the pill. */
  margin-bottom: 32px;
}
/* The fit box. The text inside it is measured against this, never clipped.
   min-width: 0 because a grid item otherwise widens to its longest word. */
.fit { min-height: 0; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.text, .hero, .context {
  /* min-width: 0, or a flex item grows to its longest word and a word too
     wide for the card never registers as overflow. */
  min-width: 0;
  overflow-wrap: normal; word-break: normal; hyphens: none;
}
.text { font-weight: 700; line-height: 1.12; letter-spacing: -0.015em; }
/* big-number: the figure, what it measures, then the card text it came from. */
/* Heading colour, not the green accent: the accent is 4.11:1 on the Money tint
   and 4.44:1 on Auto, under the 4.5:1 the card text is held to. */
.hero { font-weight: 700; line-height: 1; letter-spacing: -0.03em; white-space: nowrap; color: ${BRAND.heading}; }
.context { font-weight: 500; font-size: ${HERO_CONTEXT_FONT}px; line-height: 1.25; color: ${BRAND.source}; margin: 18px 0 44px; }
.big .text { font-weight: 700; }
/* myth-fact: the assumption, labelled and smaller, then the fact. The fact's
   floor (CARD_FONT_MIN) is above MYTH_FONT, so the fact always dominates. */
.label {
  font-weight: 700; font-size: ${LABEL_FONT}px; letter-spacing: 0.14em; text-transform: uppercase;
  color: ${BRAND.source};
}
.myth { min-width: 0; font-weight: 500; font-size: ${MYTH_FONT}px; line-height: 1.3; color: ${BRAND.source}; margin: 12px 0 44px; }
.fact-label { margin-bottom: 14px; }
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
  <div class="fit" id="fit"></div>
  <div class="rule"></div>
  <div class="foot">
    <p class="source" id="source"></p>
    <div class="mark"><img src="${logo}" alt="shouldifinance.com"></div>
  </div>
</div></body></html>`;
}

/**
 * Runs in the page. Fills one fact in and fits it. The source line is fixed,
 * so the fit box's height is known before anything inside it is sized.
 *
 *   statement   the card text, stepped from cardMax to cardMin.
 *   big-number  the hero at the largest size that fits the width (down to
 *               heroMin), the context line at a fixed size, then the card
 *               text stepped from bigMax to bigMin until the three fit.
 */
function fitInPage({ fact, colours, sizes }) {
  const $ = (id) => document.getElementById(id);
  const pill = $("pill"), fit = $("fit"), source = $("source");
  // Width is checked against the card's content box, not against an element
  // that could have stretched to fit the text it is meant to contain.
  const card = document.querySelector(".card");
  const cs = getComputedStyle(card);
  const contentWidth = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  pill.textContent = fact.category;
  pill.style.color = colours.pillText;
  // The category's card tint, on both elements so the screenshot has no seam.
  document.documentElement.style.background = colours.card;
  document.body.style.background = colours.card;
  source.textContent = fact.card_source;
  // The painted width of the text itself. The paragraph's own scrollWidth is
  // its box width whenever the text is shorter, so it can only ever say "fits".
  const paintedWidth = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return Math.ceil(range.getBoundingClientRect().width);
  };
  const sourceWidth = paintedWidth(source);
  const sourceOverflow = sourceWidth > contentWidth;

  const make = (cls, txt) => {
    const el = document.createElement("p");
    el.className = cls;
    el.textContent = txt;
    fit.appendChild(el);
    return el;
  };

  let heroSize = null, heroOverflow = false, context = null;
  if (fact.layout === "big-number") {
    fit.classList.add("big");
    const hero = make("hero", fact.hero);
    for (heroSize = sizes.heroMax; heroSize >= sizes.heroMin; heroSize -= 4) {
      hero.style.fontSize = `${heroSize}px`;
      if (paintedWidth(hero) <= contentWidth) break;
    }
    heroOverflow = paintedWidth(hero) > contentWidth;
    if (heroOverflow) heroSize = sizes.heroMin;
    context = make("context", fact.hero_context);
  }
  if (fact.layout === "myth-fact") {
    make("label", "Assumption");
    make("myth", fact.myth);
    make("label fact-label", "Fact");
  }
  const text = make("text", fact.card);
  const [max, min] = fact.layout === "big-number" ? [sizes.bigMax, sizes.bigMin] : [sizes.cardMax, sizes.cardMin];

  // Overflow both ways: the box's content taller than the box, or a single
  // word wider than the content width.
  const fits = () => fit.scrollHeight <= fit.clientHeight && text.scrollWidth <= contentWidth;
  let cardSize = max;
  for (; cardSize >= min; cardSize -= 2) {
    text.style.fontSize = `${cardSize}px`;
    if (fits()) break;
  }
  const cardOverflow = !fits() || heroOverflow;
  if (!fits()) cardSize = min;

  const lines = Math.round(text.scrollHeight / parseFloat(getComputedStyle(text).lineHeight));

  // How a short line wraps, from where each word is painted: the number of
  // lines, and how many words sit on the last one. One word alone on the last
  // line of a context or source line is a widow, and fails the run.
  const wrap = (el) => {
    const node = el?.firstChild;
    if (!node) return null;
    const tops = [...node.textContent.matchAll(/\S+/g)].map((m) => {
      const r = document.createRange();
      r.setStart(node, m.index);
      r.setEnd(node, m.index + m[0].length);
      return Math.round(r.getClientRects()[0].top);
    });
    const last = Math.max(...tops);
    return { lines: new Set(tops).size, lastLineWords: tops.filter((t) => Math.abs(t - last) <= 2).length };
  };
  const contextWrap = wrap(context);
  const sourceWrap = wrap(source);
  const pageOverflow =
    document.documentElement.scrollHeight > window.innerHeight ||
    document.documentElement.scrollWidth > window.innerWidth;

  return {
    cardSize, heroSize, heroOverflow, cardOverflow, lines, sourceWidth, contentWidth, sourceOverflow, pageOverflow, contextWrap, sourceWrap,
    boxHeight: fit.clientHeight, textHeight: fit.scrollHeight,
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

/**
 * Margins measured on the rendered pixels, not taken from the CSS: the
 * bounding box of everything that differs from the card's background (text,
 * pill, rule, source line, wordmark panel), against the 3:4 safe area. A
 * pixel counts as content when any channel is more than INK_TOLERANCE away
 * from the background, which is above JPEG noise on a flat tint.
 */
const INK_TOLERANCE = 24;
async function measureSafeArea(file, backgroundHex) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [1, 3, 5].map((i) => parseInt(backgroundHex.slice(i, i + 2), 16));
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (Math.abs(data[i] - bg[0]) > INK_TOLERANCE || Math.abs(data[i + 1] - bg[1]) > INK_TOLERANCE ||
          Math.abs(data[i + 2] - bg[2]) > INK_TOLERANCE) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const safeRight = SAFE_LEFT + SAFE_WIDTH;
  return {
    inkBox: { left: minX, top: minY, right: maxX, bottom: maxY },
    // Distance from the content to each edge of the 3:4 safe area.
    marginLeft: Math.floor(minX - SAFE_LEFT),
    marginRight: Math.floor(safeRight - 1 - maxX),
    marginTop: minY,
    marginBottom: info.height - 1 - maxY,
  };
}

const thumbHeight = (w) => Math.round((w * HEIGHT) / WIDTH);

/**
 * A grid of cards with a label under each. The overview sheet is small and
 * numbered; the per-category sheets are large enough to proofread at 400px a
 * card and are labelled with the full fact id. Labels turn red on overflow.
 */
async function contactSheet(rows, file, { cols, thumb, numbered }) {
  const th = thumbHeight(thumb);
  const LABEL = Math.round(thumb * 0.17), GAP = 12, OUTER = 24;
  const idSize = Math.max(12, Math.round(thumb * 0.06));
  const metaSize = Math.max(11, Math.round(thumb * 0.05));
  const rowsCount = Math.ceil(rows.length / cols);
  const width = OUTER * 2 + cols * thumb + (cols - 1) * GAP;
  const height = OUTER * 2 + rowsCount * (th + LABEL) + (rowsCount - 1) * GAP;
  const layers = [];
  for (const [i, r] of rows.entries()) {
    const x = OUTER + (i % cols) * (thumb + GAP);
    const y = OUTER + Math.floor(i / cols) * (th + LABEL + GAP);
    layers.push({ input: await sharp(r.path).resize(thumb, th).toBuffer(), left: x, top: y });
    const flag = r.cardOverflow || r.sourceOverflow || r.safeFail ? "#dc2626" : "#1f3d35";
    // Fit the id to the label width rather than cutting it: an id is a lookup
    // key, and a truncated one cannot be searched for.
    const idText = numbered ? `${String(i + 1).padStart(3, "0")} ${r.id}` : r.id;
    const fitted = Math.min(idSize, Math.floor((thumb - 4) / (idText.length * 0.56)));
    const sizeNote = r.layout === "big-number" ? `hero ${r.heroSize}px · text ${r.cardSize}px` : `${r.cardSize}px · ${r.lines} lines`;
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${thumb}" height="${LABEL}">
      <text x="2" y="${Math.round(LABEL * 0.42)}" font-family="Arial" font-size="${fitted}" fill="${flag}">${escape(idText)}</text>
      <text x="2" y="${Math.round(LABEL * 0.85)}" font-family="Arial" font-size="${metaSize}" fill="#6b7280">${escape(r.layout)} · ${sizeNote}${r.cardOverflow ? " · OVERFLOW" : ""}${r.sourceOverflow ? " · SOURCE TOO LONG" : ""}${r.safeFail ? " · OUTSIDE SAFE AREA" : ""}</text>
    </svg>`;
    layers.push({ input: Buffer.from(label), left: x, top: y + th });
  }
  await sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .jpeg({ quality: 85, progressive: false })
    .toFile(file);
  return { file, width, height, count: rows.length };
}

/**
 * A mock of the profile grid after the first `count` scheduled posts, in the
 * order content/instagram-schedule.json fixes.
 *
 *   - newest first: the last post is top-left, as a profile shows it;
 *   - each tile is the 3:4 slice Instagram shows on the profile grid: the full
 *     height of the 4:5 card and the middle SAFE_WIDTH (the feed still shows
 *     the whole card);
 *   - a scheduled post that was not rendered this run (for example on an
 *     --id run) is a labelled grey placeholder, so the grid shows exactly
 *     where it falls instead of closing the gap.
 */
async function profileGrid(schedule, rowsById, file, count = 12) {
  const posts = schedule.slice(0, count);
  const COLS = 3, TILE_W = 360, TILE_H = 480, GAP = 3;
  const shown = [...posts].reverse();
  const rowsCount = Math.ceil(shown.length / COLS);
  const width = COLS * TILE_W + (COLS - 1) * GAP;
  const height = rowsCount * TILE_H + (rowsCount - 1) * GAP;
  const layers = [];
  const placeholders = [];
  for (const [i, p] of shown.entries()) {
    const left = (i % COLS) * (TILE_W + GAP), top = Math.floor(i / COLS) * (TILE_H + GAP);
    const r = rowsById.get(p.id);
    let tile;
    if (r) {
      tile = await sharp(r.path)
        .extract({ left: Math.round(SAFE_LEFT), top: 0, width: Math.floor(SAFE_WIDTH), height: HEIGHT })
        .resize(TILE_W, TILE_H)
        .toBuffer();
    } else {
      placeholders.push(p);
      tile = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="44%" text-anchor="middle" font-family="Arial" font-size="22" fill="#374151">${escape(p.layout)}</text>
        <text x="50%" y="51%" text-anchor="middle" font-family="Arial" font-size="15" fill="#374151">${escape(p.id)}</text>
        <text x="50%" y="58%" text-anchor="middle" font-family="Arial" font-size="15" fill="#6b7280">post ${p.n} · not rendered this run</text>
      </svg>`);
    }
    layers.push({ input: tile, left, top });
  }
  await sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .jpeg({ quality: 88, progressive: false })
    .toFile(file);
  return { file, width, height, posts, placeholders };
}

/**
 * Every fact, not only the ones being rendered, so a bad entry is caught on
 * any run. Rendering a layout needs the fields that layout uses.
 */
function validateFacts(facts) {
  const problems = [];
  for (const f of facts) {
    if (f.shelfLife) continue;
    if (!f.card_source) problems.push(`${f.id}: no card_source`);
    if (!["statement", "big-number", "myth-fact"].includes(f.layout)) problems.push(`${f.id}: layout "${f.layout}" is not statement, big-number or myth-fact`);
    if (f.layout === "big-number") {
      if (!f.hero) problems.push(`${f.id}: big-number with no hero`);
      // Letter case aside, so a hero can open with a capital ("Year 20") that
      // sits mid-sentence in the card ("…until year 20.").
      else if (f.card.toLowerCase().split(f.hero.toLowerCase()).length - 1 !== 1) problems.push(`${f.id}: hero "${f.hero}" does not appear exactly once in the card`);
      if (!f.hero_context || !f.hero_context.trim()) problems.push(`${f.id}: big-number with no hero_context`);
    }
    if (f.layout === "myth-fact" && (!f.myth || !f.myth.trim())) problems.push(`${f.id}: myth-fact with no myth`);
  }
  if (problems.length) throw new Error(`Facts file fails validation:\n  ${problems.join("\n  ")}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const facts = JSON.parse(read(args.facts)).facts;
  validateFacts(facts);
  const selected = args.id
    ? facts.filter((f) => f.id === args.id)
    : facts.filter((f) => args.all || !f.shelfLife);
  if (!selected.length) throw new Error(args.id ? `No fact with id ${args.id}` : "No facts selected");
  const chosen = selected;

  const colours = categoryColours();
  const fonts = {
    medium: dataUrl(path.join(FONTS, "Geist-Medium.woff2"), "font/woff2"),
    bold: dataUrl(path.join(FONTS, "Geist-Bold.woff2"), "font/woff2"),
  };
  const logo = dataUrl(path.join(ROOT, "public", "logo-wide.png"), "image/png");
  fs.mkdirSync(args.out, { recursive: true });

  const browser = await launch();
  const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const rows = [];
  try {
    for (const fact of chosen) {
      if (!colours[fact.category]) throw new Error(`${fact.id}: unknown category ${fact.category}`);
      await tab.setContent(page(fonts, logo), { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);
      const fitted = await tab.evaluate(fitInPage, {
        fact, colours: colours[fact.category],
        sizes: {
          cardMax: CARD_FONT_MAX, cardMin: CARD_FONT_MIN,
          heroMax: HERO_FONT_MAX, heroMin: HERO_FONT_MIN,
          bigMax: BIG_TEXT_FONT_MAX, bigMin: BIG_TEXT_FONT_MIN,
        },
      });
      const png = await tab.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
      const file = path.join(args.out, `${fact.id}.jpg`);
      await sharp(png)
        .toColorspace("srgb")
        .jpeg({ quality: JPEG_QUALITY, progressive: false, chromaSubsampling: "4:4:4", mozjpeg: false })
        .withIccProfile("srgb")
        .toFile(file);
      const safe = await measureSafeArea(file, colours[fact.category].card);
      rows.push({
        id: fact.id, category: fact.category, layout: fact.layout, card_source: fact.card_source, hero_context: fact.hero_context, path: file,
        words: fact.card.split(/\s+/).filter(Boolean).length,
        ...fitted, ...(await verify(file)), ...safe,
        safeFail: Math.min(safe.marginLeft, safe.marginRight, safe.marginTop, safe.marginBottom) < SAFE_MARGIN,
      });
    }
  } finally {
    await browser.close();
  }

  const failures = rows.filter(
    (r) => r.format !== "jpeg" || !r.baseline || r.progressive || r.width !== WIDTH || r.height !== HEIGHT ||
      r.space !== "srgb" || r.bytes > 8 * 1024 * 1024,
  );
  const sheet = rows.length > 1
    ? await contactSheet(rows, path.join(args.out, "contact-sheet.jpg"), { cols: 12, thumb: 200, numbered: true })
    : null;
  // One sheet per category, at 400px a card, for proofreading.
  const categorySheets = [];
  if (rows.length > 1) {
    for (const category of Object.keys(colours)) {
      const inCategory = rows.filter((r) => r.category === category);
      if (!inCategory.length) continue;
      categorySheets.push(await contactSheet(
        inCategory,
        path.join(args.out, `contact-sheet-${category.toLowerCase()}.jpg`),
        { cols: 6, thumb: 400, numbered: false },
      ));
    }
  }
  const schedulePath = path.join(ROOT, "content", "instagram-schedule.json");
  const grid = rows.length > 1 && fs.existsSync(schedulePath)
    ? await profileGrid(JSON.parse(read(schedulePath)).posts, new Map(rows.map((r) => [r.id, r])), path.join(args.out, "profile-grid.jpg"))
    : null;
  fs.writeFileSync(
    path.join(args.out, "manifest.json"),
    JSON.stringify({ rendered: new Date().toISOString(), width: WIDTH, height: HEIGHT, cards: rows.map(({ path: p, ...r }) => ({ ...r, file: path.basename(p) })) }, null, 2) + "\n",
  );

  const bytes = rows.map((r) => r.bytes).sort((a, b) => a - b);
  const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
  const byLayout = rows.reduce((a, r) => ((a[r.layout] = (a[r.layout] || 0) + 1), a), {});
  console.log(`Rendered ${rows.length} card${rows.length === 1 ? "" : "s"} to ${path.relative(ROOT, args.out) || "."}: ${Object.entries(byLayout).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`  dimensions: ${[...new Set(rows.map((r) => `${r.width}x${r.height}`))].join(", ")}`);
  console.log(`  format: ${[...new Set(rows.map((r) => `${r.format}${r.baseline ? " baseline" : ""}${r.progressive ? " progressive" : ""}, ${r.space}${r.icc ? " + ICC" : ""}`))].join("; ")}`);
  console.log(`  file size: min ${kb(bytes[0])}, median ${kb(bytes[Math.floor(bytes.length / 2)])}, max ${kb(bytes.at(-1))}`);
  const st = rows.filter((r) => r.layout === "statement").map((r) => r.cardSize);
  const big = rows.filter((r) => r.layout === "big-number");
  if (st.length) console.log(`  statement text: ${Math.min(...st)}px to ${Math.max(...st)}px`);
  if (big.length) {
    console.log(`  big-number hero: ${Math.min(...big.map((r) => r.heroSize))}px to ${Math.max(...big.map((r) => r.heroSize))}px; text below it ${Math.min(...big.map((r) => r.cardSize))}px to ${Math.max(...big.map((r) => r.cardSize))}px`);
  }
  if (sheet) console.log(`  contact sheet: ${path.relative(ROOT, sheet.file)} (${sheet.width}x${sheet.height}, ${kb(fs.statSync(sheet.file).size)})`);
  for (const c of categorySheets) {
    console.log(`  ${path.relative(ROOT, c.file)}: ${c.count} cards, ${c.width}x${c.height}, ${kb(fs.statSync(c.file).size)}`);
  }
  if (grid) {
    console.log(`  profile grid mock: ${path.relative(ROOT, grid.file)} (${grid.width}x${grid.height}), first ${grid.posts.length} scheduled posts, newest top-left, at the 3:4 grid crop`);
    for (const p of grid.posts) console.log(`    ${String(p.n).padStart(2)}. ${p.category.padEnd(6)} ${p.layout.padEnd(10)} ${p.id}${grid.placeholders.includes(p) ? "  (placeholder: not rendered this run)" : ""}`);
  }

  console.log(`  safe area: 3:4 crop is x ${SAFE_LEFT} to ${SAFE_LEFT + SAFE_WIDTH} of ${WIDTH} (full height); required margin ${SAFE_MARGIN}px, measured on rendered pixels:`);
  const m = (k) => Math.min(...rows.map((r) => r[k]));
  console.log(`    smallest margins across all cards: left ${m("marginLeft")}px, right ${m("marginRight")}px, top ${m("marginTop")}px, bottom ${m("marginBottom")}px`);
  const safeFails = rows.filter((r) => r.safeFail);
  console.log(`    cards with content closer than ${SAFE_MARGIN}px to the safe area: ${safeFails.length}`);
  for (const r of safeFails) console.log(`      ${r.id}: L${r.marginLeft} R${r.marginRight} T${r.marginTop} B${r.marginBottom}`);

  console.log(`  contrast on each category tint (WCAG AA needs 4.5:1):`);
  for (const [category, c] of Object.entries(colours)) {
    console.log(
      `    ${category.padEnd(6)} ${c.cardName.padEnd(10)} ${c.card}: ` +
        `headline ${BRAND.heading} ${contrast(BRAND.heading, c.card).toFixed(2)}:1, ` +
        `source ${SOURCE_FONT}px ${BRAND.source} ${contrast(BRAND.source, c.card).toFixed(2)}:1, ` +
        `big-number hero ${BRAND.heading} ${contrast(BRAND.heading, c.card).toFixed(2)}:1`,
    );
  }
  console.log(`  category pill text on the white pill (held to ${PILL_TEXT_CONTRAST}:1):`);
  for (const [category, c] of Object.entries(colours)) {
    const site = c.text.startsWith("oklch") ? oklchToHex(c.text) : c.text;
    const darkened = c.pillText !== site ? `, darkened from the site's ${site} (${contrast(site, BRAND.pill).toFixed(2)}:1)` : "";
    console.log(`    ${category.padEnd(6)} ${c.pillTextName.padEnd(9)} ${c.pillText} on ${BRAND.pill}: ${contrast(c.pillText, BRAND.pill).toFixed(2)}:1${darkened}`);
  }
  const widest = rows.reduce((a, r) => (r.sourceWidth > a.sourceWidth ? r : a));
  console.log(`  widest source line: ${widest.sourceWidth}px of ${widest.contentWidth}px (${widest.id})`);

  // A page overflow counts against the card text only when an over-long
  // source line does not already explain it; that one is reported below.
  const cardOver = rows.filter((r) => r.cardOverflow || (r.pageOverflow && !r.sourceOverflow));
  console.log(`\nCard text or hero overflowing at its floor: ${cardOver.length}`);
  for (const r of cardOver) console.log(`  ${r.id} — ${r.layout}, ${r.words} words, ${r.lines} lines at ${r.cardSize}px${r.heroOverflow ? `, hero too wide at ${r.heroSize}px` : ""}`);
  const sourceOver = rows.filter((r) => r.sourceOverflow);
  console.log(`card_source lines too long for one line at ${SOURCE_FONT}px: ${sourceOver.length}`);
  for (const r of sourceOver) console.log(`  ${r.id} — ${r.sourceWidth}px of ${r.contentWidth}px — "${r.card_source}"`);
  const widow = (w) => w && w.lines > 1 && w.lastLineWords === 1;
  const widows = rows.flatMap((r) => [
    ...(widow(r.contextWrap) ? [`${r.id} — hero_context wraps to ${r.contextWrap.lines} lines with one word on the last: "${r.hero_context}"`] : []),
    ...(widow(r.sourceWrap) ? [`${r.id} — card_source wraps to ${r.sourceWrap.lines} lines with one word on the last: "${r.card_source}"`] : []),
  ]);
  console.log(`hero_context or card_source lines ending on a single word: ${widows.length}`);
  for (const w of widows) console.log(`  ${w}`);
  if (failures.length || safeFails.length || widows.length) {
    if (failures.length) {
      console.error(`\n${failures.length} file(s) fail Instagram's requirements:`);
      for (const r of failures) console.error(`  ${r.id}: ${JSON.stringify(r)}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

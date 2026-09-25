/**
 * Export plumbing, shared by all 43 calculators.
 *
 * NOTHING HERE TRANSMITS THE USER'S FIGURES. Every action runs in the browser:
 * the clipboard write is local, the share link is built and read from the URL
 * in the address bar, printing is the browser's own, and "email to myself" is a
 * mailto: URL handed to the user's own mail client. There is no fetch, no
 * endpoint and no storage in this file. The privacy policy's claim that figures
 * entered into a calculator are never transmitted stays true, and these
 * features were built the way they were in order to keep it true.
 *
 * The values are harvested from the DOM rather than passed in by each page.
 * That is deliberate: the calculators hold their state in local useState and
 * there are 43 of them, so a prop-based design would mean editing every page
 * and would drift the moment one of them changed. Instead the SHARED field and
 * result components carry data-x-* attributes, and everything here reads those.
 * Instrument once, works everywhere.
 */

export type FieldKind = "num" | "date" | "select" | "bool" | "text" | "range";

export type Harvested = {
  /** Visible label, used as the human-readable name and the match key. */
  label: string;
  kind: FieldKind;
  /** Raw value as the control holds it. */
  value: string;
  /** "$" or "%" or "/mo" — for rendering, not for parsing. */
  unit: string;
  /** Nth control with this label, so repeated rows stay distinct. */
  index: number;
};

export type Snapshot = {
  fields: Harvested[];
  headlines: { label: string; value: string }[];
  stats: { label: string; value: string }[];
};

const isVisible = (el: Element): boolean => {
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 || r.height > 0;
};

/** Everything the page is currently showing, in document order. */
export function harvest(root: ParentNode = document): Snapshot {
  const counts = new Map<string, number>();
  const fields: Harvested[] = [];

  root.querySelectorAll<HTMLElement>("[data-x-field]").forEach((el) => {
    const label = el.dataset.xField || "";
    if (!label) return;
    const kind = (el.dataset.xKind || "num") as FieldKind;
    const index = counts.get(label) ?? 0;
    counts.set(label, index + 1);

    let value = "";
    if (kind === "bool") value = (el as HTMLInputElement).checked ? "1" : "";
    else value = (el as HTMLInputElement | HTMLSelectElement).value ?? "";

    fields.push({ label, kind, value, unit: el.dataset.xUnit || "", index });
  });

  const headlines: { label: string; value: string }[] = [];
  root.querySelectorAll<HTMLElement>("[data-x-headline]").forEach((el) => {
    if (!isVisible(el)) return;
    headlines.push({ label: el.dataset.xHeadline || "", value: (el.textContent || "").trim() });
  });

  const stats: { label: string; value: string }[] = [];
  root.querySelectorAll<HTMLElement>("[data-x-stat]").forEach((el) => {
    if (!isVisible(el)) return;
    const v = el.querySelector("[data-x-value]");
    stats.push({ label: el.dataset.xStat || "", value: (v?.textContent || "").trim() });
  });

  return { fields, headlines, stats };
}

/** Fields the user actually filled in. Blank ones carry no information. */
export const filled = (s: Snapshot) => s.fields.filter((f) => f.value !== "");

/* ------------------------------------------------------------ share links -- */

/**
 * Serialization.
 *
 * A compact array of [label, index, value] triples, JSON, then base64url. Keyed
 * by the field's own LABEL rather than by position, because position changes
 * whenever a field is added and a label rarely does — and when a label does
 * change, the old link degrades in the only safe direction.
 *
 * Forward and backward compatibility, both handled by ignoring what does not
 * match:
 *
 *  - A field in the link that the page no longer has is skipped. An old link
 *    opened after a calculator gains or loses an input still restores
 *    everything it can and leaves the rest at defaults.
 *  - A field on the page that the link does not mention keeps its default. A
 *    link made before a new input existed does not blank it.
 *  - A link whose `c` does not match this page's slug is ignored entirely, so
 *    a link pasted onto the wrong calculator does nothing rather than filling
 *    it with another calculator's numbers.
 *  - Anything unparseable is ignored. A truncated or mangled link leaves the
 *    page empty, which is the same as arriving without one.
 *
 * The failure mode is always "fewer fields restored", never a broken page.
 */
const b64url = {
  encode: (s: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(s)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  decode: (s: string) => {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  },
};

export function encodeState(slug: string, snap: Snapshot): string {
  // Bools go in even when false; everything else only when filled.
  //
  // A cleared text or number field carries no information — the page default
  // for one is empty. A cleared CHECKBOX does: several default to ticked (every
  // row of a debt list, for one), so omitting an unticked box does not restore
  // it unticked, it restores it TICKED. That is the worst kind of wrong, because
  // the figures on the restored page change and nothing looks broken.
  const forLink = snap.fields.filter((f) => f.value !== "" || f.kind === "bool");
  const payload = {
    c: slug,
    v: 1,
    f: forLink.map((f) => [f.label, f.index, f.value] as [string, number, string]),
  };
  return b64url.encode(JSON.stringify(payload));
}

export function shareUrl(slug: string, snap: Snapshot): string {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("s", encodeState(slug, snap));
  return u.toString();
}

/**
 * Writes a decoded state back into the page.
 *
 * React owns these inputs, so setting `.value` alone is invisible to it — the
 * native setter plus a bubbling input event is what React's synthetic layer
 * listens for. Ugly, and the price of not editing 43 pages.
 */
/**
 * How many times a restore will re-assert its values.
 *
 * One pass is not enough when a page couples two inputs. should-i-refinance
 * derives the monthly payment from the term and vice versa, so writing "Years
 * left" runs the page's own onYears, which recomputes the payment from the
 * balance and rate. Inside a single synchronous pass those are still the React
 * state from before the restore — empty — so the payment was recomputed from
 * zero and came back blank, taking the headline with it.
 *
 * Re-asserting after React has re-rendered fixes it: by the second pass the
 * balance and rate are really there, so the recompute produces the partner
 * value the sender had. A third pass exists only to confirm nothing still
 * disagrees, and to terminate.
 *
 * WHICH HALF OF A COUPLED PAIR WINS: the page, not the link. Each pass writes
 * the link's values and then lets the page's own handlers react, so the pair
 * settles wherever the page's model puts it. For a link made on the same
 * version that is the same place the sender was — the pair is self-consistent,
 * so recomputing either half reproduces the other. Where they could disagree,
 * a page showing its own consistent pair is better than one showing two
 * numbers that contradict each other because a link asserted both.
 */
const MAX_RESTORE_PASSES = 3;

export function applyState(
  slug: string,
  encoded: string,
  root: ParentNode = document,
  pass = 0,
): number {
  let payload: { c?: string; f?: [string, number, string][] };
  try {
    payload = JSON.parse(b64url.decode(encoded));
  } catch {
    return 0;
  }
  if (!payload || payload.c !== slug || !Array.isArray(payload.f)) return 0;

  // Rebuild any rows the link needs and the page does not have yet.
  //
  // A dynamic list starts at its own default length — one debt on
  // debt-consolidation and heloc-debt-payoff, three on
  // refinance-to-pay-off-debt — so a link carrying four debts used to restore
  // only as many as happened to exist and drop the rest without saying so.
  // Indices are per-label, so the highest index the link mentions is the row
  // count it needs; clicking the list's own "add" control is what creates them,
  // which keeps this working through whatever state the page holds them in.
  const addRow = root.querySelector<HTMLElement>("[data-x-add-row]");
  if (addRow) {
    const rowLabel = addRow.dataset.xAddRow || "";
    const have = root.querySelectorAll(`[data-x-field="${CSS.escape(rowLabel)}"]`).length;
    // Indices are per-label and zero-based, so the highest one the link
    // mentions for this label is the row count it needs.
    const needed = payload.f.reduce(
      (max, e) =>
        Array.isArray(e) && e[0] === rowLabel && typeof e[1] === "number"
          ? Math.max(max, e[1] + 1)
          : max,
      0,
    );
    // Bounded, so a mangled or hostile link cannot spin this.
    const MAX_ROWS = 24;
    const deficit = Math.min(needed, MAX_ROWS) - have;
    if (deficit > 0) {
      // Click exactly the shortfall, without re-reading the DOM between clicks.
      // The add handlers use a functional state update, so N clicks appends N
      // rows even though React batches them — whereas re-counting inside the
      // loop reads a DOM that has not re-rendered yet and clicks until the
      // guard stops it. That mistake produced 27 rows from a 4-row link.
      for (let k = 0; k < deficit; k++) addRow.click();
      // The rows exist only after React re-renders. The reconcile pass at the
      // foot of this function comes back for them; it is idempotent, so that
      // pass finds the rows present, computes a deficit of zero and just
      // writes the values.
    }
  }

  const byKey = new Map<string, HTMLElement>();
  const counts = new Map<string, number>();
  root.querySelectorAll<HTMLElement>("[data-x-field]").forEach((el) => {
    const label = el.dataset.xField || "";
    const i = counts.get(label) ?? 0;
    counts.set(label, i + 1);
    byKey.set(`${label}||${i}`, el);
  });

  let applied = 0;
  /** Fields a later pass found showing something other than the link's value. */
  let disagreed = 0;
  for (const entry of payload.f) {
    if (!Array.isArray(entry) || entry.length < 3) continue;
    const [label, index, value] = entry;
    const el = byKey.get(`${label}||${index}`);
    if (!el) continue;

    const kind = el.dataset.xKind;

    // After the first pass, touch only what does not already match. Rewriting
    // a field that is already correct would re-run the page's handler for it,
    // which on a coupled page is how the two halves end up fighting.
    const shown = kind === "bool" ? ((el as HTMLInputElement).checked ? "1" : "") : (el as HTMLInputElement | HTMLSelectElement).value;
    if (pass > 0 && shown === value) continue;
    if (pass > 0) disagreed++;

    if (kind === "bool") {
      const box = el as HTMLInputElement;
      const want = value === "1";
      if (box.checked !== want) box.click();
      applied++;
      continue;
    }
    const proto =
      kind === "select" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (!setter) continue;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    applied++;
  }

  // Come back once React has re-rendered, and again only while something still
  // disagrees. A page with no coupled inputs settles on the first check and
  // costs one extra no-op pass.
  if (pass < MAX_RESTORE_PASSES && (pass === 0 || disagreed > 0)) {
    setTimeout(() => applyState(slug, encoded, root, pass + 1), 0);
  }
  return applied;
}

/* ------------------------------------------------------------- plain text -- */

const line = (label: string, value: string) => `${label}: ${value}`;

/** Inputs and headline results as text, for the clipboard and for mailto. */
export function asText(
  title: string,
  snap: Snapshot,
  opts: { url?: string; stats?: boolean } = {},
): string {
  const out: string[] = [title, new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }), ""];

  const inputs = filled(snap);
  if (inputs.length) {
    out.push("YOUR NUMBERS");
    for (const f of inputs) {
      const v =
        f.kind === "bool"
          ? "yes"
          : f.unit === "$"
            ? `$${Number(f.value).toLocaleString("en-US")}`
            : f.unit
              ? `${f.value}${f.unit}`
              : f.value;
      out.push(line(f.label, v));
    }
    out.push("");
  }

  if (snap.headlines.length) {
    out.push("RESULT");
    for (const h of snap.headlines) out.push(line(h.label, h.value));
    out.push("");
  }

  if (opts.stats !== false && snap.stats.length) {
    out.push("DETAIL");
    for (const st of snap.stats) out.push(line(st.label, st.value));
    out.push("");
  }

  if (opts.url) {
    out.push("Open these numbers in the calculator:");
    out.push(opts.url);
    out.push("");
  }
  out.push("Estimates for discussion only, from shouldifinance.com — not advice.");
  return out.join("\n");
}

/**
 * mailto: has a practical ceiling around 2,000 characters across browsers and
 * mail clients, and overflowing it truncates or fails silently.
 *
 * MAILTO_LIMIT is the target, set well below that ceiling on purpose.
 * loan-estimate-comparison with three lenders filled came out at 1,974 — under
 * 2,000, but by 26 characters, which is one longer loan amount away from
 * breaking. Aiming at 1,600 leaves room for bigger numbers and an extra row.
 */
export const MAILTO_HARD_LIMIT = 2000;
export const MAILTO_LIMIT = 1600;

/**
 * Builds the mailto, shedding detail until it fits.
 *
 * The ladder drops the least valuable part first and always keeps the share
 * link, because the link is what lets the recipient reopen the calculator with
 * every figure loaded — it makes the rest of the body a convenience rather than
 * the payload. Tables and schedules never appear at any rung.
 *
 *   1. inputs + headline + detail tiles + link
 *   2. inputs + headline + link            (drops the detail tiles)
 *   3. headline + link                     (drops the inputs)
 *   4. link only                           (always fits)
 */
export function mailtoUrl(title: string, snap: Snapshot, url: string): string {
  const subject = `${title} — shouldifinance.com`;
  const wrap = (body: string) =>
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const rungs: string[] = [
    asText(title, snap, { url, stats: true }),
    asText(title, snap, { url, stats: false }),
    asText(title, { ...snap, fields: [], stats: [] }, { url, stats: false }),
    [
      title,
      "",
      "Open these numbers in the calculator:",
      url,
      "",
      "Estimates for discussion only, from shouldifinance.com — not advice.",
    ].join("\n"),
  ];

  for (const body of rungs) {
    const candidate = wrap(body);
    if (candidate.length <= MAILTO_LIMIT) return candidate;
  }
  // The last rung is the share link and two lines; if even that is over the
  // target it is still comfortably inside the hard ceiling.
  return wrap(rungs[rungs.length - 1]);
}

/* ----------------------------------------------------------------- charts -- */

/**
 * Snapshots the first chart on the page as a data URL.
 *
 * The charts are <canvas>, drawn once when they mount. A print-only copy of the
 * page would contain a canvas that was never drawn — zero-sized and blank — so
 * the print sheet shows an <img> of the on-screen canvas instead, captured at
 * beforeprint when it is known to be painted.
 */
/**
 * The site wordmark as a data URI, for the print header.
 *
 * The only logo assets in the repo are PNG — logo-wide.png (556x119) and
 * logo.png (236x150). There is no SVG, so it cannot be inlined as markup and
 * has to be embedded as data instead.
 *
 * Rather than baking ~83KB of base64 into every calculator's JS bundle, this
 * snapshots the wordmark the nav has already loaded and painted, the same way
 * the chart is captured. That costs no extra bytes, makes no request while
 * printing, and leaves the printed sheet self-contained.
 *
 * A real <img> in the sheet, never a CSS background: browsers disable
 * background graphics in print by default, so a background would silently not
 * print for most people. If the capture fails for any reason the header falls
 * back to the site name as text, so the sheet is never unbranded.
 */
let logoCache: string | null | undefined;

export function siteLogo(root: ParentNode = document): string | null {
  if (logoCache !== undefined) return logoCache;
  const img = root.querySelector<HTMLImageElement>('img[alt="ShouldIFinance"]');
  if (!img || !img.complete || !img.naturalWidth) {
    // Not painted yet — do not cache a miss, the next print may succeed.
    return null;
  }
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const src = c.toDataURL("image/png");
    logoCache = src && src.length > 100 ? src : null;
    return logoCache;
  } catch {
    // A tainted canvas would throw. Same-origin here, but never break printing.
    return null;
  }
}

export function primaryChart(root: ParentNode = document): { title: string; src: string } | null {
  const card = root.querySelector<HTMLElement>("[data-x-chart]");
  const canvas = card?.querySelector("canvas");
  if (!card || !canvas) return null;
  try {
    const src = canvas.toDataURL("image/png");
    if (!src || src.length < 100) return null;
    return { title: card.dataset.xChart || "", src };
  } catch {
    return null;
  }
}

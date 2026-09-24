"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Link2, Printer, Mail, Check } from "lucide-react";
import { trackExportUsed } from "../lib/analytics";
import {
  applyState,
  asText,
  harvest,
  mailtoUrl,
  primaryChart,
  shareUrl,
  siteLogo,
  type Snapshot,
} from "../lib/export";
import { bySlug } from "../lib/calculators";

/**
 * The four export actions, shared by all 43 calculators.
 *
 * None of the user's figures leave the browser. Copy writes to the clipboard,
 * the share link is assembled from the address bar, print is the browser's own
 * dialog, and email is a mailto: URL handed to the user's mail client. There is
 * no fetch anywhere in this component or in lib/export — which is what keeps
 * the privacy policy's claim about CALCULATOR FIGURES true. That claim is the
 * narrow one and the one that matters; do not widen it.
 *
 * It reads values out of the DOM through the data-x-* attributes on the shared
 * field and result components, so adding it to a calculator is one line and
 * adding a field to a calculator needs no export work at all.
 */

type Props = {
  /** Registry slug. Names the calculator and scopes the share link. */
  slug: string;
};

const BTN =
  "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-gray-200 " +
  "bg-white text-xs font-medium text-gray-600 hover:border-green-200 hover:text-green-700 transition-colors";

export default function ExportBar({ slug }: Props) {
  const calc = bySlug(slug);
  const title = calc?.title ?? slug;
  const [done, setDone] = useState<string | null>(null);
  const printRoot = useRef<HTMLDivElement | null>(null);

  const flash = (what: string) => {
    setDone(what);
    window.setTimeout(() => setDone((d) => (d === what ? null : d)), 1800);
  };

  /* ---- restore from a share link, once, after the page has mounted ---- */
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("s");
    if (!s) return;

    /* Applied straight away: effects run after the whole tree is committed, so
     * every field is already in the DOM.
     *
     * This used to wait a frame via requestAnimationFrame, which was wrong —
     * rAF is paused while a document is hidden, so a share link opened in a
     * background tab (a middle-click, "open in new tab", or a link restored by
     * the browser at startup) would sit unrestored until the tab was focused.
     * A timeout retry covers anything that mounts a beat later, and applying
     * twice is harmless because the second pass writes the same values. */
    if (applyState(slug, s) === 0) {
      const t = window.setTimeout(() => applyState(slug, s), 0);
      return () => window.clearTimeout(t);
    }
  }, [slug]);

  /* ---- the print sheet ------------------------------------------------ */
  useEffect(() => {
    const root = document.createElement("div");
    root.id = "x-print-root";
    document.body.appendChild(root);
    printRoot.current = root;

    /* Warm the logo capture now rather than inside beforeprint. That handler is
     * synchronous and the print dialog can open the moment it returns, so the
     * less work done there the better — and the nav wordmark is reliably
     * painted by the time effects run. */
    siteLogo();

    const before = () => {
      root.innerHTML = buildSheet(slug, title, harvest(), primaryChart(), siteLogo());
    };
    const after = () => {
      root.innerHTML = "";
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      root.remove();
    };
  }, [slug, title]);

  const snap = (): Snapshot => harvest();

  const onCopy = useCallback(async () => {
    // Records the action and the calculator only. `text` below holds the
    // visitor's own figures and is never passed to an event.
    trackExportUsed("copy", slug);
    const text = asText(title, snap(), { url: shareUrl(slug, snap()) });
    try {
      await navigator.clipboard.writeText(text);
      flash("copy");
    } catch {
      // Clipboard API needs a secure context and permission; fall back to the
      // old execCommand path rather than failing silently.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        flash("copy");
      } finally {
        ta.remove();
      }
    }
  }, [slug, title]);

  const onShare = useCallback(async () => {
    trackExportUsed("share", slug);
    const url = shareUrl(slug, snap());
    try {
      await navigator.clipboard.writeText(url);
      flash("share");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }, [slug]);

  const onPrint = useCallback(() => {
    trackExportUsed("print", slug);
    window.print();
  }, [slug]);

  /**
   * Email is a real anchor rather than a button that assigns location, so it
   * middle-clicks, right-click-copies and keyboard-activates like any link.
   * The href is rebuilt on mousedown and focus — both of which fire before the
   * activation — because the numbers change as the user types and a href baked
   * at render time would be stale.
   */
  const mailRef = useRef<HTMLAnchorElement | null>(null);
  const prepEmail = useCallback(() => {
    if (mailRef.current) mailRef.current.href = mailtoUrl(title, snap(), shareUrl(slug, snap()));
  }, [slug, title]);

  // Tracked on activation rather than in prepEmail: prepEmail also runs on
  // focus, so counting it there would log an event for anyone tabbing past.
  const onEmail = useCallback(() => trackExportUsed("email", slug), [slug]);

  return (
    <div className="mb-6 border border-gray-200 rounded-2xl p-4 bg-gray-50 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Save or send these numbers</span>
        <button onClick={onCopy} className={BTN} aria-label="Copy results to the clipboard">
          {done === "copy" ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
          {done === "copy" ? "Copied" : "Copy results"}
        </button>
        <button onClick={onShare} className={BTN} aria-label="Copy a link that restores these numbers">
          {done === "share" ? <Check className="w-4 h-4 text-green-700" /> : <Link2 className="w-4 h-4" />}
          {done === "share" ? "Link copied" : "Share link"}
        </button>
        <button onClick={onPrint} className={BTN} aria-label="Print or save as PDF">
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
        <a
          ref={mailRef}
          href="mailto:"
          onMouseDown={prepEmail}
          onFocus={prepEmail}
          onTouchStart={prepEmail}
          onClick={onEmail}
          className={BTN}
          aria-label="Email these results to yourself"
        >
          <Mail className="w-4 h-4" />
          Email
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-2 leading-relaxed">
        All four happen in your browser. Your figures are not sent anywhere — the email opens in
        your own mail app, already filled in.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- the sheet -- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Page one is a summary: header, the inputs as a compact list, the headline
 * results, the primary chart, the disclaimer. Long tables are lifted from the
 * page and appended as an appendix, which flows onto page two and beyond. A
 * calculator with no long table prints as one page.
 *
 * Built as an HTML string into a plain DOM node rather than as React, because
 * beforeprint is synchronous — a React state update would not be committed
 * before the print dialog opened.
 */
function buildSheet(
  slug: string,
  title: string,
  snap: Snapshot,
  chart: { title: string; src: string } | null,
  logo: string | null,
): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const inputs = snap.fields
    .filter((f) => f.value !== "")
    .map((f) => {
      const v =
        f.kind === "bool"
          ? "Yes"
          : f.unit === "$"
            ? `$${Number(f.value).toLocaleString("en-US")}`
            : f.unit
              ? `${f.value}${f.unit}`
              : f.value;
      return `<div class="xp-row"><span>${esc(f.label)}</span><b>${esc(v)}</b></div>`;
    })
    .join("");

  const headlines = snap.headlines
    .map((h) => `<div class="xp-headline"><span>${esc(h.label)}</span><b>${esc(h.value)}</b></div>`)
    .join("");

  const stats = snap.stats
    .map((s) => `<div class="xp-row"><span>${esc(s.label)}</span><b>${esc(s.value)}</b></div>`)
    .join("");

  const chartBlock = chart
    ? `<div class="xp-chart"><p class="xp-h3">${esc(chart.title)}</p><img src="${chart.src}" alt=""></div>`
    : "";

  // Long tables become the appendix. Anything short enough to have fitted on
  // page one is left where it was — a three-row table is not an appendix.
  const tables = [...document.querySelectorAll("table")]
    .filter((t) => !t.closest("#x-print-root") && t.querySelectorAll("tbody tr").length > 8)
    .map((t) => `<div class="xp-appendix">${t.outerHTML}</div>`)
    .join("");

  const disclaimer =
    document.querySelector("[data-x-disclaimer]")?.textContent?.trim() ??
    "For educational purposes only. Results are estimates based on the values you enter.";

  return `
    <div class="xp-sheet">
      <div class="xp-head">
        <div>
          <p class="xp-title">${esc(title)}</p>
          <p class="xp-meta">Generated ${esc(date)} · shouldifinance.com/calculators/${esc(slug)}</p>
        </div>
        ${
          logo
            ? `<img class="xp-logo" src="${logo}" alt="ShouldIFinance">`
            : `<p class="xp-brand">ShouldIFinance</p>`
        }
      </div>
      ${headlines ? `<div class="xp-block">${headlines}</div>` : ""}
      ${inputs ? `<div class="xp-block"><p class="xp-h3">Your numbers</p>${inputs}</div>` : ""}
      ${stats ? `<div class="xp-block"><p class="xp-h3">Detail</p>${stats}</div>` : ""}
      ${chartBlock}
      <p class="xp-disclaimer">${esc(disclaimer)}</p>
    </div>
    ${tables ? `<div class="xp-break"></div>${tables}` : ""}
    <div class="xp-footer">shouldifinance.com/calculators/${esc(slug)}</div>
  `;
}

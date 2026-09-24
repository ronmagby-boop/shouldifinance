"use client";

import { track } from "@vercel/analytics";
import { CALCULATORS } from "./calculators";

/**
 * Every analytics event the site sends, and the only place one can be sent from.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ NO USER-ENTERED VALUE MAY EVER LEAVE THIS FILE.                      │
 * │                                                                      │
 * │ The Site tells four different pages — the privacy policy, the About  │
 * │ page, the contact page and the homepage tile — that figures typed     │
 * │ into a calculator are computed in the browser and never transmitted. │
 * │ An analytics payload is the one place that claim could quietly stop  │
 * │ being true, and it would stop being true without anything visibly    │
 * │ breaking.                                                            │
 * │                                                                      │
 * │ So this is not enforced by discipline. Every value sent is checked   │
 * │ against a CLOSED SET built from the calculator registry: a slug that │
 * │ is not a real calculator, a guide slug that is not paired with one,  │
 * │ or a label outside the fixed lists below is dropped before it        │
 * │ reaches track(). A balance, a rate or an income cannot pass that     │
 * │ test, because none of them is a registry slug.                       │
 * │                                                                      │
 * │ If you add an event: give it a closed value set too. Never widen a   │
 * │ check to `typeof v === "string"`, and never pass a number through.   │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Vercel Web Analytics is cookieless and stores no IP address; see section 4
 * of the privacy policy, which describes exactly what these events record.
 */

/** Real calculator slugs. Derived, so it cannot drift from the registry. */
const CALC_SLUGS: ReadonlySet<string> = new Set(CALCULATORS.map((c) => c.slug));

/**
 * Guide slugs, taken from the registry pairing rather than from lib/guides.ts —
 * that module reads the filesystem and must not be pulled into client code.
 */
const GUIDE_SLUGS: ReadonlySet<string> = new Set(
  CALCULATORS.map((c) => c.guide?.slug).filter((s): s is string => Boolean(s)),
);

/** Where a guide's link to a calculator sat. */
const PLACEMENTS = ["body", "cta"] as const;
export type Placement = (typeof PLACEMENTS)[number];

/** The four export actions, matching ExportBar's buttons. */
const EXPORT_ACTIONS = ["copy", "share", "print", "email"] as const;
export type ExportAction = (typeof EXPORT_ACTIONS)[number];

/**
 * Sends the event only if every value is in its allowed set.
 *
 * A rejection is a bug in the caller, not a condition to handle at runtime, so
 * it is loud in development and silent in production — a dropped analytics
 * event must never break a page a visitor is using.
 */
function send(name: string, props: Record<string, string>, allowed: Record<string, ReadonlySet<string>>) {
  for (const [key, value] of Object.entries(props)) {
    const set = allowed[key];
    if (!set || !set.has(value)) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          `analytics: refused to send "${name}" — ${key} is not in its allowed set. ` +
            `Only registry slugs and fixed labels may be sent; never a user-entered value.`,
        );
      }
      return;
    }
  }
  track(name, props);
}

const CALC = { calculator: CALC_SLUGS };

/** Example numbers loaded into a calculator. */
export function trackExampleLoaded(calculator: string) {
  send("Example numbers loaded", { calculator }, CALC);
}

/** The same control pressed again to empty every field. */
export function trackExampleCleared(calculator: string) {
  send("Numbers cleared", { calculator }, CALC);
}

/** A calculator's link into its written guide. */
export function trackGuideOpened(calculator: string, guide: string) {
  send("Guide opened", { calculator, guide }, { calculator: CALC_SLUGS, guide: GUIDE_SLUGS });
}

/**
 * A guide's link into a calculator. `placement` separates the links written
 * into the prose from the single card at the end, which is the whole point of
 * the event — the two answer different questions about how a guide is read.
 */
export function trackCalculatorOpened(guide: string, calculator: string, placement: Placement) {
  send(
    "Calculator opened",
    { guide, calculator, placement },
    { guide: GUIDE_SLUGS, calculator: CALC_SLUGS, placement: new Set(PLACEMENTS) },
  );
}

/** One of the related cards at the foot of a calculator. */
export function trackRelatedOpened(from: string, to: string) {
  send("Related calculator", { from, to }, { from: CALC_SLUGS, to: CALC_SLUGS });
}

/**
 * An export button. Records WHICH action was pressed and on which calculator —
 * never what was exported. ExportBar harvests the visitor's figures to build
 * the clipboard text, the share link and the mailto body; none of that is
 * passed here, and the closed set above would drop it if it were.
 */
export function trackExportUsed(action: ExportAction, calculator: string) {
  send(
    "Export used",
    { action, calculator },
    { action: new Set(EXPORT_ACTIONS), calculator: CALC_SLUGS },
  );
}

/** The homepage mortgage-rate banner, which links to the mortgage calculator. */
export function trackRateBannerClicked() {
  send("Rate banner", {}, {});
}

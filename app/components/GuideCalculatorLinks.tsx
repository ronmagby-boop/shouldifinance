"use client";

import type { ReactNode } from "react";
import { trackCalculatorOpened } from "../lib/analytics";

/**
 * Counts a guide's links into calculators, split by where the link sat.
 *
 * Delegation rather than a tracked link component, because the links written
 * into the prose are produced by Markdown from the guide's own markdown source.
 * Making those clickable-and-counted any other way would mean rendering the
 * body through client components — which would ship the markdown renderer to
 * the browser for every guide. It is server-only today and worth keeping that
 * way. One listener on a wrapper costs nothing and catches every link in the
 * body, including ones added to a guide later.
 *
 * The wrapper is `display: contents`, so it introduces no box and cannot change
 * the guide's layout or margin collapsing; it exists purely to have something
 * to listen on.
 *
 * `body` vs `cta` is decided by whether the link sits inside the end-of-guide
 * card, which carries data-x-guide-cta. That distinction is the point of the
 * event: a body link means the reader broke off mid-guide, the CTA means they
 * read to the end, and those are different things to know.
 */
export default function GuideCalculatorLinks({
  guide,
  children,
}: {
  /** The guide being read — validated against the registry before sending. */
  guide: string;
  children: ReactNode;
}) {
  return (
    <div
      className="contents"
      onClickCapture={(e) => {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!anchor) return;

        // Read the attribute, not anchor.href: the latter is resolved to an
        // absolute URL and would not match this pattern.
        const match = /^\/calculators\/([a-z0-9-]+)\/?$/.exec(anchor.getAttribute("href") ?? "");
        if (!match) return;

        trackCalculatorOpened(
          guide,
          match[1],
          anchor.closest("[data-x-guide-cta]") ? "cta" : "body",
        );
      }}
    >
      {children}
    </div>
  );
}

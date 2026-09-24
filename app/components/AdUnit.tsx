"use client";

import { useEffect, useRef } from "react";
import AdsenseScript from "./AdsenseScript";
import { ADSENSE_CLIENT, AD_HEIGHT, AD_SLOTS, adEnabled, type AdPlacement } from "../lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One advertising slot. The only place an ad appears anywhere on the site, so
 * placement across all 86 pages can be changed here.
 *
 * WHY IT LOOKS LIKE THIS:
 *
 * • Fixed reserved height. The wrapper is given its height before anything
 *   loads and the unit cannot change it, so the page never reflows when an ad
 *   arrives — or when it does not. CLS is 0 across the site today and this is
 *   what keeps it there. See AD_HEIGHT in lib/ads.ts for the trade-off.
 *
 * • Generous margin, and a labelled rule above. Both are policy, not taste:
 *   AdSense treats an ad placed where a mis-tap can land on it as an invalid
 *   click risk, and every one of these sits between real controls — the export
 *   buttons above, the related-calculator links below. The label also satisfies
 *   the requirement that ads be distinguishable from surrounding content.
 *
 * • print:hidden, belt and braces. The print stylesheet already hides
 *   everything outside #x-print-root, so an in-page unit cannot reach the
 *   printed sheet. This is here in case a future format injects itself
 *   elsewhere, and because the print sheet is purpose-built and an ad in it
 *   would be both ugly and a policy problem.
 *
 * Renders nothing at all unless the placement is fully configured, which is the
 * default. It does not reserve the space either — an empty grey box on every
 * page would be worse than no ad.
 */
export default function AdUnit({ placement }: { placement: AdPlacement }) {
  const ref = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  const live = adEnabled(placement);

  useEffect(() => {
    if (!live || pushed.current || !ref.current) return;
    // Guard against a double push in React's development double-effect, which
    // AdSense answers with "adsbygoogle.push() error: All ins elements ...
    // already have ads in them."
    if (ref.current.getAttribute("data-adsbygoogle-status")) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // A blocked or failed ad must never break the page around it.
    }
  }, [live]);

  if (!live) return null;

  const height = AD_HEIGHT[placement];

  return (
    <div className="my-10 print:hidden" role="complementary" aria-label="Advertisement">
      {/* The loader travels with the unit rather than sitting in the root
          layout, so it is requested only on pages that actually carry an ad —
          not on the home page, which has none and would otherwise pay 72 KB
          and a set of ad cookies for nothing. next/script dedupes on id, so a
          guide rendering two units still loads it once. */}
      <AdsenseScript />
      <p className="text-[10px] uppercase tracking-wide text-gray-300 text-center mb-1.5 border-t border-gray-100 pt-3">
        Advertisement
      </p>
      {/* Fixed box: height is set here and nothing inside may change it. */}
      <div
        style={{ height, contain: "layout size" }}
        className="mx-auto w-full max-w-[728px] overflow-hidden"
      >
        <ins
          ref={ref}
          className="adsbygoogle block"
          style={{ display: "block", width: "100%", height }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={AD_SLOTS[placement]}
        />
      </div>
    </div>
  );
}

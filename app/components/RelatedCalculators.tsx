"use client";

import Link from "next/link";
import { related, relatedGridClass, type Calc } from "../lib/calculators";
import { trackRelatedOpened } from "../lib/analytics";

/**
 * The "Related calculators" block at the foot of every calculator.
 *
 * Shared because it was not: CalcShell, mortgage-payment and should-i-refinance
 * each carried their own byte-identical copy of this grid, and that pattern —
 * two pages that predate CalcShell and rebuild its chrome — has now caused six
 * separate bugs, the related-card cap and the missing guide link among them.
 * Analytics would have been the seventh: the shared ExampleButton, ExportBar
 * and GuideLink pick up their events for free on all 43 calculators, and only
 * this grid would have silently gone untracked on two of them.
 *
 * Takes `cards` already resolved rather than calling related() itself, because
 * the two older pages compute theirs at module scope with an explicit list.
 */
export default function RelatedCalculators({
  from,
  cards,
}: {
  /** The calculator being left — one half of the event. */
  from: string;
  cards: Calc[];
}) {
  if (!cards.length) return null;

  return (
    <div className="mb-6">
      <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">
        Related calculators
      </h2>
      <div className={relatedGridClass(cards.length)}>
        {cards.map((card) => (
          <Link
            key={card.slug}
            href={`/calculators/${card.slug}`}
            onClick={() => trackRelatedOpened(from, card.slug)}
            className="border border-gray-200 rounded-xl p-4 hover:border-green-200 hover:shadow-sm transition-all block"
          >
            <div
              className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center mb-3 text-gray-700`}
            >
              <card.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">{card.nav}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Convenience for callers that want the registry's own choice of cards. */
export function relatedFor(slug: string, explicit?: string[]) {
  return related(slug, explicit);
}

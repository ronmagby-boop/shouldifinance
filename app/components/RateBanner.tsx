import { TrendingUp } from "lucide-react";
import { PMMS } from "../lib/pmms";
import RateBannerLink from "./RateBannerLink";

/**
 * The week's 30-year fixed average, on the homepage.
 *
 * Renders nothing at all when there is no fresh survey — a failed fetch or a
 * rate past the staleness window. That is deliberate: an absent banner is a
 * non-event, while a stale rate presented as this week's is something a reader
 * would plan around.
 *
 * The rate is printed exactly as Freddie Mac published it. See the alteration
 * note in lib/pmms.ts before touching the formatting.
 *
 * 30-year only. The 15-year is in the source data but two rates plus a date
 * does not fit at 390px, and the 30-year is what people mean by "the rate".
 *
 * STYLING: bg-gray-50 with no border, matching the category section directly
 * below it, so the two read as one continuous area. This used to be a white
 * panel with border-y, which put a second bordered white slab immediately
 * under the stats bar — same colour, but a separate card, and the homepage
 * went mint / white / white / grey with a rule between each. Merging downward
 * removes a band without introducing a colour. Do not give this its own fill
 * or border again without checking what is above and below it.
 */
export default function RateBanner() {
  if (!PMMS) return null;

  return (
    <section className="bg-gray-50" aria-label="This week's mortgage rate">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-5 md:pt-6 text-center">
        <RateBannerLink className="group inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 min-h-[44px] px-2 rounded-xl">
          <TrendingUp
            className="w-4 h-4 text-green-700 flex-shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="text-base font-bold text-gray-900">
            {/* Exactly as published — do not round or reformat. */}
            {PMMS.rate30}%
          </span>
          <span className="text-xs text-gray-500">
            30-year fixed average, week ending {PMMS.weekLabel}
          </span>
          {/* Desktop only. The whole banner is already the link, and at 390px
              this was the element forcing a third wrapped line — the rate is an
              indicator here, not a call to action. */}
          <span className="hidden sm:inline text-xs font-semibold text-green-700 group-hover:underline whitespace-nowrap">
            Run your numbers →
          </span>
        </RateBannerLink>

        <p className="text-xs text-gray-400 leading-relaxed">
          Source: {PMMS.attribution}. A national average, not a quote.
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { HAS_RATES } from "../lib/rates";

/**
 * The home page signpost to /rates.
 *
 * WHAT CHANGED, AND WHY. This used to display the 30-year rate itself, with
 * the survey week and the Freddie Mac attribution beneath it. Both of those
 * existed only to support the number — a rate without its date and its source
 * is not honest — and together they were most of the 103px it occupied at
 * 390px. Once the figure moves to /rates, the scaffolding goes with it: there
 * is nothing to date and nothing to attribute, because nothing is quoted.
 *
 * STYLING. A tint of its own, deliberately. It previously shared bg-gray-50
 * with the category grid below so the two read as one continuous area, which
 * was right when this was a block of content. It is now a control, and a
 * control that looks like the section under it does not get pressed. green-50
 * is the site's action hue at its lightest: distinct from the white stats bar
 * above and the grey grid below, in the same family as the mint hero so it
 * reads as furniture rather than a foreign band, and light enough at ~50px
 * that it is a strip rather than another storey in the stack.
 *
 * STALENESS. Gated on HAS_RATES, not on any one series. Every figure on /rates
 * is behind its own per-series age check, so HAS_RATES is false exactly when
 * that page would be empty — and a signpost to an empty page is worse than no
 * signpost. It is the same reasoning the rate banner always used, applied to
 * the whole page instead of one number.
 */
export default function RateBanner() {
  if (!HAS_RATES) return null;

  return (
    <section className="bg-green-50 border-y border-green-100" aria-label="Current rates">
      <Link
        href="/rates"
        className="group block hover:bg-green-100/70 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-2 flex items-center justify-center gap-2 text-center">
          <TrendingUp
            className="w-4 h-4 text-green-700 flex-shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
          {/* One text run, so the arrow trails the last word instead of
              wrapping onto a line of its own and costing a whole row. */}
          <span className="text-xs sm:text-sm font-medium text-green-900">
            Current rates
            <span className="text-green-800/80 font-normal">
              {" "}
              — mortgage, auto, credit card and Treasury
            </span>
            <span className="text-green-700 font-semibold group-hover:underline"> →</span>
          </span>
        </div>
      </Link>
    </section>
  );
}

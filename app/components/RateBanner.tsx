import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { PMMS } from "../lib/pmms";

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
 * does not fit the banner at 390px, and the 30-year is what people mean when
 * they say "the rate".
 */
export default function RateBanner() {
  if (!PMMS) return null;

  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-3">
        <Link
          href="/calculators/mortgage-payment"
          className="group flex flex-wrap items-center gap-x-3 gap-y-1 min-h-[44px] py-1 rounded-xl"
        >
          <span className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
          </span>

          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm md:text-base font-bold text-gray-900">
              {/* Exactly as published — do not round or reformat. */}
              {PMMS.rate30}%
            </span>
            <span className="text-xs text-gray-500">
              30-year fixed average, week ending {PMMS.weekLabel}
            </span>
          </span>

          {/* Hidden on the narrowest screens: the whole banner is already the
              link, and at 390px this pushed the row onto a third line. */}
          <span className="hidden sm:inline text-xs font-semibold text-green-700 group-hover:underline ml-auto whitespace-nowrap">
            Run your numbers →
          </span>
        </Link>

        <p className="text-xs text-gray-400 leading-relaxed">
          Source: {PMMS.attribution}. A national average, not a quote.
        </p>
      </div>
    </section>
  );
}

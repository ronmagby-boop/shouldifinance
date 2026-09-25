import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { HAS_RATES } from "../lib/rates";

/**
 * The secondary pill beside "Explore Our Calculators".
 *
 * WHAT THIS REPLACED. A full-width tinted strip between the white stats bar
 * and the green Explore button. It had a tint of its own precisely so it would
 * not read as part of the grey section below — and it still vanished, because
 * a thin band between a white bar and a large green button is the one place on
 * the page with nothing to hold the eye. Sitting it beside the button borrows
 * that attention instead of competing with it.
 *
 * NOT VISUALLY EQUAL, DELIBERATELY. Explore stays solid green: it is the
 * primary action and the reason the section exists. This is white with a green
 * border — same height, padding and radius, so the two read as a pair, but
 * clearly the second of the two. Two solid green pills would be two primary
 * actions, and the eye would have nowhere to go.
 *
 * STACKED ON MOBILE, AND THE SHORT LABEL WITH IT. See the wrapper in page.tsx
 * for why stacking is forced; the label shortens on the same breakpoint
 * because even at full width the long form wraps to two lines, which would
 * make one pill twice the height of the other.
 *
 * Renders nothing when there are no fresh rates — the same HAS_RATES gate the
 * strip used, for the same reason: /rates would be empty, and a signpost to an
 * empty page is worse than no signpost. The wrapper centres whatever is left,
 * so the Explore pill simply sits alone and centred.
 */
export default function RatesPill() {
  if (!HAS_RATES) return null;

  return (
    <Link
      href="/rates"
      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-green-50 text-green-800 font-bold rounded-full px-7 py-3.5 text-sm transition-colors border-2 border-green-700 w-full sm:w-auto"
    >
      <TrendingUp className="w-4 h-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
      {/* Short on a phone, full from sm up. The detail is what makes the link
          worth following, but it is 52 characters and wraps below sm. */}
      <span className="sm:hidden">Current rates</span>
      <span className="hidden sm:inline">
        Current rates — mortgage, auto, credit card and Treasury
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

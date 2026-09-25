import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "../components/GuideShell";
import AdUnit from "../components/AdUnit";
import { SITE, bySlug } from "../lib/calculators";
import {
  FRED_NOTICE,
  HAS_RATES,
  RATE_CATEGORIES,
  ratesIn,
  type Rate,
} from "../lib/rates";

const DESCRIPTION =
  "Current mortgage, Treasury, credit card, personal loan, CD and auto loan rates, each from its official source, with the date it was published and the calculator it belongs in.";

export const metadata: Metadata = {
  title: "Current rates",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/rates` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/rates`,
    title: "Current rates | ShouldIFinance",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Current rates | ShouldIFinance", description: DESCRIPTION },
};

/**
 * One figure, its date, what it is not, and the tool it belongs in.
 *
 * The whole card is the link. A rates page that is only rates is a dead end —
 * the number is never the answer to anything on its own, and the calculator is
 * where it becomes one.
 *
 * The date is not decoration. These seven series update on schedules ranging
 * from daily to quarterly, so "6.42%" means nothing without knowing whether it
 * is from Thursday or from last quarter. Each card carries its own.
 */
function RateCard({ rate }: { rate: Rate }) {
  const calc = bySlug(rate.calculator);
  return (
    <Link
      href={`/calculators/${rate.calculator}`}
      className="block border border-gray-200 rounded-2xl p-5 hover:border-green-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm font-medium text-gray-900">{rate.label}</h3>
        {/* Exactly as published — see the alteration note in lib/rates.ts. */}
        <span className="text-2xl font-medium text-green-700 tabular-nums shrink-0">{rate.text}%</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        {rate.dateLabel} · {rate.cadence}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">{rate.note}</p>
      <p className="text-[11px] text-gray-400 leading-relaxed mb-3">Source: {rate.source}</p>
      <span className="inline-flex items-center min-h-11 text-xs font-semibold text-green-700">
        {calc ? `Open ${calc.nav}` : "Open the calculator"} →
      </span>
    </Link>
  );
}

export default function RatesPage() {
  return (
    <GuideShell
      eyebrow="Rates"
      title="Current rates"
      intro="Seven figures, each from the body that publishes it, each shown exactly as published and dated. A rate is a starting point for a calculation, not an answer — every one here links to the tool it belongs in."
      back={{ href: "/", label: "Back to home" }}
    >
      {!HAS_RATES ? (
        /* Everything is behind a per-series staleness gate, so this is what a
           total feed outage looks like. Saying so is better than an empty page
           that reads as broken. */
        <p className="text-sm text-gray-500 leading-relaxed">
          No current rates to show. Every figure on this page is checked against the date its
          publisher gave it, and anything past its window is hidden rather than shown as though it
          were current. Please try again shortly.
        </p>
      ) : (
        <div className="space-y-10">
          {RATE_CATEGORIES.map((category) => {
            const rates = ratesIn(category);
            if (!rates.length) return null;
            return (
              <section key={category}>
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rates.map((r) => (
                    <RateCard key={r.key} rate={r} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Stated, not left as a gap. Both are absences a reader would otherwise
          assume were oversights. */}
      <section className="mt-12 border-t border-gray-100 pt-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">Two rates that are not here</h2>
        <div className="text-sm text-gray-700 leading-relaxed space-y-3">
          <p>
            <strong className="font-semibold text-gray-900">The S&amp;P 500.</strong> The index level
            is licensed data. S&amp;P Dow Jones Indices marks it as requiring pre-approval and states
            that reproduction in any form is prohibited without their prior written permission, so
            republishing it here would need a licence this site does not hold.
          </p>
          <p>
            <strong className="font-semibold text-gray-900">
              A high-yield savings rate.
            </strong>{" "}
            Nobody publishes one authoritatively. The FDIC figure that exists is a national average
            across every insured institution weighted by deposits — a different thing entirely, and
            currently a fraction of what online banks advertise. Quoting it as &ldquo;high-yield&rdquo;
            would be false, and quoting a single bank&apos;s offer would be an advertisement. The
            12-month CD average above is included precisely because the gap between it and what you
            can find is worth seeing.
          </p>
        </div>
      </section>

      {/* Below the rates and above the footer. Never between the cards, where
          an ad would read as one of the rates. */}
      <AdUnit placement="ratesBelow" />

      <section className="mt-10 border-t border-gray-100 pt-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">Where these come from</h2>
        <div className="text-xs text-gray-500 leading-relaxed space-y-2">
          <p>
            Mortgage rates are Freddie Mac&apos;s Primary Mortgage Market Survey. Treasury yields and
            the consumer credit rates are the Federal Reserve Board&apos;s H.15 and G.19 releases. The
            CD rate is the FDIC&apos;s national rate. Every figure is retrieved when this site is
            built, not when you visit, and is shown exactly as its publisher gave it — not rounded,
            averaged or recomputed.
          </p>
          <p>
            Each is hidden automatically once it passes the age its publisher&apos;s own schedule
            makes reasonable, so nothing here is presented as current when it is not. They are
            averages and benchmarks, never quotes: none of them is a rate anybody has offered you.
          </p>
          {/* Required verbatim by the FRED API terms of use. */}
          <p>{FRED_NOTICE}</p>
        </div>
      </section>

      <div className="border-t border-gray-100 mt-10 pt-4 flex flex-wrap gap-x-4">
        {[
          { href: "/calculators", label: "All calculators" },
          { href: "/guides", label: "Guides" },
        ].map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="inline-flex items-center min-h-11 py-2 text-xs font-semibold text-green-700 hover:underline"
          >
            {p.label} →
          </Link>
        ))}
      </div>
    </GuideShell>
  );
}

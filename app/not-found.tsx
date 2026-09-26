import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";
import MobileBottomNav, { MobileBottomNavSpacer } from "./components/MobileBottomNav";
import { byCategory, CALCULATORS, CATEGORY_SECTIONS, GUIDE_COVERAGE } from "./lib/calculators";

/**
 * The 404 page.
 *
 * It exists because this site is replacing one that has been indexed for
 * years, and a good share of the old URLs have no equivalent here — pages that
 * were duplicated in the old site builder, a blog that is not being carried
 * over, two calculators whose slugs were misspelled. Those links will keep
 * arriving for months, and every one of them lands on this page.
 *
 * So it is built as a way in, not an apology. One line saying the page is
 * gone, then the four categories with their real counts, the guides, and the
 * nav's search — which is the fastest route to a specific tool and comes free
 * with SiteNav. Someone arriving from a dead link should be one click from
 * whatever they were looking for.
 *
 * NOINDEX. A 404 must never be indexed, and this one is reachable at any URL,
 * so it would otherwise be a duplicate at every address a crawler tried.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That page does not exist on ShouldIFinance. Browse the calculators by category, read the guides, or search for the decision you are weighing up.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white font-sans flex flex-col">
      <SiteNav position="sticky" logo="wide" />

      <section className="bg-[#CCEEE7]">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-2">404</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
            That page doesn&apos;t exist
          </h1>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">
            The link may be from an older version of this site. Everything is still here — it has
            just moved. Pick a category below, or use the search in the header to go straight to a
            calculator.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 w-full">
        <h2 className="text-base font-bold text-gray-900 mb-3">Browse by category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {CATEGORY_SECTIONS.map((s) => {
            const count = byCategory(s.category).length;
            return (
              <Link
                key={s.id}
                href={`/calculators#${s.id}`}
                className="flex items-start gap-3 border border-gray-200 rounded-2xl p-4 hover:border-green-200 hover:shadow-sm transition-all"
              >
                <span
                  className={`w-9 h-9 ${s.tint} ${s.text} rounded-lg flex items-center justify-center flex-shrink-0`}
                >
                  <s.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{s.category}</span>
                  <span className="block text-xs text-gray-400 leading-relaxed mt-0.5">
                    {count} calculator{count === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <h2 className="text-base font-bold text-gray-900 mb-3">Or start here</h2>
        <div className="flex flex-col gap-2">
          {[
            { href: "/calculators", label: `All ${CALCULATORS.length} calculators`, sub: "The full list, grouped by category" },
            { href: "/guides", label: GUIDE_COVERAGE.prose, sub: "The rules behind the arithmetic, with sources" },
            { href: "/rates", label: "Current rates", sub: "Mortgage, auto, credit card and Treasury" },
            { href: "/", label: "Home", sub: "Start from the beginning" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-baseline justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-green-200 hover:shadow-sm transition-all min-h-11"
            >
              <span className="text-sm font-medium text-green-700">{l.label}</span>
              <span className="text-xs text-gray-400 text-right">{l.sub}</span>
            </Link>
          ))}
        </div>
      </div>

      <SiteFooter />

      <MobileBottomNav />
      <MobileBottomNavSpacer />
    </main>
  );
}

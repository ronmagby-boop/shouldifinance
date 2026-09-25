import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "../components/GuideShell";
import { BookOpen } from "lucide-react";
import { CATEGORY_SECTIONS, SITE, OG_IMAGE } from "../lib/calculators";
import { calculatorForGuide, GUIDE_CATEGORIES, GUIDES, guidesByCategory } from "../lib/guides";

const DESCRIPTION =
  "Plain-English explanations of the rules behind the calculators — what the numbers mean, which figures are excluded, and where the answers come from.";

export const metadata: Metadata = {
  title: "Guides",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/guides` },
  openGraph: {
    images: [OG_IMAGE],
    title: "Guides | ShouldIFinance",
    description: DESCRIPTION,
    url: `${SITE}/guides`,
    siteName: "ShouldIFinance",
    type: "website",
  },
  twitter: {
    images: [OG_IMAGE.url],
    card: "summary_large_image",
    title: "Guides | ShouldIFinance",
    description: DESCRIPTION,
  },
};

export default function GuidesIndex() {
  return (
    <GuideShell
      eyebrow="Guides"
      title="Guides"
      intro={DESCRIPTION}
      back={{ href: "/", label: "Back to home" }}
      meta={
        GUIDES.length > 0
          ? GUIDES.length === 1
            ? "One guide"
            : `${GUIDES.length} guides, grouped the way the calculators are`
          : null
      }
    >
      {GUIDES.length === 0 ? (
        <p className="text-sm text-gray-500">
          No guides have been published yet.{" "}
          <Link href="/calculators" className="text-green-700 underline">
            Browse the calculators
          </Link>{" "}
          in the meantime.
        </p>
      ) : (
        <div className="space-y-10">
          {/* Grouped by the same four categories the calculators use, in the
              same order. Categories with nothing written yet are left out
              rather than rendered as empty headings. */}
          {GUIDE_CATEGORIES.map((category) => {
            const section = CATEGORY_SECTIONS.find((s) => s.category === category)!;
            const guides = guidesByCategory(category);
            return (
              <section key={category} id={section.id} className="scroll-mt-20">
                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${section.tint} ${section.text}`}
                  >
                    <section.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{category}</h2>
                    <p className="text-xs text-gray-400">{section.blurb}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {guides.map((guide) => {
                    const calc = calculatorForGuide(guide);
                    /* A paired guide borrows its calculator's icon and tint, so
                       the two read as the same thing seen twice. An unpaired one
                       has nothing to borrow and takes the category's own colour
                       with a generic mark. */
                    const Icon = calc ? calc.icon : BookOpen;
                    const tint = calc ? calc.bg : section.tint;
                    return (
                      <Link
                        key={guide.slug}
                        href={`/guides/${guide.slug}`}
                        className="border border-gray-200 rounded-xl p-4 hover:border-green-200 hover:shadow-sm transition-all block"
                      >
                        <div
                          className={`w-9 h-9 ${tint} rounded-lg flex items-center justify-center mb-3 text-gray-700`}
                        >
                          <Icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">{guide.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed mb-2">
                          {guide.description}
                        </p>
                        {calc && (
                          <p className="text-xs text-gray-400">
                            Pairs with <span className="text-gray-500">{calc.nav}</span>
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="border-t border-gray-100 mt-12 pt-4">
        <Link
          href="/calculators"
          className="inline-flex items-center min-h-[44px] py-2 text-xs font-semibold text-green-700 hover:underline"
        >
          All calculators →
        </Link>
      </div>
    </GuideShell>
  );
}

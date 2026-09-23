import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { byCategory, CALCULATORS, CATEGORY_SECTIONS, SITE } from "../lib/calculators";
import SiteNav from "../components/SiteNav";
import MobileBottomNav, { MobileBottomNavSpacer } from "../components/MobileBottomNav";

export const metadata: Metadata = {
  title: `All ${CALCULATORS.length} Free Financial Calculators`,
  description:
    "Every ShouldIFinance calculator in one place — mortgages, refinancing, investing, retirement, auto loans and debt payoff. Free, no sign-up, runs in your browser.",
  keywords: [
    "financial calculators",
    "free mortgage calculator",
    "investment calculator",
    "auto loan calculator",
    "debt payoff calculator",
  ],
  alternates: { canonical: `${SITE}/calculators` },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: `${SITE}/calculators`,
    title: `All ${CALCULATORS.length} Free Financial Calculators | ShouldIFinance`,
    description:
      "Every ShouldIFinance calculator in one place. Free, no sign-up, runs in your browser.",
  },
};

export default function AllCalculators() {
  return (
    <main className="min-h-screen bg-white font-sans">

      <SiteNav position="sticky" logo="wide" />

      {/* HEADER */}
      <section className="bg-[#CCEEE7]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <Link href="/" className="text-xs font-semibold text-green-800 hover:underline">← Back to home</Link>
          <p className="text-xs font-bold text-green-800 uppercase tracking-widest mt-4 mb-2">Every Calculator</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
            All {CALCULATORS.length} free financial calculators.
          </h1>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed max-w-xl">
            No sign-up, no email required. Every tool runs in your browser and loads sample numbers
            if you just want to see how it works.
          </p>
        </div>
      </section>

      {/* CATEGORY JUMP LINKS */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex flex-wrap gap-2">
          {CATEGORY_SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 hover:border-green-200 hover:text-green-700 transition-colors">
              <s.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {s.category}
              <span className="text-gray-400">{byCategory(s.category).length}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ALL CALCULATORS, GROUPED BY CATEGORY */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8 space-y-10">
          {CATEGORY_SECTIONS.map(section => (
            <div key={section.id} id={section.id} className="scroll-mt-20">
              <div className="flex items-start gap-3 mb-4 pb-3 border-b border-gray-100">
                <span className={`w-9 h-9 rounded-xl ${section.tint} ${section.text} flex items-center justify-center flex-shrink-0`}>
                  <section.icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">{section.category}</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">{section.blurb}</p>
                </div>
                <span className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">
                  {byCategory(section.category).length} tools
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {byCategory(section.category).map(calc => (
                  <Link key={calc.slug} href={`/calculators/${calc.slug}`}
                    className="group bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg hover:border-green-100 transition-all flex items-start gap-3">
                    <div className={`w-10 h-10 ${calc.bg} rounded-xl flex items-center justify-center flex-shrink-0 text-gray-700`}>
                      <calc.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
                        {calc.nav}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{calc.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a2744] text-white mt-auto">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="max-w-xs">
              <span className="inline-flex bg-white rounded-lg px-3 py-2 mb-3">
                <Image src="/logo-wide.png" alt="ShouldIFinance" width={556} height={119} className="h-10 w-auto" />
              </span>
              <p className="text-xs text-gray-400 leading-relaxed">
                Better Questions. Smarter Decisions. Free financial tools for every stage of life.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              {CATEGORY_SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`} className="text-xs text-gray-400 hover:text-white transition-colors">
                  {s.category}
                </a>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">© 2025 ShouldIFinance.com. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Use", href: "/terms" },
                { label: "Disclaimer", href: "/disclaimer" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="text-xs text-gray-500 hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
      <MobileBottomNavSpacer />
    </main>
  );
}

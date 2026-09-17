"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { CATEGORY_SECTIONS, related, type Category } from "../lib/calculators";
import CalculatorSidebar, { CalculatorBrowseMobile } from "./CalculatorSidebar";
import MobileBottomNav, { MobileBottomNavSpacer } from "./MobileBottomNav";

const CATEGORY_HREF: Record<Category, string> = {
  "Real estate": "/calculators#real-estate",
  Investing: "/calculators#investing",
  Auto: "/calculators#auto",
};

const NAV_LINKS = [
  { label: "Calculators", href: "/calculators" },
  ...CATEGORY_SECTIONS.map(s => ({ label: s.category, href: `/calculators#${s.id}` })),
];

export type CalcShellProps = {
  slug: string;
  category: Category;
  eyebrow: string;
  title: string;
  intro: string;
  crumb: string;
  onExample: () => void;
  relatedSlugs?: string[];
  disclaimer: string;
  children: ReactNode;
};

/**
 * Page chrome shared by every calculator: nav, breadcrumb, heading,
 * related cards, disclaimer and the mobile bottom nav.
 */
export default function CalcShell({
  slug,
  category,
  eyebrow,
  title,
  intro,
  crumb,
  onExample,
  relatedSlugs,
  disclaimer,
  children,
}: CalcShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cards = related(slug, relatedSlugs);

  return (
    <main className="min-h-screen bg-white font-sans">
      {/* Widened from max-w-5xl to make room for the sidebar rail without
          narrowing the calculator itself (1280 - 220 rail > the old 1024). */}
      <div className="max-w-7xl mx-auto">
        {/* NAV */}
        <nav className="flex items-center justify-between gap-3 px-5 py-1.5 md:py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo.png" alt="ShouldIFinance" width={236} height={150} className="h-9 w-auto" priority />
          </Link>
          <div className="hidden md:flex gap-6">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-sm text-gray-500 hover:text-gray-900">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="md:hidden flex flex-col gap-1 p-1.5"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`block w-5 h-0.5 bg-gray-900 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-5 h-0.5 bg-gray-900 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-gray-900 transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-5 py-3 flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                className="text-sm text-gray-700 py-2.5 border-b border-gray-50">
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* BREADCRUMB */}
        <div className="px-5 py-1.5 md:py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-green-700">
            Home
          </Link>
          <span>›</span>
          <Link href={CATEGORY_HREF[category]} className="hover:text-green-700">
            {category}
          </Link>
          <span>›</span>
          <span className="text-gray-900">{crumb}</span>
        </div>

        <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)]">
        <CalculatorSidebar activeSlug={slug} />

        <div className="min-w-0">
        <CalculatorBrowseMobile activeSlug={slug} />

        <div className="px-5 py-4 md:py-6">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">{eyebrow}</p>
          <h1 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-2xl">{intro}</p>

          {/* Sits directly above the inputs — this is the moment someone decides
              whether to type their own numbers or see it working first. */}
          <button
            onClick={onExample}
            className="inline-flex items-center gap-2 mb-4 text-sm font-semibold border border-green-200 bg-green-50 text-green-800 rounded-xl px-4 py-2.5 hover:bg-green-100 hover:border-green-300 transition-colors"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            See with example numbers
          </button>

          {children}

          {/* RELATED */}
          <div className="mb-6">
            <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">
              Related calculators
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cards.map((card) => (
                <Link
                  key={card.slug}
                  href={`/calculators/${card.slug}`}
                  className="border border-gray-200 rounded-xl p-4 hover:border-green-200 hover:shadow-sm transition-all block"
                >
                  <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center mb-3 text-gray-700`}>
                    <card.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">{card.nav}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* DISCLAIMER */}
          <div className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
            {disclaimer}
          </div>
        </div>
        </div>
        </div>

        <MobileBottomNav />
        <MobileBottomNavSpacer />
      </div>
    </main>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { related, type Category } from "../lib/calculators";

const CATEGORY_HREF: Record<Category, string> = {
  "Real estate": "/#calculators",
  Investing: "/#calculators",
  Auto: "/#calculators",
  "Personal finance": "/#calculators",
};

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
      <div className="max-w-5xl mx-auto">
        {/* NAV */}
        <nav className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo.png" alt="ShouldIFinance logo" width={100} height={32} priority />
          </Link>
          <div className="hidden md:flex gap-6">
            {["Calculators", "Real estate", "Investing", "Blog", "About"].map((l) => (
              <Link key={l} href="/#calculators" className="text-sm text-gray-500 hover:text-gray-900">
                {l}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExample}
              className="text-xs border border-green-200 text-green-700 rounded-lg px-3 py-1.5 hover:bg-green-50 whitespace-nowrap"
            >
              See with example numbers
            </button>
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
            {["Calculators", "Real estate", "Investing", "Blog", "About"].map((l) => (
              <Link key={l} href="/#calculators" className="text-sm text-gray-700 py-2.5 border-b border-gray-50">
                {l}
              </Link>
            ))}
          </div>
        )}

        {/* BREADCRUMB */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
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

        <div className="px-5 py-6">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">{eyebrow}</p>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-2xl">{intro}</p>

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
                  <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center text-base mb-3`}>
                    {card.icon}
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

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50">
          <div className="flex justify-around">
            {[
              { icon: "🏠", label: "Real estate" },
              { icon: "📈", label: "Investing" },
              { icon: "🚗", label: "Auto" },
              { icon: "📝", label: "Blog" },
            ].map((item) => (
              <Link key={item.label} href="/#calculators" className="flex flex-col items-center gap-1 px-3 py-1">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs text-gray-500">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="md:hidden h-16" />
      </div>
    </main>
  );
}

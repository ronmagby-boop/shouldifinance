"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { bySlug, CATEGORY_SECTIONS, related, relatedGridClass } from "../lib/calculators";
import CalculatorSidebar, { CalculatorBrowseMobile } from "./CalculatorSidebar";
import MobileBottomNav, { MobileBottomNavSpacer } from "./MobileBottomNav";
import SiteNav from "./SiteNav";
import ExampleButton from "./ExampleButton";

export type CalcShellProps = {
  slug: string;
  /** All three default to the registry, so a rename there flows everywhere. */
  eyebrow?: string;
  title?: string;
  intro: string;
  crumb?: string;
  onExample: () => void;
  /** Empties every field back to the page's initial state. */
  onClear?: () => void;
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
  eyebrow,
  title,
  intro,
  crumb,
  onExample,
  onClear,
  relatedSlugs,
  disclaimer,
  children,
}: CalcShellProps) {
  const cards = related(slug, relatedSlugs);
  // Category comes from the registry rather than a prop, so it cannot drift
  // out of step with lib/calculators.ts the way the old hardcoded props did.
  const category = bySlug(slug)?.category ?? "Home";
  // The pairing lives on the registry entry rather than being read from the
  // markdown, because this component is client-side and lib/guides.ts touches
  // the filesystem. lib/guides.ts fails the build if the two disagree.
  const guide = bySlug(slug)?.guide;
  const section = CATEGORY_SECTIONS.find(s => s.category === category);
  const categoryHref = `/calculators#${section?.id ?? ""}`;
  const eyebrowText = eyebrow ?? `${category} tools`;
  const titleText = title ?? bySlug(slug)?.title ?? "";
  const crumbText = crumb ?? bySlug(slug)?.nav ?? "";

  return (
    <main className="min-h-screen bg-white font-sans">
      {/* Widened from max-w-5xl to make room for the sidebar rail without
          narrowing the calculator itself (1280 - 220 rail > the old 1024). */}
      <div className="max-w-7xl mx-auto">
        <SiteNav position="sticky" logo="compact" />

        {/* BREADCRUMB */}
        <div className="px-5 py-1.5 md:py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-green-700">
            Home
          </Link>
          <span>›</span>
          <Link href={categoryHref} className="hover:text-green-700">
            {category}
          </Link>
          <span>›</span>
          <span className="text-gray-900">{crumbText}</span>
        </div>

        <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)]">
        <CalculatorSidebar activeSlug={slug} />

        <div className="min-w-0">
        <CalculatorBrowseMobile activeSlug={slug} />

        <div className="px-5 py-4 md:py-6">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">{eyebrowText}</p>
          <h1 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">{titleText}</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-2xl">{intro}</p>

          {/* Sits directly above the inputs — this is the moment someone decides
              whether to type their own numbers or see it working first. */}
          <ExampleButton onLoad={onExample} onClear={onClear} />

          {children}

          {/* RELATED */}
          <div className="mb-6">
            <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">
              Related calculators
            </h2>
            <div className={relatedGridClass(cards.length)}>
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

          {/* GUIDE — the one link from a calculator into its written guide.
              Deliberately not a fifth related card: the grid above changes
              column count with the number of cards, so a guide sitting in it
              would re-lay the calculators out. Renders nothing at all when the
              calculator has no guide written yet. */}
          {guide && (
            <Link
              href={`/guides/${guide.slug}`}
              className="flex items-start gap-3 border border-gray-200 rounded-xl p-4 mb-6 bg-gray-50 hover:border-green-200 hover:shadow-sm transition-all"
            >
              <span className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 text-green-700">
                <BookOpen className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{guide.teaser}</span>
                <span className="block text-xs text-gray-400 leading-relaxed mt-0.5">
                  A written guide to the rules behind this calculator →
                </span>
              </span>
            </Link>
          )}

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

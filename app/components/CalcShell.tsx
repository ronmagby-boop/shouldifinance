"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { bySlug, CATEGORY_SECTIONS, related } from "../lib/calculators";
import RelatedCalculators from "./RelatedCalculators";
import SiteFooter from "./SiteFooter";
import AdUnit from "./AdUnit";
import GuideLink from "./GuideLink";
import ExportBar from "./ExportBar";
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
  const section = CATEGORY_SECTIONS.find(s => s.category === category);
  const categoryHref = `/calculators#${section?.id ?? ""}`;
  const eyebrowText = eyebrow ?? `${category} tools`;
  const titleText = title ?? bySlug(slug)?.title ?? "";
  const crumbText = crumb ?? bySlug(slug)?.nav ?? "";

  return (
    <main className="min-h-screen bg-white font-sans flex flex-col">
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
          <ExampleButton slug={slug} onLoad={onExample} onClear={onClear} />

          {children}

          {/* EXPORT — sits with the results, above the related grid, so it
              neither competes with the headline nor gets buried at the bottom.
              Placed before RELATED deliberately: the related grid's column
              count depends on card count and the guide link is a sibling of
              it, so neither is disturbed. */}
          <ExportBar slug={slug} />

          {/* AD — below the results and the export bar, above the related
              grid. Nothing sits above the calculator or between the inputs and
              the results: people arrive for a number and an ad in that path
              degrades the only thing they came for.

              AdUnit carries its own wide margin because this position has a
              control on each side — the export buttons above, the related
              links below — and an ad within mis-tap range of either is an
              invalid-click risk, not just an annoyance. */}
          <AdUnit placement="calculatorBelowResults" />

          {/* RELATED */}
          <RelatedCalculators from={slug} cards={cards} />

          <GuideLink slug={slug} />

          {/* DISCLAIMER */}
          <div
            className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6"
            data-x-disclaimer
          >
            {disclaimer}
          </div>
        </div>
        </div>
        </div>

        <MobileBottomNav />
        <MobileBottomNavSpacer />
      </div>

      {/* Outside the max-w-7xl wrapper so the footer's own band spans the full
          width, as it does on every other page. CalcShell rendered no footer at
          all until now, which is why all 43 calculators had none. */}
      <SiteFooter />
    </main>
  );
}

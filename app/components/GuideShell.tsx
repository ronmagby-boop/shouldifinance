import Link from "next/link";
import type { ReactNode } from "react";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import MobileBottomNav, { MobileBottomNavSpacer } from "./MobileBottomNav";

/**
 * Page chrome for /guides and /guides/[slug].
 *
 * Deliberately the same structure as LegalShell — sticky nav, mint header,
 * narrow reading column, shared footer, mobile bottom bar — so moving between a
 * calculator, a guide and a legal page never changes the design language.
 * Guides are prose, so they get the reading column rather than the calculator
 * pages' wide grid.
 */
export default function GuideShell({
  eyebrow,
  title,
  intro,
  back,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  back: { href: string; label: string };
  /** Small line under the intro — the reviewed date on a guide. */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white font-sans flex flex-col">
      <SiteNav position="sticky" logo="wide" />

      <section className="bg-[#CCEEE7]">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <Link href={back.href} className="text-xs font-semibold text-green-800 hover:underline">
            ← {back.label}
          </Link>
          <p className="text-xs font-bold text-green-800 uppercase tracking-widest mt-4 mb-2">{eyebrow}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3">{title}</h1>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">{intro}</p>
          {meta ? <div className="text-xs text-green-900/70 mt-4">{meta}</div> : null}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 w-full">{children}</div>

      <SiteFooter />

      <MobileBottomNav />
      <MobileBottomNavSpacer />
    </main>
  );
}

/**
 * The link from a guide into the calculator it explains. Used twice in a guide
 * page — once inline in the body, once as the closing call to action — so the
 * two cannot be styled differently by accident.
 */
export function CalculatorCta({
  href,
  title,
  desc,
  label = "Open the calculator",
}: {
  href: string;
  title: string;
  desc: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-gray-200 rounded-2xl p-5 bg-gray-50 hover:border-green-200 hover:shadow-sm transition-all"
    >
      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">{label}</p>
      <h2 className="text-base font-bold text-gray-900 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</p>
      <span className="inline-flex items-center min-h-[44px] text-sm font-semibold text-green-700">
        Run your numbers →
      </span>
    </Link>
  );
}

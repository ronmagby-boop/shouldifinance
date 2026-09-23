import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import SiteNav from "./SiteNav";
import MobileBottomNav, { MobileBottomNavSpacer } from "./MobileBottomNav";
import { LEGAL_UPDATED_ISO, LEGAL_UPDATED_LABEL } from "../lib/legal";

const LEGAL_PAGES = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/disclaimer", label: "Disclaimer" },
];

/**
 * Page chrome for the three legal documents: the site nav, a header carrying
 * the last-updated date, the prose column, and a footer that cross-links the
 * other two. Kept in one place so the three cannot drift apart in styling the
 * way the calculators once did in their maths.
 */
export default function LegalShell({
  eyebrow,
  title,
  intro,
  current,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  /** Path of the page being rendered, so it is not linked to itself. */
  current: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white font-sans flex flex-col">
      <SiteNav position="sticky" logo="wide" />

      <section className="bg-[#CCEEE7]">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <Link href="/" className="text-xs font-semibold text-green-800 hover:underline">
            ← Back to home
          </Link>
          <p className="text-xs font-bold text-green-800 uppercase tracking-widest mt-4 mb-2">
            {eyebrow}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
            {title}
          </h1>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">{intro}</p>
          <p className="text-xs text-green-900/70 mt-4">
            Last updated{" "}
            <time dateTime={LEGAL_UPDATED_ISO} className="font-semibold">
              {LEGAL_UPDATED_LABEL}
            </time>
          </p>
        </div>
      </section>

      {/* The prose column. Legal text is read, not scanned, so it stays narrow
          and the type stays larger than the calculators' dense figures. */}
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 w-full">
        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">{children}</div>

        {/* Standalone navigation, so these get a real touch target rather than
            the 16px a bare text link would be. */}
        <div className="border-t border-gray-100 mt-12 pt-4 flex flex-wrap gap-x-4">
          {LEGAL_PAGES.filter((p) => p.href !== current).map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="inline-flex items-center min-h-[44px] py-2 text-xs font-semibold text-green-700 hover:underline"
            >
              {p.label} →
            </Link>
          ))}
        </div>
      </div>

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
              <Link href="/calculators" className="text-xs text-gray-400 hover:text-white transition-colors">
                All calculators
              </Link>
              {LEGAL_PAGES.map((p) => (
                <Link key={p.href} href={p.href} className="text-xs text-gray-400 hover:text-white transition-colors">
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 mt-6 pt-5">
            <p className="text-xs text-gray-500">© 2025 ShouldIFinance.com. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
      <MobileBottomNavSpacer />
    </main>
  );
}

/** A numbered section heading plus its body, so the three pages match. */
export function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-base font-bold text-gray-900 mb-2">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** A callout for the things a reader most needs to not miss. */
export function Note({ tone = "amber", children }: { tone?: "amber" | "green"; children: ReactNode }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-green-200 bg-green-50 text-green-900",
  };
  return <div className={`border rounded-xl p-4 text-xs leading-relaxed ${tones[tone]}`}>{children}</div>;
}

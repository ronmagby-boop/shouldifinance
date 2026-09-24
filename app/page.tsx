"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator, FileText, BadgeCheck, ShieldCheck,
  ArrowRight, CheckCircle2, Search, Compass, ClipboardCheck,
} from "lucide-react";
import { byCategory, CALCULATORS, CATEGORY_SECTIONS, GUIDED } from "./lib/calculators";
import MobileBottomNav, { MobileBottomNavSpacer } from "./components/MobileBottomNav";
import SiteNav from "./components/SiteNav";

// hero.png (1176x628) has a near-uniform mint backdrop — its four corners sample
// #cdeee7 / #cceee7 / #cdeee7 / #ccede7, averaging the #CCEEE7 the section uses.
// Even so the edges are faded rather than butted against the section colour: a
// 2/255 step still reads as a line across a long edge, and the fade costs nothing.
//
// Stops are measured against the artwork box (x 306..1024, y 42..627). The 8/5
// crop keeps 14.3% clear background on the left and right and 6.7% on top, so
// those three fades never touch the phone, plant or floating icons.
//
// The bottom is the tight one: the source is cropped hard there, with the phone's
// solid base reaching row 625 of 628 — 0.3% off the edge. So the bottom fade is
// only 2%, just enough to kill the straight cut. Checked at 3x against 0% and 5%:
// 0% leaves a visible line across the box, 5% dissolves the phone's base and the
// plant pot, 2% softens the cut while both stay crisp.
const HERO_MASK = [
  "linear-gradient(to right, transparent 0%, #000 11%, #000 89%, transparent 100%)",
  "linear-gradient(to bottom, transparent 0%, #000 5%, #000 98%, transparent 100%)",
].join(", ");

/**
 * Number of guides, taken from the calculators that name one rather than typed
 * into the copy. The homepage used to claim "100+ Helpful Articles" and
 * "Updated Weekly"; neither was true. This one cannot go stale — lib/guides.ts
 * fails the build if the registry and content/guides/ disagree.
 */
const GUIDE_COUNT = GUIDED.length;

// Two gradients intersected: any pixel transparent in either layer is hidden.
const HERO_MASK_STYLE: React.CSSProperties = {
  maskImage: HERO_MASK,
  WebkitMaskImage: HERO_MASK,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

function EnvelopeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3 7 8.1 5.6a1.6 1.6 0 0 0 1.8 0L21 7" />
    </svg>
  );
}

/** Clipboard-with-checklist — stands in for the guides and checklists on offer. */
function ChecklistIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 7h-3a3 3 0 0 0-3 3v28a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V10a3 3 0 0 0-3-3h-3" />
      <rect x="17" y="4" width="14" height="6" rx="2" />
      <path d="m17.5 20.5 2.5 2.5 4.5-4.5" />
      <path d="m17.5 30.5 2.5 2.5 4.5-4.5" />
      <path d="M29 20h5M29 31h5" />
    </svg>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [decideQuery, setDecideQuery] = useState("");

  // Same matching rules as the nav search, so "pmi" or "car" both work here.
  const decideResults = useMemo(() => {
    const q = decideQuery.trim().toLowerCase();
    if (!q) return [];
    return CALCULATORS.filter(c =>
      c.nav.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.keywords.some(k => k.toLowerCase().includes(q)),
    ).slice(0, 6);
  }, [decideQuery]);

  return (
    <main className="min-h-screen bg-white font-sans">

      <SiteNav position="fixed" logo="wide" ctaHref="#resources" />

      {/* HERO — light mint band matching the illustration's own background;
          text on the left, phone illustration on the right, stacked on mobile. */}
      <section className="pt-14 md:pt-16 bg-[#CCEEE7]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-7 md:py-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">

          {/* Text */}
          <div className="w-full md:flex-1 max-w-lg">
            <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-3">Financial Tools &amp; Guidance</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
              Better questions.<br />
              <span className="text-green-700">Smarter decisions.</span>
            </h1>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-5 max-w-sm">
              Whether you&apos;re buying a home, refinancing, investing, or just trying to make smarter money moves — we give you the tools, answers and insights to help you decide.
            </p>

            {/* Search lives here, in the first thing anyone sees. The results
                panel is absolutely positioned so opening it never reflows the
                hero or shoves the illustration down the page. */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={decideQuery}
                onChange={e => setDecideQuery(e.target.value)}
                placeholder="What are you trying to decide?"
                aria-label="Search calculators"
                className="w-full bg-white border border-gray-200 rounded-full pl-12 pr-4 py-3.5 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />

              {decideQuery.trim() !== "" && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                  {decideResults.length === 0 ? (
                    <div className="px-4 py-5">
                      <p className="text-sm text-gray-500 mb-2">
                        Nothing matches &ldquo;{decideQuery}&rdquo;.
                      </p>
                      <Link href="/calculators" className="text-sm font-semibold text-green-700 hover:underline">
                        Browse all {CALCULATORS.length} calculators &rarr;
                      </Link>
                    </div>
                  ) : (
                    decideResults.map(c => (
                      <Link key={c.slug} href={`/calculators/${c.slug}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 group">
                        <span className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0 text-gray-700`}>
                          <c.icon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors truncate">
                            {c.nav}
                          </span>
                          <span className="block text-xs text-gray-400">{c.category}</span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-700 flex-shrink-0" aria-hidden="true" />
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Illustration — one 8/5 box at every width, so a single crop serves
              both layouts. 8/5 is narrower than the source's 1.873, meaning the
              full height is always kept and only the art's empty left margin is
              trimmed; object-position 95% then centres the artwork in the frame,
              leaving the phone, plant and floating icons whole. The mask on this
              wrapper dissolves all four edges into the section colour — see
              HERO_MASK for how the stops were measured. */}
          <div
            className="relative w-full max-w-sm mx-auto md:mx-0 md:flex-1 aspect-[8/5] md:max-w-md"
            style={HERO_MASK_STYLE}
          >
            <Image
              src="/hero.png"
              alt="Phone showing a portfolio allocation chart alongside a financial checklist"
              fill
              preload
              sizes="(max-width: 768px) 90vw, 40vw"
              className="object-cover object-[95%_center]"
            />
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-white border-y border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { Icon: Calculator, num: `${CALCULATORS.length}`, label: "Free Calculators" },
              { Icon: FileText, num: `${GUIDE_COUNT}`, label: GUIDE_COUNT === 1 ? "In-Depth Guide" : "In-Depth Guides" },
              { Icon: BadgeCheck, num: "Expert", label: "Real-World Advice" },
              { Icon: ShieldCheck, num: "Trusted", label: "For Every Stage of Life" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-4 md:px-8 py-3">
                <span className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
                  <s.Icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm md:text-base font-bold text-gray-900">{s.num}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DECIDE — search plus the four category doors. Replaces the old
          "Popular Tools" grid; example calculators now live inside each card. */}
      <section id="calculators" aria-label="Browse calculators by topic"
        className="py-10 md:py-14 bg-gray-50 scroll-mt-14 md:scroll-mt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          {/* Browse, for anyone who would rather look around than search. */}
          <div className="text-center mb-8 md:mb-10">
            <Link href="/calculators"
              className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold rounded-full px-7 py-3.5 text-sm transition-colors shadow-md">
              <Calculator className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              Explore Our Calculators
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>

          {/* Four category doors; byCategory puts the "Should I ...?" tools first */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORY_SECTIONS.map(section => {
              const all = byCategory(section.category);
              const picks = all.slice(0, 4);
              return (
                <div key={section.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-green-100 transition-all flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-11 h-11 rounded-xl ${section.tint} ${section.text} flex items-center justify-center flex-shrink-0`}>
                      <section.icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <Link href={`/calculators#${section.id}`}
                        className="block text-base font-extrabold text-gray-900 hover:text-green-700 transition-colors">
                        {section.category}
                      </Link>
                      <span className="block text-xs text-gray-400">{all.length} calculators</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {picks.map(c => (
                      <li key={c.slug}>
                        <Link href={`/calculators/${c.slug}`}
                          className="group flex items-start gap-2 text-sm text-gray-600 hover:text-green-700 transition-colors">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-green-600 flex-shrink-0" />
                          <span className="leading-snug">{c.nav}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link href={`/calculators#${section.id}`}
                    className={`inline-flex items-center gap-1 text-xs font-bold ${section.text} hover:underline mt-auto`}>
                    All {section.category.toLowerCase()} calculators
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-7">
            <Link href="/calculators"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline">
              Explore all {CALCULATORS.length} calculators
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED CALCULATOR SPOTLIGHT */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2">

            {/* A mock of the calculator's own output — the figures add to $2,487 */}
            <div className="bg-[#1a2744] p-6 md:p-10 flex items-center justify-center">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
                <p className="text-xs text-gray-400 mb-1">Current monthly payment</p>
                <p className="text-3xl font-extrabold text-green-700 mb-4">
                  $2,487<span className="text-base font-bold text-gray-400">/mo</span>
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Principal & interest", value: "$1,847" },
                    { label: "Property taxes", value: "$400" },
                    { label: "Insurance", value: "$120" },
                    { label: "PMI", value: "None" },
                    { label: "HOA", value: "$120" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-bold ${row.value === "None" ? "text-green-700" : "text-gray-900"}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10 flex flex-col justify-center">
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Featured calculator</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-3">
                What am I really paying on my mortgage?
              </h2>
              <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-6">
                Your payment is more than principal and interest. Taxes, insurance, PMI and HOA
                all ride along, and lenders quote them inconsistently. Put your numbers in once
                and see the whole payment broken out, plus what the loan really costs over its life.
              </p>
              <Link href="/calculators/mortgage-payment"
                className="inline-flex items-center gap-2 self-start bg-green-700 hover:bg-green-800 text-white font-bold rounded-full px-7 py-3.5 text-sm transition-colors shadow-md">
                Run my numbers
                <ArrowRight className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-10 md:py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">How it works</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
              How ShouldIFinance works
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-5">
            {[
              { Icon: Compass, step: "1", title: "Explore", desc: "Choose a topic or search for the decision you are weighing up." },
              { Icon: Calculator, step: "2", title: "Run the numbers", desc: "Enter your details, or load example numbers to see it working first." },
              { Icon: ClipboardCheck, step: "3", title: "Get the facts", desc: "Review clear results, with the trade-offs and totals spelled out." },
              { Icon: CheckCircle2, step: "4", title: "Make the best decision", desc: "Move forward knowing what each option actually costs you." },
            ].map(s => (
              <li key={s.step} className="flex flex-col items-center text-center md:items-start md:text-left">
                <span className="relative w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-3">
                  <s.Icon className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="bg-[#1a2744] py-7 md:py-8">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x sm:divide-white/10">
            {[
              { Icon: FileText, num: `${GUIDE_COUNT}`, label: GUIDE_COUNT === 1 ? "In-Depth Guide" : "In-Depth Guides" },
              { Icon: Calculator, num: `${CALCULATORS.length}`, label: "Calculators & Tools" },
              { Icon: ShieldCheck, num: "No Signup", label: "Free, And Nothing Tracked" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 md:px-8">
                <span className="w-9 h-9 rounded-xl bg-white/10 text-green-300 flex items-center justify-center flex-shrink-0">
                  <s.Icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm md:text-base font-bold text-white">{s.num}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMAIL SIGNUP — target of the nav's "Get Free Resources" button */}
      <section id="resources" className="py-8 md:py-12 bg-white scroll-mt-14 md:scroll-mt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="bg-gray-50 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="flex-1 w-full">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center mb-3 text-green-700">
                <EnvelopeIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">Get Free Financial Resources</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-md">
                Join our newsletter and get our top financial guides, checklists and tips delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400 bg-white"
                />
                <button className="bg-green-700 text-white text-sm font-bold rounded-full px-6 py-3 hover:bg-green-800 whitespace-nowrap transition-colors">
                  Subscribe
                </button>
              </div>
              <div className="flex items-center gap-5 mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" /> No spam
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" /> Unsubscribe anytime
                </span>
              </div>
            </div>
            <div className="hidden md:flex w-36 h-36 bg-green-50 rounded-3xl items-center justify-center flex-shrink-0 text-green-700">
              <ChecklistIcon className="w-20 h-20" />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a2744] text-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="max-w-xs">
              <span className="inline-flex bg-white rounded-lg px-3 py-2 mb-3">
                <Image src="/logo-wide.png" alt="ShouldIFinance" width={556} height={119} className="h-10 w-auto" />
              </span>
              <p className="text-xs text-gray-400 leading-relaxed">Better Questions. Smarter Decisions. Free financial tools for every stage of life.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-sm w-full md:w-auto">
              <div>
                <p className="font-bold text-white mb-3 text-sm">Tools</p>
                {[
                  { label: "All calculators", href: "/calculators" },
                  ...CATEGORY_SECTIONS.map(s => ({ label: s.category, href: `/calculators#${s.id}` })),
                ].map(l => (
                  <Link key={l.label} href={l.href} className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">{l.label}</Link>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-3 text-sm">Learn</p>
                {/* Guides is the whole of it. Articles, Blog and FAQ used to sit
                    here as "#" placeholders, which read as an unfinished site;
                    there is one content section and this is it. An unpaired
                    piece still belongs in Guides. */}
                <Link href="/guides" className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">Guides</Link>
              </div>
              <div>
                <p className="font-bold text-white mb-3 text-sm">Company</p>
                {/* About is still a placeholder — its copy is drafted but not
                    approved, and a page that says nothing is worse than none.
                    Contact is real. */}
                <a href="#" className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">About</a>
                <Link href="/contact" className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">Contact</Link>
                {[
                  { label: "Disclaimer", href: "/disclaimer" },
                  { label: "Privacy", href: "/privacy" },
                  { label: "Terms", href: "/terms" },
                ].map(l => (
                  <Link key={l.label} href={l.href} className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">{l.label}</Link>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-3 text-sm">Follow Us</p>
                <div className="flex gap-3">
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-xs font-bold">
                    in
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-xs font-bold">
                    ig
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
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

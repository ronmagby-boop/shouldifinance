"use client";
import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Calculator, FileText, BadgeCheck, ShieldCheck, Users, CalendarClock,
  Landmark, House, RefreshCw, PiggyBank, Car, TrendingUp, Star, ArrowRight, Search, CheckCircle2,
} from "lucide-react";
import { CALCULATORS, CATEGORY_SECTIONS } from "./lib/calculators";
import MobileBottomNav, { MobileBottomNavSpacer } from "./components/MobileBottomNav";

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

// Every nav target now lives on /calculators — the homepage no longer carries a
// full listing, so these are real routes rather than same-page anchors.
const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Calculators", href: "/calculators" },
  ...CATEGORY_SECTIONS.map(s => ({ label: s.category, href: `/calculators#${s.id}` })),
];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Nav search: matches the display name, full title and the SEO keywords, so
  // "house" finds "How much house can I afford?" and "PMI" finds the mortgage tool.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CALCULATORS.filter(c =>
      c.nav.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.keywords.some(k => k.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [query]);

  const closeSearch = () => { setSearchOpen(false); setQuery(""); };

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSearch(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const calculators = [
    { icon: Landmark, bg: "bg-blue-50", title: "Mortgage Calculator", desc: "Find out what you can afford and estimate your payments.", href: "/calculators/mortgage-payment" },
    { icon: House, bg: "bg-green-50", title: "Rent vs. Buy", desc: "See which option makes more financial sense for you.", href: "/calculators/rent-vs-buy" },
    { icon: RefreshCw, bg: "bg-purple-50", title: "Refinance Calculator", desc: "Find out if refinancing could save you money.", href: "/calculators/should-i-refinance" },
    { icon: PiggyBank, bg: "bg-orange-50", title: "Retirement Calculator", desc: "Plan for the future and see how your savings add up.", href: "/calculators/retirement-savings" },
    { icon: Car, bg: "bg-teal-50", title: "Lease vs. Buy", desc: "Compare the true cost of leasing or buying your next car.", href: "/calculators/lease-vs-buy" },
    { icon: TrendingUp, bg: "bg-emerald-50", title: "Investment Calculator", desc: "See how your money can grow with compound interest.", href: "/calculators/compound-interest" },
  ];

  return (
    <main className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 py-2">
          <Link href="/">
            <Image src="/logo-wide.png" alt="ShouldIFinance" width={556} height={119} className="h-10 md:h-12 w-auto" priority />
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="text-sm text-gray-600 hover:text-green-700 font-medium transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search calculators"
              className="text-gray-400 hover:text-green-700 p-2 rounded-full hover:bg-gray-50 transition-colors">
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
            <a href="#resources"
              className="bg-green-700 text-white text-sm font-semibold rounded-full px-5 py-2 hover:bg-green-800 transition-colors">
              Get Free Resources
            </a>
          </div>
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search calculators"
              className="text-gray-400 hover:text-green-700 p-2">
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
          <button className="flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-900 ${menuOpen ? "opacity-0" : ""}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
          </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-2">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="text-sm text-gray-700 py-2.5 border-b border-gray-50 font-medium">{l.label}</a>
            ))}
            <a href="#resources" onClick={() => setMenuOpen(false)}
              className="w-full text-center bg-green-700 text-white rounded-full py-3 text-sm font-semibold mt-3">
              Get Free Resources
            </a>
          </div>
        )}
      </nav>

      {/* SEARCH OVERLAY */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm px-4 pt-20 md:pt-28"
          onClick={closeSearch}>
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${CALCULATORS.length} calculators…`}
                className="flex-1 py-4 text-sm focus:outline-none"
              />
              <button onClick={closeSearch} aria-label="Close search"
                className="text-xs font-semibold text-gray-400 hover:text-gray-700 px-2 py-1">
                ESC
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() === "" ? (
                <p className="px-4 py-6 text-sm text-gray-400">
                  Start typing to find a calculator — try “mortgage”, “retirement” or “car”.
                </p>
              ) : results.length === 0 ? (
                <div className="px-4 py-6">
                  <p className="text-sm text-gray-500 mb-3">
                    No calculator matches “{query}”.
                  </p>
                  <Link href="/calculators" onClick={closeSearch}
                    className="text-sm text-green-700 font-semibold hover:underline">
                    Browse all {CALCULATORS.length} calculators →
                  </Link>
                </div>
              ) : (
                results.map(c => (
                  <Link key={c.slug} href={`/calculators/${c.slug}`} onClick={closeSearch}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 group">
                    <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0 text-gray-700`}>
                      <c.icon className="w-4.5 h-4.5" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors">{c.nav}</p>
                      <p className="text-xs text-gray-500 truncate">{c.category} · {c.desc}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* HERO — light mint band matching the illustration's own background;
          text on the left, phone illustration on the right, stacked on mobile. */}
      <section className="pt-14 md:pt-16 bg-[#CCEEE7]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

          {/* Text */}
          <div className="w-full md:flex-1 max-w-lg">
            <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-4">Financial Tools &amp; Guidance</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              Better questions.<br />
              <span className="text-green-700">Smarter decisions.</span>
            </h1>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-6 max-w-sm">
              Whether you&apos;re buying a home, refinancing, investing, or just trying to make smarter money moves — we give you the tools, answers and insights to help you decide.
            </p>
            <Link href="/calculators"
              className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold rounded-full px-7 py-3.5 text-sm transition-colors shadow-md">
              <Calculator className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              Explore Our Calculators
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>

          {/* Illustration — one 8/5 box at every width, so a single crop serves
              both layouts. 8/5 is narrower than the source's 1.873, meaning the
              full height is always kept and only the art's empty left margin is
              trimmed; object-position 95% then centres the artwork in the frame,
              leaving the phone, plant and floating icons whole. The mask on this
              wrapper dissolves all four edges into the section colour — see
              HERO_MASK for how the stops were measured. */}
          <div
            className="relative w-full md:flex-1 aspect-[8/5] md:max-w-lg"
            style={HERO_MASK_STYLE}
          >
            <Image
              src="/hero.png"
              alt="Phone showing a portfolio allocation chart alongside a financial checklist"
              fill
              preload
              sizes="(max-width: 768px) 100vw, 45vw"
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
              { Icon: Calculator, num: "25+", label: "Free Calculators" },
              { Icon: FileText, num: "100+", label: "Helpful Articles" },
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

      {/* POPULAR TOOLS — the six featured tools only; the full list lives on /calculators */}
      <section id="calculators" className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between mb-5 md:mb-6">
            <div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Popular Tools</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                Get answers to your biggest<br className="hidden md:block" /> financial questions.
              </h2>
            </div>
            <Link href="/calculators" className="hidden md:flex items-center gap-1 text-sm text-green-700 font-semibold hover:underline whitespace-nowrap ml-4">
              View All {CALCULATORS.length} Calculators →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {calculators.map((calc) => (
              <Link key={calc.title} href={calc.href}
                className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 hover:shadow-lg hover:border-green-100 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 ${calc.bg} rounded-full flex items-center justify-center text-gray-700`}>
                    <calc.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-800 bg-green-50 border border-green-100 rounded-full px-2 py-1">
                    <Star className="w-3 h-3 fill-current" aria-hidden="true" /> Most Popular
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5 group-hover:text-green-700 transition-colors">{calc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{calc.desc}</p>
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-green-700 group-hover:border-green-700 group-hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-5 md:hidden">
            <Link href="/calculators" className="text-sm text-green-700 font-semibold hover:underline">
              View All {CALCULATORS.length} Calculators →
            </Link>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="bg-[#1a2744] py-7 md:py-8">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-0 md:divide-x md:divide-white/10">
            {[
              { Icon: Users, num: "200K+", label: "Monthly Visitors" },
              { Icon: FileText, num: "100+", label: "Articles & Guides" },
              { Icon: Calculator, num: "25+", label: "Calculators & Tools" },
              { Icon: CalendarClock, num: "Updated Weekly", label: "New Content & Insights" },
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
                  className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-green-400 bg-white"
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
                {["Articles","Guides","Blog","FAQ"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-3 text-sm">Company</p>
                {["About","Contact","Disclaimer","Privacy"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2 text-xs transition-colors">{l}</a>
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
            <div className="flex gap-5">
              {["Privacy Policy","Terms of Use","Disclaimer"].map(l => (
                <a key={l} href="#" className="text-xs text-gray-500 hover:text-white transition-colors">{l}</a>
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

"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");

  const calculators = [
    { icon: "🏦", bg: "bg-blue-50", title: "Mortgage Calculator", desc: "Find out what you can afford and estimate your payments.", href: "/calculators/mortgage-payment" },
    { icon: "🏠", bg: "bg-green-50", title: "Rent vs. Buy", desc: "See which option makes more financial sense for you.", href: "/calculators/rent-vs-buy" },
    { icon: "🔄", bg: "bg-purple-50", title: "Refinance Calculator", desc: "Find out if refinancing could save you money.", href: "/calculators/should-i-refinance" },
    { icon: "🐷", bg: "bg-orange-50", title: "Retirement Calculator", desc: "Plan for the future and see how your savings add up.", href: "/calculators/retirement-savings" },
    { icon: "🚗", bg: "bg-teal-50", title: "Lease vs. Buy", desc: "Compare the true cost of leasing or buying your next car.", href: "/calculators/lease-vs-buy" },
    { icon: "📈", bg: "bg-emerald-50", title: "Investment Calculator", desc: "See how your money can grow with compound interest.", href: "/calculators/compound-interest" },
  ];

  return (
    <main className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 py-3">
          <Link href="/">
            <Image src="/logo.png" alt="ShouldIFinance logo" width={130} height={42} priority />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#calculators" className="text-sm text-gray-600 hover:text-green-700 font-medium">Calculators</a>
            <a href="#" className="text-sm text-gray-600 hover:text-green-700 font-medium">Articles</a>
            <a href="#" className="text-sm text-gray-600 hover:text-green-700 font-medium">Guides</a>
            <a href="#" className="text-sm text-gray-600 hover:text-green-700 font-medium">About</a>
            <a href="#" className="text-sm text-gray-600 hover:text-green-700 font-medium">Contact</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2">🔍</button>
            <button className="bg-green-700 text-white text-sm font-medium rounded-full px-5 py-2.5 hover:bg-green-800 transition-colors">
              Get Free Resources
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <div className={`w-6 h-0.5 bg-gray-900 mb-1.5 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}></div>
            <div className={`w-6 h-0.5 bg-gray-900 mb-1.5 ${menuOpen ? "opacity-0" : ""}`}></div>
            <div className={`w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}></div>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 flex flex-col gap-3">
            {["Calculators","Articles","Guides","About","Contact"].map(l => (
              <a key={l} href="#" className="text-sm text-gray-700 py-2 border-b border-gray-50">{l}</a>
            ))}
            <button className="w-full bg-green-700 text-white rounded-full py-3 text-sm font-medium mt-2">Get Free Resources</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-[580px] md:min-h-[640px] flex items-center pt-16">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero.jpg"
            alt="Family looking at sunset over a city"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-16">
          <p className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">Financial Tools &amp; Guidance</p>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-2xl">
            Better questions.<br />
            <span className="text-green-400">Smarter decisions.</span>
          </h1>
          <p className="text-base md:text-lg text-gray-200 leading-relaxed mb-8 max-w-xl">
            Whether you're buying a home, refinancing, investing, or just trying to make smarter money moves — we give you the tools, answers and insights to help you decide.
          </p>
          <Link href="#calculators"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full px-7 py-4 text-sm transition-colors">
            🧮 Explore Our Calculators →
          </Link>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { icon: "🧮", num: "25+", label: "Free Calculators" },
              { icon: "📄", num: "100+", label: "Helpful Articles" },
              { icon: "👥", num: "Expert", label: "Real-World Advice" },
              { icon: "🛡️", num: "Trusted", label: "For Every Stage of Life" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-4 md:px-8 py-5">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="text-base font-bold text-gray-900">{s.num}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR TOOLS */}
      <section id="calculators" className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">Popular Tools</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                Get answers to your biggest<br className="hidden md:block" /> financial questions.
              </h2>
            </div>
            <a href="#" className="hidden md:flex items-center gap-1 text-sm text-green-700 font-medium hover:underline">
              View All Calculators →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calculators.map((calc) => (
              <Link key={calc.title} href={calc.href}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-100 transition-all group">
                <div className={`w-14 h-14 ${calc.bg} rounded-full flex items-center justify-center text-2xl mb-5`}>
                  {calc.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{calc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{calc.desc}</p>
                <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-green-700 group-hover:border-green-700 group-hover:text-white transition-all">
                  →
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8 md:hidden">
            <a href="#" className="text-sm text-green-700 font-medium hover:underline">View All Calculators →</a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="bg-[#1a2744] py-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/10">
            {[
              { icon: "👥", num: "200K+", label: "Monthly Visitors" },
              { icon: "📄", num: "1,000+", label: "Articles & Guides" },
              { icon: "🧮", num: "25+", label: "Calculators & Tools" },
              { icon: "📅", num: "Updated Weekly", label: "New Content & Insights" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 md:px-8">
                <span className="text-2xl opacity-80">{s.icon}</span>
                <div>
                  <div className="text-base font-bold text-white">{s.num}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMAIL SIGNUP */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="bg-gray-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl mb-5">📬</div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Get Free Financial Resources</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-md">
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
                <button className="bg-green-700 text-white text-sm font-medium rounded-full px-6 py-3 hover:bg-green-800 whitespace-nowrap transition-colors">
                  Subscribe
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-gray-400 flex items-center gap-1">✅ No spam</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">✅ Unsubscribe anytime</span>
              </div>
            </div>
            <div className="hidden md:block w-48 h-48 bg-green-50 rounded-2xl flex items-center justify-center">
              <span className="text-7xl">📚</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a2744] text-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
            <div>
              <Image src="/logo.png" alt="ShouldIFinance logo" width={140} height={45} className="brightness-0 invert mb-3" />
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Better Questions. Smarter Decisions. Free financial tools for every stage of life.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              <div>
                <p className="font-semibold text-white mb-3">Tools</p>
                {["Calculators","Real Estate","Investing","Auto"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2 text-xs">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-white mb-3">Learn</p>
                {["Articles","Guides","Blog","FAQ"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2 text-xs">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-white mb-3">Company</p>
                {["About","Contact","Disclaimer","Privacy"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2 text-xs">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-white mb-3">Follow Us</p>
                <div className="flex gap-3">
                  <a href="#" className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-xs font-bold">in</a>
                  <a href="#" className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-xs font-bold">ig</a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">© 2025 ShouldIFinance.com. All rights reserved.</p>
            <div className="flex gap-4">
              {["Privacy Policy","Terms of Use","Disclaimer"].map(l => (
                <a key={l} href="#" className="text-xs text-gray-500 hover:text-white">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50">
        <div className="flex justify-around">
          {[{icon:"🏠",label:"Real estate"},{icon:"📈",label:"Investing"},{icon:"🚗",label:"Auto"},{icon:"📝",label:"Blog"}].map(item => (
            <button key={item.label} className="flex flex-col items-center gap-1 px-3 py-1">
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs text-gray-500">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="md:hidden h-16"></div>

    </main>
  );
}
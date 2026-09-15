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
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 py-2">
          <Link href="/">
            <Image src="/logo.png" alt="ShouldIFinance logo" width={110} height={36} priority />
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {["Calculators","Articles","Guides","About","Contact"].map(l => (
              <a key={l} href="#" className="text-sm text-gray-600 hover:text-green-700 font-medium transition-colors">{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-700 p-2">🔍</button>
            <button className="bg-green-700 text-white text-sm font-semibold rounded-full px-5 py-2 hover:bg-green-800 transition-colors">
              Get Free Resources
            </button>
          </div>
          <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-900 ${menuOpen ? "opacity-0" : ""}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-2">
            {["Calculators","Articles","Guides","About","Contact"].map(l => (
              <a key={l} href="#" className="text-sm text-gray-700 py-2.5 border-b border-gray-50 font-medium">{l}</a>
            ))}
            <button className="w-full bg-green-700 text-white rounded-full py-3 text-sm font-semibold mt-3">Get Free Resources</button>
          </div>
        )}
      </nav>

      {/* HERO — full width with blended photo */}
      <section className="pt-14 relative min-h-[480px] md:min-h-[540px] flex items-center overflow-hidden bg-white">
        {/* Photo — full right side */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero.jpg"
            alt="Family looking at sunset over a city"
            className="w-full h-full object-cover object-center"
          />
          {/* Gradient — blends photo to white on the left */}
          <div className="absolute inset-0"
            style={{background: "linear-gradient(to right, white 35%, rgba(255,255,255,0.95) 45%, rgba(255,255,255,0.5) 60%, rgba(255,255,255,0) 80%)"}}
          ></div>
          {/* Also fade top and bottom slightly */}
          <div className="absolute inset-0"
            style={{background: "linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 20%, transparent 80%, rgba(255,255,255,0.3) 100%)"}}
          ></div>
        </div>

        {/* Text content — left side */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="max-w-lg">
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-4">Financial Tools &amp; Guidance</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              Better questions.<br />
              <span className="text-green-600">Smarter decisions.</span>
            </h1>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-7 max-w-sm">
              Whether you're buying a home, refinancing, investing, or just trying to make smarter money moves — we give you the tools, answers and insights to help you decide.
            </p>
            <a href="#calculators"
              className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold rounded-full px-7 py-3.5 text-sm transition-colors shadow-md">
              🧮 Explore Our Calculators →
            </a>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-white border-y border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { icon: "🧮", num: "25+", label: "Free Calculators" },
              { icon: "📄", num: "100+", label: "Helpful Articles" },
              { icon: "👥", num: "Expert", label: "Real-World Advice" },
              { icon: "🛡️", num: "Trusted", label: "For Every Stage of Life" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-4 md:px-8 py-4">
                <span className="text-xl md:text-2xl">{s.icon}</span>
                <div>
                  <div className="text-sm md:text-base font-bold text-gray-900">{s.num}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR TOOLS */}
      <section id="calculators" className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Popular Tools</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                Get answers to your biggest<br className="hidden md:block" /> financial questions.
              </h2>
            </div>
            <a href="#" className="hidden md:flex items-center gap-1 text-sm text-green-700 font-semibold hover:underline whitespace-nowrap ml-4">
              View All Calculators →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {calculators.map((calc) => (
              <Link key={calc.title} href={calc.href}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-green-100 transition-all group cursor-pointer">
                <div className={`w-14 h-14 ${calc.bg} rounded-full flex items-center justify-center text-2xl mb-4`}>
                  {calc.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{calc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{calc.desc}</p>
                <div className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-green-700 group-hover:border-green-700 group-hover:text-white transition-all text-sm font-bold">
                  →
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6 md:hidden">
            <a href="#" className="text-sm text-green-700 font-semibold hover:underline">View All Calculators →</a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="bg-[#1a2744] py-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-white/10">
            {[
              { icon: "👥", num: "200K+", label: "Monthly Visitors" },
              { icon: "📄", num: "1,000+", label: "Articles & Guides" },
              { icon: "🧮", num: "25+", label: "Calculators & Tools" },
              { icon: "📅", num: "Updated Weekly", label: "New Content & Insights" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 md:px-8">
                <span className="text-2xl opacity-80">{s.icon}</span>
                <div>
                  <div className="text-sm md:text-base font-bold text-white">{s.num}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMAIL SIGNUP */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="bg-gray-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 w-full">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl mb-5">📬</div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">Get Free Financial Resources</h2>
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
                <button className="bg-green-700 text-white text-sm font-bold rounded-full px-6 py-3 hover:bg-green-800 whitespace-nowrap transition-colors">
                  Subscribe
                </button>
              </div>
              <div className="flex items-center gap-5 mt-4">
                <span className="text-xs text-gray-400">✅ No spam</span>
                <span className="text-xs text-gray-400">✅ Unsubscribe anytime</span>
              </div>
            </div>
            <div className="hidden md:flex w-44 h-44 bg-green-50 rounded-3xl items-center justify-center flex-shrink-0">
              <span className="text-7xl">📚</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a2744] text-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <Image src="/logo.png" alt="ShouldIFinance logo" width={120} height={38} className="brightness-0 invert mb-4" />
              <p className="text-xs text-gray-400 leading-relaxed">Better Questions. Smarter Decisions. Free financial tools for every stage of life.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm w-full md:w-auto">
              <div>
                <p className="font-bold text-white mb-4 text-sm">Tools</p>
                {["Calculators","Real Estate","Investing","Auto"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2.5 text-xs transition-colors">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-4 text-sm">Learn</p>
                {["Articles","Guides","Blog","FAQ"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2.5 text-xs transition-colors">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-4 text-sm">Company</p>
                {["About","Contact","Disclaimer","Privacy"].map(l => (
                  <a key={l} href="#" className="block text-gray-400 hover:text-white mb-2.5 text-xs transition-colors">{l}</a>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-4 text-sm">Follow Us</p>
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
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">© 2025 ShouldIFinance.com. All rights reserved.</p>
            <div className="flex gap-5">
              {["Privacy Policy","Terms of Use","Disclaimer"].map(l => (
                <a key={l} href="#" className="text-xs text-gray-500 hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50 shadow-lg">
        <div className="flex justify-around">
          {[{icon:"🏠",label:"Real estate"},{icon:"📈",label:"Investing"},{icon:"🚗",label:"Auto"},{icon:"📝",label:"Blog"}].map(item => (
            <button key={item.label} className="flex flex-col items-center gap-1 px-3 py-1">
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs text-gray-500">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="md:hidden h-16"></div>

    </main>
  );
}
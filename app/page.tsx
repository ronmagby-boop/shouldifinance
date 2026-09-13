"use client";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto">

      {/* NAV */}
      <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="flex items-center">
          <Image src="/logo.png" alt="ShouldIFinance logo" width={110} height={36} priority />
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex gap-6">
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Calculators</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Real estate</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Investing</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Blog</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">About</a>
        </div>
        <div className="hidden md:flex gap-3">
          <button className="text-sm border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">Request a tool</button>
          <button className="text-sm bg-green-800 text-white rounded-lg px-4 py-2 hover:bg-green-900">Subscribe</button>
        </div>
        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}></span>
          <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "opacity-0" : ""}`}></span>
          <span className={`block w-6 h-0.5 bg-gray-900 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-b border-gray-100 bg-white px-5 py-4 flex flex-col gap-4 z-40">
          {["Calculators","Real estate","Investing","Blog","About"].map(link => (
            <a key={link} href="#" className="text-sm text-gray-700 py-1 border-b border-gray-50">{link}</a>
          ))}
          <button className="w-full bg-green-800 text-white rounded-lg py-3 text-sm mt-2">Subscribe for free tips</button>
        </div>
      )}

      {/* HERO — stacks on mobile, side by side on desktop */}
      <section className="flex flex-col md:grid md:grid-cols-2 border-b-2 border-gray-100 md:min-h-[420px] md:max-h-[420px] overflow-hidden">
        <div className="px-5 md:px-8 pt-8 pb-6 md:py-10 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 text-xs font-medium rounded-full px-3 py-1 mb-4 w-fit">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Free. No signup. No bias.
          </div>
          <h1 className="text-3xl md:text-4xl font-medium leading-tight text-gray-900 mb-3 tracking-tight">
            Know the number<br />before you<br />
            <em className="not-italic text-green-700">commit.</em>
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-sm">
            Financial calculators that cut through the noise — so you walk into every decision knowing exactly where you stand.
          </p>
          <div className="flex gap-3 items-center">
            <button className="bg-green-800 text-white text-sm rounded-lg px-5 py-3 hover:bg-green-900 flex items-center gap-2 flex-1 md:flex-none justify-center md:justify-start">
              Explore tools →
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-900 hidden md:flex items-center gap-1">
              Read the blog →
            </button>
          </div>
          <div className="flex gap-6 mt-6 pt-5 border-t border-gray-100">
            <div><div className="text-xl font-medium text-gray-900">11+</div><div className="text-xs text-gray-400 mt-0.5">Free calculators</div></div>
            <div><div className="text-xl font-medium text-gray-900">100%</div><div className="text-xs text-gray-400 mt-0.5">Unbiased</div></div>
            <div><div className="text-xl font-medium text-gray-900">2,400+</div><div className="text-xs text-gray-400 mt-0.5">Subscribers</div></div>
          </div>
        </div>
        {/* Preview card — hidden on mobile, shown on desktop */}
        <div className="hidden md:flex bg-green-50 border-l border-gray-100 items-center justify-center p-8">
          <div className="bg-white border border-gray-100 rounded-xl p-5 w-72 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-900">Rent vs. buy</span>
              <span className="text-xs bg-green-50 text-green-700 rounded px-2 py-0.5">Live preview</span>
            </div>
            <div className="space-y-0">
              {[["Home price","$380,000"],["Monthly rent","$2,100"],["Down payment","$76,000"],["Interest rate","6.8%"]].map(([label,value]) => (
                <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-xs font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="bg-green-800 rounded-lg px-4 py-3 mt-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-green-300 mb-0.5">Break-even point</div>
                <div className="text-xl font-medium text-white">4.2 years</div>
              </div>
              <span className="text-green-300 text-lg">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* CALCULATORS */}
      <section className="px-5 md:px-8 pt-8 md:pt-12 pb-8 md:pb-10 border-b border-gray-100">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-base md:text-lg font-medium text-gray-900">All calculators</h2>
            <p className="text-xs text-gray-400 mt-1">No account needed — just open and go</p>
          </div>
          <a href="#" className="text-xs text-green-700 hover:underline">View all →</a>
        </div>
        {/* Mobile: 2 columns. Desktop: 3 columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: "💳", color: "bg-red-50", tag: "Popular", tagColor: "bg-blue-50 text-blue-700", title: "Debt payoff", desc: "Snowball vs. avalanche strategy.", time: "~2 min" },
            { icon: "🏠", color: "bg-green-50", tag: "Popular", tagColor: "bg-blue-50 text-blue-700", title: "Rent vs. buy", desc: "Break-even and total cost.", time: "~3 min" },
            { icon: "🏦", color: "bg-purple-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Retirement", desc: "401(k) / IRA projections.", time: "~2 min" },
            { icon: "🎓", color: "bg-blue-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Student loans", desc: "Payoff timeline and interest.", time: "~2 min" },
            { icon: "☂️", color: "bg-amber-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Emergency fund", desc: "Your savings target.", time: "~1 min" },
            { icon: "📊", color: "bg-teal-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Net worth", desc: "Assets minus liabilities.", time: "~3 min" },
          ].map((calc) => (
            <div key={calc.title} className="border border-gray-200 rounded-xl p-4 hover:border-green-200 hover:shadow-sm cursor-pointer flex flex-col transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${calc.color} rounded-lg flex items-center justify-center text-sm`}>{calc.icon}</div>
                <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${calc.tagColor}`}>{calc.tag}</span>
              </div>
              <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">{calc.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed flex-1 hidden md:block">{calc.desc}</p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                <span className="text-xs text-green-700 font-medium">Open →</span>
                <span className="text-xs text-gray-300">{calc.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-5 md:px-8 py-8 md:py-10 bg-gray-50 border-b border-gray-100">
        <h2 className="text-base md:text-lg font-medium text-gray-900 mb-6">How it works</h2>
        <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-10">
          {[
            ["1","Pick a calculator","11+ free tools covering debt, real estate, investing, and retirement."],
            ["2","Enter your numbers","Type in your situation. Results update instantly."],
            ["3","Understand the answer","Plain-English breakdown of what the numbers mean for you."],
          ].map(([num,title,desc]) => (
            <div key={num} className="flex gap-4 md:block">
              <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-medium flex-shrink-0 md:mb-4">{num}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1 md:mb-2">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="px-5 md:px-8 py-8 md:py-10 border-b border-gray-100">
        <div className="flex flex-col md:grid md:grid-cols-3 gap-3">
          {[
            ["🛡️","No conflicts of interest","No commissions, no sponsors. Just the math."],
            ["🔓","Free forever","No paywall, no trial, no email gate."],
            ["💡","Education first","We explain the math behind every result."],
          ].map(([icon,title,desc]) => (
            <div key={title} className="border border-gray-200 rounded-xl p-4 flex gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">{icon}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section className="px-5 md:px-8 py-8 md:py-10 bg-gray-50 border-b border-gray-100">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-base md:text-lg font-medium text-gray-900">From the blog</h2>
            <p className="text-xs text-gray-400 mt-1">Plain-English guides on real financial questions</p>
          </div>
          <a href="#" className="text-xs text-green-700 hover:underline">All posts →</a>
        </div>
        <div className="flex flex-col md:grid md:grid-cols-3 gap-3">
          {[
            { bg: "bg-green-50", icon: "🏠", cat: "REAL ESTATE", title: "Is now a good time to buy? What the numbers actually say", time: "5 min read" },
            { bg: "bg-blue-50", icon: "💳", cat: "DEBT", title: "Snowball vs. avalanche: which payoff strategy actually wins?", time: "4 min read" },
            { bg: "bg-amber-50", icon: "📈", cat: "RETIREMENT", title: "How much should you have saved by 30, 40, and 50?", time: "6 min read" },
          ].map((post) => (
            <div key={post.title} className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-200 hover:shadow-sm transition-all flex md:block gap-4 items-center p-4 md:p-0">
              <div className={`w-14 h-14 md:w-full md:h-20 ${post.bg} flex items-center justify-center text-2xl md:text-3xl rounded-lg md:rounded-none flex-shrink-0`}>{post.icon}</div>
              <div className="md:p-5">
                <div className="text-xs font-medium text-green-700 tracking-wide mb-1 md:mb-2">{post.cat}</div>
                <h3 className="text-xs md:text-sm font-medium text-gray-900 leading-relaxed mb-1 md:mb-3">{post.title}</h3>
                <span className="text-xs text-gray-300">{post.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EMAIL CTA */}
      <section className="px-5 md:px-8 py-10 md:py-14 border-b border-gray-100 text-center">
        <div className="max-w-sm mx-auto">
          <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-2 tracking-tight">Stay ahead of your finances</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-5">New calculators, guides, and tips — one email a week.</p>
          <div className="flex gap-2">
            <input type="email" placeholder="your@email.com" className="flex-1 border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-green-400" />
            <button className="bg-green-800 text-white text-sm rounded-lg px-4 py-3 hover:bg-green-900 whitespace-nowrap">Subscribe</button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex">
              {["JR","SM","KL"].map((initials,i) => (
                <div key={initials} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${i===0?"bg-green-500":i===1?"bg-blue-500":"bg-purple-500"} ${i>0?"-ml-2":""}`}>{initials[0]}</div>
              ))}
            </div>
            <span className="text-xs text-gray-400">Joined by 2,400+ readers</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 md:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Image src="/logo.png" alt="ShouldIFinance logo" width={110} height={36} className="mb-2" />
          <p className="text-xs text-gray-400">For educational purposes only. Not financial advice.</p>
        </div>
        <div className="flex flex-wrap gap-4 md:gap-6">
          {["About","Blog","Calculators","Contact","Disclaimer"].map((link) => (
            <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-900">{link}</a>
          ))}
        </div>
      </footer>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50">
        <div className="flex justify-around">
          {[
            { icon: "🏠", label: "Real estate" },
            { icon: "📈", label: "Investing" },
            { icon: "🚗", label: "Auto" },
            { icon: "📝", label: "Blog" },
          ].map((item) => (
            <button key={item.label} className="flex flex-col items-center gap-1 px-3 py-1">
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs text-gray-500">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16"></div>

      </div>
    </main>
  );
}
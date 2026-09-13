import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto">

      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-3 border-b border-gray-100">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="ShouldIFinance logo"
            width={120}
            height={38}
            priority
          />
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Calculators</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Real estate</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Investing</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Blog</a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-900">About</a>
        </div>
        <div className="flex gap-3">
          <button className="text-sm border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">Request a tool</button>
          <button className="text-sm bg-green-800 text-white rounded-lg px-4 py-2 hover:bg-green-900">Subscribe</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid grid-cols-2 border-b-2 border-gray-100 min-h-[420px] max-h-[420px]">
        <div className="px-8 py-10 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 text-xs font-medium rounded-full px-3 py-1 mb-5 w-fit">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Free. No signup. No bias.
          </div>
          <h1 className="text-4xl font-medium leading-tight text-gray-900 mb-4 tracking-tight">
            Know the number<br />before you<br />
            <em className="not-italic text-green-700">commit.</em>
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-7 max-w-sm">
            Financial calculators that cut through the noise — so you walk into every decision knowing exactly where you stand.
          </p>
          <div className="flex gap-3 items-center">
            <button className="bg-green-800 text-white text-sm rounded-lg px-5 py-2.5 hover:bg-green-900 flex items-center gap-2">
              Explore tools →
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              Read the blog →
            </button>
          </div>
          <div className="flex gap-8 mt-8 pt-7 border-t border-gray-100">
            <div>
              <div className="text-xl font-medium text-gray-900">11+</div>
              <div className="text-xs text-gray-400 mt-0.5">Free calculators</div>
            </div>
            <div>
              <div className="text-xl font-medium text-gray-900">100%</div>
              <div className="text-xs text-gray-400 mt-0.5">Unbiased</div>
            </div>
            <div>
              <div className="text-xl font-medium text-gray-900">2,400+</div>
              <div className="text-xs text-gray-400 mt-0.5">Subscribers</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border-l border-gray-100 flex items-center justify-center p-8">
          <div className="bg-white border border-gray-100 rounded-xl p-5 w-72 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-900">Rent vs. buy</span>
              <span className="text-xs bg-green-50 text-green-700 rounded px-2 py-0.5">Live preview</span>
            </div>
            <div className="space-y-0">
              {[
                ["Home price", "$380,000"],
                ["Monthly rent", "$2,100"],
                ["Down payment", "$76,000"],
                ["Interest rate", "6.8%"],
              ].map(([label, value]) => (
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
      <section className="px-8 pt-12 pb-10 border-b border-gray-100">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">All calculators</h2>
            <p className="text-xs text-gray-400 mt-1">No account needed — just open and go</p>
          </div>
          <a href="#" className="text-xs text-green-700 hover:underline">View all →</a>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: "💳", color: "bg-red-50", tag: "Popular", tagColor: "bg-blue-50 text-blue-700", title: "Debt payoff", desc: "Snowball vs. avalanche — find which strategy saves you more.", time: "~2 min" },
            { icon: "🏠", color: "bg-green-50", tag: "Popular", tagColor: "bg-blue-50 text-blue-700", title: "Rent vs. buy", desc: "Break-even point, total ownership cost, and 10-year comparison.", time: "~3 min" },
            { icon: "🏦", color: "bg-purple-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Retirement savings", desc: "401(k) / IRA projections with employer match included.", time: "~2 min" },
            { icon: "🎓", color: "bg-blue-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Student loan repayment", desc: "Payoff timeline, total interest, and value of extra payments.", time: "~2 min" },
            { icon: "☂️", color: "bg-amber-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Emergency fund", desc: "Your target number and exactly how long it takes to save it.", time: "~1 min" },
            { icon: "📊", color: "bg-teal-50", tag: "New", tagColor: "bg-green-50 text-green-700", title: "Net worth tracker", desc: "Assets minus liabilities — your complete financial picture.", time: "~3 min" },
          ].map((calc) => (
            <div key={calc.title} className="border border-gray-200 rounded-xl p-5 hover:border-green-200 hover:shadow-sm cursor-pointer flex flex-col transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${calc.color} rounded-lg flex items-center justify-center text-base`}>{calc.icon}</div>
                <span className={`text-xs rounded px-2 py-0.5 font-medium ${calc.tagColor}`}>{calc.tag}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1.5">{calc.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed flex-1">{calc.desc}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                <span className="text-xs text-green-700 font-medium">Open →</span>
                <span className="text-xs text-gray-300">{calc.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-8 py-10 bg-gray-50 border-b border-gray-100">
        <h2 className="text-lg font-medium text-gray-900 mb-8">How it works</h2>
        <div className="grid grid-cols-3 gap-10">
          {[
            ["1", "Pick a calculator", "11+ free tools covering debt, real estate, investing, and retirement — no login required."],
            ["2", "Enter your numbers", "Type in your real situation. Results update instantly as you type."],
            ["3", "Understand the answer", "Every result comes with a plain-English breakdown of what the numbers mean for you."],
          ].map(([num, title, desc]) => (
            <div key={num}>
              <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-medium mb-4">{num}</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="px-8 py-10 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          {[
            ["🛡️", "No conflicts of interest", "No commissions, no sponsors, no financial products. Just the math."],
            ["🔓", "Free forever", "Every tool is free. No paywall, no trial, no email gate."],
            ["💡", "Education first", "We explain the math so you leave understanding the decision, not just the output."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="border border-gray-200 rounded-xl p-5 flex gap-4">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">{icon}</div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1.5">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section className="px-8 py-10 bg-gray-50 border-b border-gray-100">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">From the blog</h2>
            <p className="text-xs text-gray-400 mt-1">Plain-English guides on real financial questions</p>
          </div>
          <a href="#" className="text-xs text-green-700 hover:underline">All posts →</a>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { bg: "bg-green-50", icon: "🏠", cat: "REAL ESTATE", title: "Is now a good time to buy? What the numbers actually say", time: "5 min read" },
            { bg: "bg-blue-50", icon: "💳", cat: "DEBT", title: "Snowball vs. avalanche: which payoff strategy actually wins?", time: "4 min read" },
            { bg: "bg-amber-50", icon: "📈", cat: "RETIREMENT", title: "How much should you have saved by 30, 40, and 50?", time: "6 min read" },
          ].map((post) => (
            <div key={post.title} className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-200 hover:shadow-sm transition-all">
              <div className={`h-20 ${post.bg} flex items-center justify-center text-3xl`}>{post.icon}</div>
              <div className="p-5">
                <div className="text-xs font-medium text-green-700 tracking-wide mb-2">{post.cat}</div>
                <h3 className="text-sm font-medium text-gray-900 leading-relaxed mb-3">{post.title}</h3>
                <span className="text-xs text-gray-300">{post.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EMAIL CTA */}
      <section className="px-8 py-14 border-b border-gray-100 text-center">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-medium text-gray-900 mb-2 tracking-tight">Stay ahead of your finances</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">New calculators, guides, and tips — one email a week. No fluff, no spam.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
            <button className="bg-green-800 text-white text-sm rounded-lg px-4 py-2.5 hover:bg-green-900 whitespace-nowrap">
              Subscribe
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex">
              {["JR", "SM", "KL"].map((initials, i) => (
                <div
                  key={initials}
                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium
                    ${i === 0 ? "bg-green-500" : i === 1 ? "bg-blue-500" : "bg-purple-500"}
                    ${i > 0 ? "-ml-2" : ""}`}
                >
                  {initials[0]}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400">Joined by 2,400+ readers</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-6 flex items-center justify-between">
        <div>
          <Image
            src="/logo.png"
            alt="ShouldIFinance logo"
            width={120}
            height={40}
            className="mb-2"
          />
          <p className="text-xs text-gray-400">For educational purposes only. Not financial advice.</p>
        </div>
        <div className="flex gap-6">
          {["About", "Blog", "Calculators", "Contact", "Disclaimer"].map((link) => (
            <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-900">{link}</a>
          ))}
        </div>
      </footer>

      </div>
    </main>
  );
}
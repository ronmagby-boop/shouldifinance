"use client";
import Image from "next/image";
import { useState, useMemo } from "react";
import Link from "next/link";
import CalculatorSidebar, { CalculatorBrowseMobile } from "../../components/CalculatorSidebar";

export default function MortgageCalculator() {
  const [price, setPrice] = useState(400000);
  const [down, setDown] = useState(80000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.8);
  const [term, setTerm] = useState(30);
  const [tax, setTax] = useState(1.2);
  const [ins, setIns] = useState(120);
  const [hoa, setHoa] = useState(0);
  const [pmi, setPmi] = useState(0.5);

  const fmt = (v: number) => "$" + Math.round(Math.abs(v)).toLocaleString();
  const fmtK = (v: number) => {
    const n = Math.round(Math.abs(v));
    return n >= 1000000 ? "$" + (n / 1000000).toFixed(2) + "M" : "$" + n.toLocaleString();
  };

  const results = useMemo(() => {
    const loan = Math.max(0, price - down);
    const r = rate / 100 / 12;
    const n = term * 12;
    const pi = r > 0 ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n;
    const taxMo = (price * tax) / 100 / 12;
    const pmiMo = down / price < 0.2 ? (loan * pmi) / 100 / 12 : 0;
    const total = pi + taxMo + ins + pmiMo + hoa;
    const totalInt = Math.max(0, pi * n - loan);
    const totalCost = loan + totalInt;
    const now = new Date();
    now.setMonth(now.getMonth() + n);
    const payoffStr = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const intRatio = Math.round((totalInt / totalCost) * 100);

    // Amortization
    const amortRows: { yr: number; yearPrin: number; yearInt: number; bal: number; equity: number }[] = [];
    let bal = loan;
    const years = Math.min(5, Math.floor(n / 12));
    for (let yr = 1; yr <= years; yr++) {
      let yearPrin = 0, yearInt = 0;
      for (let mo = 0; mo < 12 && (yr - 1) * 12 + mo < n; mo++) {
        const intPmt = bal * r;
        const prinPmt = Math.min(pi - intPmt, bal);
        yearInt += intPmt;
        yearPrin += prinPmt;
        bal = Math.max(0, bal - prinPmt);
      }
      amortRows.push({ yr, yearPrin, yearInt, bal, equity: price - bal });
    }

    return { total, pi, taxMo, pmiMo, totalInt, totalCost, payoffStr, intRatio, loan, amortRows };
  }, [price, down, rate, term, tax, ins, hoa, pmi]);

  const syncFromAmt = (val: number) => {
    setDown(val);
    setDownPct(Math.round((val / price) * 100 * 10) / 10);
  };
  const syncFromPct = (val: number) => {
    setDownPct(val);
    setDown(Math.round((price * val) / 100));
  };

  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto">

        {/* NAV */}
        <nav className="flex items-center justify-between px-5 md:px-8 py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
          <Link href="/">
            <Image src="/logo.png" alt="ShouldIFinance logo" width={110} height={36} priority />
          </Link>
          <div className="hidden md:flex gap-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Calculators</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Real estate</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Investing</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Blog</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">About</a>
          </div>
          <button className="hidden md:block text-sm bg-green-800 text-white rounded-lg px-4 py-2 hover:bg-green-900">Subscribe</button>
          <Link href="/" className="md:hidden text-sm text-gray-500">← Home</Link>
        </nav>

        {/* BREADCRUMB */}
        <div className="px-5 md:px-8 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <span>›</span>
          <span className="hover:text-green-700 cursor-pointer">Real estate calculators</span>
          <span>›</span>
          <span className="text-gray-900">Mortgage payment</span>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[220px_minmax(0,1fr)]">

          <CalculatorSidebar />

          {/* MAIN CONTENT */}
          <div className="min-w-0">
          <CalculatorBrowseMobile />
          <div className="px-5 md:px-8 py-6 md:py-8">

            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">Mortgage payment calculator</h1>
              <p className="text-sm text-gray-500 leading-relaxed">Estimate your monthly payment including principal, interest, taxes, insurance, and PMI.</p>
            </div>

            {/* CALCULATOR */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="flex flex-col md:grid md:grid-cols-2">

                {/* INPUTS */}
                <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-gray-100">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Home price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" value={price} onChange={e => setPrice(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Down payment</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" value={down} onChange={e => syncFromAmt(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                        </div>
                        <div className="relative">
                          <input type="number" value={downPct} onChange={e => syncFromPct(+e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Interest rate</label>
                        <div className="relative">
                          <input type="number" value={rate} step={0.125} onChange={e => setRate(+e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Loan term</label>
                        <div className="relative">
                          <input type="number" value={term} onChange={e => setTerm(+e.target.value)} className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">yrs</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Property tax (annual %)</label>
                      <div className="relative">
                        <input type="number" value={tax} step={0.1} onChange={e => setTax(+e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Insurance/mo</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" value={ins} onChange={e => setIns(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">HOA/mo</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" value={hoa} onChange={e => setHoa(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">PMI rate (if down &lt; 20%)</label>
                      <div className="relative">
                        <input type="number" value={pmi} step={0.1} onChange={e => setPmi(+e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESULTS */}
                {results && (
                  <div className="p-5 md:p-6 bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Total monthly payment</p>
                    <p className="text-3xl font-medium text-green-700 mb-5 tracking-tight">{fmt(results.total)}<span className="text-sm text-gray-400 font-normal">/mo</span></p>

                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {[
                        { label: "Principal & interest", value: fmt(results.pi) + "/mo", color: "" },
                        { label: "Property tax", value: fmt(results.taxMo) + "/mo", color: "" },
                        { label: "Insurance + HOA", value: fmt(ins + hoa) + "/mo", color: "" },
                        { label: "PMI", value: results.pmiMo > 0 ? fmt(results.pmiMo) + "/mo" : "None ✓", color: results.pmiMo > 0 ? "text-amber-600" : "text-green-700" },
                        { label: "Loan amount", value: fmtK(results.loan), color: "" },
                        { label: "Total interest", value: fmtK(results.totalInt), color: "text-amber-600" },
                        { label: "Total loan cost", value: fmtK(results.totalCost), color: "" },
                        { label: "Payoff date", value: results.payoffStr, color: "text-green-700" },
                      ].map((m) => (
                        <div key={m.label} className="bg-white border border-gray-100 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{m.label}</p>
                          <p className={`text-sm font-medium ${m.color || "text-gray-900"}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-800 leading-relaxed">
                      At <strong>{rate}%</strong> for <strong>{term} years</strong>, you&apos;ll pay <strong>{fmtK(results.totalInt)}</strong> in interest — <strong>{results.intRatio}%</strong> of your total loan cost.
                      {results.pmiMo > 0 && ` You're paying ${fmt(results.pmiMo)}/mo in PMI — drops once you reach 20% equity.`}
                      {results.pmiMo === 0 && ` No PMI — your down payment is 20% or more.`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AMORTIZATION TABLE */}
            <div className="mb-6">
              <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">Amortization schedule — first 5 years</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium border-b border-gray-100">Year</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium border-b border-gray-100">Principal paid</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium border-b border-gray-100">Interest paid</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium border-b border-gray-100">Balance</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium border-b border-gray-100">Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.amortRows.map((row) => (
                      <tr key={row.yr} className="hover:bg-gray-50 border-b border-gray-50">
                        <td className="px-3 py-2 text-gray-900">Year {row.yr}</td>
                        <td className="px-3 py-2 text-green-700">{fmt(row.yearPrin)}</td>
                        <td className="px-3 py-2 text-amber-600">{fmt(row.yearInt)}</td>
                        <td className="px-3 py-2 text-gray-900">{fmtK(row.bal)}</td>
                        <td className="px-3 py-2 text-green-700">{fmtK(row.equity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RELATED CALCULATORS */}
            <div className="mb-6">
              <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">Related calculators</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { icon: "🔄", bg: "bg-green-50", title: "Should I refinance?", desc: "See if refinancing saves money and when you break even." },
                  { icon: "🏠", bg: "bg-blue-50", title: "Rent vs. buy", desc: "Compare renting and buying over 5, 10, and 20 years." },
                  { icon: "➕", bg: "bg-amber-50", title: "Extra payments", desc: "How much time and interest extra payments can save you." },
                ].map((card) => (
                  <div key={card.title} className="border border-gray-200 rounded-xl p-4 hover:border-green-200 cursor-pointer transition-all">
                    <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{card.icon}</div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">{card.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* DISCLAIMER */}
            <div className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-100">
              For educational purposes only. Results are estimates based on the values you enter. Actual loan terms, rates, taxes, and insurance costs will vary. Consult a licensed mortgage professional before making any financial decisions.
            </div>

          </div>
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50">
          <div className="flex justify-around">
            {[
              { icon: "🏠", label: "Real estate", href: "/calculators#real-estate" },
              { icon: "📈", label: "Investing", href: "/calculators#investing" },
              { icon: "🚗", label: "Auto", href: "/calculators#auto" },
              { icon: "🧮", label: "All", href: "/calculators" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 px-3 py-1">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs text-gray-500">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="md:hidden h-16"></div>

      </div>
    </main>
  );
}
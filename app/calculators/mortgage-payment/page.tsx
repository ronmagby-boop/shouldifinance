"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import CalculatorSidebar, { CalculatorBrowseMobile } from "../../components/CalculatorSidebar";
import MobileBottomNav, { MobileBottomNavSpacer } from "../../components/MobileBottomNav";
import SiteNav from "../../components/SiteNav";
import { related } from "../../lib/calculators";
import { NumField, type Num } from "../../components/Inputs";

export default function MortgageCalculator() {
  const [price, setPrice] = useState<number | "">("");
  const [down, setDown] = useState<number | "">("");
  const [downPct, setDownPct] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [term, setTerm] = useState<number | "">("");
  const [tax, setTax] = useState<number | "">("");
  const [ins, setIns] = useState<number | "">("");
  const [hoa, setHoa] = useState<number | "">("");
  const [pmi, setPmi] = useState<number | "">("");

  /** Blank reads as zero for the maths, the same way should-i-refinance does it. */
  const n = (v: number | "") => (v === "" ? 0 : +v);

  const loadExample = () => {
    setPrice(400000);
    setDown(80000);
    setDownPct(20);
    setRate(6.8);
    setTerm(30);
    setTax(1.2);
    setIns(120);
    setHoa(0);
    setPmi(0.5);
  };

  const fmt = (v: number) => "$" + Math.round(Math.abs(v)).toLocaleString();
  const fmtK = (v: number) => {
    const n = Math.round(Math.abs(v));
    return n >= 1000000 ? "$" + (n / 1000000).toFixed(2) + "M" : "$" + n.toLocaleString();
  };

  const results = useMemo(() => {
    const P = n(price), D = n(down), R = n(rate), T = n(term);
    const TAX = n(tax), INS = n(ins), HOA = n(hoa), PMI = n(pmi);
    const loan = Math.max(0, P - D);
    const r = R / 100 / 12;
    const months = T * 12;
    const pi = months <= 0 ? 0
      : r > 0 ? (loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
      : loan / months;
    const taxMo = (P * TAX) / 100 / 12;
    const pmiMo = P > 0 && D / P < 0.2 ? (loan * PMI) / 100 / 12 : 0;
    const total = pi + taxMo + INS + pmiMo + HOA;
    const totalInt = Math.max(0, pi * months - loan);
    const totalCost = loan + totalInt;
    const now = new Date();
    now.setMonth(now.getMonth() + months);
    const payoffStr = months > 0 ? now.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
    const intRatio = totalCost > 0 ? Math.round((totalInt / totalCost) * 100) : 0;

    // Amortization
    const amortRows: { yr: number; yearPrin: number; yearInt: number; bal: number; equity: number }[] = [];
    let bal = loan;
    const years = Math.min(5, Math.floor(months / 12));
    for (let yr = 1; yr <= years; yr++) {
      let yearPrin = 0, yearInt = 0;
      for (let mo = 0; mo < 12 && (yr - 1) * 12 + mo < months; mo++) {
        const intPmt = bal * r;
        const prinPmt = Math.min(pi - intPmt, bal);
        yearInt += intPmt;
        yearPrin += prinPmt;
        bal = Math.max(0, bal - prinPmt);
      }
      amortRows.push({ yr, yearPrin, yearInt, bal, equity: P - bal });
    }

    return { total, pi, taxMo, pmiMo, totalInt, totalCost, payoffStr, intRatio, loan, amortRows };
  }, [price, down, rate, term, tax, ins, hoa, pmi]);

  const syncFromAmt = (val: Num) => {
    if (val === "") { setDown(""); setDownPct(""); return; }
    setDown(val);
    const P = n(price);
    setDownPct(P > 0 ? Math.round((val / P) * 100 * 10) / 10 : "");
  };
  const syncFromPct = (val: Num) => {
    if (val === "") { setDownPct(""); setDown(""); return; }
    setDownPct(val);
    const P = n(price);
    setDown(P > 0 ? Math.round((P * val) / 100) : "");
  };

  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto">

        <SiteNav position="sticky" logo="compact" />

        {/* BREADCRUMB */}
        <div className="px-5 md:px-8 py-1.5 md:py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <span>›</span>
          <Link href="/calculators#real-estate" className="hover:text-green-700">Home calculators</Link>
          <span>›</span>
          <span className="text-gray-900">What&apos;s my mortgage payment?</span>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[220px_minmax(0,1fr)]">

          <CalculatorSidebar />

          {/* MAIN CONTENT */}
          <div className="min-w-0">
          <CalculatorBrowseMobile />
          <div className="px-5 md:px-8 py-4 md:py-8">

            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">What&apos;s my mortgage payment?</h1>
              <p className="text-sm text-gray-500 leading-relaxed">Estimate your monthly payment including principal, interest, taxes, insurance, and PMI.</p>
            </div>

            <button
              onClick={loadExample}
              className="inline-flex items-center gap-2 mb-4 text-sm font-semibold border border-green-200 bg-green-50 text-green-800 rounded-xl px-4 py-2.5 hover:bg-green-100 hover:border-green-300 transition-colors"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              See with example numbers
            </button>

            {/* CALCULATOR */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="flex flex-col md:grid md:grid-cols-2">

                {/* INPUTS */}
                <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-gray-100">
                  <div className="space-y-4">
                    <NumField label="Home price" value={price} onChange={setPrice} placeholder="400000" prefix="$" />
                    <div className="grid grid-cols-2 gap-2">
                      <NumField label="Down payment" value={down} onChange={syncFromAmt} placeholder="80000" prefix="$" />
                      <NumField label="Down payment %" value={downPct} onChange={syncFromPct} placeholder="20" suffix="%" step={0.1} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumField label="Interest rate" value={rate} onChange={setRate} placeholder="6.8" suffix="%" step={0.125} />
                      <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
                    </div>
                    <NumField label="Property tax (annual %)" value={tax} onChange={setTax} placeholder="1.2" suffix="%" step={0.1} />
                    <div className="grid grid-cols-2 gap-2">
                      <NumField label="Insurance/mo" value={ins} onChange={setIns} placeholder="120" prefix="$" />
                      <NumField label="HOA/mo" value={hoa} onChange={setHoa} placeholder="0" prefix="$" />
                    </div>
                    <NumField label="PMI rate (if down < 20%)" value={pmi} onChange={setPmi} placeholder="0.5" suffix="%" step={0.1} />
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
                        { label: "Insurance + HOA", value: fmt(n(ins) + n(hoa)) + "/mo", color: "" },
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
                {related("mortgage-payment", ["should-i-refinance", "rent-vs-buy", "extra-payments"]).map((card) => (
                  <Link key={card.slug} href={`/calculators/${card.slug}`}
                    className="border border-gray-200 rounded-xl p-4 hover:border-green-200 hover:shadow-sm transition-all block">
                    <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center mb-3 text-gray-700`}>
                      <card.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">{card.nav}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                  </Link>
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

        <MobileBottomNav />
        <MobileBottomNavSpacer />

      </div>
    </main>
  );
}
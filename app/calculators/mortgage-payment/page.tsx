"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import CalculatorSidebar, { CalculatorBrowseMobile } from "../../components/CalculatorSidebar";
import MobileBottomNav, { MobileBottomNavSpacer } from "../../components/MobileBottomNav";
import SiteNav from "../../components/SiteNav";
import ExampleButton from "../../components/ExampleButton";
import { related, relatedGridClass } from "../../lib/calculators";
import GuideLink from "../../components/GuideLink";
import ExportBar from "../../components/ExportBar";
import { NumField, type Num } from "../../components/Inputs";

/**
 * ⚠ THIS PAGE DOES NOT USE CalcShell.
 *
 * It and mortgage-payment are the two oldest calculators, and they build their
 * own page chrome — nav, breadcrumb, heading, related grid, disclaimer —
 * instead of passing children to CalcShell like the other 41.
 *
 * That duplication has now caused three bugs, each found separately:
 *
 *  1. The related-card cap. related() silently sliced to three, so a declared
 *     fourth link never rendered.
 *  2. Input components copied rather than shared, which let the copies drift
 *     from components/Inputs.
 *  3. The guide link. GuideLink was added to CalcShell and would never have
 *     appeared here at all — it had to be inserted by hand, below.
 *
 * So: ANY new shared page element added to CalcShell has to be added to this
 * page and to mortgage-payment manually. Nothing warns you. Search for
 * "DOES NOT USE CalcShell" to find both.
 *
 * Migrating them is worth doing and is not a small change; until then this
 * comment is the only thing standing between the next shared element and a
 * fourth instance of the same bug.
 */

/* Resolved once at module scope: the registry is static, and the count
   decides the grid's column class. */
const RELATED = related("mortgage-payment", [
  "should-i-refinance",
  "rent-vs-buy",
  "extra-payments",
  "payoff-house-vs-invest",
]);

export default function MortgageCalculator() {
  const [price, setPrice] = useState<number | "">("");
  const [down, setDown] = useState<number | "">("");
  const [downPct, setDownPct] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [term, setTerm] = useState<number | "">("");
  const [tax, setTax] = useState<number | "">("");
  /** Annual property tax as a dollar figure; the percent field derives from it
   *  and vice versa, the same linked pair the down payment uses. Tax bills
   *  arrive in dollars, and effective rates vary enough by state that guessing
   *  a percentage moves the payment materially. */
  const [taxAmt, setTaxAmt] = useState<number | "">("");
  const [ins, setIns] = useState<number | "">("");
  const [hoa, setHoa] = useState<number | "">("");
  const [pmi, setPmi] = useState<number | "">("");
  const [showAll, setShowAll] = useState(false);

  /** Blank reads as zero for the maths, the same way should-i-refinance does it. */
  const n = (v: number | "") => (v === "" ? 0 : +v);

  const loadExample = () => {
    setPrice(400000);
    setDown(80000);
    setDownPct(20);
    setRate(6.8);
    setTerm(30);
    setTax(1.2);
    setTaxAmt(4800);
    setIns(120);
    setHoa(0);
    setPmi(0.5);
    setShowAll(false);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setPrice("");
    setDown("");
    setDownPct("");
    setRate("");
    setTerm("");
    setTax("");
    setTaxAmt("");
    setIns("");
    setHoa("");
    setPmi("");
    setShowAll(false);
  };

  const fmt = (v: number) => "$" + Math.round(Math.abs(v)).toLocaleString();
  const fmtK = (v: number) => {
    const n = Math.round(Math.abs(v));
    return n >= 1000000 ? "$" + (n / 1000000).toFixed(2) + "M" : "$" + n.toLocaleString();
  };

  const results = useMemo(() => {
    const P = n(price), D = n(down), R = n(rate), T = n(term);
    const INS = n(ins), HOA = n(hoa), PMI = n(pmi);
    // Without a price and a term there is nothing to report. Returning a result
    // anyway rendered "first 0 years" over an empty table, and a green summary
    // claiming no PMI was due on a loan nobody had entered.
    if (P <= 0 || T <= 0 || R <= 0) return null;
    const loan = Math.max(0, P - D);
    const r = R / 100 / 12;
    const months = T * 12;
    const pi = months <= 0 ? 0
      : r > 0 ? (loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
      : loan / months;
    // Driven by the dollar figure, so a tax bill entered exactly stays exact.
    const taxMo = n(taxAmt) / 12;
    const pmiMo = P > 0 && D / P < 0.2 ? (loan * PMI) / 100 / 12 : 0;
    const total = pi + taxMo + INS + pmiMo + HOA;
    const totalInt = Math.max(0, pi * months - loan);
    const totalCost = loan + totalInt;
    const now = new Date();
    now.setMonth(now.getMonth() + months);
    const payoffStr = months > 0 ? now.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
    const intRatio = totalCost > 0 ? Math.round((totalInt / totalCost) * 100) : 0;

    // Amortization over the whole term, not a fixed five years. PMI is charged
    // only while the balance is above 78% of the original price, which is where
    // the servicer must drop it automatically -- the same rule the VA and
    // buy-now-or-save pages use. Charging it for the full term overstated the
    // cost of every low-down-payment loan on this page.
    const amortRows: {
      yr: number; yearPrin: number; yearInt: number; yearPmi: number;
      bal: number; equity: number; crossover: boolean;
    }[] = [];
    let bal = loan;
    let pmiTotal = 0;
    let pmiMonths = 0;
    let crossoverYear: number | null = null;
    const years = Math.max(0, Math.floor(months / 12));
    for (let yr = 1; yr <= years; yr++) {
      let yearPrin = 0, yearInt = 0, yearPmi = 0;
      for (let mo = 0; mo < 12 && (yr - 1) * 12 + mo < months; mo++) {
        if (pmiMo > 0 && bal > P * 0.78) {
          yearPmi += pmiMo;
          pmiTotal += pmiMo;
          pmiMonths++;
        }
        const intPmt = bal * r;
        const prinPmt = Math.min(pi - intPmt, bal);
        yearInt += intPmt;
        yearPrin += prinPmt;
        bal = Math.max(0, bal - prinPmt);
      }
      const crossover = crossoverYear === null && yearPrin > yearInt;
      if (crossover) crossoverYear = yr;
      amortRows.push({ yr, yearPrin, yearInt, yearPmi, bal, equity: P - bal, crossover });
    }
    const pmiEndYear = pmiMo > 0 && pmiMonths > 0 ? Math.ceil(pmiMonths / 12) : null;

    const shown = Math.min(5, amortRows.length);
    const firstFive = amortRows.slice(0, shown);
    const prin5 = firstFive.reduce((a, x) => a + x.yearPrin, 0);
    const int5 = firstFive.reduce((a, x) => a + x.yearInt, 0);

    return {
      total, pi, taxMo, pmiMo, totalInt, totalCost, payoffStr, intRatio, loan, amortRows,
      years, crossoverYear, pmiTotal, pmiMonths, pmiEndYear, shown, prin5, int5,
    };
  }, [price, down, rate, term, taxAmt, ins, hoa, pmi]);

  const syncFromAmt = (val: Num) => {
    if (val === "") { setDown(""); setDownPct(""); return; }
    setDown(val);
    const P = n(price);
    setDownPct(P > 0 ? Math.round((val / P) * 100 * 10) / 10 : "");
  };
  const syncTaxFromAmt = (val: Num) => {
    if (val === "") { setTaxAmt(""); setTax(""); return; }
    setTaxAmt(val);
    const P = n(price);
    setTax(P > 0 ? Math.round((val / P) * 100 * 1000) / 1000 : "");
  };
  const syncTaxFromPct = (val: Num) => {
    if (val === "") { setTax(""); setTaxAmt(""); return; }
    setTax(val);
    const P = n(price);
    setTaxAmt(P > 0 ? Math.round((P * val) / 100) : "");
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

            <ExampleButton onLoad={loadExample} onClear={clearExample} />

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
                    <div className="grid grid-cols-2 gap-2">
                      <NumField label="Property tax (annual $)" value={taxAmt} onChange={syncTaxFromAmt} placeholder="4800" prefix="$" />
                      <NumField label="Property tax (annual %)" value={tax} onChange={syncTaxFromPct} placeholder="1.2" suffix="%" step={0.1} />
                    </div>
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
                    {/* data-x-* so the shared ExportBar can harvest a result from
                        this page too. It builds its own results markup rather than
                        using Headline/Stat, so nothing here is tagged for free —
                        the same duplication that has now cost five bugs. */}
                    <p className="text-3xl font-medium text-green-700 mb-5 tracking-tight" data-x-headline="Total monthly payment">{fmt(results.total)}<span className="text-sm text-gray-400 font-normal">/mo</span></p>

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
                        <div key={m.label} className="bg-white border border-gray-100 rounded-lg p-3" data-x-stat={m.label}>
                          <p className="text-xs text-gray-400 mb-0.5">{m.label}</p>
                          <p className={`text-sm font-medium ${m.color || "text-gray-900"}`} data-x-value>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-800 leading-relaxed">
                      At <strong>{rate}%</strong> for <strong>{term} years</strong>, you&apos;ll pay <strong>{fmtK(results.totalInt)}</strong> in interest — <strong>{results.intRatio}%</strong> of your total loan cost.
                      {results.pmiMo > 0 && results.pmiEndYear !== null && ` You're paying ${fmt(results.pmiMo)}/mo in PMI, ending in year ${results.pmiEndYear} at ${fmt(results.pmiTotal)} in total.`}
                      {results.pmiMo === 0 && ` No PMI — your down payment is 20% or more.`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!results && (
              <div className="mb-6 border border-gray-200 rounded-xl bg-gray-50 px-5 py-8 text-center">
                <p className="text-sm text-gray-500">
                  Enter a home price, an interest rate and a loan term to see the payment and the
                  schedule.
                </p>
              </div>
            )}

            {/* AMORTIZATION TABLE */}
            {results && (
            <div className="mb-6">
              <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-gray-100">
                <h2 className="text-base font-medium text-gray-900">
                  Amortization schedule {showAll ? `— all ${results.years} years` : `— first ${results.shown} years`}
                </h2>
                {results.years > results.shown && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-xs font-medium text-green-700 underline shrink-0 min-h-11 px-1 -mx-1"
                  >
                    {showAll ? "Show first 5 years" : `Show all ${results.years} years`}
                  </button>
                )}
              </div>
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
                    {(showAll ? results.amortRows : results.amortRows.slice(0, results.shown)).map((row) => (
                      <tr
                        key={row.yr}
                        className={`border-b border-gray-50 ${row.crossover ? "bg-green-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                          Year {row.yr}
                          {row.crossover && (
                            <span className="ml-1.5 text-[10px] font-medium text-green-700">turning point</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-green-700">{fmt(row.yearPrin)}</td>
                        <td className="px-3 py-2 text-amber-600">{fmt(row.yearInt)}</td>
                        <td className="px-3 py-2 text-gray-900">{fmtK(row.bal)}</td>
                        <td className="px-3 py-2 text-green-700">{fmtK(row.equity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500 leading-relaxed">
                  After <strong className="text-gray-900">{results.shown} years</strong> you will have paid{" "}
                  <strong className="text-amber-600">{fmt(results.int5)}</strong> in interest and repaid{" "}
                  <strong className="text-green-700">{fmt(results.prin5)}</strong> of what you borrowed
                  {results.prin5 > 0 && (
                    <> — about {(results.int5 / results.prin5).toFixed(2)} dollars of interest for every dollar off the balance</>
                  )}
                  .
                </p>
                {results.crossoverYear !== null && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    The row marked <span className="text-green-700 font-medium">turning point</span> is{" "}
                    <strong className="text-gray-900">year {results.crossoverYear}</strong>, the first year
                    more of your payments go to principal than to interest.
                    {!showAll && results.crossoverYear > results.shown && (
                      <> It is further down the schedule — expand the table to see it.</>
                    )}
                  </p>
                )}
                {results.pmiEndYear !== null && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    PMI stops in <strong className="text-gray-900">year {results.pmiEndYear}</strong>, once the
                    balance falls to 78% of the purchase price and the servicer has to drop it —{" "}
                    <strong className="text-gray-900">{fmt(results.pmiTotal)}</strong> in total. You can ask to
                    cancel earlier, at 80%.
                  </p>
                )}
                <p className="text-xs text-gray-400 leading-relaxed">
                  Equity here is your down payment plus the principal you have repaid. It leaves out any
                  change in the home&apos;s value — appreciation comes on top of this, and a falling
                  market comes off it.
                </p>
              </div>
            </div>

            )}

            {/* EXPORT — this page builds its own chrome, so CalcShell does not
                place this for it. See the "DOES NOT USE CalcShell" note above. */}
            <ExportBar slug="mortgage-payment" />

            {/* RELATED CALCULATORS */}
            <div className="mb-6">
              <h2 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">Related calculators</h2>
              <div className={relatedGridClass(RELATED.length)}>
                {RELATED.map((card) => (
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

            <GuideLink slug="mortgage-payment" />

            {/* DISCLAIMER */}
            <div className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-100" data-x-disclaimer>
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
"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function ShouldIRefinance() {
  // Current loan
  const [currentBalance, setCurrentBalance] = useState(300000);
  const [currentRate, setCurrentRate] = useState(7.5);
  const [yearsLeft, setYearsLeft] = useState(25);
  const [currentPayment, setCurrentPayment] = useState(2100);

  // New loan
  const [cashOut, setCashOut] = useState(0);
  const [closingCosts, setClosingCosts] = useState(5000);
  const [financeClosing, setFinanceClosing] = useState(false);
  const [newRate, setNewRate] = useState(6.5);
  const [newTerm, setNewTerm] = useState(30);
  const [extraPayment, setExtraPayment] = useState(0);

  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fmt = (v: number) => "$" + Math.round(Math.abs(v)).toLocaleString();
  const fmtK = (v: number) => {
    const n = Math.round(Math.abs(v));
    return n >= 1000000 ? "$" + (n / 1000000).toFixed(2) + "M" : "$" + n.toLocaleString();
  };

  useEffect(() => {
    // Current loan calculations
    const currentR = currentRate / 100 / 12;
    const currentN = yearsLeft * 12;
    const interestLeft = (currentPayment * currentN) - currentBalance;

    // New loan amount
    const newLoanBase = currentBalance + cashOut;
    const newLoanAmount = financeClosing ? newLoanBase + closingCosts : newLoanBase;
    const outOfPocket = financeClosing ? 0 : closingCosts;

    // New loan payment
    const newR = newRate / 100 / 12;
    const newN = newTerm * 12;
    const newPayment = newR > 0
      ? newLoanAmount * newR * Math.pow(1 + newR, newN) / (Math.pow(1 + newR, newN) - 1)
      : newLoanAmount / newN;

    // Monthly savings
    const monthlySavings = currentPayment - newPayment;

    // Break even on closing costs
    const breakEvenMonths = monthlySavings > 0
      ? Math.ceil(outOfPocket / monthlySavings)
      : null;

    // Interest paid — current loan over remaining term
    const currentTotalInterest = (currentPayment * currentN) - currentBalance;

    // Interest paid — new loan over SAME horizon (yearsLeft * 12)
    let newInterestSameHorizon = 0;
    let newBal = newLoanAmount;
    const horizonMonths = Math.min(currentN, newN);
    for (let i = 0; i < horizonMonths; i++) {
      const intPmt = newBal * newR;
      const totalPmt = newPayment + extraPayment;
      const prinPmt = Math.min(totalPmt - intPmt, newBal);
      newInterestSameHorizon += intPmt;
      newBal = Math.max(0, newBal - prinPmt);
      if (newBal <= 0) break;
    }

    const interestSaved = currentTotalInterest - newInterestSameHorizon;

    // Build payoff chart data
    // Current loan balance over time
    const currentBalances: number[] = [currentBalance];
    let cBal = currentBalance;
    for (let i = 0; i < currentN; i++) {
      const intPmt = cBal * currentR;
      cBal = Math.max(0, cBal - (currentPayment - intPmt));
      currentBalances.push(Math.round(cBal));
      if (cBal <= 0) break;
    }

    // New loan balance over time with extra payment
    const newBalances: number[] = [newLoanAmount];
    let nBal = newLoanAmount;
    for (let i = 0; i < newN; i++) {
      const intPmt = nBal * newR;
      const prinPmt = Math.min(newPayment + extraPayment - intPmt, nBal);
      nBal = Math.max(0, nBal - prinPmt);
      newBalances.push(Math.round(nBal));
      if (nBal <= 0) break;
    }

    setResults({
      interestLeft,
      newLoanAmount,
      newPayment,
      monthlySavings,
      breakEvenMonths,
      outOfPocket,
      interestSaved,
      currentBalances,
      newBalances,
      currentN,
      newN,
    });
  }, [currentBalance, currentRate, yearsLeft, currentPayment, cashOut, closingCosts, financeClosing, newRate, newTerm, extraPayment]);

  // Draw chart
  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { currentBalances, newBalances, currentN, newN } = results;
    const maxMonths = Math.max(currentN, newN);
    const maxBal = Math.max(currentBalance, results.newLoanAmount);

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      const val = maxBal - (maxBal / 4) * i;
      ctx.fillStyle = "#999";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("$" + Math.round(val / 1000) + "k", pad.left - 6, y + 4);
    }

    // X axis labels
    const yearSteps = Math.ceil(maxMonths / 12 / 6);
    for (let y = 0; y <= Math.ceil(maxMonths / 12); y += yearSteps) {
      const x = pad.left + (y * 12 / maxMonths) * chartW;
      ctx.fillStyle = "#999";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Yr " + y, x, h - pad.bottom + 16);
    }

    const plotLine = (data: number[], color: string, dash: number[] = []) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      data.forEach((val, i) => {
        const x = pad.left + (i / maxMonths) * chartW;
        const y = pad.top + chartH - (val / maxBal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    plotLine(currentBalances, "#1D9E75");
    plotLine(newBalances, "#378ADD", [6, 3]);

  }, [results]);

  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto">

        <nav className="flex items-center justify-between px-5 md:px-8 py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
          <Link href="/"><Image src="/logo.png" alt="ShouldIFinance logo" width={110} height={36} priority /></Link>
          <div className="hidden md:flex gap-6">
            {["Calculators","Real estate","Investing","Blog","About"].map(l => (
              <a key={l} href="#" className="text-sm text-gray-500 hover:text-gray-900">{l}</a>
            ))}
          </div>
          <button className="hidden md:block text-sm bg-green-800 text-white rounded-lg px-4 py-2">Subscribe</button>
          <Link href="/" className="md:hidden text-sm text-gray-500">← Home</Link>
        </nav>

        <div className="px-5 md:px-8 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link><span>›</span>
          <span className="hover:text-green-700 cursor-pointer">Real estate</span><span>›</span>
          <span className="text-gray-900">Should I refinance?</span>
        </div>

        <div className="px-5 md:px-8 py-6 md:py-8 max-w-5xl">
          <div className="mb-2">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">ShouldIFinance · Refinance tools</p>
            <h1 className="text-2xl md:text-3xl font-medium text-gray-900 mb-2">Should I Refinance?</h1>
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">Enter your current loan and a new loan you're considering. We'll compare the monthly payment, chart out both payoff timelines, and show the real interest savings — including the effect of any extra payments you plan to make.</p>
          </div>

          {/* MAIN CALCULATOR GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-6">

            {/* CURRENT LOAN */}
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-900">Your current loan</p>
                <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">TODAY</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current balance</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={currentBalance} onChange={e => setCurrentBalance(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /></div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current rate</label>
                  <div className="relative"><input type="number" value={currentRate} step={0.125} onChange={e => setCurrentRate(+e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Years remaining — how long left on this loan</label>
                  <div className="relative"><input type="number" value={yearsLeft} onChange={e => setYearsLeft(+e.target.value)} className="w-full pl-3 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">yrs</span></div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current monthly payment (P&I)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={currentPayment} onChange={e => setCurrentPayment(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /></div>
                </div>
                {results && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Interest left to pay (at this pace)</span>
                      <span className="font-medium text-gray-900">{fmtK(results.interestLeft)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NEW LOAN */}
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-900">The new loan</p>
                <span className="text-xs bg-green-50 text-green-700 rounded px-2 py-0.5">PROPOSED</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Loan terms — cash out (extra cash to you at closing, if any)</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={cashOut} onChange={e => setCashOut(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /></div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Closing costs</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={closingCosts} onChange={e => setClosingCosts(+e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="financeClosing" checked={financeClosing} onChange={e => setFinanceClosing(e.target.checked)} className="w-4 h-4 accent-green-700" />
                  <label htmlFor="financeClosing" className="text-xs text-gray-500">Finance closing costs into the new loan (unchecked = paid out of pocket)</label>
                </div>
                {results && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-green-700 font-medium">New loan amount</span>
                    <span className="text-sm font-medium text-green-800">{fmtK(results.newLoanAmount)}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New rate</label>
                  <div className="relative"><input type="number" value={newRate} step={0.125} onChange={e => setNewRate(+e.target.value)} className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New term</label>
                  <div className="relative"><input type="number" value={newTerm} onChange={e => setNewTerm(+e.target.value)} className="w-full pl-3 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">yrs</span></div>
                </div>
                {results && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-green-700 font-medium">New monthly payment (P&I)</span>
                    <span className="text-sm font-medium text-green-800">{fmt(results.newPayment)}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Optional: pay extra toward the new loan — extra monthly payment applied straight to principal</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={extraPayment} onChange={e => setExtraPayment(+e.target.value)} placeholder="0" className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* PAYOFF TIMELINE CHART */}
          <div className="border border-gray-200 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Payoff timeline</h2>
            <div style={{ position: "relative", width: "100%", height: "220px" }}>
              <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} role="img" aria-label="Payoff timeline chart comparing current loan vs new loan balance over time" />
            </div>
            <div className="flex gap-6 mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-6 h-0.5 bg-green-600"></div>Current loan
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-6 h-0.5 bg-blue-500" style={{ borderTop: "2px dashed #378ADD" }}></div>New loan
              </div>
            </div>

            {/* Reset the clock caveat */}
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
              <strong>⚠ The "reset the clock" caveat</strong><br />
              A new loan starts its amortization over, so comparing total lifetime interest on a fresh {newTerm}-year loan against a mortgage you're already partway through isn't quite apples-to-apples. Below, alongside the full-life-of-loan interest figures, we've also compared interest paid over the same {yearsLeft}-year horizon as what's left on your current loan — that's the fairer comparison if you plan to stay put.
            </div>
          </div>

          {/* RESULTS SUMMARY */}
          {results && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Payment today</p>
                  <p className="text-lg font-medium text-gray-900">{fmt(currentPayment)}</p>
                </div>
                <div className="p-4 text-center bg-green-800">
                  <p className="text-xs text-green-300 mb-1">You&apos;d save</p>
                  <p className="text-2xl font-medium text-white">{fmt(Math.abs(results.monthlySavings))}</p>
                  <p className="text-xs text-green-300">per month</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">New payment</p>
                  <p className="text-lg font-medium text-gray-900">{fmt(results.newPayment)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Break-even on closing costs</p>
                  <p className="text-base font-medium text-gray-900">
                    {results.breakEvenMonths ? `${results.breakEvenMonths} months` : "N/A"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {results.breakEvenMonths ? `${(results.breakEvenMonths / 12).toFixed(1)} years to recoup costs` : "Monthly payment doesn't decrease"}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Interest saved — same {yearsLeft}-yr horizon</p>
                  <p className={`text-base font-medium ${results.interestSaved > 0 ? "text-green-700" : "text-red-600"}`}>
                    {results.interestSaved > 0 ? fmtK(results.interestSaved) : "-" + fmtK(Math.abs(results.interestSaved))}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">vs. {fmtK(Math.abs(results.interestSaved))} {results.interestSaved > 0 ? "saved" : "more"} on the new loan full term</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-100 mb-6">
            Figures are estimates for discussion purposes only, based on the numbers entered above. "Interest left to pay" on your current loan is approximated from your payment and remaining term. Extra payments change your note rate — they reduce total interest by shortening your loan. Actual figures depend on credit, escrow, and underwriting. This is not a commitment to lend.
          </div>

          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50">
            <div className="flex justify-around">
              {[{ icon: "🏠", label: "Real estate" },{ icon: "📈", label: "Investing" },{ icon: "🚗", label: "Auto" },{ icon: "📝", label: "Blog" }].map(item => (
                <button key={item.label} className="flex flex-col items-center gap-1 px-3 py-1">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs text-gray-500">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="md:hidden h-16"></div>
        </div>
      </div>
    </main>
  );
}
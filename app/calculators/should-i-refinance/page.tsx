"use client";
import Image from "next/image";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

export default function ShouldIRefinance() {
  const [currentBalance, setCurrentBalance] = useState<number | "">(0);
  const [currentRate, setCurrentRate] = useState<number | "">(0);
  const [yearsLeft, setYearsLeft] = useState<number | "">(0);
  const [currentPayment, setCurrentPayment] = useState<number | "">(0);
  const [cashOut, setCashOut] = useState<number | "">(0);
  const [closingCosts, setClosingCosts] = useState<number | "">(0);
  const [financeClosing, setFinanceClosing] = useState(false);
  const [newRate, setNewRate] = useState<number | "">(0);
  const [newTerm, setNewTerm] = useState<number | "">(30);
  const [extraPayment, setExtraPayment] = useState<number | "">("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fmt = (v: number) => "$" + Math.round(Math.abs(v)).toLocaleString();
  const fmtK = (v: number) => {
    const n = Math.round(Math.abs(v));
    return n >= 1000000 ? "$" + (n / 1000000).toFixed(2) + "M" : "$" + n.toLocaleString();
  };

  const loadExample = () => {
    setCurrentBalance(300000);
    setCurrentRate(7.5);
    setYearsLeft(25);
    setCurrentPayment(2100);
    setCashOut(0);
    setClosingCosts(5000);
    setFinanceClosing(false);
    setNewRate(6.5);
    setNewTerm(30);
    setExtraPayment("");
  };

  const n = (v: number | "") => (v === "" ? 0 : +v);

  const results = useMemo(() => {
    if (!n(currentBalance) && !n(currentRate) && !n(currentPayment)) return null;

    const currentR = n(currentRate) / 100 / 12;
    const currentN = n(yearsLeft) * 12;
    const interestLeft = (n(currentPayment) * currentN) - n(currentBalance);
    const newLoanBase = n(currentBalance) + n(cashOut);
    const newLoanAmount = financeClosing ? newLoanBase + n(closingCosts) : newLoanBase;
    const outOfPocket = financeClosing ? 0 : n(closingCosts);
    const newR = n(newRate) / 100 / 12;
    const newN = n(newTerm) * 12;
    const newPayment = newR > 0
      ? newLoanAmount * newR * Math.pow(1 + newR, newN) / (Math.pow(1 + newR, newN) - 1)
      : newLoanAmount / newN;
    const monthlySavings = n(currentPayment) - newPayment;
    const extraPmt = n(extraPayment);
    const breakEvenMonths = monthlySavings > 0 ? Math.ceil(outOfPocket / monthlySavings) : null;

    let newInterestSameHorizon = 0;
    let newBal = newLoanAmount;
    const horizonMonths = Math.min(currentN, newN);
    for (let i = 0; i < horizonMonths; i++) {
      const intPmt = newBal * newR;
      const prinPmt = Math.min(newPayment + extraPmt - intPmt, newBal);
      newInterestSameHorizon += intPmt;
      newBal = Math.max(0, newBal - prinPmt);
      if (newBal <= 0) break;
    }
    const interestSaved = interestLeft - newInterestSameHorizon;

    const currentBalances: number[] = [n(currentBalance)];
    let cBal = n(currentBalance);
    for (let i = 0; i < currentN; i++) {
      const intPmt = cBal * currentR;
      cBal = Math.max(0, cBal - (n(currentPayment) - intPmt));
      currentBalances.push(Math.round(cBal));
      if (cBal <= 0) break;
    }

    const newBalances: number[] = [newLoanAmount];
    let nBal = newLoanAmount;
    for (let i = 0; i < newN; i++) {
      const intPmt = nBal * newR;
      const prinPmt = Math.min(newPayment + extraPmt - intPmt, nBal);
      nBal = Math.max(0, nBal - prinPmt);
      newBalances.push(Math.round(nBal));
      if (nBal <= 0) break;
    }

    return {
      interestLeft, newLoanAmount, newPayment, monthlySavings,
      breakEvenMonths, outOfPocket, interestSaved,
      currentBalances, newBalances, currentN, newN,
      suggestedExtra: Math.max(0, Math.round(monthlySavings)),
    };
  }, [currentBalance, currentRate, yearsLeft, currentPayment, cashOut, closingCosts, financeClosing, newRate, newTerm, extraPayment]);

  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { currentBalances, newBalances, currentN, newN } = results;
    const maxMonths = Math.max(currentN, newN);
    const maxBal = Math.max(currentBalances[0], results.newLoanAmount);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const pad = { top: 16, right: 16, bottom: 36, left: 52 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = "#aaa"; ctx.font = "10px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("$" + Math.round((maxBal - (maxBal / 4) * i) / 1000) + "k", pad.left - 4, y + 3);
    }
    const steps = Math.ceil(maxMonths / 12 / 5);
    for (let y = 0; y <= Math.ceil(maxMonths / 12); y += steps) {
      const x = pad.left + (y * 12 / maxMonths) * chartW;
      ctx.fillStyle = "#aaa"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Yr " + y, x, h - pad.bottom + 14);
    }
    const plotLine = (data: number[], color: string, dash: number[] = []) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash);
      data.forEach((val, i) => {
        const x = pad.left + (i / maxMonths) * chartW;
        const y = pad.top + chartH - (val / maxBal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
    };
    plotLine(currentBalances, "#0F6E56");
    plotLine(newBalances, "#378ADD", [6, 3]);
  }, [results]);

  const inputCls = "w-full py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 bg-white";

  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-5xl mx-auto">

        <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-50">
          <Link href="/"><Image src="/logo.png" alt="ShouldIFinance logo" width={100} height={32} priority /></Link>
          <div className="hidden md:flex gap-6">
            {["Calculators","Real estate","Investing","Blog","About"].map(l => (
              <a key={l} href="#" className="text-sm text-gray-500 hover:text-gray-900">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadExample} className="text-xs border border-green-200 text-green-700 rounded-lg px-3 py-1.5 hover:bg-green-50">
              See with example numbers
            </button>
            <Link href="/" className="md:hidden text-sm text-gray-400">← Back</Link>
          </div>
        </nav>

        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link><span>›</span>
          <span>Real estate</span><span>›</span>
          <span className="text-gray-900">Should I refinance?</span>
        </div>

        <div className="px-5 py-6">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Refinance tools</p>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">Should I Refinance?</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-2xl">Enter your current loan and a new loan you&apos;re considering. We&apos;ll compare monthly payments, chart both payoff timelines, and show real interest savings — including any extra payments.</p>

          {/* TWO COLUMN ON DESKTOP, STACKED ON MOBILE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* CURRENT LOAN */}
            <div className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-medium text-gray-900">Your current loan</p>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-3 py-1">TODAY</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Current balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" value={currentBalance} placeholder="300000"
                      onChange={e => setCurrentBalance(e.target.value === "" ? "" : +e.target.value)}
                      className={inputCls + " pl-7 pr-3"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Current rate</label>
                    <div className="relative">
                      <input type="number" value={currentRate} step={0.125} placeholder="7.5"
                        onChange={e => setCurrentRate(e.target.value === "" ? "" : +e.target.value)}
                        className={inputCls + " pl-3 pr-8"} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Years left</label>
                    <div className="relative">
                      <input type="number" value={yearsLeft} placeholder="25"
                        onChange={e => setYearsLeft(e.target.value === "" ? "" : +e.target.value)}
                        className={inputCls + " pl-3 pr-10"} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">yrs</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Current monthly payment (P&I)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" value={currentPayment} placeholder="2100"
                      onChange={e => setCurrentPayment(e.target.value === "" ? "" : +e.target.value)}
                      className={inputCls + " pl-7 pr-3"} />
                  </div>
                </div>
                {results && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Interest left to pay at this pace</span>
                    <span className="text-sm font-medium text-gray-900">{fmtK(results.interestLeft)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* NEW LOAN */}
            <div className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-medium text-gray-900">The new loan</p>
                <span className="text-xs bg-green-50 text-green-700 rounded-full px-3 py-1">PROPOSED</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Cash out</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="number" value={cashOut} placeholder="0"
                        onChange={e => setCashOut(e.target.value === "" ? "" : +e.target.value)}
                        className={inputCls + " pl-7 pr-3"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Closing costs</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="number" value={closingCosts} placeholder="5000"
                        onChange={e => setClosingCosts(e.target.value === "" ? "" : +e.target.value)}
                        className={inputCls + " pl-7 pr-3"} />
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={financeClosing} onChange={e => setFinanceClosing(e.target.checked)} className="mt-0.5 w-4 h-4 accent-green-700 flex-shrink-0" />
                  <span className="text-xs text-gray-500 leading-relaxed">Finance closing costs into the new loan (unchecked = paid out of pocket)</span>
                </label>
                {results && (
                  <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-green-700 font-medium">New loan amount</span>
                    <span className="text-sm font-medium text-green-800">{fmtK(results.newLoanAmount)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">New rate</label>
                    <div className="relative">
                      <input type="number" value={newRate} step={0.125} placeholder="6.5"
                        onChange={e => setNewRate(e.target.value === "" ? "" : +e.target.value)}
                        className={inputCls + " pl-3 pr-8"} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">New term</label>
                    <div className="relative">
                      <input type="number" value={newTerm} placeholder="30"
                        onChange={e => setNewTerm(e.target.value === "" ? "" : +e.target.value)}
                        className={inputCls + " pl-3 pr-10"} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">yrs</span>
                    </div>
                  </div>
                </div>
                {results && (
                  <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-green-700 font-medium">New monthly payment (P&I)</span>
                    <span className="text-sm font-medium text-green-800">{fmt(results.newPayment)}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Extra monthly payment toward principal
                    {results && results.suggestedExtra > 0 && (
                      <button onClick={() => setExtraPayment(results.suggestedExtra)} className="ml-2 text-green-700 underline text-xs">
                        Use savings ({fmt(results.suggestedExtra)}/mo)
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" value={extraPayment}
                      placeholder={results ? String(results.suggestedExtra) : "0"}
                      onChange={e => setExtraPayment(e.target.value === "" ? "" : +e.target.value)}
                      className={inputCls + " pl-7 pr-3"} />
                  </div>
                  {results && results.suggestedExtra > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Suggested: apply your monthly savings of {fmt(results.suggestedExtra)} as extra principal</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CHART */}
          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Payoff timeline</h2>
            <div style={{ position:"relative", width:"100%", height:"200px" }}>
              <canvas ref={canvasRef} style={{ width:"100%", height:"100%" }}
                role="img" aria-label="Payoff timeline comparing current vs new loan balance over time" />
            </div>
            <div className="flex gap-6 mt-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-5 h-0.5 bg-green-700"></div>Current loan
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-5 border-t-2 border-dashed border-blue-400"></div>New loan
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
              <strong>⚠ The &quot;reset the clock&quot; caveat</strong><br />
              A new loan restarts amortization, so comparing full lifetime interest on a fresh {n(newTerm)}-year loan against one you&apos;re partway through isn&apos;t apples-to-apples. Below we compare interest paid over the same {n(yearsLeft)}-year horizon — that&apos;s the fairer number if you plan to stay put.
            </div>
          </div>

          {/* RESULTS */}
          {results && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Payment today</p>
                  <p className="text-lg font-medium text-gray-900">{fmt(n(currentPayment))}</p>
                </div>
                <div className="p-4 text-center bg-green-800">
                  <p className="text-xs text-green-300 mb-0.5">You&apos;d save</p>
                  <p className="text-2xl font-medium text-white">{fmt(Math.abs(results.monthlySavings))}</p>
                  <p className="text-xs text-green-300">per month</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">New payment</p>
                  <p className="text-lg font-medium text-gray-900">{fmt(results.newPayment)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100">
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Break-even on closing costs</p>
                  <p className="text-base font-medium text-gray-900">
                    {results.breakEvenMonths ? `${results.breakEvenMonths} months` : "N/A"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {results.breakEvenMonths
                      ? `${(results.breakEvenMonths / 12).toFixed(1)} years to recoup costs`
                      : "Payment doesn't decrease"}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Interest saved — same {n(yearsLeft)}-yr horizon</p>
                  <p className={`text-base font-medium ${results.interestSaved > 0 ? "text-green-700" : "text-red-600"}`}>
                    {results.interestSaved > 0 ? fmtK(results.interestSaved) : "-" + fmtK(Math.abs(results.interestSaved))}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">vs. staying with current loan</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
            Figures are estimates for discussion purposes only. Not a commitment to lend. Actual figures depend on credit, escrow, and underwriting.
          </div>

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
        </div>
      </div>
    </main>
  );
}
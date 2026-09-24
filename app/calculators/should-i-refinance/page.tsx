"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import CalculatorSidebar, { CalculatorBrowseMobile } from "../../components/CalculatorSidebar";
import MobileBottomNav, { MobileBottomNavSpacer } from "../../components/MobileBottomNav";
import SiteNav from "../../components/SiteNav";
import ExampleButton from "../../components/ExampleButton";
import { payment, amortize, monthsFromPayment, interestOver } from "../../lib/finance";
import { NumField } from "../../components/Inputs";
import { related } from "../../lib/calculators";
import RelatedCalculators from "../../components/RelatedCalculators";
import AdUnit from "../../components/AdUnit";
import GuideLink from "../../components/GuideLink";
import ExportBar from "../../components/ExportBar";

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

type Num = number | "";

/* Resolved once at module scope: the registry is static, and the count
   decides the grid's column class. */
const RELATED = related("should-i-refinance", [
  "refinance-to-pay-off-debt",
  "extra-payments",
  "rate-buydown",
]);

export default function ShouldIRefinance() {
  const [currentBalance, setCurrentBalance] = useState<Num>("");
  const [currentRate, setCurrentRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [currentPayment, setCurrentPayment] = useState<Num>("");
  /**
   * Which half of the payment/term pair was last filled in for the user.
   * Balance and rate are always entered; payment and term are two views of the
   * same fact, so editing one recomputes the other and this records which.
   */
  const [derived, setDerived] = useState<"payment" | "term" | null>(null);
  const [cashOut, setCashOut] = useState<Num>("");
  const [closingCosts, setClosingCosts] = useState<Num>("");
  const [financeClosing, setFinanceClosing] = useState(true);
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [extraPayment, setExtraPayment] = useState<Num>("");
  /**
   * False while the extra-payment field still mirrors the suggested saving.
   * Set once the user types their own figure, so recalculations stop moving it
   * under them. "Use savings" clears it again.
   */
  const [extraDirty, setExtraDirty] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const n = (v: Num) => (v === "" ? 0 : +v);
  const fmt = (v: number) => "$" + Math.round(Math.abs(v)).toLocaleString();
  const fmtK = (v: number) => {
    const a = Math.round(Math.abs(v));
    return a >= 1000000 ? "$" + (a / 1000000).toFixed(2) + "M" : "$" + a.toLocaleString();
  };
  const yearsOf = (months: number) => Math.round((months / 12) * 10) / 10;

  const loadExample = () => {
    const bal = 300000, rate = 7.5, yrs = 27;
    const cash = 0, costs = 5000, nRate = 6.5, nTermYears = 30;
    // Derive the payment through the same linked-pair helper the form uses, so
    // the example can never drift out of step with the amortization maths.
    const pay = payFrom(bal, rate, yrs);

    setCurrentBalance(bal);
    setCurrentRate(rate);
    setYearsLeft(yrs);
    setCurrentPayment(pay);
    setDerived(null);
    setCashOut(cash);
    setClosingCosts(costs);
    setFinanceClosing(true);
    setNewRate(nRate);
    setNewTerm(nTermYears);
    // Open on the scenario the caveat recommends: the saving redirected to
    // principal, so total outlay is unchanged from what they pay today. Left
    // untouched, so it keeps tracking the suggestion as inputs change.
    setExtraDirty(false);
    setExtraPayment("");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setCurrentBalance("");
    setCurrentRate("");
    setYearsLeft("");
    setCurrentPayment("");
    setDerived(null);
    setCashOut("");
    setClosingCosts("");
    setFinanceClosing(true);
    setNewRate("");
    setNewTerm("");
    setExtraPayment("");
    setExtraDirty(false);
  };

  // --- the linked pair -------------------------------------------------
  // Balance and rate are always entered. Payment and remaining term are two
  // views of the same fact, so editing either recomputes the other and the
  // current loan can never be described impossibly. Both stay editable: the
  // payment field is the lever for anyone already overpaying their loan.

  const termFrom = (bal: number, rate: number, pay: number): Num => {
    const m = monthsFromPayment(bal, rate, pay);
    return m === null ? "" : yearsOf(m);
  };
  const payFrom = (bal: number, rate: number, yrs: number): Num => {
    const p = payment(bal, rate, Math.round(yrs * 12));
    return p > 0 ? Math.round(p) : "";
  };

  /** Balance or rate moved — refresh whichever of the pair is the derived one. */
  const reconcile = (bal: number, rate: number) => {
    if (derived === "payment" && n(yearsLeft) > 0) {
      setCurrentPayment(payFrom(bal, rate, n(yearsLeft)));
    } else if (n(currentPayment) > 0) {
      setYearsLeft(termFrom(bal, rate, n(currentPayment)));
    }
  };

  const onBalance = (v: Num) => { setCurrentBalance(v); reconcile(n(v), n(currentRate)); };
  const onRate = (v: Num) => { setCurrentRate(v); reconcile(n(currentBalance), n(v)); };
  const onPayment = (v: Num) => {
    setCurrentPayment(v);
    setDerived("term");
    setYearsLeft(n(v) > 0 ? termFrom(n(currentBalance), n(currentRate), n(v)) : "");
  };
  const onYears = (v: Num) => {
    setYearsLeft(v);
    setDerived("payment");
    setCurrentPayment(n(v) > 0 ? payFrom(n(currentBalance), n(currentRate), n(v)) : "");
  };

  const interestOnly = n(currentBalance) * (n(currentRate) / 100 / 12);
  const paymentTooSmall =
    n(currentBalance) > 0 &&
    n(currentRate) > 0 &&
    n(currentPayment) > 0 &&
    monthsFromPayment(n(currentBalance), n(currentRate), n(currentPayment)) === null;

  /**
   * The saving a refinance frees up each month. Depends only on the current
   * payment and the new loan's terms — never on the extra payment — so the
   * field below can be derived from it without a cycle.
   */
  const suggestedExtra = useMemo(() => {
    const bal = n(currentBalance);
    const pay = n(currentPayment);
    const term = n(newTerm);
    if (bal <= 0 || pay <= 0 || term <= 0) return 0;
    const newLoan = bal + n(cashOut) + (financeClosing ? n(closingCosts) : 0);
    const newPay = payment(newLoan, n(newRate), Math.round(term * 12));
    return Math.max(0, Math.round(pay - newPay));
  }, [currentBalance, currentPayment, cashOut, closingCosts, financeClosing, newRate, newTerm]);

  /**
   * What the field shows and the results use. Until the user edits it, this is
   * the live suggestion, so toggling financing or changing a rate moves it too.
   * Derived rather than stored, which avoids syncing state inside an effect.
   */
  const extraValue: Num = extraDirty ? extraPayment : (suggestedExtra > 0 ? suggestedExtra : "");

  const onExtraChange = (v: Num) => { setExtraDirty(true); setExtraPayment(v); };
  const useSuggestedExtra = () => { setExtraDirty(false); setExtraPayment(""); };

  const results = useMemo(() => {
    const bal = n(currentBalance);
    const rate = n(currentRate);
    const pay = n(currentPayment);
    const term = n(newTerm);
    if (bal <= 0 || pay <= 0 || rate < 0 || term <= 0 || n(newRate) < 0) return null;

    const curMonths = monthsFromPayment(bal, rate, pay);
    if (curMonths === null) return null;

    // Remaining interest comes from actually amortizing the loan — never from
    // payment x months minus balance, which ignores the rate entirely.
    const cur = amortize(bal, rate, 600, 0, pay);
    if (!Number.isFinite(cur.totalInterest)) return null;

    const horizonYears = n(yearsLeft) > 0 ? n(yearsLeft) : yearsOf(curMonths);
    const horizonMonths = Math.max(1, Math.round(horizonYears * 12));
    const curInterestHorizon = interestOver(bal, rate, pay, 0, horizonMonths);

    const newLoanAmount = bal + n(cashOut) + (financeClosing ? n(closingCosts) : 0);
    const outOfPocket = financeClosing ? 0 : n(closingCosts);
    const newN = Math.round(term * 12);
    const newPayment = payment(newLoanAmount, n(newRate), newN);
    const monthlySavings = pay - newPayment;
    const extraPmt = n(extraValue);

    // Break-even is closing costs over the monthly saving in both states —
    // financing changes when you pay them, not what they cost.
    const breakEvenMonths =
      monthlySavings > 0 && n(closingCosts) > 0
        ? Math.ceil(n(closingCosts) / monthlySavings)
        : null;

    const newAmort = amortize(newLoanAmount, n(newRate), newN, extraPmt);
    const newInterestHorizon = interestOver(newLoanAmount, n(newRate), newPayment, extraPmt, horizonMonths);
    const interestDelta = curInterestHorizon - newInterestHorizon;

    const currentBalances: number[] = [bal];
    {
      const r = rate / 100 / 12;
      let b = bal;
      for (let i = 0; i < 600 && b > 0.005; i++) {
        b = Math.max(0, b - (pay - b * r));
        currentBalances.push(Math.round(b));
      }
    }
    const newBalances: number[] = [newLoanAmount];
    {
      const r = n(newRate) / 100 / 12;
      let b = newLoanAmount;
      for (let i = 0; i < newN && b > 0.005; i++) {
        const principal = Math.min(newPayment + extraPmt - b * r, b);
        if (principal <= 0) break;
        b = Math.max(0, b - principal);
        newBalances.push(Math.round(b));
      }
    }

    return {
      curTotalInterest: cur.totalInterest, curPayoffMonths: cur.payoffMonths,
      horizonMonths, horizonYears, curInterestHorizon,
      newLoanAmount, newPayment, outOfPocket,
      monthlySavings, extraPmt, breakEvenMonths,
      newPayoffMonths: newAmort.payoffMonths, newInterestHorizon, interestDelta,
      currentBalances, newBalances,
      totalOutlay: newPayment + extraPmt,
    };
  }, [currentBalance, currentRate, yearsLeft, currentPayment, cashOut, closingCosts, financeClosing, newRate, newTerm, extraValue]);

  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { currentBalances, newBalances } = results;
    const maxMonths = Math.max(currentBalances.length, newBalances.length, 2) - 1;
    const maxBal = Math.max(currentBalances[0], results.newLoanAmount) || 1;
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
    const steps = Math.max(1, Math.ceil(maxMonths / 12 / 5));
    for (let y = 0; y <= Math.ceil(maxMonths / 12); y += steps) {
      const x = pad.left + ((y * 12) / maxMonths) * chartW;
      ctx.fillStyle = "#aaa"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Yr " + y, x, h - pad.bottom + 14);
    }
    const plotLine = (data: number[], color: string, dash: number[] = []) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash);
      data.forEach((val, i) => {
        const x = pad.left + (i / maxMonths) * chartW;
        const y = pad.top + chartH - (val / maxBal) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
    };
    plotLine(currentBalances, "#0F6E56");
    plotLine(newBalances, "#378ADD", [6, 3]);
  }, [results]);


  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto">

        <SiteNav position="sticky" logo="compact" />

        <div className="px-5 py-1.5 md:py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-green-700">Home</Link><span>›</span>
          <Link href="/calculators#real-estate" className="hover:text-green-700">Home</Link><span>›</span>
          <span className="text-gray-900">Should I refinance?</span>
        </div>

        <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)]">
        <CalculatorSidebar />

        <div className="min-w-0">
        <CalculatorBrowseMobile />

        <div className="px-5 py-4 md:py-6">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Refinance tools</p>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">Should I refinance?</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-2xl">Enter your current loan and a new loan you&apos;re considering. We&apos;ll compare monthly payments, chart both payoff timelines, and show real interest savings — including any extra payments.</p>

            <ExampleButton slug="should-i-refinance" onLoad={loadExample} onClear={clearExample} />

          {/* TWO COLUMN ON DESKTOP, STACKED ON MOBILE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* CURRENT LOAN */}
            <div className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-medium text-gray-900">Your current loan</p>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-3 py-1">TODAY</span>
              </div>
              <div className="space-y-4">
                <NumField label="Current balance" value={currentBalance} onChange={onBalance} placeholder="300000" prefix="$" />
                <NumField label="Current rate" value={currentRate} onChange={onRate} placeholder="7.5" suffix="%" step={0.125} />

                <NumField
                  label="Current monthly payment (P&I)"
                  value={currentPayment}
                  onChange={onPayment}
                  placeholder="2162"
                  prefix="$"
                  hint={
                    derived === "payment" && n(currentPayment) > 0
                      ? "Calculated from your remaining term. Already paying extra? Type your real payment and the years left will follow."
                      : undefined
                  }
                />
                <NumField
                  label="Years left"
                  value={yearsLeft}
                  onChange={onYears}
                  placeholder="27"
                  suffix="yrs"
                  step={0.1}
                  hint={derived === "term" && n(yearsLeft) > 0 ? "Calculated from your payment." : undefined}
                />

                {paymentTooSmall ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700 leading-relaxed">
                    That payment doesn&apos;t cover the interest on this balance. Make sure you&apos;re entering
                    principal and interest only, not your full payment with taxes and insurance.
                    {interestOnly > 0 && (
                      <> Interest alone runs about <strong>{fmt(interestOnly)}</strong> a month.</>
                    )}
                  </div>
                ) : results ? (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-400">Interest left to pay at this pace</span>
                    <span className="text-sm font-medium text-gray-900">{fmtK(results.curTotalInterest)}</span>
                  </div>
                ) : null}
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
                  <NumField label="Cash out" value={cashOut} onChange={setCashOut} placeholder="0" prefix="$" />
                  <NumField label="Closing costs" value={closingCosts} onChange={setClosingCosts} placeholder="5000" prefix="$" />
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={financeClosing} onChange={e => setFinanceClosing(e.target.checked)} className="mt-0.5 w-4 h-4 accent-green-700 flex-shrink-0" />
                  <span className="text-xs text-gray-500 leading-relaxed">Finance closing costs into the new loan (unchecked = paid out of pocket)</span>
                </label>
                {results && (
                  <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-green-700 font-medium">New loan amount</span>
                    <span className="text-sm font-medium text-green-800">{fmtK(results.newLoanAmount)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="New rate" value={newRate} onChange={setNewRate} placeholder="6.5" suffix="%" step={0.125} />
                  <NumField label="New term" value={newTerm} onChange={setNewTerm} placeholder="30" suffix="yrs" />
                </div>
                {results && (
                  <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-green-700 font-medium">New monthly payment (P&amp;I)</span>
                    <span className="text-sm font-medium text-green-800">{fmt(results.newPayment)}</span>
                  </div>
                )}
                <NumField
                  label="Extra monthly payment toward principal"
                  value={extraValue}
                  onChange={onExtraChange}
                  placeholder={suggestedExtra > 0 ? String(suggestedExtra) : "0"}
                  prefix="$"
                  action={
                    suggestedExtra > 0 ? (
                      <button onClick={useSuggestedExtra} className="ml-2 text-green-700 underline text-xs">
                        Use savings ({fmt(suggestedExtra)}/mo)
                      </button>
                    ) : undefined
                  }
                  hint={
                    results && results.extraPmt > 0 ? (
                      <>
                        Applied to the new loan. Total outlay {fmt(results.totalOutlay)}/mo
                        {results.totalOutlay <= n(currentPayment) + 1 && <> — no more than you pay today</>}.
                      </>
                    ) : undefined
                  }
                />
              </div>
            </div>
          </div>

          {/* CHART */}
          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Payoff timeline</h2>
            <div style={{ position: "relative", width: "100%", height: "200px" }}>
              <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }}
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
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed space-y-2">
              <p>
                <strong>⚠ The &quot;reset the clock&quot; caveat</strong><br />
                A new loan restarts amortization, so comparing lifetime interest on a fresh{" "}
                {n(newTerm) > 0 ? `${n(newTerm)}-year` : "new"} loan against one you&apos;re partway through
                isn&apos;t apples-to-apples. The figures below compare interest over the same{" "}
                {results ? `${results.horizonYears}-year` : "remaining"} horizon instead.
              </p>
              <p>
                The strongest version of a refinance is to take the monthly saving and put it straight back
                onto the new loan&apos;s principal. Your total outlay doesn&apos;t rise, because the money is the
                saving itself, but it offsets the term reset and cuts both the interest and the payoff date.
                That only works if you actually make the extra payment rather than letting the saving
                disappear into the budget.
              </p>
            </div>
          </div>

          {/* RESULTS */}
          {results && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                {/* data-x-* so the shared ExportBar can harvest results here too.
                    This page builds its own results markup instead of using
                    Headline/Stat, so none of it is tagged for free. */}
                <div className="p-4 text-center" data-x-stat="Payment today">
                  <p className="text-xs text-gray-400 mb-1">Payment today</p>
                  <p className="text-lg font-medium text-gray-900" data-x-value>{fmt(n(currentPayment))}</p>
                </div>
                <div className={`p-4 text-center ${results.monthlySavings >= 0 ? "bg-green-800" : "bg-amber-600"}`}>
                  <p className="text-xs text-white/70 mb-0.5">
                    {results.monthlySavings >= 0 ? "You'd save" : "You'd pay"}
                  </p>
                  <p
                    className="text-2xl font-medium text-white"
                    data-x-headline={results.monthlySavings >= 0 ? "Monthly saving" : "Monthly increase"}
                  >
                    {fmt(Math.abs(results.monthlySavings))}
                  </p>
                  <p className="text-xs text-white/70">
                    per month{results.monthlySavings < 0 ? " more" : ""}
                  </p>
                </div>
                <div className="p-4 text-center" data-x-stat="New payment">
                  <p className="text-xs text-gray-400 mb-1">New payment</p>
                  <p className="text-lg font-medium text-gray-900" data-x-value>{fmt(results.newPayment)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100">
                <div className="p-4 text-center" data-x-stat="Break-even on closing costs">
                  <p className="text-xs text-gray-400 mb-1">Break-even on closing costs</p>
                  <p className="text-base font-medium text-gray-900" data-x-value>
                    {results.breakEvenMonths ? `${results.breakEvenMonths} months` : "N/A"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {results.breakEvenMonths
                      ? `${(results.breakEvenMonths / 12).toFixed(1)} years to recoup costs`
                      : results.monthlySavings <= 0 ? "Payment doesn't decrease" : "No closing costs entered"}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Clearing the costs is a lower bar than finishing ahead overall — sending the saving to
                    principal is what opens that gap.
                  </p>
                </div>
                <div className="p-4 text-center">
                  {/* The label flips with the sign — never a negative under a positive label. */}
                  <p className="text-xs text-gray-400 mb-1">
                    {results.interestDelta >= 0 ? "Interest saved" : "Extra interest you'd pay"}
                  </p>
                  <p className={`text-base font-medium ${results.interestDelta >= 0 ? "text-green-700" : "text-amber-600"}`}>
                    {fmtK(Math.abs(results.interestDelta))}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">over a {results.horizonYears}-year horizon</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">New loan paid off in</p>
                  <p className="text-base font-medium text-gray-900">
                    {Number.isFinite(results.newPayoffMonths)
                      ? `${(results.newPayoffMonths / 12).toFixed(1)} years`
                      : "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {results.extraPmt > 0 ? `with ${fmt(results.extraPmt)}/mo extra` : "no extra payment"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EXPORT — this page builds its own chrome, so CalcShell does not
              place this for it. See the "DOES NOT USE CalcShell" note above. */}
          <ExportBar slug="should-i-refinance" />

          {/* RELATED */}
          {/* AD — same position as CalcShell: below results and export,
              above related. See AdUnit for the separation rules. */}
          <AdUnit placement="calculatorBelowResults" />

          {/* The shared component, so this page's grid is tracked like the
              other 42. See RelatedCalculators for why. */}
          <RelatedCalculators from="should-i-refinance" cards={RELATED} />

          <GuideLink slug="should-i-refinance" />

          <div className="text-xs text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6" data-x-disclaimer>
            Figures are estimates for discussion purposes only. Not a commitment to lend. Actual figures depend on credit, escrow, and underwriting.
          </div>

          <MobileBottomNav />
          <MobileBottomNavSpacer />
        </div>
        </div>
        </div>
      </div>
    </main>
  );
}

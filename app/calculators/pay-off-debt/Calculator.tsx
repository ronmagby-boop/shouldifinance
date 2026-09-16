"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");
  const [investReturn, setInvestReturn] = useState<Num>("");
  const [taxRate, setTaxRate] = useState<Num>("");
  const [deductible, setDeductible] = useState(false);
  const [marginalRate, setMarginalRate] = useState<Num>("");

  const loadExample = () => {
    setBalance(280000);
    setRate(6.75);
    setYearsLeft(26);
    setExtra(600);
    setInvestReturn(7.5);
    setTaxRate(15);
    setDeductible(false);
    setMarginalRate(24);
  };

  const r = useMemo(() => {
    const bal = n(balance);
    const term = Math.round(n(yearsLeft) * 12);
    if (bal <= 0 || term <= 0 || n(extra) <= 0) return null;

    const basePayment = payment(bal, n(rate), term);
    const base = amortize(bal, n(rate), term);
    const fast = amortize(bal, n(rate), term, n(extra), basePayment);
    if (!Number.isFinite(fast.totalInterest)) return null;

    // After-tax cost of the debt, if the interest is deductible.
    const effectiveDebtRate = deductible ? n(rate) * (1 - n(marginalRate) / 100) : n(rate);
    const afterTaxInvestReturn = n(investReturn) * (1 - n(taxRate) / 100);

    const horizon = base.payoffMonths;
    const monthlyInvest = n(investReturn) / 100 / 12;

    // Path A: prepay the debt, then invest the whole payment once it's gone.
    // Path B: keep the minimum payment and invest the extra from day one.
    const payoffNet: number[] = [];
    const investNet: number[] = [];
    let payoffPortfolio = 0;
    let investPortfolio = 0;

    for (let m = 1; m <= horizon; m++) {
      // Path A
      const debtGoneA = m > fast.payoffMonths;
      payoffPortfolio *= 1 + monthlyInvest;
      if (debtGoneA) payoffPortfolio += basePayment + n(extra);
      const balanceA = fast.balances[Math.min(m, fast.balances.length - 1)] ?? 0;

      // Path B
      investPortfolio = investPortfolio * (1 + monthlyInvest) + n(extra);
      const balanceB = base.balances[Math.min(m, base.balances.length - 1)] ?? 0;

      // Only gains are taxed, and only when the money is eventually sold.
      const contributedA = debtGoneA ? (basePayment + n(extra)) * (m - fast.payoffMonths) : 0;
      const contributedB = n(extra) * m;
      const afterTaxA = payoffPortfolio - Math.max(0, payoffPortfolio - contributedA) * (n(taxRate) / 100);
      const afterTaxB = investPortfolio - Math.max(0, investPortfolio - contributedB) * (n(taxRate) / 100);

      payoffNet.push(afterTaxA - balanceA);
      investNet.push(afterTaxB - balanceB);
    }

    const finalPayoff = payoffNet[payoffNet.length - 1] ?? 0;
    const finalInvest = investNet[investNet.length - 1] ?? 0;
    const interestSaved = base.totalInterest - fast.totalInterest;

    return {
      basePayment,
      base,
      fast,
      interestSaved,
      monthsSaved: base.payoffMonths - fast.payoffMonths,
      effectiveDebtRate,
      afterTaxInvestReturn,
      spread: afterTaxInvestReturn - effectiveDebtRate,
      payoffNet,
      investNet,
      finalPayoff,
      finalInvest,
      advantage: finalInvest - finalPayoff,
      horizonYears: horizon / 12,
    };
  }, [balance, rate, yearsLeft, extra, investReturn, taxRate, deductible, marginalRate]);

  return (
    <CalcShell
      slug="pay-off-debt"
      category="Real estate"
      eyebrow="Real estate tools"
      title="Pay off debt or invest?"
      crumb="Pay off debt"
      intro="Paying down a loan is a guaranteed return equal to its interest rate. Investing might do better — or might not. Compare both after tax, and see how much of the answer rests on an assumption."
      onExample={loadExample}
      relatedSlugs={["extra-payments", "debt-payoff", "investment-growth"]}
      disclaimer="For educational purposes only. Paying down debt is a certain return; investment returns are not — the comparison assumes a steady rate that real markets do not deliver. Before doing either, capture any employer retirement match and fund your emergency savings. Not investment or tax advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The debt" badge="LOAN">
          <div className="space-y-4">
            <NumField label="Balance" value={balance} onChange={setBalance} placeholder="280000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Interest rate" value={rate} onChange={setRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Years remaining" value={yearsLeft} onChange={setYearsLeft} placeholder="26" suffix="yrs" />
            </div>
            <NumField
              label="Extra money available each month"
              value={extra}
              onChange={setExtra}
              placeholder="600"
              prefix="$"
              hint="The amount you'd either prepay or invest."
            />
            <Toggle checked={deductible} onChange={setDeductible}>
              I itemize and deduct this interest (mortgage interest for most filers)
            </Toggle>
            {deductible && (
              <NumField label="Your marginal tax rate" value={marginalRate} onChange={setMarginalRate} placeholder="24" suffix="%" step={1} />
            )}
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Effective cost of this debt</span>
                <span className="text-sm font-medium text-gray-900">{pct(r.effectiveDebtRate, 2)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The investment alternative" badge="MARKET" badgeTone="blue">
          <div className="space-y-4">
            <NumField label="Expected annual return" value={investReturn} onChange={setInvestReturn} placeholder="7.5" suffix="%" step={0.25} />
            <NumField
              label="Tax on investment gains"
              value={taxRate}
              onChange={setTaxRate}
              placeholder="15"
              suffix="%"
              step={1}
              hint="Use 0 for a 401(k), IRA, or other tax-sheltered account."
            />
            {r && (
              <>
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">After-tax expected return</span>
                  <span className="text-sm font-medium text-blue-800">{pct(r.afterTaxInvestReturn, 2)}</span>
                </div>
                <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.spread > 0 ? "bg-blue-50" : "bg-green-50"}`}>
                  <span className={`text-xs font-medium ${r.spread > 0 ? "text-blue-700" : "text-green-700"}`}>
                    Spread over debt cost
                  </span>
                  <span className={`text-sm font-medium ${r.spread > 0 ? "text-blue-800" : "text-green-800"}`}>
                    {r.spread > 0 ? "+" : ""}{pct(r.spread, 2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Pay off the debt</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalPayoff)}</p>
              </div>
              <div className={`p-4 text-center ${r.advantage > 0 ? "bg-[#1a2744]" : "bg-green-800"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.advantage > 0 ? "Investing wins by" : "Paying off wins by"}
                </p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.advantage))}</p>
                <p className="text-xs text-green-300">after {r.horizonYears.toFixed(0)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Invest instead</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.finalInvest)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="If you prepay, interest saved" value={fmtK(r.interestSaved)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Debt-free" value={fmtMonths(r.fast.payoffMonths)} sub={`${fmtMonths(r.monthsSaved)} early`} tone="green" />
              <Stat label="Guaranteed return" value={pct(r.effectiveDebtRate, 2)} tone="green" />
              <Stat label="Expected after-tax return" value={pct(r.afterTaxInvestReturn, 2)} tone="amber" sub="not guaranteed" />
              <Stat label="Regular payment" value={`${fmt(r.basePayment)}/mo`} />
            </div>
            <Takeaway tone={r.spread > 0 ? "blue" : "green"}>
              {r.spread > 0 ? (
                <>
                  On these assumptions investing edges ahead by{" "}
                  <strong>{fmtK(Math.abs(r.advantage))}</strong> — a{" "}
                  <strong>{pct(r.spread, 2)}</strong> spread over the cost of your debt. But that margin
                  is an expectation, not a promise: a decade of poor returns flips it, while the{" "}
                  {pct(r.effectiveDebtRate, 2)} you save by prepaying happens no matter what markets do.
                </>
              ) : (
                <>
                  <strong>Paying off wins here.</strong> Your debt costs{" "}
                  {pct(r.effectiveDebtRate, 2)} after tax, more than the{" "}
                  {pct(r.afterTaxInvestReturn, 2)} you&apos;d expect to net from investing — and the
                  payoff return is guaranteed. Prepaying also clears the debt{" "}
                  {fmtMonths(r.monthsSaved)} early, freeing {fmt(r.basePayment)}/mo afterwards.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Net worth under each strategy">
            <LineChart
              ariaLabel="Net worth when prepaying the debt compared with investing the extra money"
              periodsPerYear={12}
              baselineZero
              series={[
                { label: "Prepay, then invest", color: COLORS.green, data: r.payoffNet },
                { label: "Invest from day one", color: COLORS.blue, data: r.investNet, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="amber">
                The prepay line jumps when the loan clears and the whole payment starts going into
                investments instead. Net worth counts both sides — portfolio minus remaining balance — so
                the two paths are compared on the same footing.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total interest paid">
            <BarChart
              ariaLabel="Total interest paid on the current schedule compared with prepaying"
              height={200}
              bars={[
                { label: "Minimum payments", segments: [{ label: "Interest", value: r.base.totalInterest, color: COLORS.amber }] },
                { label: "With extra payments", segments: [{ label: "Interest", value: r.fast.totalInterest, color: COLORS.green }] },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Enter a balance, rate, years remaining, and the extra amount you have available each month.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

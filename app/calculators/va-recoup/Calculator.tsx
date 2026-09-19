"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

const VA_LIMIT = 36; // months — the statutory recoupment ceiling for an IRRRL

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [currentRate, setCurrentRate] = useState<Num>("");
  const [currentPayment, setCurrentPayment] = useState<Num>("");
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [closingCosts, setClosingCosts] = useState<Num>("");
  const [fundingFeePct, setFundingFeePct] = useState<Num>("");
  const [escrow, setEscrow] = useState<Num>("");
  const [financeCosts, setFinanceCosts] = useState(true);

  const loadExample = () => {
    setBalance(340000);
    setCurrentRate(7.25);
    setCurrentPayment(2320);
    setNewRate(6.125);
    setNewTerm(30);
    setClosingCosts(4200);
    setFundingFeePct(0.5);
    setEscrow(0);
    setFinanceCosts(true);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBalance("");
    setCurrentRate("");
    setCurrentPayment("");
    setNewRate("");
    setNewTerm("");
    setClosingCosts("");
    setFundingFeePct("");
    setEscrow("");
    setFinanceCosts(true);
  };

  const r = useMemo(() => {
    if (n(balance) <= 0 || n(currentPayment) <= 0) return null;

    const fundingFee = (n(balance) * n(fundingFeePct)) / 100;
    // VA recoupment counts all fees and closing costs, excluding escrow and prepaids.
    const recoupableCosts = n(closingCosts) + fundingFee;
    const newLoan = financeCosts ? n(balance) + recoupableCosts + n(escrow) : n(balance);
    const termMonths = Math.max(1, n(newTerm) * 12);
    const newPayment = payment(newLoan, n(newRate), termMonths);

    const monthlySavings = n(currentPayment) - newPayment;
    const recoupMonths = monthlySavings > 0 ? recoupableCosts / monthlySavings : null;
    const passes = recoupMonths !== null && recoupMonths <= VA_LIMIT;

    // Cumulative net position: costs first, then savings accumulate.
    const horizon = 60;
    const net: number[] = [];
    const zero: number[] = [];
    for (let m = 0; m <= horizon; m++) {
      net.push(monthlySavings * m - recoupableCosts);
      zero.push(0);
    }

    const rateDrop = n(currentRate) - n(newRate);

    return {
      fundingFee,
      recoupableCosts,
      newLoan,
      newPayment,
      monthlySavings,
      recoupMonths,
      passes,
      net,
      zero,
      rateDrop,
      savings5yr: monthlySavings * 60 - recoupableCosts,
      savings10yr: monthlySavings * 120 - recoupableCosts,
      maxCosts: monthlySavings > 0 ? monthlySavings * VA_LIMIT : 0,
    };
  }, [balance, currentRate, currentPayment, newRate, newTerm, closingCosts, fundingFeePct, escrow, financeCosts]);

  return (
    <CalcShell
      slug="va-recoup"
      intro="A VA streamline refinance (IRRRL) has a hard rule: the fees have to pay for themselves within 36 months. Enter your numbers to see your recoupment period and whether the loan clears that bar."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["should-i-refinance", "mortgage-payment", "loan-estimate-comparison"]}
      disclaimer="For educational purposes only and not a commitment to lend. VA recoupment rules count fees, closing costs and expenses other than taxes, insurance, and escrow — lender interpretations vary. IRRRLs also require a net tangible benefit and a seasoning period on the existing loan. Confirm eligibility and exact figures with a VA-approved lender."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your current VA loan" badge="TODAY">
          <div className="space-y-4">
            <NumField label="Current balance" value={balance} onChange={setBalance} placeholder="340000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current rate" value={currentRate} onChange={setCurrentRate} placeholder="7.25" suffix="%" step={0.125} />
              <NumField label="Payment (P&I)" value={currentPayment} onChange={setCurrentPayment} placeholder="2320" prefix="$" />
            </div>
          </div>
        </Card>

        <Card title="The IRRRL you're offered" badge="PROPOSED" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={newRate} onChange={setNewRate} placeholder="6.125" suffix="%" step={0.125} />
              <NumField label="New term" value={newTerm} onChange={setNewTerm} placeholder="30" suffix="yrs" />
            </div>
            <NumField label="Closing costs and fees" value={closingCosts} onChange={setClosingCosts} placeholder="4200" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="VA funding fee"
                value={fundingFeePct}
                onChange={setFundingFeePct}
                placeholder="0.5"
                suffix="%"
                step={0.05}
                hint="0.5% for most IRRRLs."
              />
              <NumField
                label="Escrow/prepaids"
                value={escrow}
                onChange={setEscrow}
                placeholder="0"
                prefix="$"
                hint="Excluded from recoupment."
              />
            </div>
            <Toggle checked={financeCosts} onChange={setFinanceCosts}>
              Roll costs into the new loan (IRRRLs are usually structured this way)
            </Toggle>
            {r && (
              <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-green-700 font-medium">New payment (P&amp;I)</span>
                <span className="text-sm font-medium text-green-800">{fmt(r.newPayment)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className={`border rounded-2xl p-5 mb-4 ${r.passes ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="text-xs text-gray-500 mb-1">Recoupment period</p>
            <div className="flex flex-wrap items-baseline gap-3 mb-4">
              <p className={`text-3xl font-medium tracking-tight ${r.passes ? "text-green-700" : "text-amber-700"}`}>
                {r.recoupMonths === null ? "Never" : `${Math.ceil(r.recoupMonths)} months`}
              </p>
              <span className={`text-xs rounded-full px-3 py-1 font-medium ${r.passes ? "bg-green-700 text-white" : "bg-amber-600 text-white"}`}>
                {r.passes ? "✓ PASSES the 36-month rule" : "✗ FAILS the 36-month rule"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Monthly savings" value={r.monthlySavings > 0 ? `${fmt(r.monthlySavings)}/mo` : "None"} tone={r.monthlySavings > 0 ? "green" : "red"} />
              <Stat label="Recoupable costs" value={fmt(r.recoupableCosts)} sub={`incl. ${fmt(r.fundingFee)} funding fee`} />
              <Stat label="Rate reduction" value={pct(r.rateDrop, 3)} tone={r.rateDrop > 0 ? "green" : "red"} />
              <Stat label="New loan amount" value={fmtK(r.newLoan)} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Net savings after 5 years" value={fmtK(r.savings5yr)} tone={r.savings5yr > 0 ? "green" : "red"} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              <Stat label="Net after 10 years" value={fmtK(r.savings10yr)} tone={r.savings10yr > 0 ? "green" : "red"} />
              <Stat label="Break-even" value={r.recoupMonths ? fmtMonths(Math.ceil(r.recoupMonths)) : "—"} />
              <Stat
                label="Max costs that would still pass"
                value={r.maxCosts > 0 ? fmt(r.maxCosts) : "—"}
                sub="at this monthly savings"
              />
            </div>
            <Takeaway tone={r.passes ? "green" : "amber"}>
              {r.recoupMonths === null ? (
                <>
                  <strong>⚠ This loan doesn&apos;t lower your payment</strong>, so there is nothing to
                  recoup. An IRRRL must produce a net tangible benefit — normally a lower rate and payment,
                  or a move from an adjustable rate to a fixed one.
                </>
              ) : r.passes ? (
                <>
                  <strong>✓ Recoups in {Math.ceil(r.recoupMonths)} months</strong>, inside the 36-month
                  limit with {VA_LIMIT - Math.ceil(r.recoupMonths)} months to spare. You could absorb up to{" "}
                  <strong>{fmt(r.maxCosts)}</strong> in costs and still qualify — useful leverage if a
                  lender quotes higher fees.
                </>
              ) : (
                <>
                  <strong>⚠ Recoupment takes {Math.ceil(r.recoupMonths)} months</strong>, past the
                  36-month limit. To qualify, costs need to come down to about{" "}
                  <strong>{fmt(r.maxCosts)}</strong> — ask about a lender credit or a slightly higher rate
                  with fewer fees.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="When the refinance pays for itself">
            <LineChart
              ariaLabel="Cumulative net savings over five years showing the recoupment crossover point"
              periodsPerYear={12}
              baselineZero
              series={[
                { label: "Cumulative net savings", color: COLORS.green, data: r.net },
                { label: "Break-even", color: COLORS.gray, data: r.zero, dash: [4, 4] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The line starts below zero by the full {fmt(r.recoupableCosts)} in costs and climbs by{" "}
                {fmt(Math.max(0, r.monthlySavings))} a month. Where it crosses zero is your recoupment
                date — the VA requires that to happen within 36 months.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Payment comparison">
            <BarChart
              ariaLabel="Current monthly payment compared with the proposed IRRRL payment"
              height={200}
              bars={[
                { label: "Current payment", segments: [{ label: "P&I", value: n(currentPayment), color: COLORS.gray }] },
                { label: "IRRRL payment", segments: [{ label: "P&I", value: r.newPayment, color: COLORS.green }] },
              ]}
              valueFormat={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your current balance and payment to check the 36-month rule.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

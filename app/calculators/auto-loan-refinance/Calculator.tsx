"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [currentPayment, setCurrentPayment] = useState<Num>("");
  const [currentRate, setCurrentRate] = useState<Num>("");
  const [monthsLeft, setMonthsLeft] = useState<Num>("");
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [fees, setFees] = useState<Num>("");
  const [carValue, setCarValue] = useState<Num>("");
  const [rollFees, setRollFees] = useState(true);

  const loadExample = () => {
    setBalance(24500);
    setCurrentPayment(612);
    setCurrentRate(9.4);
    setMonthsLeft(44);
    setNewRate(6.25);
    setNewTerm(48);
    setFees(150);
    setCarValue(23000);
    setRollFees(true);
  };

  const r = useMemo(() => {
    const bal = n(balance);
    const left = Math.round(n(monthsLeft));
    if (bal <= 0 || left <= 0 || n(currentPayment) <= 0) return null;

    const current = amortize(bal, n(currentRate), left, 0, n(currentPayment));
    if (!Number.isFinite(current.totalInterest)) return null;

    const newLoan = rollFees ? bal + n(fees) : bal;
    const newMonths = Math.max(1, Math.round(n(newTerm)));
    const newPayment = payment(newLoan, n(newRate), newMonths);
    const refi = amortize(newLoan, n(newRate), newMonths);
    const upfront = rollFees ? 0 : n(fees);

    const monthlySavings = n(currentPayment) - newPayment;
    const totalInterestSaved = current.totalInterest - refi.totalInterest - n(fees);
    const breakEven = monthlySavings > 0 && upfront > 0 ? Math.ceil(upfront / monthlySavings) : upfront === 0 ? 0 : null;

    // Same-horizon comparison: interest over the months you have left today.
    let sameHorizonInterest = 0;
    let b = newLoan;
    const nr = n(newRate) / 100 / 12;
    for (let i = 0; i < Math.min(left, newMonths); i++) {
      const int = b * nr;
      sameHorizonInterest += int;
      b = Math.max(0, b - (newPayment - int));
    }

    const equity = n(carValue) - bal;
    const ltv = n(carValue) > 0 ? (bal / n(carValue)) * 100 : 0;

    return {
      current,
      refi,
      newPayment,
      newLoan,
      monthlySavings,
      totalInterestSaved,
      breakEven,
      upfront,
      sameHorizonInterest,
      equity,
      ltv,
      extendsLoan: newMonths > left,
      extraMonths: newMonths - left,
      totalPaidNow: n(currentPayment) * left,
      totalPaidRefi: newPayment * newMonths + upfront,
    };
  }, [balance, currentPayment, currentRate, monthsLeft, newRate, newTerm, fees, carValue, rollFees]);

  return (
    <CalcShell
      slug="auto-loan-refinance"
      category="Auto"
      eyebrow="Auto tools"
      title="Auto loan refinance calculator"
      crumb="Auto refinance"
      intro="Car loans are short, so a refinance has less time to pay off than a mortgage does. Enter your current loan and the offer to see the monthly savings, the real interest savings, and whether a longer term is quietly undoing both."
      onExample={loadExample}
      relatedSlugs={["loan-vs-cash", "auto-affordability", "depreciation"]}
      disclaimer="For educational purposes only and not a commitment to lend. Refinancing depends on credit, vehicle age and mileage, and loan-to-value limits. Check your current loan for prepayment penalties and confirm whether it uses simple interest or a precomputed balance."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your current loan" badge="TODAY">
          <div className="space-y-4">
            <NumField label="Current balance" value={balance} onChange={setBalance} placeholder="24500" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current rate" value={currentRate} onChange={setCurrentRate} placeholder="9.4" suffix="%" step={0.25} />
              <NumField label="Payment" value={currentPayment} onChange={setCurrentPayment} placeholder="612" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Months remaining" value={monthsLeft} onChange={setMonthsLeft} placeholder="44" suffix="mo" />
              <NumField label="Car's value" value={carValue} onChange={setCarValue} placeholder="23000" prefix="$" />
            </div>
            {r && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.equity >= 0 ? "bg-gray-50" : "bg-amber-50"}`}>
                <span className={`text-xs ${r.equity >= 0 ? "text-gray-400" : "text-amber-700 font-medium"}`}>
                  {r.equity >= 0 ? "Equity in the car" : "Underwater by"}
                </span>
                <span className={`text-sm font-medium ${r.equity >= 0 ? "text-gray-900" : "text-amber-800"}`}>
                  {fmt(Math.abs(r.equity))} · {pct(r.ltv, 0)} LTV
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The refinance offer" badge="PROPOSED" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="New rate" value={newRate} onChange={setNewRate} placeholder="6.25" suffix="%" step={0.25} />
              <NumField label="New term" value={newTerm} onChange={setNewTerm} placeholder="48" suffix="mo" />
            </div>
            <NumField
              label="Fees"
              value={fees}
              onChange={setFees}
              placeholder="150"
              prefix="$"
              hint="Title transfer and registration fees are typical; many auto refinances have no lender fee."
            />
            <Toggle checked={rollFees} onChange={setRollFees}>
              Roll fees into the new loan
            </Toggle>
            {r && (
              <>
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">New payment</span>
                  <span className="text-sm font-medium text-green-800">{fmt(r.newPayment)}/mo</span>
                </div>
                {r.extendsLoan && (
                  <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-amber-700 font-medium">Extends the loan by</span>
                    <span className="text-sm font-medium text-amber-800">{r.extraMonths} months</span>
                  </div>
                )}
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
                <p className="text-xs text-gray-400 mb-1">Payment today</p>
                <p className="text-lg font-medium text-gray-900">{fmt(n(currentPayment))}</p>
              </div>
              <div className={`p-4 text-center ${r.monthlySavings > 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.monthlySavings > 0 ? "You'd save" : "Payment increases"}
                </p>
                <p className="text-2xl font-medium text-white">{fmt(Math.abs(r.monthlySavings))}</p>
                <p className="text-xs text-green-300">per month</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">New payment</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.newPayment)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Total interest saved"
              value={fmtK(r.totalInterestSaved)}
              tone={r.totalInterestSaved > 0 ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Interest on current loan" value={fmt(r.current.totalInterest)} tone="amber" />
              <Stat label="Interest on new loan" value={fmt(r.refi.totalInterest)} tone={r.refi.totalInterest < r.current.totalInterest ? "green" : "red"} />
              <Stat
                label="Break-even"
                value={r.breakEven === null ? "Never" : r.breakEven === 0 ? "Immediate" : `${r.breakEven} mo`}
              />
              <Stat label="Rate reduction" value={pct(n(currentRate) - n(newRate), 2)} tone={n(currentRate) > n(newRate) ? "green" : "red"} />
            </div>
            <Takeaway tone={r.totalInterestSaved > 0 ? "green" : "amber"}>
              {r.extendsLoan ? (
                <>
                  <strong>⚠ Watch the term.</strong> This offer stretches the loan{" "}
                  {r.extraMonths} months longer than you have left. That is where most of the{" "}
                  {fmt(Math.abs(r.monthlySavings))}/mo saving comes from — you&apos;d pay{" "}
                  <strong>{fmtK(r.totalPaidRefi)}</strong> in total versus {fmtK(r.totalPaidNow)} on your
                  current schedule. Over the same {n(monthsLeft)} months, the lower rate alone saves about{" "}
                  <strong>{fmt(Math.max(0, r.current.totalInterest - r.sameHorizonInterest))}</strong>.
                </>
              ) : r.totalInterestSaved > 0 ? (
                <>
                  <strong>✓ Worth doing.</strong> Dropping from {pct(n(currentRate), 2)} to{" "}
                  {pct(n(newRate), 2)} saves <strong>{fmtK(r.totalInterestSaved)}</strong> net of fees, and
                  the new term doesn&apos;t extend your payoff date.
                </>
              ) : (
                <>
                  <strong>⚠ This offer costs more than it saves.</strong> After fees, you&apos;d pay{" "}
                  <strong>{fmt(Math.abs(r.totalInterestSaved))}</strong> more in interest than staying put.
                </>
              )}
              {r.equity < 0 && (
                <>
                  {" "}
                  You are also <strong>{fmt(Math.abs(r.equity))} underwater</strong> — most lenders cap
                  refinance loan-to-value around 120%, so check eligibility first.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Loan balance over time">
            <LineChart
              ariaLabel="Current loan balance compared with the refinanced balance over time"
              periodsPerYear={12}
              series={[
                { label: "Current loan", color: COLORS.gray, data: r.current.balances },
                { label: "Refinanced", color: COLORS.green, data: r.refi.balances, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                If the green line reaches zero later than the grey one, you traded a lower payment for a
                longer loan — and with a depreciating asset, that also means more months spent owing more
                than the car is worth.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total you'll pay either way">
            <BarChart
              ariaLabel="Total payments remaining on the current loan compared with the refinance"
              height={210}
              bars={[
                {
                  label: "Stay put",
                  segments: [
                    { label: "Principal", value: n(balance), color: COLORS.gray },
                    { label: "Interest & fees", value: r.current.totalInterest, color: COLORS.amber },
                  ],
                },
                {
                  label: "Refinance",
                  segments: [
                    { label: "Principal", value: n(balance), color: COLORS.gray },
                    { label: "Interest & fees", value: r.refi.totalInterest + n(fees), color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your balance, payment, and months remaining to compare offers.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

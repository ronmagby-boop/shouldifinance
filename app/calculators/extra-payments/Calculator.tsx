"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [yearsLeft, setYearsLeft] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");
  const [oneTime, setOneTime] = useState<Num>("");
  const [biweekly, setBiweekly] = useState(false);

  const loadExample = () => {
    setBalance(320000);
    setRate(6.5);
    setYearsLeft(28);
    setExtra(300);
    setOneTime(0);
    setBiweekly(false);
  };

  const r = useMemo(() => {
    const bal = n(balance);
    const term = Math.round(n(yearsLeft) * 12);
    if (bal <= 0 || term <= 0 || n(rate) < 0) return null;

    const basePayment = payment(bal, n(rate), term);
    // A biweekly schedule works out to one extra full payment a year.
    const effectiveExtra = n(extra) + (biweekly ? basePayment / 12 : 0);

    const base = amortize(bal, n(rate), term);
    const withExtra = amortize(Math.max(0, bal - n(oneTime)), n(rate), term, effectiveExtra, basePayment);

    if (!Number.isFinite(withExtra.totalInterest)) return null;

    const monthsSaved = base.payoffMonths - withExtra.payoffMonths;
    const interestSaved = base.totalInterest - withExtra.totalInterest;

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + withExtra.payoffMonths);
    const originalDate = new Date();
    originalDate.setMonth(originalDate.getMonth() + base.payoffMonths);

    return {
      basePayment,
      effectiveExtra,
      base,
      withExtra,
      monthsSaved,
      interestSaved,
      payoffStr: payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      originalStr: originalDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      newPayment: basePayment + effectiveExtra,
    };
  }, [balance, rate, yearsLeft, extra, oneTime, biweekly]);

  return (
    <CalcShell
      slug="extra-payments"
      intro="Every extra dollar toward principal skips all the interest that dollar would have carried for the rest of the loan. Enter what you could add each month and see the years and interest it erases."
      onExample={loadExample}
      relatedSlugs={["mortgage-payment", "should-i-refinance", "pay-off-debt"]}
      disclaimer="For educational purposes only. Confirm your servicer applies extra payments to principal, and check for prepayment penalties. Before prepaying, make sure you have an emergency fund and are capturing any employer retirement match — those usually come first."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your loan today" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="Current balance" value={balance} onChange={setBalance} placeholder="320000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Interest rate" value={rate} onChange={setRate} placeholder="6.5" suffix="%" step={0.125} />
              <NumField label="Years remaining" value={yearsLeft} onChange={setYearsLeft} placeholder="28" suffix="yrs" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Your payment (P&amp;I)</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.basePayment)}/mo</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="What you'd add" badge="EXTRA" badgeTone="green">
          <div className="space-y-4">
            <NumField label="Extra each month" value={extra} onChange={setExtra} placeholder="300" prefix="$" />
            <NumField
              label="One-time lump sum"
              value={oneTime}
              onChange={setOneTime}
              placeholder="5000"
              prefix="$"
              hint="A bonus or tax refund applied to principal today."
            />
            <div className="space-y-2">
              <Toggle checked={biweekly} onChange={setBiweekly}>
                Switch to biweekly payments — half your payment every two weeks means 26 half payments a
                year, or one extra full payment. This adds to the monthly extra above, it does not replace
                it.
              </Toggle>
              {biweekly && r && (
                <p className="text-xs text-gray-400 leading-relaxed pl-6">
                  Biweekly adds {fmt(r.basePayment / 12)}/mo
                  {n(extra) > 0 && <> on top of your {fmt(n(extra))}</>}, so the loan is getting{" "}
                  {fmt(r.effectiveExtra)}/mo extra.
                </p>
              )}
            </div>
            {r && (
              <>
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">New monthly payment</span>
                  <span className="text-sm font-medium text-green-800">{fmt(r.newPayment)}</span>
                </div>
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">Paid off</span>
                  <span className="text-sm font-medium text-green-800">{r.payoffStr}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Time saved</p>
                <p className="text-lg font-medium text-gray-900">{fmtMonths(r.monthsSaved)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.originalStr} → {r.payoffStr}</p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">Interest saved</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.interestSaved)}</p>
                <p className="text-xs text-green-300">over the life of the loan</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Total interest with extra payments" value={fmtK(r.withExtra.totalInterest)} />
            {/* Interest saved already has its own tile above. It was also shown here
                as "Net benefit", which read as though the extra paid in had been
                deducted — it had not, and deducting it would be wrong: both
                schedules repay the same $320,000 of principal, so prepaying moves
                principal earlier rather than adding any. */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Stat label="Interest without extra" value={fmtK(r.base.totalInterest)} tone="amber" />
              <Stat label="Payoff time" value={fmtMonths(r.withExtra.payoffMonths)} sub={`was ${fmtMonths(r.base.payoffMonths)}`} tone="green" />
            </div>
            <Takeaway>
              Adding <strong>{fmt(r.effectiveExtra)}/mo</strong>
              {n(oneTime) > 0 && <> plus a <strong>{fmt(n(oneTime))}</strong> lump sum</>} clears the loan{" "}
              <strong>{fmtMonths(r.monthsSaved)}</strong> early and saves{" "}
              <strong>{fmtK(r.interestSaved)}</strong> — a guaranteed return equal to your{" "}
              <strong>{n(rate)}%</strong> rate.
            </Takeaway>
          </div>

          <ChartCard title="Balance over time">
            <LineChart
              ariaLabel="Loan balance with and without extra payments over time"
              periodsPerYear={12}
              series={[
                { label: "Current schedule", color: COLORS.gray, data: r.base.balances },
                { label: "With extra payments", color: COLORS.green, data: r.withExtra.balances, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The green line falls away faster every year. Early payments matter most: a dollar paid in
                year one avoids nearly three decades of interest, while the same dollar in year 25 avoids
                almost none.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Total cost either way">
            <BarChart
              ariaLabel="Total amount paid on the current schedule compared with extra payments"
              height={210}
              bars={[
                {
                  label: "Current schedule",
                  segments: [
                    { label: "Principal", value: n(balance), color: COLORS.gray },
                    { label: "Interest", value: r.base.totalInterest, color: COLORS.amber },
                  ],
                },
                {
                  label: "With extra payments",
                  segments: [
                    { label: "Principal", value: n(balance), color: COLORS.gray },
                    { label: "Interest", value: r.withExtra.totalInterest, color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your balance, rate, and years remaining to see what extra payments do.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

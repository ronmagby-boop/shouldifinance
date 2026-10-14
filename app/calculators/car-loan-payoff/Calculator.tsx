"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, has, months, n, pct, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { analyze } from "../../lib/carPayoff";

type Known = "months" | "payment";

/** The month a payoff lands in, counted from this month. */
const monthLabel = (from: Date, add: number) =>
  new Date(from.getFullYear(), from.getMonth() + add, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [apr, setApr] = useState<Num>("");
  const [known, setKnown] = useState<Known>("months");
  const [remaining, setRemaining] = useState<Num>("");
  const [current, setCurrent] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");
  const [lump, setLump] = useState<Num>("");
  const [alt, setAlt] = useState<Num>("");
  const [penalty, setPenalty] = useState<Num>("");

  const loadExample = () => {
    setBalance(18000);
    setApr(7.5);
    setKnown("months");
    setRemaining(48);
    setCurrent("");
    setExtra(150);
    setLump(2000);
    setAlt(4.5);
    setPenalty("");
  };

  const clearExample = () => {
    setBalance("");
    setApr("");
    setKnown("months");
    setRemaining("");
    setCurrent("");
    setExtra("");
    setLump("");
    setAlt("");
    setPenalty("");
  };

  const r = useMemo(() => {
    if (!(n(balance) > 0) || !has(apr)) return null;
    if (known === "months" ? !(n(remaining) > 0) : !(n(current) > 0)) return null;
    const res = analyze({
      balance: n(balance),
      apr: Math.max(0, n(apr)),
      months: known === "months" ? n(remaining) : null,
      currentPayment: known === "payment" ? n(current) : null,
      extraMonthly: n(extra),
      lumpSum: n(lump),
      altReturn: n(alt),
      penalty: n(penalty),
    });
    if (!res) return { tooLow: true as const };
    const today = new Date();
    return {
      tooLow: false as const,
      ...res,
      originalEnd: monthLabel(today, res.months),
      newEnd: res.fastMonths === 0 ? "today" : monthLabel(today, res.fastMonths),
      prepaying: n(extra) > 0 || n(lump) > 0,
    };
  }, [balance, apr, known, remaining, current, extra, lump, alt, penalty]);

  return (
    <CalcShell
      slug="car-loan-payoff"
      intro="Extra car payments save the interest the balance would have carried, which makes prepaying a guaranteed return equal to the loan's rate. See how much sooner it ends, what it saves, and whether the same money would do more invested or paying off a costlier debt."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["auto-loan-refinance", "depreciation", "emergency-fund", "debt-payoff"]}
      disclaimer="For educational purposes only. Assumes a simple-interest loan with interest charged monthly; most car loans charge it daily, so figures differ slightly, and a precomputed loan saves less. Check your contract for prepayment terms. If your loan interest is deductible (a 2025–2028 exception for some new, US-assembled vehicles), the after-tax saving is a little smaller. The comparison assumes a steady return, which investments do not deliver."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your loan" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current balance" value={balance} onChange={setBalance} min={0} placeholder="18000" prefix="$" hint="The payoff amount from your lender is the exact figure." />
              <NumField label="APR" value={apr} onChange={setApr} min={0} placeholder="7.5" suffix="%" step={0.1} />
            </div>
            <SelectField
              label="I know my"
              value={known}
              onChange={(v) => setKnown(v as Known)}
              options={[{ value: "months", label: "Remaining months" }, { value: "payment", label: "Current monthly payment" }]}
            />
            {known === "months" ? (
              <NumField label="Remaining months" value={remaining} onChange={setRemaining} min={0} placeholder="48" suffix="mo" />
            ) : (
              <NumField label="Current monthly payment" value={current} onChange={setCurrent} min={0} placeholder="435" prefix="$" />
            )}
            <NumField label="Prepayment penalty (optional)" value={penalty} onChange={setPenalty} min={0} placeholder="0" prefix="$" hint="Most simple-interest car loans have none; your contract says." />
          </div>
        </Card>
        <Card title="Paying it down faster" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Extra each month" value={extra} onChange={setExtra} min={0} placeholder="150" prefix="$" />
              <NumField label="One-time lump sum" value={lump} onChange={setLump} min={0} placeholder="2000" prefix="$" />
            </div>
            <NumField
              label="Or the money could earn"
              value={alt}
              onChange={setAlt}
              placeholder="4.5"
              suffix="%"
              step={0.25}
              hint="A savings rate or expected investment return, or the rate on a costlier debt the same money could pay down."
            />
          </div>
        </Card>
      </div>

      {r && !r.tooLow ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={r.prepaying ? "Paid off" : "Paid off on schedule"}
              value={r.prepaying ? (r.fastMonths === 0 ? "Today" : r.newEnd) : r.originalEnd}
              tone={r.prepaying ? "green" : "gray"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Sooner by" value={r.prepaying ? months(r.monthsSooner) : "—"} sub={`instead of ${r.originalEnd}`} />
              <Stat
                label="Interest saved"
                value={fmt(r.netSaved)}
                tone={r.netSaved > 0 ? "green" : "default"}
                sub={r.penalty > 0 ? `${fmt(r.interestSaved)} less a ${fmt(r.penalty)} penalty` : `of ${fmt(r.baseInterest)} left to pay`}
              />
              <Stat label="Cash freed once paid off" value={`${fmt(r.freedMonthly)}/mo`} sub={r.freedMonths > 0 ? `for ${months(r.freedMonths)} before the original end` : "no earlier than planned"} />
              <Stat label="Guaranteed return" value={pct(r.guaranteedReturn, 2)} sub="the loan's rate, on a simple-interest loan" />
            </div>
            {r.prepaying && (
              <div className="space-y-2">
                <Takeaway tone={r.prepayAdvantage >= 0 ? "green" : "amber"}>
                  Over the original term, to {r.originalEnd}: putting the money on the loan, then investing what it frees,
                  leaves <strong>{fmt(Math.abs(r.prepayAdvantage))} {r.prepayAdvantage >= 0 ? "more" : "less"}</strong> than
                  investing it at {pct(n(alt), 2)} while the loan runs.{" "}
                  {Math.abs(r.prepayAdvantage) < 1
                    ? "They tie because the return equals the loan's rate."
                    : r.prepayAdvantage >= 0
                      ? `Paying a ${pct(r.guaranteedReturn, 2)} loan beats a ${pct(n(alt), 2)} alternative, and with no risk.`
                      : `A ${pct(n(alt), 2)} return beats the loan's ${pct(r.guaranteedReturn, 2)}, if it arrives; the loan's return is certain, the investment's is not.`}
                </Takeaway>
                {r.guaranteedReturn === 0 && (
                  <Takeaway tone="blue">At 0% the loan costs nothing to keep, so paying it early saves no interest.</Takeaway>
                )}
              </div>
            )}
          </div>

          <ChartCard title="The balance, month by month">
            <LineChart
              ariaLabel="Car loan balance over time on schedule and with extra payments"
              periodsPerYear={12}
              series={[
                { label: "On schedule", color: COLORS.gray, data: r.baseBalances },
                ...(r.prepaying ? [{ label: "With extra payments", color: COLORS.green, data: r.fastBalances }] : []),
              ]}
              xUnit="Yr"
            />
          </ChartCard>
        </>
      ) : r && r.tooLow ? (
        <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-amber-900 mb-1">That payment does not pay the loan off</p>
          <p className="text-xs text-amber-900 leading-relaxed">
            A monthly payment at or below the month&apos;s interest never reduces the balance. Check the payment and APR
            against your statement.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the balance, APR and remaining months or payment.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Before you prepay</h2>
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            <strong>Check how your loan charges interest.</strong> Most car loans use simple interest, charged on the
            balance you still owe, which is what this page assumes. Some use precomputed interest, where the total is set
            at the start and paying early saves less; the CFPB says that if you plan to pay off early, you want a simple
            interest loan. Your Truth in Lending disclosure tells you which: a simple-interest loan must say whether a
            charge may be imposed for paying early, and a precomputed one whether you are entitled to a rebate of the
            finance charge. Under federal law a precomputed loan must refund unearned interest when paid off, and the
            Rule of 78s, which front-loads interest, is barred for precomputed loans longer than 61 months made after
            September 1993; shorter ones and state law can differ. Your contract and state law decide whether a
            prepayment penalty applies.
          </p>
          <p>
            <strong>Make sure extra goes to principal.</strong> Payments usually cover fees and interest first. Ask your
            lender or servicer to apply the extra to principal, and check the next statement to confirm the balance fell
            by the full amount.
          </p>
          <p>
            <strong>Keep an emergency fund first.</strong> Money paid into a car loan cannot be taken back out if the car
            breaks down or your income stops. The{" "}
            <Link href="/calculators/emergency-fund" className="text-green-700 underline">emergency fund calculator</Link>{" "}
            sizes the cushion to hold before prepaying.
          </p>
          <p>
            <strong>Underwater?</strong> If you owe more than the car is worth, paying down faster shortens the time you
            would have a shortfall if it were stolen or totaled. The{" "}
            <Link href="/calculators/depreciation" className="text-green-700 underline">car value calculator</Link> shows
            when the balance falls below the car&apos;s value. If you carry GAP coverage, the CFPB notes you may be due a
            refund when you prepay the loan.
          </p>
          <p>
            <strong>Costlier debt or an employer match first.</strong> Money on a card at 24% does more than money on a 7%
            car loan; the{" "}
            <Link href="/calculators/debt-payoff" className="text-green-700 underline">snowball or avalanche calculator</Link>{" "}
            orders your debts, and the{" "}
            <Link href="/calculators/401k-vs-debt-payoff" className="text-green-700 underline">401(k) match calculator</Link>{" "}
            weighs a match against paying down debt.
          </p>
        </div>
      </div>
    </CalcShell>
  );
}

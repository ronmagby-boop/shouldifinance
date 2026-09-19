"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { amortize, growthSeries } from "../../lib/finance";

export default function Calculator() {
  const [extra, setExtra] = useState<Num>("");
  const [debt, setDebt] = useState<Num>("");
  const [debtRate, setDebtRate] = useState<Num>("");
  const [debtPayment, setDebtPayment] = useState<Num>("");
  const [salary, setSalary] = useState<Num>("");
  const [matchPct, setMatchPct] = useState<Num>("");
  const [matchCap, setMatchCap] = useState<Num>("");
  const [contribPct, setContribPct] = useState<Num>("");
  const [ret, setRet] = useState<Num>("");
  const [years, setYears] = useState<Num>("");

  const loadExample = () => {
    setExtra(600);
    setDebt(18000);
    setDebtRate(21.9);
    setDebtPayment(450);
    setSalary(85000);
    setMatchPct(50);
    setMatchCap(6);
    setContribPct(2);
    setRet(7);
    setYears(10);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setExtra("");
    setDebt("");
    setDebtRate("");
    setDebtPayment("");
    setSalary("");
    setMatchPct("");
    setMatchCap("");
    setContribPct("");
    setRet("");
    setYears("");
  };

  const r = useMemo(() => {
    const E = n(extra);
    const yrs = n(years);
    if (E <= 0 || yrs <= 0 || n(debt) < 0) return null;

    // How much of the employer match is still on the table?
    const capDollars = (n(salary) * Math.min(n(matchCap), 100)) / 100;
    const contribDollars = (n(salary) * Math.min(n(contribPct), 100)) / 100;
    const unmatchedRoom = Math.max(0, capDollars - contribDollars);
    const monthlyRoom = unmatchedRoom / 12;
    // Money you'd need to add each month to capture the rest of the match,
    // capped by what you actually have spare.
    const toMatch = Math.min(monthlyRoom, E);
    const matchEarned = toMatch * (n(matchPct) / 100);
    const leftover = Math.max(0, E - toMatch);

    // --- Path A: everything spare goes to the debt ---
    const payA = n(debtPayment) + E;
    const debtA = amortize(n(debt), n(debtRate), 600, 0, payA);
    const clearedA = Number.isFinite(debtA.payoffMonths) ? debtA.payoffMonths : Infinity;
    // Once the debt is gone, the freed-up cash is invested for the rest of the run.
    const investMonthsA = Math.max(0, yrs * 12 - Math.min(clearedA, yrs * 12));
    const investA = growthSeries({
      initial: 0,
      contribution: payA,
      annualRate: n(ret),
      years: investMonthsA / 12,
    });
    const endA = investA.balances[investA.balances.length - 1] ?? 0;
    const debtLeftA = clearedA > yrs * 12 ? (debtA.balances[Math.round(yrs * 12)] ?? 0) : 0;
    const netA = endA - debtLeftA;

    // --- Path B: capture the match first, the rest to the debt ---
    const payB = n(debtPayment) + leftover;
    const debtB = amortize(n(debt), n(debtRate), 600, 0, payB);
    const clearedB = Number.isFinite(debtB.payoffMonths) ? debtB.payoffMonths : Infinity;
    // Contributions plus the employer match, all the way through.
    const investB = growthSeries({
      initial: 0,
      contribution: toMatch + matchEarned,
      annualRate: n(ret),
      years: yrs,
    });
    // After the debt clears, that payment is freed up and invested too.
    const freedMonthsB = Math.max(0, yrs * 12 - Math.min(clearedB, yrs * 12));
    const freedB = growthSeries({
      initial: 0,
      contribution: payB,
      annualRate: n(ret),
      years: freedMonthsB / 12,
    });
    const endB = (investB.balances[investB.balances.length - 1] ?? 0)
      + (freedB.balances[freedB.balances.length - 1] ?? 0);
    const debtLeftB = clearedB > yrs * 12 ? (debtB.balances[Math.round(yrs * 12)] ?? 0) : 0;
    const netB = endB - debtLeftB;

    // Series for the chart, in whole months across the horizon.
    const total_m = Math.round(yrs * 12);
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    for (let m = 0; m <= total_m; m++) {
      const aDebt = debtA.balances[Math.min(m, debtA.balances.length - 1)] ?? 0;
      const aInv = m > clearedA ? (investA.balances[Math.min(m - clearedA, investA.balances.length - 1)] ?? 0) : 0;
      seriesA.push(aInv - aDebt);
      const bDebt = debtB.balances[Math.min(m, debtB.balances.length - 1)] ?? 0;
      const bInv = investB.balances[Math.min(m, investB.balances.length - 1)] ?? 0;
      const bFreed = m > clearedB ? (freedB.balances[Math.min(m - clearedB, freedB.balances.length - 1)] ?? 0) : 0;
      seriesB.push(bInv + bFreed - bDebt);
    }

    const matchOnTable = matchEarned * 12 * yrs;
    const bWins = netB > netA;

    return {
      capDollars, contribDollars, unmatchedRoom, monthlyRoom, toMatch, matchEarned, leftover,
      clearedA, clearedB, endA, endB, netA, netB, debtLeftA, debtLeftB,
      seriesA, seriesB, matchOnTable, bWins,
      gap: Math.abs(netB - netA),
      alreadyMaxed: unmatchedRoom <= 0,
      debtA, debtB,
    };
  }, [extra, debt, debtRate, debtPayment, salary, matchPct, matchCap, contribPct, ret, years]);

  return (
    <CalcShell
      slug="401k-vs-debt-payoff"
      intro="An employer match is an instant return nothing else comes close to. Past that point, paying down debt is a guaranteed return and investing is not. This works out where your spare money does the most good."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["pay-off-debt", "debt-payoff", "retirement-savings"]}
      disclaimer="For educational purposes only. Investment returns are not guaranteed and are shown before tax, while debt payoff is certain. Vesting schedules can delay when employer money is really yours — check yours before counting it."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your debt" badge="DEBT" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Balance" value={debt} onChange={setDebt} placeholder="18000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate" value={debtRate} onChange={setDebtRate} placeholder="21.9" suffix="%" step={0.1} />
              <NumField label="Paying now" value={debtPayment} onChange={setDebtPayment} placeholder="450" prefix="$" />
            </div>
            <NumField
              label="Spare money each month"
              value={extra}
              onChange={setExtra}
              placeholder="600"
              prefix="$"
              hint="The amount you are deciding what to do with."
            />
          </div>
        </Card>

        <Card title="Your 401k" badge="MATCH" badgeTone="green">
          <div className="space-y-4">
            <NumField label="Salary" value={salary} onChange={setSalary} placeholder="85000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Employer matches" value={matchPct} onChange={setMatchPct} placeholder="50" suffix="%" hint="of what you put in" />
              <NumField label="Up to" value={matchCap} onChange={setMatchCap} placeholder="6" suffix="%" hint="of your salary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="You contribute" value={contribPct} onChange={setContribPct} placeholder="2" suffix="%" />
              <NumField label="Expected return" value={ret} onChange={setRet} placeholder="7" suffix="%" step={0.5} />
            </div>
            <NumField label="Time horizon" value={years} onChange={setYears} placeholder="10" suffix="yrs" />
          </div>
        </Card>
      </div>

      {r ? (
        <>
          {!r.alreadyMaxed && (
            <div className="border border-green-200 rounded-2xl p-5 mb-4 bg-green-50">
              <Headline label="Employer money you are leaving behind" value={fmtK(r.matchOnTable)} tone="green" />
              <Takeaway tone="green">
                You contribute <strong>{fmt(r.contribDollars)}</strong> a year but the match runs to{" "}
                <strong>{fmt(r.capDollars)}</strong>. Adding <strong>{fmt(r.toMatch)}/mo</strong> earns you{" "}
                <strong>{fmt(r.matchEarned)}/mo</strong> from your employer — an immediate{" "}
                <strong>{n(matchPct)}%</strong> return before a cent is invested. No debt rate beats that.
                Capture the match first, then send whatever is left to the debt.
              </Takeaway>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">All to debt</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.netA)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  debt gone in {Number.isFinite(r.clearedA) ? fmtMonths(r.clearedA) : "never"}
                </p>
              </div>
              <div className={`p-4 text-center ${r.bWins ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.bWins ? "Match first wins by" : "All to debt wins by"}</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.gap)}</p>
                <p className="text-xs text-white/70">after {n(years)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Match first, rest to debt</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.netB)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  debt gone in {Number.isFinite(r.clearedB) ? fmtMonths(r.clearedB) : "never"}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label={`Net worth built over ${n(years)} years`} value={fmtK(Math.max(r.netA, r.netB))} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Invested — all to debt" value={fmtK(r.endA)} />
              <Stat label="Invested — match first" value={fmtK(r.endB)} tone="green" />
              <Stat label="Employer contributions" value={fmtK(r.matchOnTable)} tone="green" sub="free money" />
              <Stat
                label="Debt still owed"
                value={r.debtLeftB > 0 ? fmtK(r.debtLeftB) : "Cleared"}
                tone={r.debtLeftB > 0 ? "amber" : "green"}
              />
            </div>
            <Takeaway tone={r.bWins ? "green" : "amber"}>
              {r.alreadyMaxed ? (
                <>
                  You are already capturing the full match, so there is no free money left to grab. From
                  here it is a straight race: <strong>{n(debtRate)}%</strong> guaranteed by paying the debt
                  against <strong>{n(ret)}%</strong> hoped for in the market. With a debt rate that high,
                  clearing it first is usually the better risk-adjusted move.
                </>
              ) : r.bWins ? (
                <>
                  Taking the match first and sending the rest to the debt ends up{" "}
                  <strong>{fmtK(r.gap)}</strong> ahead. The match does the heavy lifting — it is worth more
                  than the interest you avoid by throwing everything at the balance.
                </>
              ) : (
                <>
                  At <strong>{n(debtRate)}%</strong>, this debt is expensive enough that clearing it fast
                  wins by <strong>{fmtK(r.gap)}</strong> — but only because the match here is small.
                  Capture whatever match you can regardless; it is the one return that is certain.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard
            title="Net position over time"
            footnote="Investments built, less any debt still outstanding."
          >
            <LineChart
              ariaLabel="Net position over time, all to debt compared with capturing the match first"
              periodsPerYear={12}
              series={[
                { label: "All to debt", color: COLORS.amber, data: r.seriesA },
                { label: "Match first, rest to debt", color: COLORS.green, data: r.seriesB, dash: [6, 3] },
              ]}
            />
          </ChartCard>

          <ChartCard title="Where the money ends up" footnote="Investment balance at the end of the horizon.">
            <BarChart
              ariaLabel="Investment balance after the horizon under each strategy"
              height={200}
              bars={[
                { label: "All to debt", segments: [{ label: "Invested", value: r.endA, color: COLORS.gray }] },
                {
                  label: "Match first",
                  segments: [
                    { label: "Your contributions", value: Math.max(0, r.endB - r.matchOnTable), color: COLORS.gray },
                    { label: "Employer match", value: r.matchOnTable, color: COLORS.green },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your spare monthly amount, the debt, and a time horizon to compare.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

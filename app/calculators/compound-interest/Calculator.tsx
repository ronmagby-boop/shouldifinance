"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, DonutChart, COLORS } from "../../components/Charts";
import { growthSeries, effectiveAnnualRate } from "../../lib/finance";

const FREQ: Record<string, number> = {
  daily: 365, monthly: 12, quarterly: 4, annually: 1,
};

export default function Calculator() {
  const [initial, setInitial] = useState<Num>("");
  const [monthly, setMonthly] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [freq, setFreq] = useState("monthly");
  const [raise, setRaise] = useState<Num>("");

  const loadExample = () => {
    setInitial(10000);
    setMonthly(500);
    setRate(7);
    setYears(25);
    setFreq("monthly");
    setRaise(3);
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || (n(initial) <= 0 && n(monthly) <= 0)) return null;

    // Compound at the chosen frequency, then express that as an equivalent
    // monthly rate so monthly contributions are handled correctly.
    const ear = effectiveAnnualRate(n(rate), FREQ[freq]);
    const monthlyRate = (Math.pow(1 + ear / 100, 1 / 12) - 1) * 12 * 100;

    const g = growthSeries({
      initial: n(initial),
      contribution: n(monthly),
      annualRate: monthlyRate,
      years: yrs,
      periodsPerYear: 12,
      contributionGrowth: n(raise),
    });

    const final = g.balances[g.balances.length - 1];
    const simple = n(initial) * (1 + (n(rate) / 100) * yrs) + n(monthly) * 12 * yrs;
    const contributedSeries = [n(initial)];
    let c = n(monthly);
    let acc = n(initial);
    for (let i = 1; i < g.balances.length; i++) {
      if (i > 1 && (i - 1) % 12 === 0) c *= 1 + n(raise) / 100;
      acc += c;
      contributedSeries.push(acc);
    }

    return {
      final,
      contributed: g.contributed,
      interest: g.growth,
      ear,
      balances: g.balances,
      contributedSeries,
      vsSimple: final - simple,
      doubleYears: n(rate) > 0 ? 72 / n(rate) : Infinity,
    };
  }, [initial, monthly, rate, years, freq, raise]);

  return (
    <CalcShell
      slug="compound-interest"
      category="Investing"
      eyebrow="Investing tools"
      title="Compound interest calculator"
      crumb="Compound interest"
      intro="Compounding is interest earning interest. Enter what you start with and what you add each month — we'll show what it grows into, how much of that is your own money, and how much the market did for you."
      onExample={loadExample}
      relatedSlugs={["investment-growth", "retirement-savings", "dollar-cost-averaging"]}
      disclaimer="For educational purposes only. Projections assume a constant rate of return, which no real investment delivers. Actual results vary with markets, fees, and taxes. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your plan" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="Starting amount" value={initial} onChange={setInitial} placeholder="10000" prefix="$" />
            <NumField label="Monthly contribution" value={monthly} onChange={setMonthly} placeholder="500" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Annual return" value={rate} onChange={setRate} placeholder="7" suffix="%" step={0.25} />
              <NumField label="Years" value={years} onChange={setYears} placeholder="25" suffix="yrs" />
            </div>
            <SelectField
              label="Compounding frequency"
              value={freq}
              onChange={setFreq}
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "annually", label: "Annually" },
              ]}
            />
            <NumField
              label="Increase contribution each year"
              value={raise}
              onChange={setRaise}
              placeholder="3"
              suffix="%"
              step={0.5}
              hint="Optional — most people can raise contributions as income grows."
            />
          </div>
        </Card>

        <Card title="What it becomes" badge="PROJECTION" badgeTone="green" className="bg-gray-50">
          {r ? (
            <>
              <Headline label={`Balance after ${n(years)} years`} value={fmtK(r.final)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="You put in" value={fmtK(r.contributed)} />
                <Stat label="Interest earned" value={fmtK(r.interest)} tone="green" />
                <Stat label="Effective annual yield" value={pct(r.ear, 2)} />
                <Stat
                  label="Money doubles every"
                  value={Number.isFinite(r.doubleYears) ? `${r.doubleYears.toFixed(1)} yrs` : "—"}
                  sub="Rule of 72"
                />
              </div>
              <Takeaway>
                Compounding added <strong>{fmtK(r.interest)}</strong> on top of the{" "}
                <strong>{fmtK(r.contributed)}</strong> you contributed —{" "}
                <strong>{Math.round((r.interest / Math.max(1, r.final)) * 100)}%</strong> of your final
                balance is growth you never had to deposit.
                {r.vsSimple > 0 && (
                  <> Compounding beats plain simple interest here by <strong>{fmtK(r.vsSimple)}</strong>.</>
                )}
              </Takeaway>
            </>
          ) : (
            <EmptyState>
              Enter a starting amount or monthly contribution, a return, and how many years you&apos;ll
              stay invested.
            </EmptyState>
          )}
        </Card>
      </div>

      {r && (
        <>
          <ChartCard title="Growth over time">
            <LineChart
              ariaLabel="Balance growth compared with total contributions over time"
              periodsPerYear={12}
              series={[
                { label: "Balance", color: COLORS.green, data: r.balances, fill: true },
                { label: "What you contributed", color: COLORS.gray, data: r.contributedSeries, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The gap between the two lines is compounding at work. It starts almost invisible and
                widens every year — which is why time in the market matters more than the exact rate.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Where the final balance comes from">
            <DonutChart
              ariaLabel="Split of final balance between contributions and interest earned"
              centerLabel="total"
              centerValue={fmtK(r.final)}
              slices={[
                { label: "Your contributions", value: r.contributed, color: COLORS.gray },
                { label: "Interest earned", value: Math.max(0, r.interest), color: COLORS.green },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Monthly deposit</p>
                <p className="text-lg font-medium text-gray-900">{fmt(n(monthly))}</p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">Grows into</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.final)}</p>
                <p className="text-xs text-green-300">in {n(years)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Growth multiple</p>
                <p className="text-lg font-medium text-gray-900">
                  {(r.final / Math.max(1, r.contributed)).toFixed(2)}×
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </CalcShell>
  );
}

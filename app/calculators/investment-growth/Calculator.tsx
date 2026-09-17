"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { growthSeries } from "../../lib/finance";

export default function Calculator() {
  const [initial, setInitial] = useState<Num>("");
  const [monthly, setMonthly] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [fee, setFee] = useState<Num>("");
  const [inflation, setInflation] = useState<Num>("");
  const [raise, setRaise] = useState<Num>("");

  const loadExample = () => {
    setInitial(25000);
    setMonthly(1000);
    setRate(8);
    setYears(20);
    setFee(0.65);
    setInflation(2.5);
    setRaise(3);
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || (n(initial) <= 0 && n(monthly) <= 0)) return null;

    const opts = {
      initial: n(initial),
      contribution: n(monthly),
      years: yrs,
      periodsPerYear: 12,
      contributionGrowth: n(raise),
    };
    const gross = growthSeries({ ...opts, annualRate: n(rate) });
    const net = growthSeries({ ...opts, annualRate: n(rate) - n(fee) });

    const finalNominal = net.balances[net.balances.length - 1];
    const infl = n(inflation) / 100;
    const realBalances = net.balances.map((b, i) => b / Math.pow(1 + infl, i / 12));
    const finalReal = realBalances[realBalances.length - 1];

    const contributedSeries = [n(initial)];
    let c = n(monthly);
    let acc = n(initial);
    for (let i = 1; i < net.balances.length; i++) {
      if (i > 1 && (i - 1) % 12 === 0) c *= 1 + n(raise) / 100;
      acc += c;
      contributedSeries.push(acc);
    }

    const feeCost = gross.balances[gross.balances.length - 1] - finalNominal;
    const lastYearContribution = c * 12;

    return {
      finalNominal,
      finalReal,
      contributed: net.contributed,
      growth: net.growth,
      feeCost,
      balances: net.balances,
      realBalances,
      contributedSeries,
      lastYearContribution,
      purchasingPowerLoss: finalNominal - finalReal,
      netReturn: n(rate) - n(fee),
      realReturn: ((1 + (n(rate) - n(fee)) / 100) / (1 + infl) - 1) * 100,
    };
  }, [initial, monthly, rate, years, fee, inflation, raise]);

  return (
    <CalcShell
      slug="investment-growth"
      intro="A projection is only honest if it includes the two things that quietly shrink it: fees and inflation. This one shows the headline number and what that money is actually worth in today's dollars."
      onExample={loadExample}
      relatedSlugs={["compound-interest", "retirement-savings", "required-rate-of-return"]}
      disclaimer="For educational purposes only. Assumes a constant annual return, which real markets never deliver. Does not account for taxes on gains in taxable accounts, sequence-of-returns risk, or changes in contribution limits. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your portfolio" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="Starting balance" value={initial} onChange={setInitial} placeholder="25000" prefix="$" />
            <NumField label="Monthly contribution" value={monthly} onChange={setMonthly} placeholder="1000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Annual return" value={rate} onChange={setRate} placeholder="8" suffix="%" step={0.25} />
              <NumField label="Years invested" value={years} onChange={setYears} placeholder="20" suffix="yrs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Annual fees" value={fee} onChange={setFee} placeholder="0.65" suffix="%" step={0.05} />
              <NumField label="Inflation" value={inflation} onChange={setInflation} placeholder="2.5" suffix="%" step={0.1} />
            </div>
            <NumField
              label="Contribution increase per year"
              value={raise}
              onChange={setRaise}
              placeholder="3"
              suffix="%"
              step={0.5}
              hint="Optional — model raises that let you save more each year."
            />
          </div>
        </Card>

        <Card title="Projected value" badge="PROJECTION" badgeTone="green" className="bg-gray-50">
          {r ? (
            <>
              <Headline label={`Balance after ${n(years)} years`} value={fmtK(r.finalNominal)} />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Worth in today's dollars" value={fmtK(r.finalReal)} tone="amber" />
                <Stat label="You contributed" value={fmtK(r.contributed)} />
                <Stat label="Investment growth" value={fmtK(r.growth)} tone="green" />
                <Stat label="Lost to fees" value={fmtK(r.feeCost)} tone="red" />
                <Stat label="Return after fees" value={pct(r.netReturn, 2)} />
                <Stat label="Real return after inflation" value={pct(r.realReturn, 2)} />
              </div>
              <Takeaway tone={r.realReturn > 0 ? "green" : "amber"}>
                After {pct(n(fee), 2)} in fees and {pct(n(inflation), 1)} inflation, your{" "}
                <strong>{fmtK(r.finalNominal)}</strong> buys what{" "}
                <strong>{fmtK(r.finalReal)}</strong> buys today. Fees alone cost you{" "}
                <strong>{fmtK(r.feeCost)}</strong> over {n(years)} years — the strongest argument for
                low-cost index funds.
              </Takeaway>
            </>
          ) : (
            <EmptyState>
              Add a starting balance or monthly contribution, an expected return, and a time horizon.
            </EmptyState>
          )}
        </Card>
      </div>

      {r && (
        <>
          <ChartCard title="Nominal value vs. what it's really worth">
            <LineChart
              ariaLabel="Portfolio value in nominal and inflation-adjusted dollars against contributions"
              periodsPerYear={12}
              series={[
                { label: "Balance", color: COLORS.green, data: r.balances, fill: true },
                { label: "In today's dollars", color: COLORS.amber, data: r.realBalances, dash: [6, 3] },
                { label: "Contributions", color: COLORS.gray, data: r.contributedSeries, dash: [2, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="amber">
                The gap between the green and amber lines is inflation quietly eating returns. Over{" "}
                {n(years)} years it costs <strong>{fmtK(r.purchasingPowerLoss)}</strong> of purchasing
                power — which is why your target should always be a real return, not a nominal one.
              </Takeaway>
            </div>
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Starting point</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(n(initial))}</p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">Ends at</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.finalNominal)}</p>
                <p className="text-xs text-green-300">{fmtK(r.finalReal)} in today&apos;s dollars</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Final year contribution</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.lastYearContribution)}</p>
                <p className="text-xs text-gray-400 mt-0.5">per year</p>
              </div>
            </div>
          </div>
        </>
      )}
    </CalcShell>
  );
}

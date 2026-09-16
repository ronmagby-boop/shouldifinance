"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";

type Scenario = "rising" | "flat" | "dip" | "falling" | "volatile";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "rising", label: "Steady rise — market climbs the whole time" },
  { value: "dip", label: "Dip then recovery — falls, then comes back" },
  { value: "volatile", label: "Choppy — swings up and down" },
  { value: "flat", label: "Flat — goes nowhere" },
  { value: "falling", label: "Decline — keeps sliding" },
];

/** Deterministic price path so the two strategies are compared on identical markets. */
function pricePath(scenario: Scenario, months: number, annualReturn: number, start = 100): number[] {
  const drift = Math.pow(1 + annualReturn / 100, 1 / 12);
  const prices: number[] = [];
  for (let i = 0; i <= months; i++) {
    const t = months === 0 ? 0 : i / months;
    let p = start * Math.pow(drift, i);
    if (scenario === "dip") p *= 1 - 0.3 * Math.sin(Math.PI * t);
    if (scenario === "volatile") p *= 1 + 0.12 * Math.sin(t * Math.PI * 5);
    if (scenario === "flat") p = start * (1 + 0.03 * Math.sin(t * Math.PI * 2));
    if (scenario === "falling") p = start * Math.pow(0.988, i);
    prices.push(p);
  }
  return prices;
}

export default function Calculator() {
  const [total, setTotal] = useState<Num>("");
  const [periods, setPeriods] = useState<Num>("");
  const [annualReturn, setAnnualReturn] = useState<Num>("");
  const [holdYears, setHoldYears] = useState<Num>("");
  const [scenario, setScenario] = useState<Scenario>("dip");

  const loadExample = () => {
    setTotal(60000);
    setPeriods(12);
    setAnnualReturn(8);
    setHoldYears(5);
    setScenario("dip");
  };

  const r = useMemo(() => {
    const amount = n(total);
    const months = Math.max(1, Math.round(n(periods)));
    const hold = Math.max(months, Math.round(n(holdYears) * 12));
    if (amount <= 0 || n(periods) <= 0) return null;

    const prices = pricePath(scenario, hold, n(annualReturn));
    const perPeriod = amount / months;

    // Lump sum: everything at month 0.
    const lumpShares = amount / prices[0];

    // DCA: equal slices, uninvested cash sits idle.
    let dcaShares = 0;
    const dcaValues: number[] = [];
    const lumpValues: number[] = [];
    let costBasisShares = 0;

    for (let i = 0; i <= hold; i++) {
      if (i < months) {
        dcaShares += perPeriod / prices[i];
        costBasisShares += perPeriod / prices[i];
      }
      const cashWaiting = i < months ? perPeriod * (months - i) : 0;
      dcaValues.push(dcaShares * prices[i] + cashWaiting);
      lumpValues.push(lumpShares * prices[i]);
    }

    const dcaFinal = dcaValues[dcaValues.length - 1];
    const lumpFinal = lumpValues[lumpValues.length - 1];
    const dcaAvgCost = amount / costBasisShares;

    return {
      prices,
      dcaValues,
      lumpValues,
      dcaFinal,
      lumpFinal,
      diff: lumpFinal - dcaFinal,
      dcaAvgCost,
      lumpCost: prices[0],
      dcaShares,
      lumpShares,
      perPeriod,
      months,
      hold,
      dcaReturn: (dcaFinal / amount - 1) * 100,
      lumpReturn: (lumpFinal / amount - 1) * 100,
    };
  }, [total, periods, annualReturn, holdYears, scenario]);

  return (
    <CalcShell
      slug="dollar-cost-averaging"
      category="Investing"
      eyebrow="Investing tools"
      title="Dollar-cost averaging calculator"
      crumb="Dollar-cost averaging"
      intro="You have a lump of money. Do you invest it all today, or feed it in over months? Pick a market scenario and see how both strategies play out on exactly the same price path."
      onExample={loadExample}
      relatedSlugs={["compound-interest", "investment-growth", "required-rate-of-return"]}
      disclaimer="For educational purposes only. The market scenarios are illustrative price paths, not forecasts — nobody knows which one the next year looks like. Historically, lump-sum investing has beaten averaging in most periods, but averaging reduces regret when timing is wrong. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your money" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="Total amount to invest" value={total} onChange={setTotal} placeholder="60000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Spread over" value={periods} onChange={setPeriods} placeholder="12" suffix="mo" />
              <NumField label="Then hold for" value={holdYears} onChange={setHoldYears} placeholder="5" suffix="yrs" />
            </div>
            <NumField
              label="Long-run annual return"
              value={annualReturn}
              onChange={setAnnualReturn}
              placeholder="8"
              suffix="%"
              step={0.5}
              hint="The underlying trend the scenario moves around."
            />
            <SelectField
              label="Market scenario"
              value={scenario}
              onChange={(v) => setScenario(v as Scenario)}
              options={SCENARIOS}
              hint="Averaging wins when prices fall first. Lump sum wins when they rise."
            />
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">You&apos;d invest</span>
                <span className="text-sm font-medium text-gray-900">
                  {fmt(r.perPeriod)}/mo for {r.months} months
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="How each finished" badge="RESULT" badgeTone="green" className="bg-gray-50">
          {r ? (
            <>
              <Headline
                label={r.diff >= 0 ? "Lump sum came out ahead by" : "Dollar-cost averaging came out ahead by"}
                value={fmtK(Math.abs(r.diff))}
                tone={r.diff >= 0 ? "gray" : "green"}
              />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Lump sum final value" value={fmtK(r.lumpFinal)} sub={pct(r.lumpReturn, 1) + " total"} />
                <Stat label="Averaging final value" value={fmtK(r.dcaFinal)} sub={pct(r.dcaReturn, 1) + " total"} />
                <Stat label="Lump sum cost/share" value={`$${r.lumpCost.toFixed(2)}`} />
                <Stat
                  label="Average cost/share"
                  value={`$${r.dcaAvgCost.toFixed(2)}`}
                  tone={r.dcaAvgCost < r.lumpCost ? "green" : "amber"}
                />
              </div>
              <Takeaway tone={r.diff >= 0 ? "blue" : "green"}>
                {r.diff >= 0 ? (
                  <>
                    In this scenario, being invested from day one beat averaging in by{" "}
                    <strong>{fmtK(r.diff)}</strong>. That is the usual result when markets rise: money on
                    the sidelines earns nothing.
                  </>
                ) : (
                  <>
                    Averaging bought more shares at lower prices and finished{" "}
                    <strong>{fmtK(Math.abs(r.diff))}</strong> ahead. Your average cost of{" "}
                    <strong>${r.dcaAvgCost.toFixed(2)}</strong> beat the day-one price of $
                    {r.lumpCost.toFixed(2)}.
                  </>
                )}
              </Takeaway>
            </>
          ) : (
            <EmptyState>Enter an amount and how many months you&apos;d spread it over.</EmptyState>
          )}
        </Card>
      </div>

      {r && (
        <>
          <ChartCard title="Portfolio value over time">
            <LineChart
              ariaLabel="Portfolio value for lump sum investing compared with dollar-cost averaging"
              periodsPerYear={12}
              series={[
                { label: "Lump sum", color: COLORS.blue, data: r.lumpValues },
                { label: "Dollar-cost averaging", color: COLORS.green, data: r.dcaValues, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="amber">
                The averaging line starts lower because most of your money is still cash. That is the real
                trade: less exposure to a bad start, but also less exposure to a good one.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Final value side by side">
            <BarChart
              ariaLabel="Final portfolio value comparison between lump sum and dollar-cost averaging"
              height={200}
              bars={[
                { label: "Lump sum", segments: [{ label: "Final value", value: r.lumpFinal, color: COLORS.blue }] },
                { label: "Averaging in", segments: [{ label: "Final value", value: r.dcaFinal, color: COLORS.green }] },
                { label: "Amount invested", segments: [{ label: "Invested", value: n(total), color: COLORS.gray }] },
              ]}
            />
          </ChartCard>
        </>
      )}
    </CalcShell>
  );
}

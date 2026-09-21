"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";

type Scenario = "rising" | "flat" | "dip" | "falling" | "volatile";

const SCENARIOS: { value: Scenario; label: string; short: string }[] = [
  { value: "rising", label: "Steady rise — market climbs the whole time", short: "Steady rise" },
  { value: "dip", label: "Dip then recovery — falls, then comes back", short: "Dip then recovery" },
  { value: "volatile", label: "Choppy — swings up and down", short: "Choppy" },
  { value: "flat", label: "Flat — goes nowhere", short: "Flat" },
  { value: "falling", label: "Decline — keeps sliding", short: "Decline" },
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

/**
 * Both strategies on one price path.
 *
 * Every figure on the page comes out of here — the tiles, both charts and each
 * row of the scenario table — so the chart cannot disagree with the result
 * beside it. It used to: the chart's averaging series counted the slice bought
 * this month as still sitting in cash, which put month zero at $65,000 on a
 * $60,000 investment and dropped a cliff into the line when the spreading
 * period ended.
 */
function runScenario(
  scenario: Scenario,
  amount: number,
  months: number,
  hold: number,
  annualReturn: number,
  cashRate: number,
) {
  const prices = pricePath(scenario, hold, annualReturn);
  const perPeriod = amount / months;
  const monthlyCash = cashRate / 100 / 12;

  const lumpShares = amount / prices[0];

  let cash = amount;
  let shares = 0;
  let paidIn = 0;
  const dcaValues: number[] = [];
  const lumpValues: number[] = [];

  for (let i = 0; i <= hold; i++) {
    if (i < months) {
      const buy = Math.min(perPeriod, cash);
      shares += buy / prices[i];
      cash -= buy;
      paidIn += buy;
    } else if (i === months && cash > 0.005) {
      // Interest the waiting cash earned goes in with the last instalment
      // rather than sitting uninvested for the rest of the hold.
      shares += cash / prices[i];
      paidIn += cash;
      cash = 0;
    }

    // Cash not yet invested, plus the market value of what has been.
    dcaValues.push(shares * prices[i] + cash);
    lumpValues.push(lumpShares * prices[i]);

    if (i < months) cash *= 1 + monthlyCash;
  }

  const dcaFinal = dcaValues[dcaValues.length - 1];
  const lumpFinal = lumpValues[lumpValues.length - 1];
  return {
    prices, dcaValues, lumpValues, dcaFinal, lumpFinal,
    diff: lumpFinal - dcaFinal,
    avgCost: paidIn / shares,
    lumpCost: prices[0],
    shares, lumpShares, paidIn,
    dcaReturn: (dcaFinal / amount - 1) * 100,
    lumpReturn: (lumpFinal / amount - 1) * 100,
  };
}

export default function Calculator() {
  const [total, setTotal] = useState<Num>("");
  const [periods, setPeriods] = useState<Num>("");
  const [annualReturn, setAnnualReturn] = useState<Num>("");
  const [holdYears, setHoldYears] = useState<Num>("");
  const [cashRate, setCashRate] = useState<Num>("");
  const [scenario, setScenario] = useState<Scenario>("rising");

  const loadExample = () => {
    setTotal(60000);
    setPeriods(12);
    setAnnualReturn(8);
    setHoldYears(5);
    setCashRate(0);
    // The steady rise, because that is the common case. "Dip then recovery" is
    // the one averaging is built to win, and leading with it teaches the
    // exception as though it were the rule.
    setScenario("rising");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setTotal("");
    setPeriods("");
    setAnnualReturn("");
    setHoldYears("");
    setCashRate("");
    setScenario("rising");
  };

  const r = useMemo(() => {
    const amount = n(total);
    if (amount <= 0 || n(periods) <= 0) return null;

    const holdMonths = Math.max(1, Math.round(n(holdYears) * 12));
    // Spreading for longer than you intend to hold is not a plan; cap it and
    // say so rather than silently stretching the hold to match.
    const requested = Math.max(1, Math.round(n(periods)));
    const months = Math.min(requested, holdMonths);
    const spreadCapped = requested > holdMonths;

    const run = (s: Scenario) =>
      runScenario(s, amount, months, holdMonths, n(annualReturn), n(cashRate));

    const selected = run(scenario);
    // Every scenario on the same inputs. The selected one drives the charts;
    // this is what says whether the selected one is typical.
    const table = SCENARIOS.map((s) => {
      const x = run(s.value);
      return { ...s, lumpFinal: x.lumpFinal, dcaFinal: x.dcaFinal, diff: x.diff };
    });
    const lumpWins = table.filter((t) => t.diff >= 0).length;

    return {
      ...selected,
      table,
      lumpWins,
      perPeriod: amount / months,
      months,
      hold: holdMonths,
      spreadCapped,
      requested,
      cashEarned: Math.max(0, selected.paidIn - amount),
    };
  }, [total, periods, annualReturn, holdYears, cashRate, scenario]);

  return (
    <CalcShell
      slug="dollar-cost-averaging"
      intro="You have a lump of money. Do you invest it all today, or feed it in over months? Pick a market scenario and see how both strategies play out on exactly the same price path — then check the table, which runs every scenario at once."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["compound-interest", "investment-growth", "savings-apy", "required-rate-of-return"]}
      disclaimer="For educational purposes only. The market scenarios are illustrative price paths, not forecasts — nobody knows which one the next year looks like. Vanguard's study of the US, UK and Australian markets found lump-sum investing beat twelve-month averaging about two-thirds of the time. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your money" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="Total amount to invest" value={total} onChange={setTotal} min={0} placeholder="60000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Spread over"
                value={periods}
                onChange={setPeriods}
                min={1}
                placeholder="12"
                suffix="mo"
                hint={
                  r && r.spreadCapped
                    ? `Capped at ${r.months} months — you cannot spread the money over longer than you hold it.`
                    : undefined
                }
              />
              <NumField label="Then hold for" value={holdYears} onChange={setHoldYears} min={1} placeholder="5" suffix="yrs" />
            </div>
            <NumField
              label="Long-run annual return"
              value={annualReturn}
              onChange={setAnnualReturn}
              placeholder="8"
              suffix="%"
              step={0.5}
              hint="The underlying trend the scenario moves around. Can be negative."
            />
            <NumField
              label="Rate on cash while you wait"
              value={cashRate}
              onChange={setCashRate}
              min={0}
              placeholder="0"
              suffix="%"
              step={0.25}
              hint={
                <>
                  Optional. Money queued to be invested usually sits in a savings or money-market account
                  rather than at zero — <a href="/calculators/savings-apy" className="text-green-700 underline">what that actually earns</a>.
                </>
              }
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
                  value={`$${r.avgCost.toFixed(2)}`}
                  tone={r.avgCost < r.lumpCost ? "green" : "amber"}
                />
              </div>
              <Takeaway tone={r.diff >= 0 ? "blue" : "green"}>
                {r.diff >= 0 ? (
                  <>
                    In this scenario, being invested from day one beat averaging in by{" "}
                    <strong>{fmtK(r.diff)}</strong>. That is the usual result when markets rise: money on
                    the sidelines earns {n(cashRate) > 0 ? `only ${n(cashRate)}%` : "nothing"} while the
                    market compounds.
                  </>
                ) : (
                  <>
                    Averaging bought more shares at lower prices and finished{" "}
                    <strong>{fmtK(Math.abs(r.diff))}</strong> ahead. Your average cost of{" "}
                    <strong>${r.avgCost.toFixed(2)}</strong> beat the day-one price of $
                    {r.lumpCost.toFixed(2)}.
                  </>
                )}
                {r.cashEarned > 0.5 && (
                  <>
                    {" "}
                    The waiting cash earned <strong>{fmt(r.cashEarned)}</strong> at {n(cashRate)}%, which
                    goes in with the last instalment.
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
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-sm font-medium text-gray-900">Every scenario, same money</h2>
              <p className="text-xs text-gray-500 leading-relaxed mt-1">
                {fmt(n(total))} over {r.months} months, held {Math.round(r.hold / 12)} years, on each of
                the five price paths. Lump sum wins <strong>{r.lumpWins} of {r.table.length}</strong> here
                — which is roughly the historical split, and the point: averaging is a bet on the path,
                not a better strategy.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium border-y border-gray-100">Scenario</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-y border-gray-100">Lump sum</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-y border-gray-100">Averaging</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-y border-gray-100">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {r.table.map((row) => (
                    <tr
                      key={row.value}
                      className={`border-b border-gray-50 ${row.value === scenario ? "bg-green-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                        {row.short}
                        {row.value === scenario && <span className="ml-2 text-green-700">✓ shown above</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(row.lumpFinal)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(row.dcaFinal)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium whitespace-nowrap ${row.diff >= 0 ? "text-blue-700" : "text-green-700"}`}>
                        {row.diff >= 0 ? "Lump sum" : "Averaging"} +{fmtK(Math.abs(row.diff))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
                Both lines start at {fmt(n(total))}, because on day one the averaging money is all still
                cash. They separate as that cash goes in: less exposure to a bad start, and less to a good
                one. That is the whole trade.
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

"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [firstYear, setFirstYear] = useState<Num>("");
  const [laterYears, setLaterYears] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");

  const loadExample = () => {
    setPrice(40000);
    setFirstYear(20);
    setLaterYears(14);
    setYears(8);
    setDown(4000);
    setRate(6.9);
    setTerm(72);
  };

  const r = useMemo(() => {
    const yrs = Math.max(1, Math.round(n(years)));
    if (n(price) <= 0) return null;

    // Monthly value curve: steeper in year one, then a steady annual rate.
    const values: number[] = [n(price)];
    let value = n(price);
    for (let m = 1; m <= yrs * 12; m++) {
      const annualRate = m <= 12 ? n(firstYear) : n(laterYears);
      value *= Math.pow(1 - annualRate / 100, 1 / 12);
      values.push(value);
    }

    const financed = Math.max(0, n(price) - n(down));
    const loanMonths = Math.max(1, Math.round(n(term)));
    const monthly = payment(financed, n(rate), loanMonths);
    const schedule = amortize(financed, n(rate), loanMonths);
    const balances: number[] = [];
    for (let m = 0; m <= yrs * 12; m++) {
      balances.push(schedule.balances[Math.min(m, schedule.balances.length - 1)] ?? 0);
    }

    // When does equity turn positive?
    let positiveEquityMonth: number | null = null;
    let maxUnderwater = 0;
    for (let m = 0; m < values.length; m++) {
      const equity = values[m] - balances[m];
      if (equity < maxUnderwater) maxUnderwater = equity;
      if (positiveEquityMonth === null && equity >= 0 && m > 0) positiveEquityMonth = m;
    }
    if (n(down) >= n(price) * 0.2) positiveEquityMonth = positiveEquityMonth ?? 0;

    const yearlyValues = [];
    for (let y = 0; y <= yrs; y++) {
      const idx = Math.min(y * 12, values.length - 1);
      yearlyValues.push({
        year: y,
        value: values[idx],
        balance: balances[idx],
        equity: values[idx] - balances[idx],
        lost: n(price) - values[idx],
        pctOfOriginal: (values[idx] / n(price)) * 100,
      });
    }

    const finalValue = values[values.length - 1];
    const totalLost = n(price) - finalValue;

    return {
      values,
      balances,
      yearlyValues,
      finalValue,
      totalLost,
      lostPct: (totalLost / n(price)) * 100,
      perYear: totalLost / yrs,
      perMonth: totalLost / (yrs * 12),
      firstYearLoss: n(price) - values[Math.min(12, values.length - 1)],
      positiveEquityMonth,
      maxUnderwater,
      monthly,
      financed,
      startsUnderwater: n(price) - financed < 0 || values[1] < balances[1],
    };
  }, [price, firstYear, laterYears, years, down, rate, term]);

  return (
    <CalcShell
      slug="depreciation"
      intro="Depreciation is the largest cost of owning a car and the only one that never sends a bill. Track what your vehicle is worth each year — and see exactly when the loan balance finally drops below it."
      onExample={loadExample}
      relatedSlugs={["total-cost-of-ownership", "auto-loan-refinance", "lease-vs-buy"]}
      disclaimer="For educational purposes only. Depreciation varies enormously by make, model, condition, mileage, and market conditions — trucks and some hybrids hold value far better than average, while luxury sedans and EVs have historically fallen faster. Check current listings for the real number on your vehicle."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The vehicle" badge="VALUE">
          <div className="space-y-4">
            <NumField label="Purchase price" value={price} onChange={setPrice} placeholder="40000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="First-year drop"
                value={firstYear}
                onChange={setFirstYear}
                placeholder="20"
                suffix="%"
                step={1}
                hint="New cars: 15-25%."
              />
              <NumField
                label="Each year after"
                value={laterYears}
                onChange={setLaterYears}
                placeholder="14"
                suffix="%"
                step={1}
                hint="Typically 12-18%."
              />
            </div>
            <NumField label="Years to project" value={years} onChange={setYears} placeholder="8" suffix="yrs" />
          </div>
        </Card>

        <Card title="Your loan" badge="FINANCING" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Down payment" value={down} onChange={setDown} placeholder="4000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Loan rate" value={rate} onChange={setRate} placeholder="6.9" suffix="%" step={0.25} />
              <NumField label="Loan term" value={term} onChange={setTerm} placeholder="72" suffix="mo" />
            </div>
            {r && (
              <>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Monthly payment</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.monthly)}</span>
                </div>
                <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.positiveEquityMonth === null ? "bg-red-50" : "bg-green-50"}`}>
                  <span className={`text-xs font-medium ${r.positiveEquityMonth === null ? "text-red-700" : "text-green-700"}`}>
                    Equity turns positive
                  </span>
                  <span className={`text-sm font-medium ${r.positiveEquityMonth === null ? "text-red-800" : "text-green-800"}`}>
                    {r.positiveEquityMonth === null
                      ? "Not in this period"
                      : r.positiveEquityMonth === 0
                      ? "Day one ✓"
                      : fmtMonths(r.positiveEquityMonth)}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label={`Value after ${n(years)} years`} value={fmtK(r.finalValue)} tone="gray" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Total value lost" value={fmtK(r.totalLost)} sub={pct(r.lostPct, 0) + " of the price"} tone="red" />
              <Stat label="First-year loss alone" value={fmtK(r.firstYearLoss)} tone="red" />
              <Stat label="Average per year" value={fmt(r.perYear)} />
              <Stat label="Average per month" value={fmt(r.perMonth)} sub="on top of your payment" tone="amber" />
            </div>
            <Takeaway tone={r.maxUnderwater < 0 ? "amber" : "green"}>
              This car loses <strong>{fmtK(r.firstYearLoss)}</strong> in its first year alone — more than{" "}
              {fmt(r.firstYearLoss / 12)} a month of value you never see on a statement.
              {r.maxUnderwater < 0 && (
                <>
                  {" "}
                  You&apos;d also be underwater by as much as{" "}
                  <strong>{fmt(Math.abs(r.maxUnderwater))}</strong> at the worst point, which is why gap
                  insurance exists. A larger down payment or a shorter term closes that window faster.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Value vs. what you still owe">
            <LineChart
              ariaLabel="Vehicle value declining compared with the outstanding loan balance over time"
              periodsPerYear={12}
              series={[
                { label: "Car's value", color: COLORS.green, data: r.values, fill: true },
                { label: "Loan balance", color: COLORS.red, data: r.balances, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Wherever the red line sits above the green one, you owe more than the car is worth — if it
                were totalled, insurance would pay the value and you would still owe the difference. The
                crossing point is when you could finally sell without bringing cash to the table.
              </Takeaway>
            </div>
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Year</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Value</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">% of original</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Value lost</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Loan balance</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {r.yearlyValues.map((row) => (
                    <tr key={row.year} className="hover:bg-gray-50 border-b border-gray-50">
                      <td className="px-3 py-2.5 text-gray-900">{row.year === 0 ? "New" : `Year ${row.year}`}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmt(row.value)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{pct(row.pctOfOriginal, 0)}</td>
                      <td className="px-3 py-2.5 text-right text-red-600">{fmt(row.lost)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmt(row.balance)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${row.equity >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {row.equity >= 0 ? fmt(row.equity) : `-${fmt(Math.abs(row.equity))}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a purchase price to project the vehicle&apos;s value.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

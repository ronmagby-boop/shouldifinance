"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, balanceAfter } from "../../lib/finance";

/**
 * Value left after `years`, given a first-year drop and a steadier rate after.
 * New cars take their biggest hit the moment they leave the lot; a used car
 * has already taken that hit, so it only carries the steady rate.
 */
function residual(price: number, firstYearDrop: number, laterRate: number, years: number): number {
  if (years <= 0) return price;
  const afterFirst = price * (1 - firstYearDrop / 100);
  const rest = Math.max(0, years - 1);
  return afterFirst * Math.pow(1 - laterRate / 100, rest);
}

export default function Calculator() {
  const [newPrice, setNewPrice] = useState<Num>("");
  const [newDown, setNewDown] = useState<Num>("");
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [newDrop, setNewDrop] = useState<Num>("");
  const [usedPrice, setUsedPrice] = useState<Num>("");
  const [usedDown, setUsedDown] = useState<Num>("");
  const [usedRate, setUsedRate] = useState<Num>("");
  const [usedTerm, setUsedTerm] = useState<Num>("");
  const [usedDrop, setUsedDrop] = useState<Num>("");
  const [laterDrop, setLaterDrop] = useState<Num>("");
  const [maintGap, setMaintGap] = useState<Num>("");
  const [years, setYears] = useState<Num>("");

  const loadExample = () => {
    setNewPrice(42000);
    setNewDown(5000);
    setNewRate(6.9);
    setNewTerm(6);
    setNewDrop(20);
    setUsedPrice(27000);
    setUsedDown(5000);
    setUsedRate(9.4);
    setUsedTerm(5);
    setUsedDrop(6);
    setLaterDrop(12);
    setMaintGap(900);
    setYears(7);
  };

  const r = useMemo(() => {
    const NP = n(newPrice);
    const UP = n(usedPrice);
    const yrs = n(years);
    if (NP <= 0 || UP <= 0 || yrs <= 0) return null;

    const side = (price: number, down: number, rate: number, termYears: number, firstDrop: number, maint: number) => {
      const loan = Math.max(0, price - down);
      const term_m = Math.round(termYears * 12);
      const pi = term_m > 0 ? payment(loan, rate, term_m) : 0;
      const held_m = Math.round(yrs * 12);
      const paidMonths = Math.min(held_m, term_m);
      const paid = pi * paidMonths;
      // If you sell before the loan ends, the balance has to be settled.
      const owed = held_m < term_m ? balanceAfter(loan, rate, term_m, held_m) : 0;
      const interest = paid - (loan - owed);
      const value = residual(price, firstDrop, n(laterDrop), yrs);
      const depreciation = price - value;
      const maintenance = maint * yrs;
      // Everything out of pocket, less what the car is still worth.
      const netCost = down + paid + owed + maintenance - value;
      return { loan, pi, term_m, paid, owed, interest, value, depreciation, maintenance, netCost };
    };

    const newer = side(NP, n(newDown), n(newRate), n(newTerm), n(newDrop), n(maintGap));
    const used = side(UP, n(usedDown), n(usedRate), n(usedTerm), n(usedDrop), 0);

    const gap = newer.netCost - used.netCost;
    const usedWins = gap > 0;

    // Value curves for the chart.
    const newCurve: number[] = [];
    const usedCurve: number[] = [];
    for (let y = 0; y <= Math.ceil(yrs); y++) {
      newCurve.push(residual(NP, n(newDrop), n(laterDrop), y));
      usedCurve.push(residual(UP, n(usedDrop), n(laterDrop), y));
    }

    return {
      newer, used, gap: Math.abs(gap), usedWins,
      newCurve, usedCurve,
      priceGap: NP - UP,
      perYear: Math.abs(gap) / yrs,
      newRetained: NP > 0 ? (newer.value / NP) * 100 : 0,
      usedRetained: UP > 0 ? (used.value / UP) * 100 : 0,
    };
  }, [newPrice, newDown, newRate, newTerm, newDrop, usedPrice, usedDown, usedRate, usedTerm, usedDrop, laterDrop, maintGap, years]);

  return (
    <CalcShell
      slug="new-vs-used-car"
      intro="A new car costs more and loses value fastest in year one. A used one is cheaper but borrows at a higher rate and needs more repairs. Depreciation is usually the biggest number of the three, and the one nobody puts on the invoice."
      onExample={loadExample}
      relatedSlugs={["total-cost-of-ownership", "depreciation", "lease-vs-buy"]}
      disclaimer="For educational purposes only. Depreciation varies enormously by make, model and mileage, and repair costs on a used car are unpredictable by nature. Treat the residual values here as estimates, and check model-specific data before committing."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The new car" badge="NEW" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Price" value={newPrice} onChange={setNewPrice} placeholder="42000" prefix="$" />
              <NumField label="Down payment" value={newDown} onChange={setNewDown} placeholder="5000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate" value={newRate} onChange={setNewRate} placeholder="6.9" suffix="%" step={0.1} />
              <NumField label="Loan term" value={newTerm} onChange={setNewTerm} placeholder="6" suffix="yrs" />
            </div>
            <NumField
              label="First-year depreciation"
              value={newDrop}
              onChange={setNewDrop}
              placeholder="20"
              suffix="%"
              hint="New cars typically shed 20% or so in the first year alone."
            />
          </div>
        </Card>

        <Card title="The used car" badge="USED" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Price" value={usedPrice} onChange={setUsedPrice} placeholder="27000" prefix="$" />
              <NumField label="Down payment" value={usedDown} onChange={setUsedDown} placeholder="5000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate" value={usedRate} onChange={setUsedRate} placeholder="9.4" suffix="%" step={0.1} />
              <NumField label="Loan term" value={usedTerm} onChange={setUsedTerm} placeholder="5" suffix="yrs" />
            </div>
            <NumField
              label="First-year depreciation"
              value={usedDrop}
              onChange={setUsedDrop}
              placeholder="6"
              suffix="%"
              hint="Lower, because the steep early drop already happened to someone else."
            />
          </div>
        </Card>
      </div>

      <Card title="Shared assumptions" badge="BOTH" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="Years you'll keep it" value={years} onChange={setYears} placeholder="7" suffix="yrs" />
          <NumField label="Depreciation after year one" value={laterDrop} onChange={setLaterDrop} placeholder="12" suffix="%/yr" />
          <NumField
            label="Extra upkeep on the used car"
            value={maintGap}
            onChange={setMaintGap}
            placeholder="900"
            prefix="$"
            hint="Per year, above what the new car costs under warranty. Entered against the new car as a saving."
          />
        </div>
      </Card>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">New, over {n(years)} yrs</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.newer.netCost)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(r.newer.pi)}/mo payment</p>
              </div>
              <div className={`p-4 text-center ${r.usedWins ? "bg-green-800" : "bg-blue-700"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.usedWins ? "Used costs less by" : "New costs less by"}</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.gap)}</p>
                <p className="text-xs text-white/70">about {fmt(r.perYear)} a year</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Used, over {n(years)} yrs</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.used.netCost)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(r.used.pi)}/mo payment</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="New — true cost to own" value={fmtK(r.newer.netCost)} tone={r.usedWins ? "gray" : "green"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Depreciation" value={fmtK(r.newer.depreciation)} tone="amber" sub="the biggest cost" />
                <Stat label="Interest" value={fmtK(r.newer.interest)} />
                <Stat label="Extra upkeep" value={r.newer.maintenance > 0 ? fmtK(r.newer.maintenance) : "None"} />
                <Stat label="Worth at the end" value={fmtK(r.newer.value)} tone="green" sub={`${r.newRetained.toFixed(0)}% retained`} />
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <Headline label="Used — true cost to own" value={fmtK(r.used.netCost)} tone={r.usedWins ? "green" : "gray"} />
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Depreciation" value={fmtK(r.used.depreciation)} tone="amber" />
                <Stat label="Interest" value={fmtK(r.used.interest)} sub="higher rate, smaller loan" />
                <Stat label="Extra upkeep" value="Included above" />
                <Stat label="Worth at the end" value={fmtK(r.used.value)} tone="green" sub={`${r.usedRetained.toFixed(0)}% retained`} />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Takeaway tone={r.usedWins ? "green" : "blue"}>
              Over <strong>{n(years)} years</strong> the{" "}
              <strong>{r.usedWins ? "used car" : "new car"}</strong> costs{" "}
              <strong>{fmtK(r.gap)}</strong> less once depreciation, interest and upkeep are all counted —
              roughly <strong>{fmt(r.perYear)}</strong> a year. The sticker gap is{" "}
              <strong>{fmtK(r.priceGap)}</strong>, but depreciation is what really separates them:{" "}
              <strong>{fmtK(r.newer.depreciation)}</strong> against{" "}
              <strong>{fmtK(r.used.depreciation)}</strong>.
              {r.newer.interest < r.used.interest && (
                <> The new car does claw some back with a cheaper rate.</>
              )}
            </Takeaway>
          </div>

          <ChartCard
            title="What each car is worth"
            footnote="The new car's line falls steeply in year one, then both settle to the same rate."
          >
            <LineChart
              ariaLabel="Resale value of a new car compared with a used car over the ownership period"
              periodsPerYear={1}
              series={[
                { label: "New", color: COLORS.blue, data: r.newCurve },
                { label: "Used", color: COLORS.green, data: r.usedCurve, dash: [6, 3] },
              ]}
            />
          </ChartCard>

          <ChartCard title="Where the money goes" footnote="Total paid out, before subtracting the resale value.">
            <BarChart
              ariaLabel="Cost breakdown of owning a new car compared with a used car"
              bars={[
                {
                  label: "New",
                  segments: [
                    { label: "Depreciation", value: r.newer.depreciation, color: COLORS.amber },
                    { label: "Interest", value: r.newer.interest, color: COLORS.red },
                    { label: "Upkeep", value: r.newer.maintenance, color: COLORS.purple },
                  ],
                },
                {
                  label: "Used",
                  segments: [
                    { label: "Depreciation", value: r.used.depreciation, color: COLORS.amber },
                    { label: "Interest", value: r.used.interest, color: COLORS.red },
                    { label: "Upkeep", value: r.used.maintenance, color: COLORS.purple },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter both prices and how long you plan to keep the car.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

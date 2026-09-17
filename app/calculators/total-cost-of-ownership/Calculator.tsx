"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, DonutChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [resale, setResale] = useState<Num>("");
  const [milesPerYear, setMilesPerYear] = useState<Num>("");
  const [mpg, setMpg] = useState<Num>("");
  const [gasPrice, setGasPrice] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [maintenance, setMaintenance] = useState<Num>("");
  const [repairs, setRepairs] = useState<Num>("");
  const [registration, setRegistration] = useState<Num>("");

  const loadExample = () => {
    setPrice(36000);
    setDown(5000);
    setRate(6.9);
    setTerm(60);
    setYears(7);
    setResale(14000);
    setMilesPerYear(13000);
    setMpg(29);
    setGasPrice(3.35);
    setInsurance(1650);
    setMaintenance(600);
    setRepairs(450);
    setRegistration(280);
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (n(price) <= 0 || yrs <= 0) return null;

    const financed = Math.max(0, n(price) - n(down));
    const loanMonths = Math.max(1, Math.round(n(term)));
    const monthly = payment(financed, n(rate), loanMonths);
    const schedule = amortize(financed, n(rate), loanMonths);
    const interestPaid = Number.isFinite(schedule.totalInterest) ? schedule.totalInterest : 0;

    const depreciation = Math.max(0, n(price) - n(resale));
    const fuelPerYear = n(mpg) > 0 ? (n(milesPerYear) / n(mpg)) * n(gasPrice) : 0;
    const fuelTotal = fuelPerYear * yrs;
    const insuranceTotal = n(insurance) * yrs;
    const maintenanceTotal = n(maintenance) * yrs;
    // Repairs climb as the car ages.
    let repairsTotal = 0;
    for (let y = 1; y <= yrs; y++) repairsTotal += n(repairs) * (1 + (y - 1) * 0.25);
    const registrationTotal = n(registration) * yrs;

    const total =
      depreciation + interestPaid + fuelTotal + insuranceTotal + maintenanceTotal + repairsTotal + registrationTotal;
    const totalMiles = n(milesPerYear) * yrs;

    // Cumulative cost year by year.
    const cumulative = [0];
    let running = 0;
    for (let y = 1; y <= yrs; y++) {
      const depThisYear = depreciation * (y === 1 ? 0.3 : 0.7 / Math.max(1, yrs - 1));
      const interestThisYear = y * 12 <= loanMonths ? interestPaid / (loanMonths / 12) : 0;
      running +=
        depThisYear +
        interestThisYear +
        fuelPerYear +
        n(insurance) +
        n(maintenance) +
        n(repairs) * (1 + (y - 1) * 0.25) +
        n(registration);
      cumulative.push(running);
    }

    return {
      monthly,
      financed,
      interestPaid,
      depreciation,
      fuelTotal,
      fuelPerYear,
      insuranceTotal,
      maintenanceTotal,
      repairsTotal,
      registrationTotal,
      total,
      perYear: total / yrs,
      perMonth: total / (yrs * 12),
      perMile: totalMiles > 0 ? total / totalMiles : 0,
      totalMiles,
      cumulative,
      depreciationShare: (depreciation / Math.max(1, total)) * 100,
      cashOutlay: n(down) + monthly * Math.min(loanMonths, yrs * 12),
    };
  }, [price, down, rate, term, years, resale, milesPerYear, mpg, gasPrice, insurance, maintenance, repairs, registration]);

  return (
    <CalcShell
      slug="total-cost-of-ownership"
      intro="The sticker price is the smallest part of the story. Depreciation, fuel, insurance, and repairs usually cost more than the payment — here's what the car really costs per year and per mile."
      onExample={loadExample}
      relatedSlugs={["depreciation", "ev-savings", "auto-affordability"]}
      disclaimer="For educational purposes only. Insurance, fuel prices, and repair costs vary widely by location, driving record, and model. Resale values are estimates — check current market data for your specific vehicle, year, and mileage."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The purchase" badge="VEHICLE">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Purchase price" value={price} onChange={setPrice} placeholder="36000" prefix="$" />
              <NumField label="Down payment" value={down} onChange={setDown} placeholder="5000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Loan rate" value={rate} onChange={setRate} placeholder="6.9" suffix="%" step={0.25} />
              <NumField label="Loan term" value={term} onChange={setTerm} placeholder="60" suffix="mo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Years you'll own it" value={years} onChange={setYears} placeholder="7" suffix="yrs" />
              <NumField label="Value when you sell" value={resale} onChange={setResale} placeholder="14000" prefix="$" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Loan payment</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.monthly)}/mo</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Running costs" badge="EVERY YEAR" badgeTone="amber">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Miles per year" value={milesPerYear} onChange={setMilesPerYear} placeholder="13000" />
              <NumField label="Fuel economy" value={mpg} onChange={setMpg} placeholder="29" suffix="mpg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Gas price" value={gasPrice} onChange={setGasPrice} placeholder="3.35" prefix="$" step={0.05} />
              <NumField label="Insurance/yr" value={insurance} onChange={setInsurance} placeholder="1650" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Maintenance/yr" value={maintenance} onChange={setMaintenance} placeholder="600" prefix="$" />
              <NumField
                label="Repairs/yr"
                value={repairs}
                onChange={setRepairs}
                placeholder="450"
                prefix="$"
                hint="Grows 25% a year as the car ages."
              />
            </div>
            <NumField label="Registration & fees/yr" value={registration} onChange={setRegistration} placeholder="280" prefix="$" />
            {r && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-amber-700 font-medium">Fuel cost</span>
                <span className="text-sm font-medium text-amber-800">{fmt(r.fuelPerYear)}/yr</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Per year</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.perYear)}</p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">True cost over {n(years)} years</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.total)}</p>
                <p className="text-xs text-green-300">{fmt(r.perMonth)}/mo all in</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Per mile</p>
                <p className="text-lg font-medium text-gray-900">${r.perMile.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Biggest single cost: depreciation" value={fmtK(r.depreciation)} tone="gray" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Share of total cost" value={pct(r.depreciationShare, 0)} tone="amber" />
              <Stat label="Loan interest" value={fmt(r.interestPaid)} tone="amber" />
              <Stat label={`Fuel over ${n(years)} yrs`} value={fmtK(r.fuelTotal)} />
              <Stat label="Insurance total" value={fmtK(r.insuranceTotal)} />
            </div>
            <Takeaway tone="amber">
              Depreciation alone costs <strong>{fmtK(r.depreciation)}</strong> —{" "}
              {pct(r.depreciationShare, 0)} of everything you spend on this car, and the one cost that
              never shows up on a monthly bill. Buying a two- to three-year-old vehicle lets the first
              owner absorb the steepest part of that curve.
            </Takeaway>
          </div>

          <ChartCard title="Where every dollar goes">
            <DonutChart
              ariaLabel="Total cost of ownership split between depreciation, interest, fuel, insurance, maintenance, repairs, and fees"
              centerLabel={`over ${n(years)} yrs`}
              centerValue={fmtK(r.total)}
              slices={[
                { label: "Depreciation", value: r.depreciation, color: COLORS.red },
                { label: "Fuel", value: r.fuelTotal, color: COLORS.amber },
                { label: "Insurance", value: r.insuranceTotal, color: COLORS.blue },
                { label: "Loan interest", value: r.interestPaid, color: COLORS.purple },
                { label: "Maintenance", value: r.maintenanceTotal, color: COLORS.teal },
                { label: "Repairs", value: r.repairsTotal, color: COLORS.green },
                { label: "Registration & fees", value: r.registrationTotal, color: COLORS.gray },
              ]}
            />
          </ChartCard>

          <ChartCard title="Cumulative cost as you own it">
            <LineChart
              ariaLabel="Total money spent on the vehicle accumulating year by year"
              periodsPerYear={1}
              series={[{ label: "Total spent", color: COLORS.green, data: r.cumulative, fill: true }]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The curve is steepest in year one — that is depreciation and the front-loaded interest. It
                flattens once the loan is paid and the worst depreciation is behind you, which is exactly
                when many people trade the car in and restart the steep part.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a purchase price and how many years you plan to keep the car.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

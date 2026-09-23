"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, DonutChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/**
 * Repairs rise by this share of the first-year figure every year the car ages:
 * year one pays the base, year two 1.25x it, year three 1.5x, and so on. It is
 * a straight line, not a compounding rate — at 25% compounding, seven years of
 * a $450 base would come to $6,783 rather than $5,513.
 */
const REPAIR_GROWTH_PER_YEAR = 0.25;

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
  const [salesTax, setSalesTax] = useState<Num>("");

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
    setSalesTax(6.5);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setPrice("");
    setDown("");
    setRate("");
    setTerm("");
    setYears("");
    setResale("");
    setMilesPerYear("");
    setMpg("");
    setGasPrice("");
    setInsurance("");
    setMaintenance("");
    setRepairs("");
    setRegistration("");
    setSalesTax("");
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (n(price) <= 0 || yrs <= 0) return null;

    /* Sales tax is financed with the loan but never enters the depreciating
     * value — you do not get any of it back at resale. Same treatment
     * new-vs-used-car uses, so the two pages agree. */
    const taxAmount = (n(price) * n(salesTax)) / 100;
    const paidDown = Math.min(Math.max(0, n(down)), n(price) + taxAmount);
    const financed = Math.max(0, n(price) + taxAmount - paidDown);
    const loanMonths = Math.max(1, Math.round(n(term)));
    const monthly = payment(financed, n(rate), loanMonths);

    /* Interest is accrued only for the months the car is actually owned. The
     * full-term figure it replaces charged five years of interest to someone
     * selling after three, because a sale settles the balance. */
    const heldMonths = Math.round(yrs * 12);
    let balance = financed;
    let interestPaid = 0;
    for (let m = 1; m <= Math.min(loanMonths, heldMonths); m++) {
      const monthInterest = (balance * n(rate)) / 100 / 12;
      interestPaid += monthInterest;
      balance = Math.max(0, balance + monthInterest - monthly);
    }

    const depreciation = Math.max(0, n(price) - n(resale));
    const fuelPerYear = (n(milesPerYear) / Math.max(1, n(mpg))) * n(gasPrice);
    const fuelTotal = fuelPerYear * yrs;
    const insuranceTotal = n(insurance) * yrs;
    // Flat: what you enter is charged every year, unchanged.
    const maintenanceTotal = n(maintenance) * yrs;
    // Repairs climb in a straight line as the car ages. See the constant above.
    let repairsTotal = 0;
    for (let y = 1; y <= yrs; y++) repairsTotal += n(repairs) * (1 + (y - 1) * REPAIR_GROWTH_PER_YEAR);
    const registrationTotal = n(registration) * yrs;

    const total =
      depreciation + taxAmount + interestPaid + fuelTotal + insuranceTotal + maintenanceTotal + repairsTotal + registrationTotal;
    const totalMiles = n(milesPerYear) * yrs;

    // Cumulative cost year by year. Tax lands once, at purchase.
    const cumulative = [0];
    let running = 0;
    const loanYears = Math.max(1, loanMonths / 12);
    for (let y = 1; y <= yrs; y++) {
      const depThisYear = depreciation * (y === 1 ? 0.3 : 0.7 / Math.max(1, yrs - 1));
      const interestThisYear = y * 12 <= loanMonths ? interestPaid / Math.min(loanYears, yrs) : 0;
      running +=
        (y === 1 ? taxAmount : 0) +
        depThisYear +
        interestThisYear +
        fuelPerYear +
        n(insurance) +
        n(maintenance) +
        n(repairs) * (1 + (y - 1) * REPAIR_GROWTH_PER_YEAR) +
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
      cashOutlay: paidDown + monthly * Math.min(loanMonths, heldMonths),
      taxAmount,
      hasTax: n(salesTax) > 0,
      paidDown,
      retained: n(price) > 0 ? (n(resale) / n(price)) * 100 : 0,
      soldBeforePayoff: heldMonths < loanMonths,
    };
  }, [price, down, rate, term, years, resale, milesPerYear, mpg, gasPrice, insurance, maintenance, repairs, registration, salesTax]);

  return (
    <CalcShell
      slug="total-cost-of-ownership"
      intro="The sticker price is the smallest part of the story. Depreciation, fuel, insurance, and repairs usually cost more than the payment — here's what the car really costs per year and per mile."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["depreciation", "ev-savings", "auto-affordability"]}
      disclaimer="For educational purposes only. Insurance, fuel prices, and repair costs vary widely by location, driving record, and model. Resale values are estimates — check current market data for your specific vehicle, year, and mileage."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The purchase" badge="VEHICLE">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Purchase price" value={price} onChange={setPrice} min={0} placeholder="36000" prefix="$" />
              <NumField label="Down payment" value={down} onChange={setDown} min={0} placeholder="5000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Loan rate" value={rate} onChange={setRate} min={0} placeholder="6.9" suffix="%" step={0.25} />
              <NumField label="Loan term" value={term} onChange={setTerm} min={1} placeholder="60" suffix="mo" />
            </div>
            <NumField
              label="Sales tax"
              value={salesTax}
              onChange={setSalesTax}
              min={0}
              placeholder="6.5"
              suffix="%"
              step={0.25}
              hint="Financed with the loan, but not part of what the car is worth later — none of it comes back when you sell."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Years you'll own it" value={years} onChange={setYears} min={1} placeholder="7" suffix="yrs" />
              <NumField
                label="Value when you sell"
                value={resale}
                onChange={setResale}
                min={0}
                placeholder="14000"
                prefix="$"
                hint={
                  r && n(price) > 0
                    ? `${r.retained.toFixed(0)}% of what you paid, which is about where a new car lands after ${n(years)} years.`
                    : undefined
                }
              />
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
              <NumField label="Miles per year" value={milesPerYear} onChange={setMilesPerYear} min={0} placeholder="13000" />
              <NumField label="Fuel economy" value={mpg} onChange={setMpg} min={1} placeholder="29" suffix="mpg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Gas price" value={gasPrice} onChange={setGasPrice} min={0} placeholder="3.35" prefix="$" step={0.05} />
              <NumField label="Insurance/yr" value={insurance} onChange={setInsurance} min={0} placeholder="1650" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Maintenance/yr"
                value={maintenance}
                onChange={setMaintenance}
                min={0}
                placeholder="600"
                prefix="$"
                hint="Charged flat — the same figure every year."
              />
              <NumField
                label="Repairs, first year"
                value={repairs}
                onChange={setRepairs}
                min={0}
                placeholder="450"
                prefix="$"
                hint={`Rises by ${(REPAIR_GROWTH_PER_YEAR * 100).toFixed(0)}% of this figure each year the car ages — year two costs 1.25 times it, year three 1.5, and so on. Not a compounding rate.`}
              />
            </div>
            <NumField label="Registration & fees/yr" value={registration} onChange={setRegistration} min={0} placeholder="280" prefix="$" />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
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
              <Stat
                label="Loan interest"
                value={fmt(r.interestPaid)}
                tone="amber"
                sub={r.soldBeforePayoff ? `over the ${n(years)} yrs you own it` : undefined}
              />
              <Stat label={`Fuel over ${n(years)} yrs`} value={fmtK(r.fuelTotal)} />
              <Stat label="Insurance total" value={fmtK(r.insuranceTotal)} />
              {r.hasTax && <Stat label="Sales tax" value={fmt(r.taxAmount)} tone="amber" sub="paid once, never recovered" />}
              <Stat
                label="Maintenance & repairs"
                value={fmtK(r.maintenanceTotal + r.repairsTotal)}
                sub={`${fmtK(r.maintenanceTotal)} flat + ${fmtK(r.repairsTotal)} rising`}
              />
            </div>
            <Takeaway tone="amber">
              Depreciation alone costs <strong>{fmtK(r.depreciation)}</strong> —{" "}
              {pct(r.depreciationShare, 0)} of everything you spend on this car, and the one cost that
              never shows up on a monthly bill. Buying a two- to three-year-old vehicle lets the first
              owner absorb the steepest part of that curve.
            </Takeaway>
            <div className="mt-2">
              <Takeaway tone="blue">
                None of this counts what the money could have done elsewhere. The{" "}
                {fmt(r.paidDown)} down and everything paid in since could have been invested instead —{" "}
                <a href="/calculators/loan-vs-cash" className="text-green-700 underline">
                  should I finance or pay cash?
                </a>{" "}
                works that trade through properly.
              </Takeaway>
            </div>
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
                {
                  label: "Taxes & fees",
                  value: r.registrationTotal + r.taxAmount,
                  color: COLORS.gray,
                },
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

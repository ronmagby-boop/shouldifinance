"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";

export default function Calculator() {
  const [miles, setMiles] = useState<Num>("");
  const [years, setYears] = useState<Num>("");

  const [evPrice, setEvPrice] = useState<Num>("");
  const [incentive, setIncentive] = useState<Num>("");
  const [kwhPer100, setKwhPer100] = useState<Num>("");
  const [electricity, setElectricity] = useState<Num>("");
  const [evMaintenance, setEvMaintenance] = useState<Num>("");
  const [evInsurance, setEvInsurance] = useState<Num>("");
  const [charger, setCharger] = useState<Num>("");

  const [gasPrice, setGasPrice] = useState<Num>("");
  const [mpg, setMpg] = useState<Num>("");
  const [fuelPrice, setFuelPrice] = useState<Num>("");
  const [gasMaintenance, setGasMaintenance] = useState<Num>("");
  const [gasInsurance, setGasInsurance] = useState<Num>("");

  const loadExample = () => {
    setMiles(13000);
    setYears(8);
    setEvPrice(44000);
    setIncentive(7500);
    setKwhPer100(29);
    setElectricity(0.16);
    setEvMaintenance(350);
    setEvInsurance(1850);
    setCharger(1200);
    setGasPrice(36000);
    setMpg(30);
    setFuelPrice(3.35);
    setGasMaintenance(800);
    setGasInsurance(1600);
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || n(miles) <= 0) return null;

    const evUpfront = n(evPrice) - n(incentive) + n(charger);
    const gasUpfront = n(gasPrice);

    const evEnergyPerYear = (n(miles) / 100) * n(kwhPer100) * n(electricity);
    const gasFuelPerYear = n(mpg) > 0 ? (n(miles) / n(mpg)) * n(fuelPrice) : 0;

    const evPerYear = evEnergyPerYear + n(evMaintenance) + n(evInsurance);
    const gasPerYear = gasFuelPerYear + n(gasMaintenance) + n(gasInsurance);
    const annualSavings = gasPerYear - evPerYear;

    const upfrontGap = evUpfront - gasUpfront;
    const breakEvenYears = annualSavings > 0 && upfrontGap > 0 ? upfrontGap / annualSavings : upfrontGap <= 0 ? 0 : null;

    const evCum: number[] = [evUpfront];
    const gasCum: number[] = [gasUpfront];
    for (let y = 1; y <= yrs; y++) {
      evCum.push(evCum[y - 1] + evPerYear);
      gasCum.push(gasCum[y - 1] + gasPerYear);
    }

    const evTotal = evCum[evCum.length - 1];
    const gasTotal = gasCum[gasCum.length - 1];

    const evPerMile = evEnergyPerYear / Math.max(1, n(miles));
    const gasPerMile = gasFuelPerYear / Math.max(1, n(miles));
    // The gas price at which fuel costs would match.
    const breakEvenGasPrice = n(mpg) > 0 ? evPerMile * n(mpg) : 0;
    const mpgEquivalent = evPerMile > 0 ? n(fuelPrice) / evPerMile : 0;

    return {
      evUpfront,
      gasUpfront,
      upfrontGap,
      evEnergyPerYear,
      gasFuelPerYear,
      evPerYear,
      gasPerYear,
      annualSavings,
      breakEvenYears,
      evCum,
      gasCum,
      evTotal,
      gasTotal,
      lifetimeSavings: gasTotal - evTotal,
      evPerMile,
      gasPerMile,
      fuelSavingsPerYear: gasFuelPerYear - evEnergyPerYear,
      breakEvenGasPrice,
      mpgEquivalent,
    };
  }, [miles, years, evPrice, incentive, kwhPer100, electricity, evMaintenance, evInsurance, charger, gasPrice, mpg, fuelPrice, gasMaintenance, gasInsurance]);

  return (
    <CalcShell
      slug="ev-savings"
      category="Auto"
      eyebrow="Auto tools"
      title="EV vs. gas savings calculator"
      crumb="EV savings"
      intro="Electric cars usually cost more up front and less to run. Whether that trade works out depends on your electricity rate, your gas price, and how many miles you drive — so put your own numbers in."
      onExample={loadExample}
      relatedSlugs={["total-cost-of-ownership", "depreciation", "auto-affordability"]}
      disclaimer="For educational purposes only. Federal and state EV incentives have income caps, vehicle price limits, and sourcing requirements that change — verify eligibility before counting on one. Electricity rates vary by time of day and utility, and public fast charging typically costs two to three times home charging."
    >
      <Card title="Your driving" badge="SHARED" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField label="Miles driven per year" value={miles} onChange={setMiles} placeholder="13000" />
          <NumField label="Years you'll keep it" value={years} onChange={setYears} placeholder="8" suffix="yrs" />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The electric car" badge="EV" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Purchase price" value={evPrice} onChange={setEvPrice} placeholder="44000" prefix="$" />
              <NumField label="Tax credits" value={incentive} onChange={setIncentive} placeholder="7500" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Efficiency"
                value={kwhPer100}
                onChange={setKwhPer100}
                placeholder="29"
                suffix="kWh"
                hint="Per 100 miles."
              />
              <NumField label="Electricity" value={electricity} onChange={setElectricity} placeholder="0.16" prefix="$" step={0.01} hint="Per kWh." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Maintenance/yr" value={evMaintenance} onChange={setEvMaintenance} placeholder="350" prefix="$" />
              <NumField label="Insurance/yr" value={evInsurance} onChange={setEvInsurance} placeholder="1850" prefix="$" />
            </div>
            <NumField label="Home charger install" value={charger} onChange={setCharger} placeholder="1200" prefix="$" />
            {r && (
              <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-green-700 font-medium">Energy cost</span>
                <span className="text-sm font-medium text-green-800">
                  {fmt(r.evEnergyPerYear)}/yr · ${r.evPerMile.toFixed(3)}/mi
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The gas car" badge="GAS" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Purchase price" value={gasPrice} onChange={setGasPrice} placeholder="36000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Fuel economy" value={mpg} onChange={setMpg} placeholder="30" suffix="mpg" />
              <NumField label="Gas price" value={fuelPrice} onChange={setFuelPrice} placeholder="3.35" prefix="$" step={0.05} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Maintenance/yr" value={gasMaintenance} onChange={setGasMaintenance} placeholder="800" prefix="$" />
              <NumField label="Insurance/yr" value={gasInsurance} onChange={setGasInsurance} placeholder="1600" prefix="$" />
            </div>
            {r && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-amber-700 font-medium">Fuel cost</span>
                <span className="text-sm font-medium text-amber-800">
                  {fmt(r.gasFuelPerYear)}/yr · ${r.gasPerMile.toFixed(3)}/mi
                </span>
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
                <p className="text-xs text-gray-400 mb-1">EV total</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.evTotal)}</p>
              </div>
              <div className={`p-4 text-center ${r.lifetimeSavings >= 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.lifetimeSavings >= 0 ? "EV saves" : "Gas saves"}
                </p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.lifetimeSavings))}</p>
                <p className="text-xs text-green-300">over {n(years)} years</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Gas total</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.gasTotal)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Break-even point"
              value={
                r.breakEvenYears === null
                  ? "Never at these numbers"
                  : r.breakEvenYears === 0
                  ? "Immediately"
                  : `${r.breakEvenYears.toFixed(1)} years`
              }
              tone={r.breakEvenYears !== null && r.breakEvenYears <= n(years) ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Extra cost up front" value={fmt(Math.abs(r.upfrontGap))} tone={r.upfrontGap > 0 ? "amber" : "green"} sub={r.upfrontGap > 0 ? "EV costs more" : "EV costs less"} />
              <Stat label="Annual savings" value={fmt(r.annualSavings)} tone={r.annualSavings > 0 ? "green" : "red"} />
              <Stat label="Fuel savings alone" value={`${fmt(r.fuelSavingsPerYear)}/yr`} tone="green" />
              <Stat label="Equivalent MPG" value={`${Math.round(r.mpgEquivalent)} mpg`} sub="at your gas price" />
            </div>
            <Takeaway tone={r.breakEvenYears !== null && r.breakEvenYears <= n(years) ? "green" : "amber"}>
              {r.breakEvenYears === null ? (
                <>
                  <strong>⚠ The EV never catches up here.</strong> It costs{" "}
                  {fmt(Math.abs(r.upfrontGap))} more and doesn&apos;t save enough each year to make that
                  back. More miles, a cheaper electricity rate, or a larger incentive would change this.
                </>
              ) : r.breakEvenYears <= n(years) ? (
                <>
                  <strong>✓ The EV pays for itself in {r.breakEvenYears.toFixed(1)} years</strong>, well
                  inside the {n(years)} you plan to keep it, then saves{" "}
                  {fmt(r.annualSavings)} a year after that. Driving on electricity costs{" "}
                  <strong>${r.evPerMile.toFixed(3)}/mile</strong> versus ${r.gasPerMile.toFixed(3)} on
                  gas — like paying <strong>{fmt(r.breakEvenGasPrice)}</strong> a gallon.
                </>
              ) : (
                <>
                  <strong>⚠ Break-even comes at {r.breakEvenYears.toFixed(1)} years</strong>, after the{" "}
                  {n(years)} you plan to keep it. You&apos;d be {fmt(Math.abs(r.lifetimeSavings))} behind
                  when you sell — though a stronger resale value could close that gap.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Cumulative cost over time">
            <LineChart
              ariaLabel="Cumulative cost of owning the electric car compared with the gas car"
              periodsPerYear={1}
              series={[
                { label: "Electric", color: COLORS.green, data: r.evCum },
                { label: "Gas", color: COLORS.amber, data: r.gasCum, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The EV line starts higher — that is the price gap and the charger. It rises more slowly
                because fuel and maintenance cost less. Where the lines cross is your break-even.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="Running costs per year">
            <BarChart
              ariaLabel="Annual running costs for the electric car compared with the gas car"
              height={215}
              bars={[
                {
                  label: "Electric per year",
                  segments: [
                    { label: "Energy", value: r.evEnergyPerYear, color: COLORS.green },
                    { label: "Maintenance", value: n(evMaintenance), color: COLORS.teal },
                    { label: "Insurance", value: n(evInsurance), color: COLORS.gray },
                  ],
                },
                {
                  label: "Gas per year",
                  segments: [
                    { label: "Energy", value: r.gasFuelPerYear, color: COLORS.amber },
                    { label: "Maintenance", value: n(gasMaintenance), color: COLORS.purple },
                    { label: "Insurance", value: n(gasInsurance), color: COLORS.gray },
                  ],
                },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your annual mileage and how long you&apos;ll keep the car.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

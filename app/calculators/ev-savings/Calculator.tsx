"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { CLEAN_VEHICLE_CREDITS } from "../../lib/tax";
import { DEPRECIATION_5YR } from "../../lib/markets";

/* Five-year depreciation lives in lib/markets so the guide quotes the same
   figures. The example defaults extend those to eight years at the same annual
   rate, which is conservative in the EV's favour twice over — depreciation
   slows in later years, and the "all vehicles" average includes EVs and
   hybrids rather than being gas-only. */

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
  const [evResale, setEvResale] = useState<Num>("");

  const [gasPrice, setGasPrice] = useState<Num>("");
  const [mpg, setMpg] = useState<Num>("");
  const [fuelPrice, setFuelPrice] = useState<Num>("");
  const [gasMaintenance, setGasMaintenance] = useState<Num>("");
  const [gasInsurance, setGasInsurance] = useState<Num>("");
  const [gasResale, setGasResale] = useState<Num>("");

  const loadExample = () => {
    setMiles(13000);
    setYears(8);
    setEvPrice(44000);
    // The federal credit ended for vehicles acquired after 30 September 2025,
    // so the example starts at nothing and leaves state programmes to the user.
    setIncentive(0);
    setKwhPer100(29);
    setElectricity(0.16);
    setEvMaintenance(350);
    setEvInsurance(1850);
    setCharger(1200);
    setEvResale(11300);
    setGasPrice(36000);
    setMpg(30);
    setFuelPrice(3.35);
    setGasMaintenance(800);
    setGasInsurance(1600);
    setGasResale(15000);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setMiles("");
    setYears("");
    setEvPrice("");
    setIncentive("");
    setKwhPer100("");
    setElectricity("");
    setEvMaintenance("");
    setEvInsurance("");
    setCharger("");
    setEvResale("");
    setGasPrice("");
    setMpg("");
    setFuelPrice("");
    setGasMaintenance("");
    setGasInsurance("");
    setGasResale("");
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || n(miles) <= 0) return null;

    // An incentive cannot exceed the price of the car it discounts.
    const evUpfront = Math.max(0, n(evPrice) - n(incentive)) + n(charger);
    const gasUpfront = n(gasPrice);

    const evEnergyPerYear = (n(miles) / 100) * n(kwhPer100) * n(electricity);
    const gasFuelPerYear = n(mpg) > 0 ? (n(miles) / n(mpg)) * n(fuelPrice) : 0;

    const evPerYear = evEnergyPerYear + n(evMaintenance) + n(evInsurance);
    const gasPerYear = gasFuelPerYear + n(gasMaintenance) + n(gasInsurance);
    const annualSavings = gasPerYear - evPerYear;

    const upfrontGap = evUpfront - gasUpfront;
    const breakEvenYears =
      annualSavings > 0 && upfrontGap > 0 ? upfrontGap / annualSavings : upfrontGap <= 0 ? 0 : null;

    /* The chart tracks cash spent, which is what "break-even" on this page has
     * always meant: how long the cheaper running costs take to repay the
     * higher purchase price. Resale lands once, at the end, so it belongs in
     * the totals rather than in the slope — netting it into the lines made a
     * credit larger than the charger read as an immediate break-even, which
     * is true of the net position and useless as an answer. */
    const evCum: number[] = [evUpfront];
    const gasCum: number[] = [gasUpfront];
    for (let y = 1; y <= yrs; y++) {
      evCum.push(evCum[y - 1] + evPerYear);
      gasCum.push(gasCum[y - 1] + gasPerYear);
    }

    // Both cars are worth something at the end, and the page credited neither.
    const evTotal = evCum[evCum.length - 1] - n(evResale);
    const gasTotal = gasCum[gasCum.length - 1] - n(gasResale);
    const resaleGap = n(gasResale) - n(evResale);

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
      resaleGap,
      evResaleValue: n(evResale),
      gasResaleValue: n(gasResale),
      hasResale: n(evResale) > 0 || n(gasResale) > 0,
      yrs,
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
  }, [miles, years, evPrice, incentive, kwhPer100, electricity, evMaintenance, evInsurance, charger, evResale, gasPrice, mpg, fuelPrice, gasMaintenance, gasInsurance, gasResale]);

  return (
    <CalcShell
      slug="ev-savings"
      intro="Electric cars usually cost more up front and less to run. Whether that trade works out depends on your electricity rate, your gas price, and how many miles you drive — so put your own numbers in."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["total-cost-of-ownership", "depreciation", "auto-affordability"]}
      disclaimer="For educational purposes only. Federal and state EV incentives have income caps, vehicle price limits, and sourcing requirements that change — verify eligibility before counting on one. Electricity rates vary by time of day and utility, and public fast charging typically costs two to three times home charging."
    >
      <Card title="Your driving" badge="SHARED" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField label="Miles driven per year" value={miles} onChange={setMiles} min={0} placeholder="13000" />
          <NumField label="Years you'll keep it" value={years} onChange={setYears} min={1} placeholder="8" suffix="yrs" />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The electric car" badge="EV" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Purchase price" value={evPrice} onChange={setEvPrice} min={0} placeholder="44000" prefix="$" />
              <NumField label="Incentives" value={incentive} onChange={setIncentive} min={0} placeholder="0" prefix="$" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              State, local and utility programmes only. The federal clean vehicle credit — up to{" "}
              {fmt(CLEAN_VEHICLE_CREDITS.formerNewVehicleMax)} under section 30D — ended for vehicles
              acquired after {CLEAN_VEHICLE_CREDITS.newVehicleCutoff}, and the used-vehicle credit ended
              with it. The charging-equipment credit ran until{" "}
              {CLEAN_VEHICLE_CREDITS.chargerCutoff}. Manufacturer and dealer discounts belong in the
              price above, not here.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Efficiency"
                value={kwhPer100}
                onChange={setKwhPer100}
                min={0}
                placeholder="29"
                suffix="kWh"
                hint="Per 100 miles."
              />
              <NumField label="Electricity" value={electricity} onChange={setElectricity} min={0} placeholder="0.16" prefix="$" step={0.01} hint="Per kWh." />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              That rate assumes charging at home overnight. Public DC fast charging commonly runs three
              to four times a residential rate, and at around $0.48 a kWh this car would cost more per
              mile to run than the gas one. If you cannot charge where you park, put the rate you would
              actually pay in the field above rather than the residential one.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Maintenance/yr" value={evMaintenance} onChange={setEvMaintenance} min={0} placeholder="350" prefix="$" />
              <NumField label="Insurance/yr" value={evInsurance} onChange={setEvInsurance} min={0} placeholder="1850" prefix="$" />
            </div>
            <NumField
              label="Home charger install"
              value={charger}
              onChange={setCharger}
              min={0}
              placeholder="1200"
              hint="A one-off that stays with the property — it is not repeated if your next car is also electric, and some of it comes back in the home's value."
              prefix="$"
            />
            <NumField
              label={`Resale value after ${n(years) || "N"} years`}
              value={evResale}
              onChange={setEvResale}
              min={0}
              placeholder="11300"
              prefix="$"
              hint={`EVs have depreciated faster than the market: ${(DEPRECIATION_5YR.ev * 100).toFixed(1)}% over five years against ${(DEPRECIATION_5YR.allVehicles * 100).toFixed(1)}% for all vehicles (iSeeCars, March 2026). The default extends that rate to your horizon.`}
            />
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
            <NumField label="Purchase price" value={gasPrice} onChange={setGasPrice} min={0} placeholder="36000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Fuel economy" value={mpg} onChange={setMpg} min={1} placeholder="30" suffix="mpg" />
              <NumField label="Gas price" value={fuelPrice} onChange={setFuelPrice} min={0} placeholder="3.35" prefix="$" step={0.05} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Maintenance/yr" value={gasMaintenance} onChange={setGasMaintenance} min={0} placeholder="800" prefix="$" />
              <NumField label="Insurance/yr" value={gasInsurance} onChange={setGasInsurance} min={0} placeholder="1600" prefix="$" />
            </div>
            <NumField
              label={`Resale value after ${n(years) || "N"} years`}
              value={gasResale}
              onChange={setGasResale}
              min={0}
              placeholder="15000"
              prefix="$"
              hint="Both cars are worth something at the end, and the difference is part of the answer."
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
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
              {r.hasResale && (
                <Stat
                  label="Resale gap after"
                  value={fmt(Math.abs(r.resaleGap))}
                  tone={r.resaleGap > 0 ? "amber" : "green"}
                  sub={
                    r.resaleGap > 0
                      ? `the gas car is worth ${fmt(Math.abs(r.resaleGap))} more at the end`
                      : `the EV is worth ${fmt(Math.abs(r.resaleGap))} more at the end`
                  }
                />
              )}
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
                  when you sell.
                </>
              )}
            </Takeaway>
            {r.hasResale && r.resaleGap > 0 && (
              <Takeaway tone="amber">
                Both totals are net of what the car is still worth. The gas car keeps{" "}
                <strong>{fmt(r.resaleGap)}</strong> more of its value over {r.yrs} years, and that is a
                real part of the cost — it lands once, at the end, rather than month by month, which is
                why a running-cost comparison alone flatters the EV.
              </Takeaway>
            )}
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
                These lines are cash spent, before either car is sold — the EV starts higher because of
                the price gap and the charger, then rises more slowly because fuel and maintenance cost
                less, and where they cross is your break-even. The totals above go one step further and
                subtract what each car is still worth, which is why they are lower than the ends of
                these lines.
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

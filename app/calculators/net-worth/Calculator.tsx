"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, DonutChart, COLORS } from "../../components/Charts";

export default function Calculator() {
  // Assets
  const [cash, setCash] = useState<Num>("");
  const [investments, setInvestments] = useState<Num>("");
  const [retirement, setRetirement] = useState<Num>("");
  const [home, setHome] = useState<Num>("");
  const [vehicles, setVehicles] = useState<Num>("");
  const [otherAssets, setOtherAssets] = useState<Num>("");

  // Liabilities
  const [mortgage, setMortgage] = useState<Num>("");
  const [autoLoans, setAutoLoans] = useState<Num>("");
  const [studentLoans, setStudentLoans] = useState<Num>("");
  const [creditCards, setCreditCards] = useState<Num>("");
  const [otherDebts, setOtherDebts] = useState<Num>("");

  // Projection
  const [monthlySaving, setMonthlySaving] = useState<Num>("");
  const [investReturn, setInvestReturn] = useState<Num>("");
  const [homeGrowth, setHomeGrowth] = useState<Num>("");
  const [debtPaydown, setDebtPaydown] = useState<Num>("");
  const [age, setAge] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");

  const loadExample = () => {
    setCash(18000);
    setInvestments(46000);
    setRetirement(152000);
    setHome(465000);
    setVehicles(28000);
    setOtherAssets(9000);
    setMortgage(298000);
    setAutoLoans(17500);
    setStudentLoans(21000);
    setCreditCards(4200);
    setOtherDebts(0);
    setMonthlySaving(1500);
    setInvestReturn(7);
    setHomeGrowth(3);
    setDebtPaydown(2100);
    setAge(38);
    setIncome(135000);
  };

  const r = useMemo(() => {
    const liquidAssets = n(cash) + n(investments) + n(retirement);
    const totalAssets = liquidAssets + n(home) + n(vehicles) + n(otherAssets);
    const totalDebts = n(mortgage) + n(autoLoans) + n(studentLoans) + n(creditCards) + n(otherDebts);
    if (totalAssets === 0 && totalDebts === 0) return null;

    const netWorth = totalAssets - totalDebts;
    const homeEquity = n(home) - n(mortgage);

    // 10-year projection.
    const years = 10;
    const projection: number[] = [netWorth];
    let invest = n(investments) + n(retirement);
    const cashBal = n(cash);
    let homeValue = n(home);
    let vehicleValue = n(vehicles);
    let debt = totalDebts;

    for (let m = 1; m <= years * 12; m++) {
      invest = invest * (1 + n(investReturn) / 100 / 12) + n(monthlySaving);
      homeValue *= Math.pow(1 + n(homeGrowth) / 100, 1 / 12);
      // Vehicles lose value at roughly 12% a year.
      vehicleValue *= Math.pow(0.88, 1 / 12);
      debt = Math.max(0, debt - n(debtPaydown));
      projection.push(invest + cashBal + homeValue + vehicleValue + n(otherAssets) - debt);
    }

    const projected = projection[projection.length - 1];
    const debtFreeMonth = n(debtPaydown) > 0 ? Math.ceil(totalDebts / n(debtPaydown)) : null;

    // Benchmark: a common rule of thumb is age × income / 10.
    const benchmark = n(age) > 0 && n(income) > 0 ? (n(age) * n(income)) / 10 : 0;

    return {
      totalAssets,
      totalDebts,
      netWorth,
      liquidAssets,
      homeEquity,
      projection,
      projected,
      growth: projected - netWorth,
      debtToAsset: totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0,
      liquidRatio: totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : 0,
      benchmark,
      vsBenchmark: netWorth - benchmark,
      debtFreeMonth,
      debtFreeYears: debtFreeMonth ? debtFreeMonth / 12 : null,
    };
  }, [cash, investments, retirement, home, vehicles, otherAssets, mortgage, autoLoans, studentLoans, creditCards, otherDebts, monthlySaving, investReturn, homeGrowth, debtPaydown, age, income]);

  return (
    <CalcShell
      slug="net-worth"
      category="Investing"
      eyebrow="Money & savings tools"
      title="Net worth calculator"
      crumb="Net worth"
      intro="Net worth is the one number that captures everything: what you own minus what you owe. Track it once a quarter and the trend tells you more about your finances than any single month of budgeting."
      onExample={loadExample}
      relatedSlugs={["retirement-savings", "debt-payoff", "emergency-fund"]}
      disclaimer="For educational purposes only. Asset values are estimates — homes and vehicles are worth what someone will pay, not what a calculator says. Projections assume steady returns and consistent saving. Retirement account balances are shown before the taxes you will owe on withdrawal."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="What you own" badge="ASSETS" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cash & savings" value={cash} onChange={setCash} placeholder="18000" prefix="$" />
              <NumField label="Investments" value={investments} onChange={setInvestments} placeholder="46000" prefix="$" />
            </div>
            <NumField label="Retirement accounts" value={retirement} onChange={setRetirement} placeholder="152000" prefix="$" />
            <NumField label="Home value" value={home} onChange={setHome} placeholder="465000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Vehicles" value={vehicles} onChange={setVehicles} placeholder="28000" prefix="$" />
              <NumField label="Other assets" value={otherAssets} onChange={setOtherAssets} placeholder="9000" prefix="$" />
            </div>
            {r && (
              <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-green-700 font-medium">Total assets</span>
                <span className="text-sm font-medium text-green-800">{fmtK(r.totalAssets)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="What you owe" badge="LIABILITIES" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Mortgage balance" value={mortgage} onChange={setMortgage} placeholder="298000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Auto loans" value={autoLoans} onChange={setAutoLoans} placeholder="17500" prefix="$" />
              <NumField label="Student loans" value={studentLoans} onChange={setStudentLoans} placeholder="21000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Credit cards" value={creditCards} onChange={setCreditCards} placeholder="4200" prefix="$" />
              <NumField label="Other debts" value={otherDebts} onChange={setOtherDebts} placeholder="0" prefix="$" />
            </div>
            {r && (
              <>
                <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-amber-700 font-medium">Total liabilities</span>
                  <span className="text-sm font-medium text-amber-800">{fmtK(r.totalDebts)}</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Home equity</span>
                  <span className="text-sm font-medium text-gray-900">{fmtK(r.homeEquity)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card title="Where it's heading" badge="PROJECTION" badgeTone="blue" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NumField label="Saving & investing per month" value={monthlySaving} onChange={setMonthlySaving} placeholder="1500" prefix="$" />
          <NumField label="Debt paydown per month" value={debtPaydown} onChange={setDebtPaydown} placeholder="2100" prefix="$" />
          <NumField label="Investment return" value={investReturn} onChange={setInvestReturn} placeholder="7" suffix="%" step={0.25} />
          <NumField label="Home appreciation" value={homeGrowth} onChange={setHomeGrowth} placeholder="3" suffix="%" step={0.25} />
          <NumField label="Your age" value={age} onChange={setAge} placeholder="38" suffix="yrs" />
          <NumField label="Annual income" value={income} onChange={setIncome} placeholder="135000" prefix="$" />
        </div>
      </Card>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Assets</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.totalAssets)}</p>
              </div>
              <div className={`p-4 text-center ${r.netWorth >= 0 ? "bg-green-800" : "bg-[#1a2744]"}`}>
                <p className="text-xs text-green-300 mb-0.5">Net worth</p>
                <p className="text-2xl font-medium text-white">{fmtK(r.netWorth)}</p>
                <p className="text-xs text-green-300">today</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Liabilities</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.totalDebts)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Projected net worth in 10 years" value={fmtK(r.projected)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Growth over 10 years" value={fmtK(r.growth)} tone="green" />
              <Stat label="Liquid assets" value={fmtK(r.liquidAssets)} sub={pct(r.liquidRatio, 0) + " of assets"} />
              <Stat label="Debt-to-asset ratio" value={pct(r.debtToAsset, 0)} tone={r.debtToAsset > 60 ? "amber" : "green"} />
              <Stat
                label="Debt-free in"
                value={r.debtFreeYears ? `${r.debtFreeYears.toFixed(1)} yrs` : "—"}
                sub={r.debtFreeYears ? "at current paydown" : "add a paydown amount"}
              />
            </div>
            <Takeaway tone={r.netWorth >= 0 ? "green" : "amber"}>
              {r.benchmark > 0 && (
                <>
                  A common benchmark — age × income ÷ 10 — puts a {n(age)}-year-old earning{" "}
                  {fmtK(n(income))} at about <strong>{fmtK(r.benchmark)}</strong>. You&apos;re{" "}
                  <strong>
                    {r.vsBenchmark >= 0 ? `${fmtK(r.vsBenchmark)} above` : `${fmtK(Math.abs(r.vsBenchmark))} below`}
                  </strong>{" "}
                  that mark.{" "}
                </>
              )}
              {r.liquidRatio < 30 ? (
                <>
                  Only {pct(r.liquidRatio, 0)} of your assets are liquid — most of your wealth is in the
                  house and cars, which you can&apos;t spend without selling or borrowing against them.
                </>
              ) : (
                <>
                  {pct(r.liquidRatio, 0)} of your assets are liquid, which gives you real flexibility.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Net worth over the next 10 years">
            <LineChart
              ariaLabel="Projected net worth over the next ten years"
              periodsPerYear={12}
              baselineZero
              series={[{ label: "Net worth", color: COLORS.green, data: r.projection, fill: true }]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Two forces drive this line: assets compounding upward and debts falling toward zero. The
                curve bends up as investment growth starts to outpace what you contribute — usually
                somewhere between years five and ten.
              </Takeaway>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">What you own</h2>
              <DonutChart
                ariaLabel="Assets split by category"
                size={150}
                centerLabel="assets"
                centerValue={fmtK(r.totalAssets)}
                slices={[
                  { label: "Home", value: n(home), color: COLORS.green },
                  { label: "Retirement", value: n(retirement), color: COLORS.blue },
                  { label: "Investments", value: n(investments), color: COLORS.teal },
                  { label: "Cash", value: n(cash), color: COLORS.purple },
                  { label: "Vehicles", value: n(vehicles), color: COLORS.amber },
                  { label: "Other", value: n(otherAssets), color: COLORS.gray },
                ]}
              />
            </div>

            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">What you owe</h2>
              <DonutChart
                ariaLabel="Liabilities split by category"
                size={150}
                centerLabel="debts"
                centerValue={fmtK(r.totalDebts)}
                slices={[
                  { label: "Mortgage", value: n(mortgage), color: COLORS.red },
                  { label: "Student loans", value: n(studentLoans), color: COLORS.purple },
                  { label: "Auto loans", value: n(autoLoans), color: COLORS.amber },
                  { label: "Credit cards", value: n(creditCards), color: COLORS.blue },
                  { label: "Other", value: n(otherDebts), color: COLORS.gray },
                ]}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter what you own and what you owe to calculate your net worth.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

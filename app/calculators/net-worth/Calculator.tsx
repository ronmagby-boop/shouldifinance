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
  const [inflation, setInflation] = useState<Num>("");

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
    setInflation(2.5);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setCash("");
    setInvestments("");
    setRetirement("");
    setHome("");
    setVehicles("");
    setOtherAssets("");
    setMortgage("");
    setAutoLoans("");
    setStudentLoans("");
    setCreditCards("");
    setOtherDebts("");
    setMonthlySaving("");
    setInvestReturn("");
    setHomeGrowth("");
    setDebtPaydown("");
    setAge("");
    setIncome("");
    setInflation("");
  };

  const r = useMemo(() => {
    /* Liquid means spendable without a penalty, so retirement balances are
     * counted as assets but not as liquid ones: before 59 and a half they
     * cost income tax plus a 10% penalty to reach. Including them read as
     * 30% liquid here when the spendable share is 9%. */
    const liquidAssets = n(cash) + n(investments);
    const totalAssets = liquidAssets + n(retirement) + n(home) + n(vehicles) + n(otherAssets);
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
      /* Saving can be negative — drawing down a portfolio is a real thing to
       * model — but the balance floors at zero. Without it a drawdown runs
       * the balance negative and then compounds it, which is not a state any
       * account can be in. */
      invest = Math.max(0, invest * (1 + n(investReturn) / 100 / 12) + n(monthlySaving));
      homeValue *= Math.pow(1 + n(homeGrowth) / 100, 1 / 12);
      // Vehicles lose value at roughly 12% a year.
      vehicleValue *= Math.pow(0.88, 1 / 12);
      debt = Math.max(0, debt - n(debtPaydown));
      projection.push(invest + cashBal + homeValue + vehicleValue + n(otherAssets) - debt);
    }

    const projected = projection[projection.length - 1];
    const projectedReal = projected / Math.pow(1 + n(inflation) / 100, years);
    const debtFreeMonth = n(debtPaydown) > 0 ? Math.ceil(totalDebts / n(debtPaydown)) : null;

    // Benchmark: a common rule of thumb is age × income / 10.
    const benchmark = n(age) > 0 && n(income) > 0 ? (n(age) * n(income)) / 10 : 0;

    return {
      totalAssets,
      totalDebts,
      netWorth,
      liquidAssets,
      retirementBal: n(retirement),
      homeEquity,
      years,
      ageAtEnd: n(age) > 0 ? n(age) + years : null,
      projectedReal,
      inflating: n(inflation) > 0,
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
  }, [cash, investments, retirement, home, vehicles, otherAssets, mortgage, autoLoans, studentLoans, creditCards, otherDebts, monthlySaving, investReturn, homeGrowth, debtPaydown, age, income, inflation]);

  return (
    <CalcShell
      slug="net-worth"
      intro="Net worth is the one number that captures everything: what you own minus what you owe. Track it once a quarter and the trend tells you more about your finances than any single month of budgeting."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["retirement-savings", "debt-payoff", "emergency-fund"]}
      disclaimer="For educational purposes only. Asset values are estimates — homes and vehicles are worth what someone will pay, not what a calculator says. Projections assume steady returns and consistent saving. Retirement account balances are shown before the taxes you will owe on withdrawal."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="What you own" badge="ASSETS" badgeTone="green">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Cash & savings" value={cash} onChange={setCash} min={0} placeholder="18000" prefix="$" />
              <NumField label="Investments" value={investments} onChange={setInvestments} min={0} placeholder="46000" prefix="$" />
            </div>
            <NumField label="Retirement accounts" value={retirement} onChange={setRetirement} min={0} placeholder="152000" prefix="$" />
            <NumField label="Home value" value={home} onChange={setHome} min={0} placeholder="465000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Vehicles" value={vehicles} onChange={setVehicles} min={0} placeholder="28000" prefix="$" />
              <NumField label="Other assets" value={otherAssets} onChange={setOtherAssets} min={0} placeholder="9000" prefix="$" />
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
            <NumField label="Mortgage balance" value={mortgage} onChange={setMortgage} min={0} placeholder="298000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Auto loans" value={autoLoans} onChange={setAutoLoans} min={0} placeholder="17500" prefix="$" />
              <NumField label="Student loans" value={studentLoans} onChange={setStudentLoans} min={0} placeholder="21000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Credit cards" value={creditCards} onChange={setCreditCards} min={0} placeholder="4200" prefix="$" />
              <NumField label="Other debts" value={otherDebts} onChange={setOtherDebts} min={0} placeholder="0" prefix="$" />
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
          {/* Saving and paydown are deliberately unbounded: drawing a
              portfolio down, or watching a balance grow, are both real. The
              two rates are unbounded for the same reason. */}
          <NumField label="Saving & investing per month" value={monthlySaving} onChange={setMonthlySaving} placeholder="1500" prefix="$" />
          <NumField label="Debt paydown per month" value={debtPaydown} onChange={setDebtPaydown} placeholder="2100" prefix="$" />
          <NumField label="Investment return" value={investReturn} onChange={setInvestReturn} placeholder="7" suffix="%" step={0.25} />
          <NumField label="Home appreciation" value={homeGrowth} onChange={setHomeGrowth} placeholder="3" suffix="%" step={0.25} />
          <NumField label="Your age" value={age} onChange={setAge} min={0} placeholder="38" suffix="yrs" />
          <NumField label="Annual income" value={income} onChange={setIncome} min={0} placeholder="135000" prefix="$" />
          <NumField
            label="Inflation"
            value={inflation}
            onChange={setInflation}
            min={0}
            placeholder="2.5"
            suffix="%"
            step={0.1}
          />
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-3">
          Inflation is used only to show what the projected figure buys in today&apos;s money. Set it to
          0 to see the nominal figure alone. Saving and paydown may be negative if you are drawing down
          rather than adding.
        </p>
      </Card>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
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
            <Headline
              label={`Projected net worth in ${r.years} years${r.ageAtEnd ? ` — at age ${r.ageAtEnd}` : ""}`}
              value={fmtK(r.projected)}
            />
            {r.inflating && (
              <p className="text-xs text-gray-500 leading-relaxed -mt-3 mb-4">
                About <strong className="text-gray-900">{fmtK(r.projectedReal)}</strong> in today&apos;s
                money, after {pct(n(inflation), 1)} inflation for {r.years} years. The balance is real;
                what it buys is the smaller number.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label={`Growth over ${r.years} years`} value={fmtK(r.growth)} tone="green" />
              <Stat
                label="Liquid assets"
                value={fmtK(r.liquidAssets)}
                sub={`${pct(r.liquidRatio, 0)} of assets — cash and investments only`}
              />
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
              {r.liquidRatio < 15 ? (
                <>
                  Only {pct(r.liquidRatio, 0)} of your assets are liquid — the rest is tied up in the
                  house, the cars and retirement accounts, none of which you can spend without selling,
                  borrowing, or paying to get at early.
                </>
              ) : (
                <>
                  {pct(r.liquidRatio, 0)} of your assets are liquid, which gives you real flexibility.
                </>
              )}
            </Takeaway>
            {/* "Liquid" is doing a lot of work in the tile above and means
                nothing to a reader until it is defined. */}
            <div className="space-y-2 mt-2">
              <Takeaway tone="blue">
                <strong>Liquid</strong> here means cash and taxable investments — money you could spend
                this month without a penalty. Your {fmtK(r.retirementBal)} in retirement accounts counts
                toward net worth but not toward this figure: before 59½ reaching it costs income tax plus
                a 10% penalty, so it is not money you can use in an emergency.{" "}
                <a href="/calculators/early-withdrawal" className="text-green-700 underline">
                  Should I withdraw from my retirement early?
                </a>{" "}
                prices what it would actually cost.
              </Takeaway>
              <Takeaway tone="amber">
                The projection assumes a steady {n(investReturn)}% every year and {n(homeGrowth)}% on the
                house. Real returns arrive in a jagged order, and a poor run early does lasting damage a
                good run later does not undo — treat <strong>{fmtK(r.projected)}</strong> as a central
                estimate, not a forecast.{" "}
                <a href="/calculators/retirement-savings" className="text-green-700 underline">
                  Am I on track for retirement?
                </a>{" "}
                works a longer horizon through properly.
              </Takeaway>
            </div>
          </div>

          <ChartCard title={`Net worth over the next ${r.years} years`}>
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

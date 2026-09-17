"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { growthSeries } from "../../lib/finance";

export default function Calculator() {
  const [age, setAge] = useState<Num>("");
  const [retireAge, setRetireAge] = useState<Num>("");
  const [savings, setSavings] = useState<Num>("");
  const [monthly, setMonthly] = useState<Num>("");
  const [match, setMatch] = useState<Num>("");
  const [preReturn, setPreReturn] = useState<Num>("");
  const [postReturn, setPostReturn] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [inflation, setInflation] = useState<Num>("");
  const [lifeExp, setLifeExp] = useState<Num>("");
  const [socialSecurity, setSocialSecurity] = useState<Num>("");

  const loadExample = () => {
    setAge(35);
    setRetireAge(65);
    setSavings(120000);
    setMonthly(1200);
    setMatch(400);
    setPreReturn(7);
    setPostReturn(5);
    setIncome(6000);
    setInflation(2.5);
    setLifeExp(92);
    setSocialSecurity(2200);
  };

  const r = useMemo(() => {
    const yearsToRetire = n(retireAge) - n(age);
    if (n(age) <= 0 || yearsToRetire <= 0) return null;

    const accum = growthSeries({
      initial: n(savings),
      contribution: n(monthly) + n(match),
      annualRate: n(preReturn),
      years: yearsToRetire,
      periodsPerYear: 12,
    });
    const nestEgg = accum.balances[accum.balances.length - 1];

    // Income need in future dollars at the retirement date.
    const infl = n(inflation) / 100;
    const needToday = Math.max(0, n(income) - n(socialSecurity));
    const needAtRetirement = needToday * Math.pow(1 + infl, yearsToRetire);

    // Drawdown: withdraw the inflation-adjusted need each month.
    const retirementYears = Math.max(1, n(lifeExp) - n(retireAge));
    const postR = n(postReturn) / 100 / 12;
    let bal = nestEgg;
    let draw = needAtRetirement;
    const drawdown = [bal];
    let monthsLasted = 0;
    let ranOut = false;
    for (let i = 0; i < retirementYears * 12; i++) {
      if (i > 0 && i % 12 === 0) draw *= 1 + infl;
      bal = bal * (1 + postR) - draw;
      if (bal <= 0) {
        bal = 0;
        if (!ranOut) {
          ranOut = true;
          monthsLasted = i + 1;
        }
      }
      drawdown.push(bal);
    }
    if (!ranOut) monthsLasted = retirementYears * 12;

    // What the nest egg supports sustainably (4% rule), in today's dollars.
    const safeWithdrawalMonthly = (nestEgg * 0.04) / 12;
    const safeToday = safeWithdrawalMonthly / Math.pow(1 + infl, yearsToRetire);

    // Nest egg needed to fund the full retirement.
    let needed = 0;
    if (needAtRetirement > 0) {
      const realRate = (1 + n(postReturn) / 100) / (1 + infl) - 1;
      const months = retirementYears * 12;
      const mr = realRate / 12;
      needed =
        Math.abs(mr) < 1e-9
          ? needAtRetirement * months
          : needAtRetirement * ((1 - Math.pow(1 + mr, -months)) / mr);
    }

    const combined = [...accum.balances, ...drawdown.slice(1)];

    return {
      yearsToRetire,
      retirementYears,
      nestEgg,
      contributed: accum.contributed,
      growth: accum.growth,
      needAtRetirement,
      safeWithdrawalMonthly,
      safeToday,
      needed,
      gap: nestEgg - needed,
      monthsLasted,
      ranOut,
      ageRanOut: n(retireAge) + monthsLasted / 12,
      combined,
      accumLen: accum.balances.length,
    };
  }, [age, retireAge, savings, monthly, match, preReturn, postReturn, income, inflation, lifeExp, socialSecurity]);

  return (
    <CalcShell
      slug="retirement-savings"
      intro="Two questions matter: what will you have, and how long will it last? This projects your balance to your retirement date, then spends it down at the income you want — in inflation-adjusted dollars."
      onExample={loadExample}
      relatedSlugs={["investment-growth", "compound-interest", "early-withdrawal"]}
      disclaimer="For educational purposes only. Assumes steady returns and inflation; real markets vary and a bad sequence of returns early in retirement can shorten how long savings last. Social Security estimates are yours to supply and are not verified. Consult a financial advisor before acting."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Where you are" badge="TODAY">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current age" value={age} onChange={setAge} placeholder="35" suffix="yrs" />
              <NumField label="Retirement age" value={retireAge} onChange={setRetireAge} placeholder="65" suffix="yrs" />
            </div>
            <NumField label="Current retirement savings" value={savings} onChange={setSavings} placeholder="120000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Your monthly contribution" value={monthly} onChange={setMonthly} placeholder="1200" prefix="$" />
              <NumField label="Employer match/mo" value={match} onChange={setMatch} placeholder="400" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Return before retiring" value={preReturn} onChange={setPreReturn} placeholder="7" suffix="%" step={0.25} />
              <NumField label="Return in retirement" value={postReturn} onChange={setPostReturn} placeholder="5" suffix="%" step={0.25} />
            </div>
          </div>
        </Card>

        <Card title="What you'll need" badge="RETIREMENT">
          <div className="space-y-4">
            <NumField
              label="Monthly income you want"
              value={income}
              onChange={setIncome}
              placeholder="6000"
              prefix="$"
              hint="In today's dollars — we adjust it for inflation."
            />
            <NumField
              label="Expected Social Security/mo"
              value={socialSecurity}
              onChange={setSocialSecurity}
              placeholder="2200"
              prefix="$"
              hint="Today's dollars. Check your estimate at ssa.gov."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Inflation" value={inflation} onChange={setInflation} placeholder="2.5" suffix="%" step={0.1} />
              <NumField label="Plan through age" value={lifeExp} onChange={setLifeExp} placeholder="92" suffix="yrs" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Savings must cover</span>
                <span className="text-sm font-medium text-gray-900">
                  {fmt(Math.max(0, n(income) - n(socialSecurity)))}/mo today
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label={`Projected balance at age ${n(retireAge)}`} value={fmtK(r.nestEgg)} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              <Stat label="You'll contribute" value={fmtK(r.contributed)} />
              <Stat label="Investment growth" value={fmtK(r.growth)} tone="green" />
              <Stat label="Years to retirement" value={`${r.yearsToRetire} yrs`} />
              <Stat
                label="Nest egg needed"
                value={fmtK(r.needed)}
                sub={`to fund ${r.retirementYears} yrs of retirement`}
              />
              <Stat
                label={r.gap >= 0 ? "Surplus" : "Shortfall"}
                value={fmtK(Math.abs(r.gap))}
                tone={r.gap >= 0 ? "green" : "red"}
              />
              <Stat
                label="Safe withdrawal (4% rule)"
                value={`${fmt(r.safeWithdrawalMonthly)}/mo`}
                sub={`${fmt(r.safeToday)}/mo in today's dollars`}
              />
            </div>
            <Takeaway tone={r.ranOut ? "amber" : "green"}>
              {r.ranOut ? (
                <>
                  <strong>⚠ Your savings run out at age {Math.floor(r.ageRanOut)}</strong> — about{" "}
                  {Math.max(0, Math.round(n(lifeExp) - r.ageRanOut))} years short of your plan. Closing
                  the gap takes more contributions, a later retirement date, or a lower income target.
                </>
              ) : (
                <>
                  <strong>✓ On track.</strong> Your savings support {fmt(r.needAtRetirement)}/mo at age{" "}
                  {n(retireAge)} — the equivalent of {fmt(Math.max(0, n(income) - n(socialSecurity)))}/mo
                  today — through age {n(lifeExp)}, with room left over.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Building it up, then spending it down">
            <LineChart
              ariaLabel="Retirement balance growing until retirement then drawn down through life expectancy"
              periodsPerYear={12}
              series={[{ label: "Retirement balance", color: COLORS.green, data: r.combined, fill: true }]}
              xUnit="Yr"
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The peak is your retirement date — year {r.yearsToRetire} on this chart. Everything after
                it is withdrawals racing against returns. Notice how much of the final balance is growth
                rather than contributions: that is the part you cannot make up later.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your current age and a retirement age to see your projection.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

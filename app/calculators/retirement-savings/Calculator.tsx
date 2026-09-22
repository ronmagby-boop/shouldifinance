"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, has, type Num,
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

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setAge("");
    setRetireAge("");
    setSavings("");
    setMonthly("");
    setMatch("");
    setPreReturn("");
    setPostReturn("");
    setIncome("");
    setInflation("");
    setLifeExp("");
    setSocialSecurity("");
  };

  /* Kept out of the main result so the render can name what is wrong
     * instead of falling through to a blank "enter your age" panel. */
  const problem = useMemo(() => {
    if (!has(age) || !has(retireAge) || n(age) <= 0 || n(retireAge) <= 0) return null;
    if (n(retireAge) <= n(age)) return "retire" as const;
    if (has(lifeExp) && n(lifeExp) <= n(retireAge)) return "plan" as const;
    return null;
  }, [age, retireAge, lifeExp]);

  const r = useMemo(() => {
    const yearsToRetire = n(retireAge) - n(age);
    if (n(age) <= 0 || yearsToRetire <= 0) return null;
    // A plan-through age at or before retirement used to collapse to a
    // silent one-year retirement; it now asks rather than inventing one.
    if (n(lifeExp) - n(retireAge) <= 0) return null;

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
    const retirementYears = n(lifeExp) - n(retireAge);
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

    /* Nest egg needed: the present value of the exact schedule the drawdown
     * above charges, discounted at the same monthly return it earns.
     *
     * This used to be an annuity closed form built on an annual real rate
     * divided by twelve. That rate does not match a loop compounding monthly
     * and inflating the withdrawal once a year, and the mismatch showed: it
     * asked for $1.89M where $1.85M funds the same 27 years to the dollar,
     * overstating the target by 2.4% and understating the surplus by as much.
     * Discounting the actual schedule cannot drift from the simulation. */
    let needed = 0;
    if (needAtRetirement > 0 && 1 + postR > 0) {
      let d = needAtRetirement;
      for (let i = 0; i < retirementYears * 12; i++) {
        if (i > 0 && i % 12 === 0) d *= 1 + infl;
        needed += d / Math.pow(1 + postR, i + 1);
      }
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
      accumBalances: accum.balances,
      accumLen: accum.balances.length,
      endingBalance: drawdown[drawdown.length - 1],
      /* Three genuinely different endings, and the narrative has to branch on
       * which one happened rather than assuming the balance falls. */
      stillGrowing: !ranOut && drawdown[drawdown.length - 1] > nestEgg,
      /* What the pot earns in the first month of retirement, against the
       * first withdrawal — the pair that decides which way the line goes. */
      firstMonthReturn: nestEgg * postR,
    };
  }, [age, retireAge, savings, monthly, match, preReturn, postReturn, income, inflation, lifeExp, socialSecurity]);


  return (
    <CalcShell
      slug="retirement-savings"
      intro="Two questions matter: what will you have, and how long will it last? This projects your balance to your retirement date, then spends it down at the income you want — in inflation-adjusted dollars."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["investment-growth", "compound-interest", "early-withdrawal"]}
      disclaimer="For educational purposes only. Assumes steady returns and inflation; real markets vary and a bad sequence of returns early in retirement can shorten how long savings last. Social Security estimates are yours to supply and are not verified. Consult a financial advisor before acting."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Where you are" badge="TODAY">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Current age" value={age} onChange={setAge} min={1} placeholder="35" suffix="yrs" />
              <NumField label="Retirement age" value={retireAge} onChange={setRetireAge} min={1} placeholder="65" suffix="yrs" />
            </div>
            <NumField label="Current retirement savings" value={savings} onChange={setSavings} min={0} placeholder="120000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Your monthly contribution" value={monthly} onChange={setMonthly} min={0} placeholder="1200" prefix="$" />
              <NumField label="Employer match/mo" value={match} onChange={setMatch} min={0} placeholder="400" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Both returns are deliberately unbounded — a negative one is a
                  real thing to model, and the page handles it. */}
              <NumField label="Return before retiring" value={preReturn} onChange={setPreReturn} placeholder="7" suffix="%" step={0.25} />
              <NumField label="Return in retirement" value={postReturn} onChange={setPostReturn} placeholder="5" suffix="%" step={0.25} />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              Enter returns net of fund fees. A percentage point of fees costs more over a horizon this
              long than most people expect —{" "}
              <a href="/calculators/investment-growth" className="text-green-700 underline">
                what will my investments be worth?
              </a>{" "}
              prices it.
            </p>
          </div>
        </Card>

        <Card title="What you'll need" badge="RETIREMENT">
          <div className="space-y-4">
            <NumField
              label="Monthly income you want"
              value={income}
              onChange={setIncome}
              min={0}
              placeholder="6000"
              prefix="$"
              hint="In today's dollars — we adjust it for inflation."
            />
            <NumField
              label="Expected Social Security/mo"
              value={socialSecurity}
              onChange={setSocialSecurity}
              min={0}
              placeholder="2200"
              prefix="$"
              hint="Today's dollars, and inflated alongside the income you want — benefits carry a cost-of-living adjustment, so both sides rise together. Check your estimate at ssa.gov."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Inflation" value={inflation} onChange={setInflation} min={0} placeholder="2.5" suffix="%" step={0.1} />
              <NumField label="Plan through age" value={lifeExp} onChange={setLifeExp} min={1} placeholder="92" suffix="yrs" />
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
                sub={`to fund ${r.retirementYears} yrs at ${n(postReturn)}%, withdrawals rising with inflation`}
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
              <Stat
                label={r.ranOut ? "Runs out at age" : `Balance at age ${n(lifeExp)}`}
                value={r.ranOut ? `${Math.floor(r.ageRanOut)}` : fmtK(r.endingBalance)}
                tone={r.ranOut ? "red" : "green"}
              />
            </div>
            <div className="space-y-2">
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
              <Takeaway tone="amber">
                This assumes a steady {n(preReturn)}% every year to retirement and {n(postReturn)}% after.
                Real returns arrive in a jagged order, and the order matters most in the years either side
                of your retirement date — a poor run there does lasting damage a good run later does not
                undo. Treat <strong>{fmtK(r.nestEgg)}</strong> as a central estimate, not a forecast.
              </Takeaway>
            </div>
          </div>

          <ChartCard title="Building it up, then spending it down">
            {/* Two series over one timeline: the shaded green stops on the
                retirement date, so the eye can find it. The old copy called
                that point the peak, which is only true when withdrawals
                outrun returns — here they do not, and the line kept climbing
                with nothing on the chart to explain why. */}
            <LineChart
              ariaLabel="Retirement balance growing until retirement then drawn down through life expectancy"
              periodsPerYear={12}
              series={[
                { label: "Balance", color: COLORS.amber, data: r.combined },
                { label: "Before you retire", color: COLORS.green, data: r.accumBalances, fill: true },
              ]}
              xUnit="Yr"
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The shaded area ends on your retirement date — year {r.yearsToRetire} on this chart, at{" "}
                <strong>{fmtK(r.nestEgg)}</strong>. After it, withdrawals race against returns.{" "}
                {r.ranOut ? (
                  <>
                    Withdrawals win: the balance reaches{" "}
                    <strong>zero at age {Math.floor(r.ageRanOut)}</strong>,{" "}
                    {Math.max(0, Math.round(n(lifeExp) - r.ageRanOut))} years short of {n(lifeExp)}.
                  </>
                ) : r.stillGrowing ? (
                  <>
                    Returns win: {n(postReturn)}% on {fmtK(r.nestEgg)} earns{" "}
                    {fmt(r.firstMonthReturn)} in the first month against a{" "}
                    {fmt(r.needAtRetirement)} withdrawal, so the line keeps climbing. It never reaches
                    zero within your plan, ending at <strong>{fmtK(r.endingBalance)}</strong> at age{" "}
                    {n(lifeExp)}.
                  </>
                ) : (
                  <>
                    The balance falls but lasts: it never reaches zero within your plan, ending at{" "}
                    <strong>{fmtK(r.endingBalance)}</strong> at age {n(lifeExp)}.
                  </>
                )}
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : problem ? (
        <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-amber-900 mb-1">
            {problem === "retire"
              ? "Retirement age is before your current age"
              : "Plan-through age is before you retire"}
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">
            {problem === "retire" ? (
              <>
                You entered a retirement age of {n(retireAge)} against a current age of {n(age)}, which
                leaves no years to save in. This page projects a balance forward from today, so the
                retirement age has to come after it.
              </>
            ) : (
              <>
                You entered a plan-through age of {n(lifeExp)} against a retirement age of{" "}
                {n(retireAge)}, which leaves no retirement to fund. Set the plan-through age past the
                age you retire.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Enter your current age, the age you want to retire, and the age to plan through.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

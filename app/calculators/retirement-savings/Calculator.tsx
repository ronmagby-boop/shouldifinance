"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, n, has, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import {
  SS_EARLIEST_CLAIM_AGE, SS_LATEST_CREDIT_AGE, SS_FIRST_BIRTH_YEAR,
  claimAdjustmentPct, defaultClaimAge, fullRetirementAgeMonths, project, type SocialSecurity,
} from "../../lib/retirement";

/** The year a birth year is inferred from when none is entered. Inlined at build, so server and browser agree. */
const THIS_YEAR = Number(process.env.BUILD_YEAR) || 2026;

/** An age in years and months, as SSA writes it: "66 and 8 months". */
const ageLabel = (years: number) => {
  const total = Math.round(years * 12);
  const y = Math.floor(total / 12);
  const m = total % 12;
  return m ? `${y} and ${m} month${m === 1 ? "" : "s"}` : `${y}`;
};

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
  const [birthYear, setBirthYear] = useState<Num>("");
  const [claimAge, setClaimAge] = useState<Num>("");
  const [asEntered, setAsEntered] = useState(false);

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
    setBirthYear("");
    setClaimAge("");
    setAsEntered(false);
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
    setBirthYear("");
    setClaimAge("");
    setAsEntered(false);
  };

  /* Kept out of the main result so the render can name what is wrong
     * instead of falling through to a blank "enter your age" panel. */
  const problem = useMemo(() => {
    if (!has(age) || !has(retireAge) || n(age) <= 0 || n(retireAge) <= 0) return null;
    if (n(retireAge) <= n(age)) return "retire" as const;
    if (has(lifeExp) && n(lifeExp) <= n(retireAge)) return "plan" as const;
    return null;
  }, [age, retireAge, lifeExp]);

  /* Social Security timing. A blank birth year is read off the current age;
   * a blank claiming age is full retirement age, or the retirement age if later. */
  const ssSetup = useMemo(() => {
    const bornGiven = has(birthYear) && n(birthYear) >= SS_FIRST_BIRTH_YEAR;
    const born = bornGiven ? n(birthYear) : THIS_YEAR - n(age);
    const fraYears = fullRetirementAgeMonths(born) / 12;
    const defaultAge = defaultClaimAge(born, n(retireAge) > 0 ? n(retireAge) : fraYears);
    const typed = has(claimAge) ? n(claimAge) : null;
    const claim = typed === null ? defaultAge : Math.min(SS_LATEST_CREDIT_AGE, Math.max(SS_EARLIEST_CLAIM_AGE, typed));
    const ss: SocialSecurity = asEntered
      ? { mode: "asEntered", benefit: n(socialSecurity), claimAge: claim }
      : { mode: "fra", benefitAtFra: n(socialSecurity), birthYear: born, claimAge: claim };
    return {
      bornInferred: !bornGiven, fraYears, defaultAge, claim, ss,
      outOfRange: typed !== null && (typed < SS_EARLIEST_CLAIM_AGE || typed > SS_LATEST_CREDIT_AGE),
      adjustmentPct: asEntered ? null : claimAdjustmentPct(born, claim),
    };
  }, [age, retireAge, birthYear, claimAge, asEntered, socialSecurity]);

  const r = useMemo(() => {
    const yearsToRetire = n(retireAge) - n(age);
    if (n(age) <= 0 || yearsToRetire <= 0) return null;
    // A plan-through age at or before retirement used to collapse to a
    // silent one-year retirement; it now asks rather than inventing one.
    if (n(lifeExp) - n(retireAge) <= 0) return null;
    const p = project({
      age: n(age), retireAge: n(retireAge), planThroughAge: n(lifeExp),
      savings: n(savings), contribution: n(monthly) + n(match),
      preReturn: n(preReturn), postReturn: n(postReturn),
      income: n(income), inflation: n(inflation), ss: ssSetup.ss,
    });
    return {
      ...p,
      /** Where the claim falls on the chart, in months from today. */
      claimIndex: Math.round((p.claimAge - n(age)) * 12),
    };
  }, [age, retireAge, savings, monthly, match, preReturn, postReturn, income, inflation, lifeExp, ssSetup]);


  return (
    <CalcShell
      slug="retirement-savings"
      intro="Two questions matter: what will you have, and how long will it last? This projects your balance to your retirement date, then spends it down at the income you want — in inflation-adjusted dollars."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["investment-growth", "compound-interest", "early-withdrawal"]}
      disclaimer="For educational purposes only. Assumes steady returns and inflation; real markets vary and a bad sequence of returns early in retirement can shorten how long savings last. Social Security estimates are yours to supply and are not verified; the claiming-age adjustment uses SSA's published rates. Consult a financial advisor before acting."
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
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Inflation" value={inflation} onChange={setInflation} min={0} placeholder="2.5" suffix="%" step={0.1} />
              <NumField label="Plan through age" value={lifeExp} onChange={setLifeExp} min={1} placeholder="92" suffix="yrs" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Savings must cover{r.bridgeMonths > 0 ? ` until ${ageLabel(r.claimAge)}` : ""}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {fmt(r.bridgeMonths > 0 ? n(income) : r.drawAfterClaimToday)}/mo today
                  </span>
                </div>
                {r.bridgeMonths > 0 && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-400">From {ageLabel(r.claimAge)}</span>
                    <span className="text-sm font-medium text-gray-900">{fmt(r.drawAfterClaimToday)}/mo today</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Social Security" badge="WHEN YOU CLAIM" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <NumField
              label={asEntered ? "Monthly benefit at your claiming age" : "Monthly benefit at full retirement age"}
              value={socialSecurity}
              onChange={setSocialSecurity}
              min={0}
              placeholder="2200"
              prefix="$"
              hint={
                <>
                  Today&apos;s dollars, from your Social Security Statement at{" "}
                  <a href="https://www.ssa.gov/myaccount/" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">ssa.gov</a>.
                  It rises with inflation here, as benefits carry a cost-of-living adjustment.
                </>
              }
            />
            <Toggle checked={asEntered} onChange={setAsEntered} label="Estimate already for claiming age">
              I already have my estimate for my claiming age: use it as entered, with no adjustment
            </Toggle>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Birth year"
                value={birthYear}
                onChange={setBirthYear}
                placeholder={String(THIS_YEAR - (n(age) > 0 ? n(age) : 35))}
                hint={ssSetup.bornInferred ? "Blank: read from your age." : "Sets your full retirement age."}
              />
              <NumField
                label="Age you'll start"
                value={claimAge}
                onChange={setClaimAge}
                placeholder={String(Math.floor(ssSetup.defaultAge))}
                suffix="yrs"
                step={1}
                hint={`${SS_EARLIEST_CLAIM_AGE} to ${SS_LATEST_CREDIT_AGE}. Blank: ${ageLabel(ssSetup.defaultAge)}.`}
              />
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Benefit from age {ageLabel(ssSetup.claim)}</span>
                <span className="text-sm font-medium text-gray-900">{r ? `${fmt(r.benefit)}/mo today` : "—"}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {ssSetup.adjustmentPct === null
                  ? "As entered, with no adjustment for the claiming age."
                  : ssSetup.adjustmentPct === 0
                    ? `Your full retirement age is ${ageLabel(ssSetup.fraYears)}: no adjustment.`
                    : `Full retirement age ${ageLabel(ssSetup.fraYears)}. Claiming ${ssSetup.adjustmentPct < 0 ? "earlier reduces" : "later raises"} the benefit ${Math.abs(ssSetup.adjustmentPct).toFixed(2).replace(/\.?0+$/, "")}%.`}
                {ssSetup.outOfRange && ` Held to ${SS_EARLIEST_CLAIM_AGE} to ${SS_LATEST_CREDIT_AGE}.`}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Retiring early can lower your estimate.</strong> SSA&apos;s estimates assume you keep earning until you
            claim, and the benefit is based on your highest 35 years of earnings, so years you stop working early can
            count as low or zero. Check your Statement. Benefits start at {SS_EARLIEST_CLAIM_AGE} at the earliest, and
            delayed credits stop at {SS_LATEST_CREDIT_AGE}.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Withdrawals before 59½</strong> generally owe an additional 10% tax unless an exception applies, which
            this page does not model. One exception: if you leave your employer in or after the year you turn 55,
            withdrawals from that employer&apos;s 401(k) are not hit by it (the &quot;rule of 55&quot;). IRAs generally
            don&apos;t have it. See the{" "}
            <a href="https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">IRS list of exceptions</a>.
          </p>
        </div>
      </Card>

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
                    <strong>✓ On track.</strong> Your savings support {fmt(r.firstDraw)}/mo at age{" "}
                    {n(retireAge)} — the equivalent of {fmt(r.bridgeMonths > 0 ? n(income) : r.drawAfterClaimToday)}/mo
                    today{r.bridgeMonths > 0 ? `, falling to ${fmt(r.drawAfterClaimToday)}/mo once Social Security starts` : ""} —
                    through age {n(lifeExp)}, with room left over.
                  </>
                )}
              </Takeaway>
              {r.bridgeMonths > 0 && r.benefit > 0 && (
                <Takeaway tone="blue">
                  <strong>The bridge.</strong> You retire at {n(retireAge)} and start Social Security at{" "}
                  {ageLabel(r.claimAge)}: {(r.bridgeMonths / 12).toFixed(r.bridgeMonths % 12 ? 1 : 0)} years in which savings fund the
                  whole {fmt(n(income))}/mo. That is {fmt(r.bridgeExtraToday)}/mo more from savings than after you claim,{" "}
                  {fmtK(r.bridgeExtraTotalToday)} in today&apos;s dollars over the bridge, and it adds{" "}
                  <strong>{fmtK(r.bridgeCost)}</strong> to the nest egg needed.
                </Takeaway>
              )}
              {r.claimAge < n(retireAge) && r.benefit > 0 && (
                <Takeaway tone="blue">
                  You start Social Security at {ageLabel(r.claimAge)}, before you retire at {n(retireAge)}. Benefits received
                  while you are still working are not added to your savings here; from retirement they cover their share.
                </Takeaway>
              )}
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
              markers={r.benefit > 0 ? [{ index: r.claimIndex, label: `Social Security at ${ageLabel(r.claimAge)}` }] : []}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The shaded area ends on your retirement date — year {r.yearsToRetire} on this chart, at{" "}
                <strong>{fmtK(r.nestEgg)}</strong>.{" "}
                {r.benefit > 0 && <>The dashed line marks Social Security starting, at {ageLabel(r.claimAge)}. </>}
                After retirement, withdrawals race against returns.{" "}
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
                    {fmt(r.firstDraw)} withdrawal, so the line keeps climbing. It never reaches
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

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, has, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import {
  BENEFIT_TAX_85_THRESHOLD, BENEFIT_TAX_BASE, EARNINGS_TEST, EARNINGS_TEST_NEXT,
  SS_EARLIEST_CLAIM_AGE, SS_FIRST_BIRTH_YEAR, SS_LATEST_CREDIT_AGE,
  benefitAt, breakEvenAge, claimAdjustmentPct, claimAgePassed, cumulativeBy, fullRetirementAgeMonths, investedBreakEvenAge,
} from "../../lib/socialSecurity";

/** An age in years and months, as SSA writes it: "66 and 8 months". */
const ageLabel = (years: number) => {
  const total = Math.round(years * 12);
  const y = Math.floor(total / 12);
  const m = total % 12;
  return m ? `${y} and ${m} month${m === 1 ? "" : "s"}` : `${y}`;
};

/** A break-even age, or why there is none. */
const beLabel = (age: number | null) => (age === null ? "not by 110" : ageLabel(Math.round(age * 12) / 12));

/** How far the chart runs when no plan-through age is given: a range, not an assumption about you. */
const CHART_DEFAULT_END = 100;

export default function Calculator() {
  const [benefit, setBenefit] = useState<Num>("");
  const [birthYear, setBirthYear] = useState<Num>("");
  const [planThrough, setPlanThrough] = useState<Num>("");
  const [ret, setRet] = useState<Num>("");

  const loadExample = () => {
    setBenefit(2000);
    setBirthYear(1964);
    setPlanThrough(88);
    setRet("");
  };

  const clearExample = () => {
    setBenefit("");
    setBirthYear("");
    setPlanThrough("");
    setRet("");
  };

  const r = useMemo(() => {
    const b = n(benefit);
    if (b <= 0 || !has(birthYear) || n(birthYear) < SS_FIRST_BIRTH_YEAR) return null;
    const born = Math.floor(n(birthYear));
    const fra = fullRetirementAgeMonths(born) / 12;
    const plan = n(planThrough) > SS_EARLIEST_CLAIM_AGE ? n(planThrough) : null;

    const ages = [62, 63, 64, 65, 66, 67, 68, 69, 70];
    if (!ages.includes(fra)) ages.push(fra);
    ages.sort((a, z) => a - z);
    // Ages the reader is certainly past, from the birth year and today's date.
    const today = new Date();
    const passed = (age: number) => claimAgePassed(born, age, today);
    const rows = ages.map((age) => {
      const monthly = benefitAt(b, born, age);
      return {
        age, monthly, pct: claimAdjustmentPct(born, age), passed: passed(age),
        total: plan === null ? null : cumulativeBy(monthly, age, plan), isFra: age === fra,
      };
    });
    const open = rows.filter((x) => !x.passed);
    const best = plan === null || open.length === 0 ? null : open.reduce((m, x) => (x.total! > m.total! ? x : m), open[0]);
    /** Past 70: every age has gone, and claiming now, at the maximum, is the only option. */
    const allPassed = open.length === 0;

    const at62 = benefitAt(b, born, 62);
    const atFra = b;
    const at70 = benefitAt(b, born, 70);
    const be = {
      earlyVsFra: breakEvenAge(62, at62, fra, atFra),
      fraVs70: breakEvenAge(fra, atFra, 70, at70),
      earlyVs70: breakEvenAge(62, at62, 70, at70),
    };
    const rate = has(ret) ? n(ret) : null;
    const invested = rate === null ? null : {
      earlyVsFra: investedBreakEvenAge(62, at62, fra, atFra, rate),
      fraVs70: investedBreakEvenAge(fra, atFra, 70, at70, rate),
      earlyVs70: investedBreakEvenAge(62, at62, 70, at70, rate),
    };

    const end = plan ?? CHART_DEFAULT_END;
    const months = Math.round((end - 62) * 12);
    const series = (claim: number, monthly: number) =>
      Array.from({ length: months + 1 }, (_, i) => cumulativeBy(monthly, claim, 62 + i / 12));

    return {
      born, fra, plan, rows, best, allPassed, at62, atFra, at70, be, rate, invested, end,
      passed62: passed(62), passedFra: passed(fra), passed70: passed(70),
      chart: { s62: series(62, at62), sFra: series(fra, atFra), s70: series(70, at70) },
    };
  }, [benefit, birthYear, planThrough, ret]);

  const markers = r
    ? [
        { age: r.be.earlyVsFra, label: `62 = ${ageLabel(r.fra)}` },
        { age: r.be.fraVs70, label: `${ageLabel(r.fra)} = 70` },
      ]
        .filter((m): m is { age: number; label: string } => m.age !== null && m.age <= r.end)
        .map((m) => ({ index: Math.round((m.age - 62) * 12), label: m.label }))
    : [];

  return (
    <CalcShell
      slug="when-to-start-social-security"
      intro="Starting Social Security at 62 pays a smaller benefit for longer; waiting to 70 pays a larger one for less time. See the monthly amount at every age, the age at which waiting catches up, and what each choice pays by the age you plan to."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["retirement-savings", "roth-vs-traditional", "early-withdrawal"]}
      disclaimer="For educational purposes only. Uses SSA's published reduction and credit rates on the benefit you enter; your own Statement and SSA's calculators are the authority on your benefit. Amounts are in today's dollars. Spousal and survivor benefits, the earnings test and taxes are described, not calculated."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your benefit" className="h-full">
          <div className="space-y-4">
            <NumField
              label="Monthly benefit at full retirement age"
              value={benefit}
              onChange={setBenefit}
              min={0}
              placeholder="2000"
              prefix="$"
              hint={
                <>
                  From your Social Security Statement at{" "}
                  <a href="https://www.ssa.gov/myaccount/" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">ssa.gov</a>.
                </>
              }
            />
            <NumField label="Birth year" value={birthYear} onChange={setBirthYear} placeholder="1964" hint="Sets your full retirement age. Born on 1 January? Use the year before." />
          </div>
        </Card>
        <Card title="How long to plan for" className="h-full">
          <div className="space-y-4">
            <NumField
              label="Plan through age"
              value={planThrough}
              onChange={setPlanThrough}
              min={0}
              placeholder="88"
              suffix="yrs"
              hint={
                <>
                  No built-in assumption: pick an age, or see SSA&apos;s{" "}
                  <a href="https://www.ssa.gov/oact/population/longevity.html" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">life expectancy calculator</a>
                  , and try a later one too.
                </>
              }
            />
            <NumField
              label="Return if you invest early benefits (optional)"
              value={ret}
              onChange={setRet}
              placeholder="3"
              suffix="%"
              step={0.5}
              hint="Above inflation, since the amounts are in today's dollars. Shows how the break-evens move."
            />
          </div>
        </Card>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed -mt-2 mb-4">
        All amounts are in today&apos;s dollars. Benefits get a cost-of-living adjustment each year, which keeps them
        roughly level in real terms.
      </p>

      {r && r.allPassed ? (
        <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
          <Headline label="Claiming now is the only option" value={`${fmt(r.at70)}/mo`} tone="gray" />
          <Takeaway tone="blue">
            Born in {r.born}, you are past {SS_LATEST_CREDIT_AGE}, so every claiming age on this page has already passed and
            there is nothing left to compare. Delayed credits stop at {SS_LATEST_CREDIT_AGE}, so claiming now pays the
            largest benefit there is: {fmt(r.at70)} a month on these numbers.
          </Takeaway>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-gray-400 text-left">
                  <th className="py-2 pr-3 font-normal">Start</th>
                  <th className="py-2 pr-3 font-normal">Monthly</th>
                  <th className="py-2 font-normal">vs full age</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 font-medium">
                  <td className="py-2 pr-3">Now</td>
                  <td className="py-2 pr-3">{fmt(r.at70)}</td>
                  <td className="py-2">+{claimAdjustmentPct(r.born, SS_LATEST_CREDIT_AGE).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label={`At 62, full retirement age (${ageLabel(r.fra)}) and 70`} value={`${fmt(r.at62)} · ${fmt(r.atFra)} · ${fmt(r.at70)}`} tone="gray" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <Stat label={`Break-even, 62 vs ${ageLabel(r.fra)}`} value={beLabel(r.be.earlyVsFra)} />
              <Stat label={`Break-even, ${ageLabel(r.fra)} vs 70`} value={beLabel(r.be.fraVs70)} />
              <Stat label="Break-even, 62 vs 70" value={beLabel(r.be.earlyVs70)} />
            </div>
            <div className="space-y-2">
              <Takeaway tone="blue">
                Waiting from 62 to 70 raises the benefit from {fmt(r.at62)} to {fmt(r.at70)} a month for life, and the
                larger checks make up for the years without any by about age {beLabel(r.be.earlyVs70)}. Live past it and
                waiting paid more in total; die before it and claiming early did.
                {r.best && r.plan !== null && (
                  <>
                    {" "}Through age {r.plan}, of the ages still open to you, claiming at{" "}
                    <strong>{ageLabel(r.best.age)}</strong> pays the most: {fmtK(r.best.total!)}.
                  </>
                )}
              </Takeaway>
              {r.rows.some((row) => row.passed) && (
                <Takeaway tone="amber">
                  Born in {r.born}, you are already past some of these ages, so they are greyed out below and left out of
                  the comparison of totals. The break-evens still show how the choices compare.
                </Takeaway>
              )}
              {r.invested && (
                <Takeaway tone="amber">
                  If every early check were invested at {r.rate}% above inflation, the break-evens move to{" "}
                  <strong>{beLabel(r.invested.earlyVsFra)}</strong> (62 vs {ageLabel(r.fra)}),{" "}
                  <strong>{beLabel(r.invested.fraVs70)}</strong> ({ageLabel(r.fra)} vs 70) and{" "}
                  <strong>{beLabel(r.invested.earlyVs70)}</strong> (62 vs 70). That assumes the money is not spent and the
                  return arrives, which is the hard part.
                </Takeaway>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">The benefit at each age</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-gray-400 text-left">
                    <th className="py-2 pr-3 font-normal">Start at</th>
                    <th className="py-2 pr-3 font-normal">Monthly</th>
                    <th className="py-2 pr-3 font-normal">vs full age</th>
                    <th className="py-2 font-normal">{r.plan === null ? "Total by your plan age" : `Total by ${r.plan}`}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr
                      key={row.age}
                      className={`border-t border-gray-100 ${row.passed ? "text-gray-400" : ""} ${row.isFra && !row.passed ? "bg-blue-50" : ""} ${r.best && row.age === r.best.age ? "font-medium" : ""}`}
                    >
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {ageLabel(row.age)}
                        {row.isFra && <span className={`text-xs ${row.passed ? "" : "text-blue-600"}`}> full age</span>}
                        {row.passed && <span className="text-xs"> already passed</span>}
                      </td>
                      <td className="py-2 pr-3">{fmt(row.monthly)}</td>
                      <td className="py-2 pr-3">{row.pct === 0 ? "—" : `${row.pct > 0 ? "+" : "−"}${Math.abs(row.pct).toFixed(1)}%`}</td>
                      <td className="py-2">{row.total === null ? "Add a plan-through age" : fmtK(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ChartCard title="Total collected by each age">
            <LineChart
              ariaLabel="Cumulative Social Security benefits by age when claiming at 62, at full retirement age and at 70"
              periodsPerYear={12}
              xUnit="Age"
              xStart={62}
              markers={markers}
              series={[
                { label: `Start at 62${r.passed62 ? " (already passed)" : ""}`, color: r.passed62 ? COLORS.gray : COLORS.amber, data: r.chart.s62 },
                { label: `Start at ${ageLabel(r.fra)}${r.passedFra ? " (already passed)" : ""}`, color: r.passedFra ? COLORS.gray : COLORS.blue, data: r.chart.sFra },
                { label: "Start at 70", color: COLORS.green, data: r.chart.s70 },
              ]}
            />
            <p className="text-xs text-gray-400 mt-3">
              Each line is the benefits received so far, in today&apos;s dollars, to age {r.end}
              {r.plan === null ? " (add a plan-through age to stop it there)" : ""}. Where a later line crosses an earlier one
              is the break-even; the dashed lines mark the two break-evens, labelled by the ages compared.
            </p>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your benefit at full retirement age and your birth year.</EmptyState>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">What this page does not calculate</h2>
        <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
          <p>
            <strong>Working while you claim.</strong> Claim before full retirement age while still working, and SSA
            withholds $1 for every $2 you earn above {fmt(EARNINGS_TEST.lower)} in {EARNINGS_TEST.year} (
            {fmt(EARNINGS_TEST_NEXT.lower)} in {EARNINGS_TEST_NEXT.year}); in the year you reach full retirement age, $1
            for every $3 above {fmt(EARNINGS_TEST.higher)} ({fmt(EARNINGS_TEST_NEXT.higher)} in {EARNINGS_TEST_NEXT.year}),
            counting only the months before it. Withheld benefits are not lost: SSA raises your benefit at full
            retirement age to make up for them. See{" "}
            <a href="https://www.ssa.gov/benefits/retirement/planner/whileworking.html" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">Receiving Benefits While Working</a>.
          </p>
          <p>
            <strong>A surviving spouse.</strong> If you are married and the higher earner, delaying also raises what your
            spouse may receive as a survivor if you die first, so the choice covers two lifetimes, not one.
          </p>
          <p>
            <strong>Spousal benefits</strong> depend on both of your records and ages. SSA explains them under{" "}
            <a href="https://www.ssa.gov/family" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">Family benefits</a>.
          </p>
          <p>
            <strong>Tax.</strong> Part of your benefits can be taxable once half your benefits plus your other income
            pass {fmt(BENEFIT_TAX_BASE.single)} ({fmt(BENEFIT_TAX_BASE.joint)} married filing jointly): up to 50%, or up
            to 85% above {fmt(BENEFIT_TAX_85_THRESHOLD.single)} ({fmt(BENEFIT_TAX_85_THRESHOLD.joint)} jointly). See{" "}
            <a href="https://www.irs.gov/publications/p915" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">IRS Publication 915</a>.
          </p>
          <p>
            Claiming between {SS_EARLIEST_CLAIM_AGE} and {SS_LATEST_CREDIT_AGE} is your choice; SSA says there is no single
            best age. To see how a later claim changes what your savings must carry until then, use the{" "}
            <Link href="/calculators/retirement-savings" className="text-green-700 underline">retirement calculator</Link>.
          </p>
        </div>
      </div>
    </CalcShell>
  );
}

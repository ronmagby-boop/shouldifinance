"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Toggle, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { growthSeries } from "../../lib/finance";

/**
 * Long-run US returns, 1928-2025, as geometric averages over 98 years of
 * annual returns. From Aswath Damodaran's dataset at NYU Stern: $100 invested
 * at the start of 1928 ended 2025 at $1,157,598.95 in the S&P 500 with
 * dividends reinvested, $7,752.88 in 10-year Treasuries and $2,578.30 in
 * 3-month bills.
 *
 * The verdict bands hang off these rather than off round numbers, because the
 * useful fact about a required return is where it sits against what the broad
 * asset classes have actually delivered. Any mix of stocks and bonds has a
 * long-run return somewhere between the bond and stock figures, so a required
 * return above the stock figure is a bet on beating the best of them.
 */
const LONG_RUN = { stocks: 10.02, bonds: 4.54, bills: 3.37 };

/**
 * The top of "aggressive". Unlike the three above this is a judgement, not a
 * measurement — it marks where a required return stops describing a portfolio
 * and starts describing a hope.
 */
const FANCIFUL = 15;

/** Sits between the long-run bond and stock figures — a mixed portfolio. */
const BENCHMARK = 7;

function endingBalance(initial: number, monthly: number, rate: number, years: number): number {
  const g = growthSeries({ initial, contribution: monthly, annualRate: rate, years, periodsPerYear: 12 });
  return g.balances[g.balances.length - 1];
}

/** Bisect for the annual return that hits the goal. */
function solveRate(initial: number, monthly: number, goal: number, years: number): number | null {
  let lo = -50;
  let hi = 100;
  if (endingBalance(initial, monthly, hi, years) < goal) return null;
  if (endingBalance(initial, monthly, lo, years) > goal) return lo;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (endingBalance(initial, monthly, mid, years) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Bisect for the monthly contribution needed at a given return. */
function solveContribution(initial: number, goal: number, rate: number, years: number): number {
  let lo = 0;
  let hi = Math.max(1000, goal);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (endingBalance(initial, mid, rate, years) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export default function Calculator() {
  const [current, setCurrent] = useState<Num>("");
  const [monthly, setMonthly] = useState<Num>("");
  const [goal, setGoal] = useState<Num>("");
  const [years, setYears] = useState<Num>("");
  const [inflation, setInflation] = useState<Num>("");
  const [inTodaysDollars, setInTodaysDollars] = useState(true);

  const loadExample = () => {
    setCurrent(50000);
    setMonthly(800);
    setGoal(750000);
    setYears(20);
    setInflation(2.5);
    setInTodaysDollars(true);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setCurrent("");
    setMonthly("");
    setGoal("");
    setYears("");
    setInflation("");
    setInTodaysDollars(true);
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || n(goal) <= 0) return null;

    /* A goal figure is almost always picked in today's money — "$750,000"
     * means $750,000 of today's purchasing power. Everything solves against
     * the future-dollar target, and the other reading is shown alongside so
     * neither number disappears. */
    const factor = Math.pow(1 + n(inflation) / 100, yrs);
    const target = inTodaysDollars ? n(goal) * factor : n(goal);
    const targetToday = inTodaysDollars ? n(goal) : n(goal) / factor;
    const otherTarget = inTodaysDollars ? n(goal) : n(goal) * factor;
    const otherRequired = solveRate(n(current), n(monthly), otherTarget, yrs);

    const required = solveRate(n(current), n(monthly), target, yrs);
    const atBenchmark = endingBalance(n(current), n(monthly), BENCHMARK, yrs);
    const shortfall = target - atBenchmark;
    const neededContribution = solveContribution(n(current), target, BENCHMARK, yrs);

    // What the plan reaches with no growth at all — the line below which the
    // goal is already covered and a "required return" is a misleading thing
    // to quote at all.
    const withoutGrowth = endingBalance(n(current), n(monthly), 0, yrs);
    const alreadyCovered = withoutGrowth >= target;

    // Extra years needed at the benchmark return.
    let extraYears = 0;
    if (shortfall > 0) {
      for (let y = yrs; y <= yrs + 40; y += 0.25) {
        if (endingBalance(n(current), n(monthly), BENCHMARK, y) >= target) {
          extraYears = y - yrs;
          break;
        }
      }
    }

    const verdict = alreadyCovered
      ? {
          tone: "green" as const,
          label: "Already covered",
          text: "Your contributions alone reach the target, so this plan needs no growth at all.",
        }
      : required === null
        ? { tone: "red" as const, label: "Out of reach", text: "No realistic return gets there on this timeline." }
        : required <= LONG_RUN.bonds
          ? {
              tone: "green" as const,
              label: "Conservative",
              text: `At or below the ${pct(LONG_RUN.bonds, 1)} long-run return on 10-year Treasuries, so bonds and CDs could plausibly carry it.`,
            }
          : required <= LONG_RUN.stocks
            ? {
                tone: "green" as const,
                label: "Reasonable",
                text: `Between the long-run return on Treasuries and the ${pct(LONG_RUN.stocks, 1)} the S&P 500 has delivered, which is the range a stock-and-bond mix falls in.`,
              }
            : required <= FANCIFUL
              ? {
                  tone: "amber" as const,
                  label: "Aggressive",
                  text: `Above the ${pct(LONG_RUN.stocks, 1)} US stocks have returned over the long run, so the plan is betting on beating the best broad asset class.`,
                }
              : {
                  tone: "red" as const,
                  label: "Unrealistic",
                  text: "Far above what any broad asset class has sustained. A plan should not be anchored to it.",
                };

    const requiredSeries = growthSeries({
      initial: n(current),
      contribution: n(monthly),
      annualRate: required ?? BENCHMARK,
      years: yrs,
      periodsPerYear: 12,
    }).balances;
    const benchmarkSeries = growthSeries({
      initial: n(current),
      contribution: n(monthly),
      annualRate: BENCHMARK,
      years: yrs,
      periodsPerYear: 12,
    }).balances;

    return {
      required,
      verdict,
      atBenchmark,
      shortfall,
      neededContribution,
      extraYears,
      requiredSeries,
      benchmarkSeries,
      goalLine: requiredSeries.map(() => target),
      totalContributed: n(current) + n(monthly) * 12 * yrs,
      target,
      targetToday,
      otherTarget,
      otherRequired,
      withoutGrowth,
      alreadyCovered,
      yrs,
      inflating: n(inflation) > 0,
    };
  }, [current, monthly, goal, years, inflation, inTodaysDollars]);

  return (
    <CalcShell
      slug="required-rate-of-return"
      intro="Work backwards from the goal. Given what you have, what you can add, and how long you have, this finds the annual return you'd need — and tells you honestly whether that number is realistic."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["investment-growth", "compound-interest", "retirement-savings"]}
      disclaimer="For educational purposes only. A required return is a planning figure, not a promise — no portfolio delivers the same number every year. If the required return looks aggressive, adjusting the goal, the contribution, or the timeline is usually safer than reaching for risk. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your goal" badge="INPUTS">
          <div className="space-y-4">
            <NumField label="What you have today" value={current} onChange={setCurrent} min={0} placeholder="50000" prefix="$" />
            <NumField label="Monthly contribution" value={monthly} onChange={setMonthly} min={0} placeholder="800" prefix="$" />
            <NumField label="Target amount" value={goal} onChange={setGoal} min={0} placeholder="750000" prefix="$" />
            <Toggle checked={inTodaysDollars} onChange={setInTodaysDollars}>
              Target is in today&apos;s dollars
            </Toggle>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Years to get there" value={years} onChange={setYears} min={1} placeholder="20" suffix="yrs" />
              <NumField label="Inflation" value={inflation} onChange={setInflation} min={0} placeholder="2.5" suffix="%" step={0.1} />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              Used only to show what the balance buys in today&apos;s money. Set it to 0 to see the
              nominal figure alone.
            </p>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Contributions alone</span>
                <span className="text-sm font-medium text-gray-900">{fmtK(r.totalContributed)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The return you need" badge="RESULT" badgeTone="green" className="bg-gray-50">
          {r ? (
            <>
              <Headline
                label="Required annual return"
                value={r.alreadyCovered ? "None needed" : r.required === null ? "Not achievable" : pct(r.required, 2)}
                tone={r.verdict.tone === "green" ? "green" : r.verdict.tone === "red" ? "red" : "gray"}
              />
              {/* Both readings stay on the page. Which one the headline shows
                  follows the switch, but the other is one line away, because
                  the gap between them is the whole point of the input. */}
              {r.inflating && !r.alreadyCovered && (
                <p className="text-xs text-gray-500 leading-relaxed -mt-3 mb-4">
                  {inTodaysDollars ? (
                    <>
                      {fmtK(n(goal))} of today&apos;s purchasing power is{" "}
                      <strong className="text-gray-900">{fmtK(r.target)}</strong> in {r.yrs} years at{" "}
                      {pct(n(inflation), 1)} inflation, and that is what this rate is solved against. Read
                      as a plain {fmtK(n(goal))} in {r.yrs} years&apos; money, the requirement is{" "}
                      <strong className="text-gray-900">
                        {r.otherRequired === null ? "not achievable" : pct(r.otherRequired, 2)}
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      {fmtK(n(goal))} in {r.yrs} years buys what{" "}
                      <strong className="text-gray-900">{fmtK(r.targetToday)}</strong> buys today at{" "}
                      {pct(n(inflation), 1)} inflation. To keep {fmtK(n(goal))} of today&apos;s purchasing
                      power you would need{" "}
                      <strong className="text-gray-900">
                        {r.otherRequired === null ? "more than any realistic return" : pct(r.otherRequired, 2)}
                      </strong>
                      .
                    </>
                  )}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Stat label="Verdict" value={r.verdict.label} tone={r.verdict.tone === "red" ? "red" : r.verdict.tone === "amber" ? "amber" : "green"} />
                <Stat label={`At a ${BENCHMARK}% return you'd have`} value={fmtK(r.atBenchmark)} />
                <Stat
                  label={r.shortfall > 0 ? "Shortfall at 7%" : "Surplus at 7%"}
                  value={fmtK(Math.abs(r.shortfall))}
                  tone={r.shortfall > 0 ? "red" : "green"}
                />
                <Stat
                  label="Monthly needed at 7%"
                  value={fmt(r.neededContribution)}
                  sub={r.neededContribution > n(monthly) ? `${fmt(r.neededContribution - n(monthly))} more` : "You're covered"}
                />
                <Stat
                  label="Contributions alone reach"
                  value={fmtK(r.withoutGrowth)}
                  sub="with no growth at all"
                />
              </div>
              <div className="space-y-2">
                <Takeaway tone={r.verdict.tone}>
                  <strong>{r.verdict.label}.</strong> {r.verdict.text}
                  {!r.alreadyCovered && r.shortfall > 0 && r.extraYears > 0 && (
                    <>
                      {" "}
                      If you&apos;d rather not reach for a higher return, the same goal is reachable at{" "}
                      {BENCHMARK}% by adding <strong>{fmt(r.neededContribution - n(monthly))}/mo</strong> or
                      by giving it <strong>{r.extraYears.toFixed(1)} more years</strong>.
                    </>
                  )}
                </Takeaway>
                {/* The bands are the page's only judgement, so they say what
                    they are measured against rather than asserting a verdict. */}
                <Takeaway tone="blue">
                  The bands come from long-run US returns, 1928 to 2025: {pct(LONG_RUN.bills, 1)} on
                  3-month Treasury bills, {pct(LONG_RUN.bonds, 1)} on 10-year Treasuries and{" "}
                  {pct(LONG_RUN.stocks, 1)} on the S&amp;P 500 with dividends reinvested (Damodaran, NYU
                  Stern). Any mix of stocks and bonds lands between the last two, so a requirement above{" "}
                  {pct(LONG_RUN.stocks, 1)} is a bet on beating the best of them for {r.yrs} years running.
                </Takeaway>
                <Takeaway tone="amber">
                  This is a gross return, before fees and before tax. In a taxable account, or in any fund
                  charging more than a broad index does, the gross return you need is higher than the
                  figure above —{" "}
                  <a href="/calculators/investment-growth" className="text-green-700 underline">
                    what will my investments be worth?
                  </a>{" "}
                  prices what a fee costs over a horizon like this.
                </Takeaway>
              </div>
            </>
          ) : (
            <EmptyState>Enter a target amount and how many years you have.</EmptyState>
          )}
        </Card>
      </div>

      {r && (
        <ChartCard title="Getting to the goal">
          <LineChart
            ariaLabel="Growth at the required return compared with a seven percent benchmark against the goal"
            periodsPerYear={12}
            series={[
              {
                label: r.required === null ? "Best case" : `At required ${pct(r.required, 1)}`,
                color: COLORS.green,
                data: r.requiredSeries,
                fill: true,
              },
              { label: `At ${BENCHMARK}% benchmark`, color: COLORS.blue, data: r.benchmarkSeries, dash: [6, 3] },
              {
                label: r.inflating && inTodaysDollars ? `Your goal (${fmtK(r.target)})` : "Your goal",
                color: COLORS.amber,
                data: r.goalLine,
                dash: [2, 3],
              },
            ]}
          />
          <div className="mt-4">
            <Takeaway tone="blue">
              Where the green line meets the amber one is your goal being met on time. The gap between
              green and blue is how much extra performance you are counting on — and the bigger that gap,
              the more the plan depends on something outside your control.
            </Takeaway>
          </div>
        </ChartCard>
      )}
    </CalcShell>
  );
}

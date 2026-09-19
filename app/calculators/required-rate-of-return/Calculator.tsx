"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { growthSeries } from "../../lib/finance";

const BENCHMARK = 7; // long-run diversified portfolio assumption

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

  const loadExample = () => {
    setCurrent(50000);
    setMonthly(800);
    setGoal(750000);
    setYears(20);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setCurrent("");
    setMonthly("");
    setGoal("");
    setYears("");
  };

  const r = useMemo(() => {
    const yrs = n(years);
    if (yrs <= 0 || n(goal) <= 0) return null;

    const required = solveRate(n(current), n(monthly), n(goal), yrs);
    const atBenchmark = endingBalance(n(current), n(monthly), BENCHMARK, yrs);
    const shortfall = n(goal) - atBenchmark;
    const neededContribution = solveContribution(n(current), n(goal), BENCHMARK, yrs);

    // Extra years needed at the benchmark return.
    let extraYears = 0;
    if (shortfall > 0) {
      for (let y = yrs; y <= yrs + 40; y += 0.25) {
        if (endingBalance(n(current), n(monthly), BENCHMARK, y) >= n(goal)) {
          extraYears = y - yrs;
          break;
        }
      }
    }

    const verdict =
      required === null
        ? { tone: "red" as const, label: "Out of reach", text: "No realistic return gets there on this timeline." }
        : required <= 4
        ? { tone: "green" as const, label: "Conservative", text: "Bonds, CDs, and a cautious portfolio can plausibly do this." }
        : required <= 8
        ? { tone: "green" as const, label: "Reasonable", text: "In line with a diversified stock-and-bond portfolio over long periods." }
        : required <= 12
        ? { tone: "amber" as const, label: "Aggressive", text: "Requires an equity-heavy portfolio and tolerance for big drawdowns." }
        : { tone: "red" as const, label: "Unrealistic", text: "Sustained returns this high are rare and should not anchor a plan." };

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
      goalLine: requiredSeries.map(() => n(goal)),
      totalContributed: n(current) + n(monthly) * 12 * yrs,
    };
  }, [current, monthly, goal, years]);

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
            <NumField label="What you have today" value={current} onChange={setCurrent} placeholder="50000" prefix="$" />
            <NumField label="Monthly contribution" value={monthly} onChange={setMonthly} placeholder="800" prefix="$" />
            <NumField label="Target amount" value={goal} onChange={setGoal} placeholder="750000" prefix="$" />
            <NumField label="Years to get there" value={years} onChange={setYears} placeholder="20" suffix="yrs" />
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
                value={r.required === null ? "Not achievable" : pct(r.required, 2)}
                tone={r.verdict.tone === "green" ? "green" : r.verdict.tone === "red" ? "red" : "gray"}
              />
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
              </div>
              <Takeaway tone={r.verdict.tone}>
                <strong>{r.verdict.label}.</strong> {r.verdict.text}
                {r.shortfall > 0 && r.extraYears > 0 && (
                  <>
                    {" "}
                    If you&apos;d rather not reach for a higher return, the same goal is reachable at{" "}
                    {BENCHMARK}% by adding <strong>{fmt(r.neededContribution - n(monthly))}/mo</strong> or
                    by giving it <strong>{r.extraYears.toFixed(1)} more years</strong>.
                  </>
                )}
              </Takeaway>
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
              { label: "Your goal", color: COLORS.amber, data: r.goalLine, dash: [2, 3] },
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

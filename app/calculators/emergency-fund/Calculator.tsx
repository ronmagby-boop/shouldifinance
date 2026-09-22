"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, DonutChart, COLORS } from "../../components/Charts";

type Situation = "stable" | "average" | "variable" | "single-income";

/**
 * The months each situation produces, and why. The common rule is three to
 * six months of essential expenses for predictable income, stretching to six
 * to twelve when income is not predictable — so every option below lands
 * inside one of those two bands, and says which.
 */
const SITUATIONS: {
  value: Situation;
  label: string;
  months: number;
  band: string;
  note: string;
}[] = [
  {
    value: "stable",
    label: "Very stable — salaried, in-demand field, two incomes",
    months: 3,
    band: "three to six",
    note: "the bottom of the three-to-six range: a second income means one job loss does not take everything, and an in-demand role is replaced faster",
  },
  {
    value: "average",
    label: "Typical — salaried, one or two incomes",
    months: 6,
    band: "three to six",
    note: "the top of the three-to-six range, and the usual answer for a salaried household",
  },
  {
    value: "single-income",
    label: "Single income supporting others",
    months: 9,
    band: "six to twelve",
    note: "inside the six-to-twelve range: one income covering dependants has no second earner to fall back on",
  },
  {
    value: "variable",
    label: "Variable — self-employed, commission, contract",
    months: 12,
    band: "six to twelve",
    note: "the top of the six-to-twelve range: irregular income means lean stretches arrive without notice, and there is no severance",
  },
];

export default function Calculator() {
  const [housing, setHousing] = useState<Num>("");
  const [food, setFood] = useState<Num>("");
  const [transport, setTransport] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [debtPayments, setDebtPayments] = useState<Num>("");
  const [other, setOther] = useState<Num>("");
  const [current, setCurrent] = useState<Num>("");
  const [monthlySaving, setMonthlySaving] = useState<Num>("");
  const [apy, setApy] = useState<Num>("");
  const [situation, setSituation] = useState<Situation>("average");

  const loadExample = () => {
    setHousing(2100);
    setFood(750);
    setTransport(480);
    setInsurance(390);
    setDebtPayments(560);
    setOther(420);
    setCurrent(6500);
    setMonthlySaving(700);
    setApy(4.2);
    setSituation("average");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setHousing("");
    setFood("");
    setTransport("");
    setInsurance("");
    setDebtPayments("");
    setOther("");
    setCurrent("");
    setMonthlySaving("");
    setApy("");
    setSituation("average");
  };

  const r = useMemo(() => {
    const essentials = n(housing) + n(food) + n(transport) + n(insurance) + n(debtPayments) + n(other);
    if (essentials <= 0) return null;

    const profile = SITUATIONS.find((s) => s.value === situation)!;
    const target = essentials * profile.months;
    const gap = Math.max(0, target - n(current));
    const monthsCovered = n(current) / essentials;

    /* One month-by-month simulation drives both the timeline and the interest
     * figure, so they cannot disagree: the same loop that finds the month the
     * target is reached is the one accumulating interest along the way. */
    const rate = n(apy) / 100 / 12;
    const balances: number[] = [n(current)];
    const targetLine: number[] = [target];
    let bal = n(current);
    let monthsToTarget: number | null = gap === 0 ? 0 : null;
    let interestEarned = 0;
    const maxMonths = 240;

    if (gap === 0) {
      /* Already funded. The old code still ran the full 240 months here,
       * because the loop only broke when it crossed a target it had already
       * crossed — quoting twenty years of interest as "earned getting there"
       * and charting two decades of growth. A funded fund just sits there. */
      for (let m = 1; m <= 12; m++) {
        bal = bal + bal * rate;
        balances.push(bal);
        targetLine.push(target);
      }
    } else {
      for (let m = 1; m <= maxMonths; m++) {
        const interest = bal * rate;
        interestEarned += interest;
        bal = bal + interest + n(monthlySaving);
        balances.push(bal);
        targetLine.push(target);
        if (bal >= target) {
          monthsToTarget = m;
          // Keep charting a few months past the finish line.
          if (m + 6 < maxMonths) {
            for (let k = m + 1; k <= m + 6; k++) {
              bal = bal + bal * rate + n(monthlySaving);
              balances.push(bal);
              targetLine.push(target);
            }
          }
          break;
        }
      }
    }

    const tiers = [3, 6, 9, 12].map((months) => ({
      months,
      amount: essentials * months,
      covered: n(current) >= essentials * months,
      band: months <= 6 ? "steady income" : "variable income",
    }));

    return {
      essentials,
      profile,
      target,
      gap,
      monthsCovered,
      monthsToTarget,
      balances,
      targetLine,
      interestEarned,
      tiers,
      progress: target > 0 ? Math.min(100, (n(current) / target) * 100) : 0,
      annualInterest: target * (n(apy) / 100),
      funded: gap === 0,
      /* Saving nothing with a gap left is a real state, and "over 20 years" is
       * a poor way to describe a plan that never arrives at all. */
      stalled: gap > 0 && n(monthlySaving) <= 0 && monthsToTarget === null,
    };
  }, [housing, food, transport, insurance, debtPayments, other, current, monthlySaving, apy, situation]);

  return (
    <CalcShell
      slug="emergency-fund"
      intro="An emergency fund is measured in months, not dollars — it's however long you could keep the lights on with no income. Add up what you'd actually have to keep paying, and see how long it takes to get there."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-payoff", "net-worth", "early-withdrawal"]}
      disclaimer="For educational purposes only. Include only essential expenses you could not cut — streaming subscriptions and dining out are not part of a survival budget. Keep emergency savings somewhere liquid and federally insured; this money's job is availability, not return."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Essential monthly expenses" badge="MUST PAY" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Housing — rent or mortgage" value={housing} onChange={setHousing} min={0} placeholder="2100" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Food & groceries" value={food} onChange={setFood} min={0} placeholder="750" prefix="$" />
              <NumField label="Transport" value={transport} onChange={setTransport} min={0} placeholder="480" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Insurance & health" value={insurance} onChange={setInsurance} min={0} placeholder="390" prefix="$" />
              <NumField label="Debt minimums" value={debtPayments} onChange={setDebtPayments} min={0} placeholder="560" prefix="$" />
            </div>
            <NumField
              label="Utilities & everything else"
              value={other}
              onChange={setOther}
              min={0}
              placeholder="420"
              prefix="$"
              hint="Only what you couldn't stop paying if income disappeared."
            />
            {r && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-amber-700 font-medium">Bare-bones monthly cost</span>
                <span className="text-sm font-medium text-amber-800">{fmt(r.essentials)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Your situation and savings" badge="PROGRESS" badgeTone="green">
          <div className="space-y-4">
            <SelectField
              label="How stable is your income?"
              value={situation}
              onChange={(v) => setSituation(v as Situation)}
              options={SITUATIONS.map((s) => ({ value: s.value, label: s.label }))}
              hint={r ? `${r.profile.months} months — ${r.profile.note}.` : undefined}
            />
            <NumField label="Saved so far" value={current} onChange={setCurrent} min={0} placeholder="6500" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Saving per month" value={monthlySaving} onChange={setMonthlySaving} min={0} placeholder="700" prefix="$" />
              <NumField label="Savings APY" value={apy} onChange={setApy} min={0} placeholder="4.2" suffix="%" step={0.1} />
            </div>
            {r && (
              <>
                <div>
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">Progress to target</span>
                    <span className="text-xs font-medium text-gray-900">{pct(r.progress, 0)}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-700 rounded-full transition-all"
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-green-700 font-medium">You currently have</span>
                  <span className="text-sm font-medium text-green-800">
                    {r.monthsCovered.toFixed(1)} months covered
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label={`Your ${r.profile.months}-month target`} value={fmtK(r.target)} />
            {/* The number is useless without the rule behind it. This sits
                above the tiles, not in a field hint, and restates itself
                whenever the selector moves so the change explains itself. */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-xs text-gray-500 leading-relaxed">
                The rule of thumb is <strong className="text-gray-900">three to six months</strong> of
                essential expenses, stretching to{" "}
                <strong className="text-gray-900">six to twelve</strong> when income is less predictable.
                Three to six suits steady salaried pay, especially with two earners. Six to twelve suits
                variable or self-employed income, commission pay, a single earner supporting others, or a
                field where finding a new role takes months.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                You picked <strong className="text-gray-900">{r.profile.label.split(" — ")[0]}</strong>,
                which sets <strong className="text-gray-900">{r.profile.months} months</strong> — {r.profile.note}.
                At {fmt(r.essentials)} a month that is{" "}
                <strong className="text-gray-900">{fmtK(r.target)}</strong>.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Months of <strong className="text-gray-900">essential expenses</strong> — not months of
                income, and not months of total spending. That is the part most people get wrong, and it
                is what the panel above is for: rent, food, transport, insurance, debt minimums and
                utilities, with nothing in it you could stop paying.
              </p>
            </div>
            <div className={`grid grid-cols-2 ${r.funded || r.stalled ? "md:grid-cols-3" : "md:grid-cols-4"} gap-2 mb-4`}>
              <Stat label="Still to save" value={fmtK(r.gap)} tone={r.gap > 0 ? "amber" : "green"} />
              <Stat
                label="Time to get there"
                value={
                  r.funded
                    ? "Already there ✓"
                    : r.stalled
                      ? "Not on this plan"
                      : r.monthsToTarget === null
                        ? "Over 20 years"
                        : fmtMonths(r.monthsToTarget)
                }
                tone={!r.funded && (r.stalled || r.monthsToTarget === null) ? "amber" : "green"}
              />
              {/* "Earned getting there" means nothing on a plan that never
                  arrives, and nothing on one that already has. */}
              {!r.funded && !r.stalled && (
                <Stat label="Interest earned getting there" value={fmt(r.interestEarned)} tone="green" />
              )}
              <Stat label="Interest once full" value={`${fmt(r.annualInterest)}/yr`} sub={`at ${pct(n(apy), 2)} APY`} />
            </div>
            <div className="space-y-2">
              <Takeaway tone={r.funded ? "green" : "amber"}>
                {r.funded ? (
                  <>
                    <strong>✓ You&apos;re fully funded.</strong> You have {r.monthsCovered.toFixed(1)}{" "}
                    months of essentials set aside. Keep it where it is, and send the{" "}
                    {fmt(n(monthlySaving))}/mo you were saving toward retirement or debt instead.
                  </>
                ) : r.stalled ? (
                  <>
                    <strong>This plan does not get there.</strong> You need{" "}
                    <strong>{fmtK(r.gap)}</strong> more and are putting nothing aside each month, so
                    interest alone would have to close it. Even {fmt(Math.round(r.essentials / 10))}/mo
                    starts the clock — a one-month starter fund of {fmt(r.essentials)} already covers most
                    of the small emergencies that would otherwise land on a credit card.
                  </>
                ) : (
                  <>
                    You need <strong>{fmtK(r.gap)}</strong> more to reach {r.profile.months} months of
                    cover. At {fmt(n(monthlySaving))}/mo that takes{" "}
                    <strong>
                      {r.monthsToTarget === null ? "over 20 years" : fmtMonths(r.monthsToTarget)}
                    </strong>
                    . If that feels long, a one-month starter fund of {fmt(r.essentials)} already covers
                    most of the small emergencies that would otherwise land on a credit card.
                  </>
                )}
              </Takeaway>
              <Takeaway tone="blue">
                Keep it somewhere you can reach the same day: a federally insured savings or money-market
                account. A CD locks it up and the market can be down exactly when you need it — an
                emergency fund is bought for availability, not return.{" "}
                <a href="/calculators/savings-apy" className="text-green-700 underline">
                  What does my savings account really earn?
                </a>{" "}
                compares what accounts actually pay.
              </Takeaway>
              <Takeaway tone="blue">
                Inflation matters less here than on a long projection, because this money is spent soon
                rather than held for decades, and a competitive APY roughly keeps pace while it sits. What
                does move is the target itself: it is {r.profile.months} times your essentials, so when
                rent or insurance goes up, {fmtK(r.target)} goes up with it. Worth re-running once a year.
              </Takeaway>
            </div>
          </div>

          <ChartCard title="Building the fund">
            <LineChart
              ariaLabel="Emergency fund balance growing over time toward the target"
              periodsPerYear={12}
              series={[
                { label: "Your savings", color: COLORS.green, data: r.balances, fill: true },
                { label: `${r.profile.months}-month target`, color: COLORS.amber, data: r.targetLine, dash: [4, 4] },
              ]}
            />
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-1">What each level of cover costs</h2>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                The first two are the three-to-six range for steady income; the last two are the
                six-to-twelve range for income that is not.
              </p>
              <div className="space-y-2">
                {r.tiers.map((t) => (
                  <div
                    key={t.months}
                    className={`flex justify-between items-center gap-2 px-4 py-3 rounded-xl border ${
                      t.months === r.profile.months
                        ? "border-green-200 bg-green-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <span className="text-xs text-gray-500">
                      {t.months} months
                      <span className="ml-2 text-gray-400">{t.band}</span>
                      {t.months === r.profile.months && (
                        <span className="ml-2 text-green-700 font-medium">your target</span>
                      )}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {fmtK(t.amount)}
                      {t.covered && <span className="ml-2 text-green-700">✓</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">What you&apos;re protecting</h2>
              <DonutChart
                ariaLabel="Monthly essential expenses split by category"
                size={150}
                centerLabel="per month"
                centerValue={fmt(r.essentials)}
                slices={[
                  { label: "Housing", value: n(housing), color: COLORS.green },
                  { label: "Food", value: n(food), color: COLORS.blue },
                  { label: "Transport", value: n(transport), color: COLORS.amber },
                  { label: "Insurance", value: n(insurance), color: COLORS.purple },
                  { label: "Debt minimums", value: n(debtPayments), color: COLORS.red },
                  { label: "Other", value: n(other), color: COLORS.gray },
                ]}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your essential monthly expenses to size your fund.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

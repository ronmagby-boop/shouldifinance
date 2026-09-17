"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, DonutChart, COLORS } from "../../components/Charts";

type Situation = "stable" | "average" | "variable" | "single-income";

const SITUATIONS: { value: Situation; label: string; months: number; note: string }[] = [
  { value: "stable", label: "Very stable — salaried, in-demand field, two incomes", months: 3, note: "Three months is a reasonable floor when your income is steady and replaceable." },
  { value: "average", label: "Typical — salaried, one or two incomes", months: 6, note: "Six months is the standard target for most households." },
  { value: "single-income", label: "Single income supporting others", months: 9, note: "One income covering dependants means a longer runway if it stops." },
  { value: "variable", label: "Variable — self-employed, commission, contract", months: 12, note: "Irregular income deserves a full year of cover; your lean months are unpredictable." },
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

  const r = useMemo(() => {
    const essentials = n(housing) + n(food) + n(transport) + n(insurance) + n(debtPayments) + n(other);
    if (essentials <= 0) return null;

    const profile = SITUATIONS.find((s) => s.value === situation)!;
    const target = essentials * profile.months;
    const gap = Math.max(0, target - n(current));
    const monthsCovered = n(current) / essentials;

    // Build the fund month by month, with interest.
    const rate = n(apy) / 100 / 12;
    const balances: number[] = [n(current)];
    const targetLine: number[] = [target];
    let bal = n(current);
    let monthsToTarget: number | null = gap === 0 ? 0 : null;
    let interestEarned = 0;
    const maxMonths = 240;

    for (let m = 1; m <= maxMonths; m++) {
      const interest = bal * rate;
      interestEarned += interest;
      bal = bal + interest + n(monthlySaving);
      balances.push(bal);
      targetLine.push(target);
      if (monthsToTarget === null && bal >= target) {
        monthsToTarget = m;
        // Keep charting a few months past the finish line.
        if (m + 6 < maxMonths) {
          for (let k = m + 1; k <= m + 6; k++) {
            const i2 = bal * rate;
            bal = bal + i2 + n(monthlySaving);
            balances.push(bal);
            targetLine.push(target);
          }
        }
        break;
      }
    }

    const tiers = [3, 6, 9, 12].map((months) => ({
      months,
      amount: essentials * months,
      covered: n(current) >= essentials * months,
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
    };
  }, [housing, food, transport, insurance, debtPayments, other, current, monthlySaving, apy, situation]);

  return (
    <CalcShell
      slug="emergency-fund"
      category="Investing"
      eyebrow="Money & savings tools"
      title="Emergency fund calculator"
      crumb="Emergency fund"
      intro="An emergency fund is measured in months, not dollars — it's however long you could keep the lights on with no income. Add up what you'd actually have to keep paying, and see how long it takes to get there."
      onExample={loadExample}
      relatedSlugs={["debt-payoff", "net-worth", "early-withdrawal"]}
      disclaimer="For educational purposes only. Include only essential expenses you could not cut — streaming subscriptions and dining out are not part of a survival budget. Keep emergency savings somewhere liquid and federally insured; this money's job is availability, not return."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Essential monthly expenses" badge="MUST PAY" badgeTone="amber">
          <div className="space-y-4">
            <NumField label="Housing — rent or mortgage" value={housing} onChange={setHousing} placeholder="2100" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Food & groceries" value={food} onChange={setFood} placeholder="750" prefix="$" />
              <NumField label="Transport" value={transport} onChange={setTransport} placeholder="480" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Insurance & health" value={insurance} onChange={setInsurance} placeholder="390" prefix="$" />
              <NumField label="Debt minimums" value={debtPayments} onChange={setDebtPayments} placeholder="560" prefix="$" />
            </div>
            <NumField
              label="Utilities & everything else"
              value={other}
              onChange={setOther}
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
              hint={r?.profile.note}
            />
            <NumField label="Saved so far" value={current} onChange={setCurrent} placeholder="6500" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Saving per month" value={monthlySaving} onChange={setMonthlySaving} placeholder="700" prefix="$" />
              <NumField label="Savings APY" value={apy} onChange={setApy} placeholder="4.2" suffix="%" step={0.1} />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Still to save" value={fmtK(r.gap)} tone={r.gap > 0 ? "amber" : "green"} />
              <Stat
                label="Time to get there"
                value={
                  r.monthsToTarget === null
                    ? "Over 20 years"
                    : r.monthsToTarget === 0
                    ? "Already there ✓"
                    : fmtMonths(r.monthsToTarget)
                }
                tone={r.monthsToTarget !== null && r.monthsToTarget <= 24 ? "green" : "amber"}
              />
              <Stat label="Interest earned getting there" value={fmt(r.interestEarned)} tone="green" />
              <Stat label="Interest once full" value={`${fmt(r.annualInterest)}/yr`} sub={`at ${pct(n(apy), 2)} APY`} />
            </div>
            <Takeaway tone={r.gap === 0 ? "green" : "amber"}>
              {r.gap === 0 ? (
                <>
                  <strong>✓ You&apos;re fully funded.</strong> You have {r.monthsCovered.toFixed(1)} months
                  of essentials set aside. Keep it in a high-yield savings account, and send the{" "}
                  {fmt(n(monthlySaving))}/mo you were saving toward retirement or debt instead.
                </>
              ) : (
                <>
                  You need <strong>{fmtK(r.gap)}</strong> more to reach {r.profile.months} months of cover.
                  At {fmt(n(monthlySaving))}/mo that takes{" "}
                  <strong>
                    {r.monthsToTarget === null ? "over 20 years" : fmtMonths(r.monthsToTarget)}
                  </strong>
                  . If that feels long, a one-month starter fund of {fmt(r.essentials)} already covers most
                  of the small emergencies that would otherwise land on a credit card.
                </>
              )}
            </Takeaway>
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
              <h2 className="text-sm font-medium text-gray-900 mb-4">What each level of cover costs</h2>
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

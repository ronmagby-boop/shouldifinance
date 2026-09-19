"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, SelectField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

type Status = "single" | "married" | "head";

// 2025 federal poverty guideline, 48 contiguous states.
const FPL_BASE = 15650;
const FPL_PER_PERSON = 5500;

export default function Calculator() {
  const [balance, setBalance] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [income, setIncome] = useState<Num>("");
  const [incomeGrowth, setIncomeGrowth] = useState<Num>("");
  const [familySize, setFamilySize] = useState<Num>("");
  const [extra, setExtra] = useState<Num>("");
  const [status, setStatus] = useState<Status>("single");

  const loadExample = () => {
    setBalance(52000);
    setRate(6.2);
    setIncome(68000);
    setIncomeGrowth(3);
    setFamilySize(1);
    setExtra(150);
    setStatus("single");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setBalance("");
    setRate("");
    setIncome("");
    setIncomeGrowth("");
    setFamilySize("");
    setExtra("");
    setStatus("single");
  };

  const r = useMemo(() => {
    const bal = n(balance);
    if (bal <= 0 || n(rate) < 0) return null;

    // --- Standard: 10 years ---
    const standardPayment = payment(bal, n(rate), 120);
    const standard = amortize(bal, n(rate), 120);

    // --- Extended: 25 years ---
    const extendedPayment = payment(bal, n(rate), 300);
    const extended = amortize(bal, n(rate), 300);

    // --- Standard with extra payments ---
    const withExtra = amortize(bal, n(rate), 120, n(extra), standardPayment);

    // --- Income-driven: 10% of discretionary income, forgiven at 20 years ---
    const povertyLine = FPL_BASE + FPL_PER_PERSON * Math.max(0, n(familySize) - 1);
    const discretionary = Math.max(0, n(income) - povertyLine * 1.5);
    const idrStartPayment = (discretionary * 0.1) / 12;

    const idrBalances: number[] = [bal];
    let idrBal = bal;
    let idrInterest = 0;
    let idrPaid = 0;
    let idrIncome = n(income);
    let idrPayment = idrStartPayment;
    let idrMonths = 0;
    let forgiven = 0;
    const monthlyRate = n(rate) / 100 / 12;
    const FORGIVE_AT = 240;

    for (let m = 1; m <= FORGIVE_AT; m++) {
      if (m > 1 && (m - 1) % 12 === 0) {
        idrIncome *= 1 + n(incomeGrowth) / 100;
        const disc = Math.max(0, idrIncome - povertyLine * 1.5);
        idrPayment = (disc * 0.1) / 12;
      }
      const interest = idrBal * monthlyRate;
      idrInterest += interest;
      const applied = Math.min(idrPayment, idrBal + interest);
      idrPaid += applied;
      idrBal = idrBal + interest - applied;
      idrBalances.push(Math.max(0, idrBal));
      idrMonths = m;
      if (idrBal <= 0.01) {
        idrBal = 0;
        break;
      }
    }
    if (idrBal > 0.01) forgiven = idrBal;

    const plans = [
      {
        name: "Standard 10-year",
        monthly: standardPayment,
        months: standard.payoffMonths,
        interest: standard.totalInterest,
        total: standard.totalPaid,
        forgiven: 0,
        balances: standard.balances,
        color: COLORS.green,
      },
      {
        name: "Extended 25-year",
        monthly: extendedPayment,
        months: extended.payoffMonths,
        interest: extended.totalInterest,
        total: extended.totalPaid,
        forgiven: 0,
        balances: extended.balances,
        color: COLORS.amber,
      },
      {
        name: "Income-driven",
        monthly: idrStartPayment,
        months: idrMonths,
        interest: idrInterest,
        total: idrPaid,
        forgiven,
        balances: idrBalances,
        color: COLORS.blue,
      },
    ];

    const cheapest = plans.reduce((a, b) => (b.total < a.total ? b : a));
    const lowestPayment = plans.reduce((a, b) => (b.monthly < a.monthly ? b : a));
    const paymentToIncome = n(income) > 0 ? (standardPayment / (n(income) / 12)) * 100 : 0;

    return {
      plans,
      cheapest,
      lowestPayment,
      standard,
      standardPayment,
      withExtra,
      extraSaves: standard.totalInterest - withExtra.totalInterest,
      extraMonthsSaved: standard.payoffMonths - withExtra.payoffMonths,
      povertyLine,
      discretionary,
      forgiven,
      idrMonths,
      paymentToIncome,
      negativeAmortization: idrStartPayment < bal * monthlyRate,
    };
  }, [balance, rate, income, incomeGrowth, familySize, extra]);

  return (
    <CalcShell
      slug="student-loan-repayment"
      intro="The lowest payment and the lowest cost are almost never the same plan. Compare standard, extended, and income-driven repayment on your actual balance — including what gets forgiven and what that costs in interest."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-payoff", "pay-off-debt", "emergency-fund"]}
      disclaimer="For educational purposes only. Federal repayment plans, their formulas, and forgiveness timelines change with legislation and regulation — verify current terms at studentaid.gov. Income-driven plans require annual recertification, and forgiven balances may be taxable. Private loans do not qualify for federal plans or forgiveness. This is not advice about your specific loans."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your loans" badge="BALANCE">
          <div className="space-y-4">
            <NumField label="Total balance" value={balance} onChange={setBalance} placeholder="52000" prefix="$" />
            <NumField
              label="Weighted average rate"
              value={rate}
              onChange={setRate}
              placeholder="6.2"
              suffix="%"
              step={0.1}
              hint="If you have several loans, use the balance-weighted average."
            />
            <NumField
              label="Extra you could pay each month"
              value={extra}
              onChange={setExtra}
              placeholder="150"
              prefix="$"
              hint="Applied on top of the standard payment."
            />
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Standard payment</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.standardPayment)}/mo</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Your income" badge="FOR IDR" badgeTone="blue">
          <div className="space-y-4">
            <NumField label="Annual gross income" value={income} onChange={setIncome} placeholder="68000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Family size" value={familySize} onChange={setFamilySize} placeholder="1" />
              <NumField label="Income growth/yr" value={incomeGrowth} onChange={setIncomeGrowth} placeholder="3" suffix="%" step={0.5} />
            </div>
            <SelectField
              label="Filing status"
              value={status}
              onChange={(v) => setStatus(v as Status)}
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married filing jointly" },
                { value: "head", label: "Head of household" },
              ]}
            />
            {r && (
              <>
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">Discretionary income</span>
                  <span className="text-sm font-medium text-blue-800">{fmtK(r.discretionary)}/yr</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Standard payment as % of income</span>
                  <span className="text-sm font-medium text-gray-900">{pct(r.paymentToIncome, 1)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Plan</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Monthly</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Payoff time</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Interest</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Total paid</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Forgiven</th>
                  </tr>
                </thead>
                <tbody>
                  {r.plans.map((p) => (
                    <tr key={p.name} className={`border-b border-gray-50 ${p.name === r.cheapest.name ? "bg-green-50" : "hover:bg-gray-50"}`}>
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: p.color }} />
                        {p.name}
                        {p.name === r.cheapest.name && <span className="ml-2 text-green-700">✓ cheapest</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmt(p.monthly)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{fmtMonths(p.months)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600">{fmtK(p.interest)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(p.total)}</td>
                      <td className="px-3 py-2.5 text-right text-green-700">{p.forgiven > 0 ? fmtK(p.forgiven) : "—"}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: COLORS.purple }} />
                      Standard + {fmt(n(extra))}/mo
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-900">{fmt(r.standardPayment + n(extra))}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmtMonths(r.withExtra.payoffMonths)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600">{fmtK(r.withExtra.totalInterest)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(r.withExtra.totalPaid)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="Cheapest overall" value={r.cheapest.name} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Total it costs" value={fmtK(r.cheapest.total)} tone="green" />
              <Stat label="Lowest monthly payment" value={fmt(r.lowestPayment.monthly)} sub={r.lowestPayment.name} />
              <Stat label="Balance forgiven on IDR" value={r.forgiven > 0 ? fmtK(r.forgiven) : "None"} tone={r.forgiven > 0 ? "green" : "default"} />
              <Stat
                label={`Extra ${fmt(n(extra))}/mo saves`}
                value={fmtK(r.extraSaves)}
                sub={`${fmtMonths(r.extraMonthsSaved)} sooner`}
                tone="green"
              />
            </div>
            <Takeaway tone={r.negativeAmortization ? "amber" : "green"}>
              {r.negativeAmortization ? (
                <>
                  <strong>⚠ On income-driven repayment your balance would grow.</strong> The{" "}
                  {fmt(r.plans[2].monthly)}/mo payment doesn&apos;t cover the{" "}
                  {fmt((n(balance) * n(rate)) / 100 / 12)}/mo in interest. That is survivable if you are
                  heading for forgiveness, but the balance climbing each month is real — and forgiven
                  amounts can be taxable.
                </>
              ) : r.forgiven > 0 ? (
                <>
                  Income-driven repayment forgives <strong>{fmtK(r.forgiven)}</strong> after 20 years,
                  which makes it the lowest out-of-pocket option — but you pay for two decades instead of
                  one, and forgiven balances may count as taxable income. The standard plan clears the debt
                  in 10 years for {fmtK(r.plans[0].total)}.
                </>
              ) : (
                <>
                  Your income is high enough relative to the balance that income-driven repayment pays the
                  loan off before any forgiveness. The <strong>{r.cheapest.name}</strong> plan costs least
                  at {fmtK(r.cheapest.total)}, and adding {fmt(n(extra))}/mo to the standard plan saves a
                  further <strong>{fmtK(r.extraSaves)}</strong>.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Balance over time by plan">
            <LineChart
              ariaLabel="Loan balance over time under standard, extended, and income-driven repayment"
              periodsPerYear={12}
              series={r.plans.map((p) => ({
                label: p.name,
                color: p.color,
                data: p.balances,
                dash: p.name === "Extended 25-year" ? [6, 3] : p.name === "Income-driven" ? [2, 3] : undefined,
              }))}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                A flat or rising line means your payment isn&apos;t covering the interest. The steeper the
                line falls, the more of each payment is reaching the principal.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="What each plan costs in total">
            <BarChart
              ariaLabel="Total amount paid under each repayment plan"
              height={220}
              bars={r.plans.map((p) => ({
                label: p.name,
                segments: [
                  { label: "Principal", value: Math.max(0, p.total - p.interest), color: COLORS.gray },
                  { label: "Interest", value: p.interest, color: p.color },
                ],
              }))}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your loan balance and interest rate to compare plans.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

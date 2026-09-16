"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, DonutChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

type Scenario = { name: string; frontEnd: number; backEnd: number; note: string; color: string };

const SCENARIOS: Scenario[] = [
  { name: "Conservative", frontEnd: 25, backEnd: 33, note: "Comfortable room for savings and the unexpected", color: COLORS.green },
  { name: "Standard", frontEnd: 28, backEnd: 36, note: "The classic 28/36 rule most lenders start from", color: COLORS.blue },
  { name: "Maximum", frontEnd: 31, backEnd: 43, note: "The upper limit of most qualified mortgages", color: COLORS.amber },
];

export default function Calculator() {
  const [income, setIncome] = useState<Num>("");
  const [debts, setDebts] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [tax, setTax] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [hoa, setHoa] = useState<Num>("");
  const [pmiRate, setPmiRate] = useState<Num>("");

  const loadExample = () => {
    setIncome(9500);
    setDebts(650);
    setDown(60000);
    setRate(6.75);
    setTerm(30);
    setTax(1.2);
    setInsurance(140);
    setHoa(0);
    setPmiRate(0.55);
  };

  const r = useMemo(() => {
    const gross = n(income);
    if (gross <= 0) return null;

    const months = Math.max(1, n(term) * 12);

    /** Solve for the price where total housing cost hits the budget. */
    const priceFor = (budget: number): number => {
      let lo = 0;
      let hi = 5_000_000;
      for (let i = 0; i < 120; i++) {
        const price = (lo + hi) / 2;
        const loan = Math.max(0, price - n(down));
        const pi = payment(loan, n(rate), months);
        const taxMo = (price * n(tax)) / 100 / 12;
        const pmiMo = price > 0 && n(down) / price < 0.2 ? (loan * n(pmiRate)) / 100 / 12 : 0;
        const total = pi + taxMo + n(insurance) + n(hoa) + pmiMo;
        if (total < budget) lo = price;
        else hi = price;
      }
      return lo;
    };

    const results = SCENARIOS.map((s) => {
      const frontBudget = (gross * s.frontEnd) / 100;
      const backBudget = Math.max(0, (gross * s.backEnd) / 100 - n(debts));
      const budget = Math.min(frontBudget, backBudget);
      const price = priceFor(budget);
      const loan = Math.max(0, price - n(down));
      const pi = payment(loan, n(rate), months);
      const taxMo = (price * n(tax)) / 100 / 12;
      const pmiMo = price > 0 && n(down) / price < 0.2 ? (loan * n(pmiRate)) / 100 / 12 : 0;
      return {
        ...s,
        price,
        loan,
        budget,
        pi,
        taxMo,
        pmiMo,
        total: pi + taxMo + n(insurance) + n(hoa) + pmiMo,
        limitedBy: backBudget < frontBudget ? "your other debts" : "the housing ratio",
        dti: ((pi + taxMo + n(insurance) + n(hoa) + pmiMo + n(debts)) / gross) * 100,
      };
    });

    const standard = results[1];
    const downPct = standard.price > 0 ? (n(down) / standard.price) * 100 : 0;

    return {
      results,
      standard,
      downPct,
      annualIncome: gross * 12,
      priceToIncome: standard.price / Math.max(1, gross * 12),
      currentDti: (n(debts) / gross) * 100,
    };
  }, [income, debts, down, rate, term, tax, insurance, hoa, pmiRate]);

  return (
    <CalcShell
      slug="home-affordability"
      category="Real estate"
      eyebrow="Real estate tools"
      title="How much house can I afford?"
      crumb="How much can I afford?"
      intro="Lenders answer this with two ratios: how much of your income goes to housing, and how much goes to all debt combined. Here are three price points — what's comfortable, what's standard, and what's the ceiling."
      onExample={loadExample}
      relatedSlugs={["mortgage-payment", "rent-vs-buy", "extra-payments"]}
      disclaimer="For educational purposes only. Qualifying depends on credit score, assets, employment history, loan program, and the lender's own overlays — this is not a pre-approval. What you can borrow and what you should borrow are different questions; leave room for maintenance, repairs, and life."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your finances" badge="INCOME">
          <div className="space-y-4">
            <NumField
              label="Gross monthly income"
              value={income}
              onChange={setIncome}
              placeholder="9500"
              prefix="$"
              hint="Before tax, household total."
            />
            <NumField
              label="Other monthly debt payments"
              value={debts}
              onChange={setDebts}
              placeholder="650"
              prefix="$"
              hint="Car loans, student loans, credit card minimums, child support."
            />
            <NumField label="Down payment" value={down} onChange={setDown} placeholder="60000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Interest rate" value={rate} onChange={setRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            </div>
          </div>
        </Card>

        <Card title="The other costs" badge="HOUSING">
          <div className="space-y-4">
            <NumField label="Property tax rate" value={tax} onChange={setTax} placeholder="1.2" suffix="%" step={0.1} hint="Annual, as a percent of the home's value." />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Insurance/mo" value={insurance} onChange={setInsurance} placeholder="140" prefix="$" />
              <NumField label="HOA/mo" value={hoa} onChange={setHoa} placeholder="0" prefix="$" />
            </div>
            <NumField
              label="PMI rate"
              value={pmiRate}
              onChange={setPmiRate}
              placeholder="0.55"
              suffix="%"
              step={0.05}
              hint="Applies when your down payment is under 20%."
            />
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Current debt-to-income</span>
                <span className="text-sm font-medium text-gray-900">{pct(r.currentDti, 1)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="A standard lender would approve about" value={fmtK(r.standard.price)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Monthly payment" value={fmt(r.standard.total)} sub="all in, PITI + HOA" />
              <Stat label="Loan amount" value={fmtK(r.standard.loan)} />
              <Stat label="Down payment" value={pct(r.downPct, 1)} tone={r.downPct >= 20 ? "green" : "amber"} sub={r.downPct >= 20 ? "No PMI ✓" : `PMI ${fmt(r.standard.pmiMo)}/mo`} />
              <Stat label="Price to income" value={`${r.priceToIncome.toFixed(1)}×`} sub="annual income" />
            </div>
            <Takeaway tone={r.currentDti > 20 ? "amber" : "green"}>
              At this price your total debt-to-income lands at{" "}
              <strong>{pct(r.standard.dti, 1)}</strong>, limited by{" "}
              <strong>{r.standard.limitedBy}</strong>.
              {n(debts) > 0 && (
                <>
                  {" "}
                  Every {fmt(100)}/mo of other debt you clear adds roughly{" "}
                  <strong>{fmtK((r.results[1].price / Math.max(1, r.results[1].budget)) * 100)}</strong> to
                  what you can borrow.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Three price points">
            <BarChart
              ariaLabel="Maximum home price under conservative, standard, and maximum debt-to-income ratios"
              height={220}
              bars={r.results.map((s) => ({
                label: s.name,
                segments: [
                  { label: "Down payment", value: Math.min(n(down), s.price), color: COLORS.gray },
                  { label: "Mortgage", value: s.loan, color: s.color },
                ],
              }))}
            />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {r.results.map((s) => (
                <div key={s.name} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-1">{fmtK(s.price)}</p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">
                    {fmt(s.total)}/mo · {s.frontEnd}/{s.backEnd} ratio
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.note}</p>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="What the monthly payment is made of">
            <DonutChart
              ariaLabel="Monthly payment breakdown at the standard affordability price"
              centerLabel="per month"
              centerValue={fmt(r.standard.total)}
              slices={[
                { label: "Principal & interest", value: r.standard.pi, color: COLORS.green },
                { label: "Property tax", value: r.standard.taxMo, color: COLORS.blue },
                { label: "Insurance", value: n(insurance), color: COLORS.purple },
                { label: "HOA", value: n(hoa), color: COLORS.teal },
                { label: "PMI", value: r.standard.pmiMo, color: COLORS.amber },
              ]}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter your gross monthly income to see what you can afford.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

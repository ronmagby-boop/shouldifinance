"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, LineChart, COLORS } from "../../components/Charts";
import { payment, aprFromFees, balanceAfter } from "../../lib/finance";

type Quote = {
  name: string;
  rate: Num;
  points: Num;
  lenderFees: Num;
  otherFees: Num;
  credits: Num;
};

const EMPTY: Quote = { name: "", rate: "", points: "", lenderFees: "", otherFees: "", credits: "" };
const TONES = [COLORS.green, COLORS.blue, COLORS.purple];

export default function Calculator() {
  const [loanAmount, setLoanAmount] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [stayYears, setStayYears] = useState<Num>("");
  const [quotes, setQuotes] = useState<Quote[]>([
    { ...EMPTY, name: "Lender A" },
    { ...EMPTY, name: "Lender B" },
    { ...EMPTY, name: "Lender C" },
  ]);

  const update = (i: number, patch: Partial<Quote>) =>
    setQuotes((q) => q.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const loadExample = () => {
    setLoanAmount(400000);
    setTerm(30);
    setStayYears(7);
    setQuotes([
      { name: "Lender A", rate: 6.625, points: 0, lenderFees: 1800, otherFees: 3200, credits: 0 },
      { name: "Lender B", rate: 6.25, points: 1.25, lenderFees: 1400, otherFees: 3100, credits: 0 },
      { name: "Lender C", rate: 6.875, points: 0, lenderFees: 900, otherFees: 3000, credits: 1500 },
    ]);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setLoanAmount("");
    setTerm("");
    setStayYears("");
    setQuotes([
    { ...EMPTY, name: "Lender A" },
    { ...EMPTY, name: "Lender B" },
    { ...EMPTY, name: "Lender C" },
  ]);
  };

  const r = useMemo(() => {
    const loan = n(loanAmount);
    const months = Math.max(1, Math.round(n(term) * 12));
    if (loan <= 0) return null;

    const rows = quotes
      .map((q, i) => {
        if (n(q.rate) <= 0) return null;
        const pointCost = (loan * n(q.points)) / 100;
        const totalFees = pointCost + n(q.lenderFees) + n(q.otherFees) - n(q.credits);
        const monthly = payment(loan, n(q.rate), months);
        const apr = aprFromFees(loan, n(q.rate), months, totalFees);
        const stayMonths = Math.max(1, Math.round(n(stayYears) * 12));
        const paidOverStay = monthly * stayMonths;
        const balanceLeft = balanceAfter(loan, n(q.rate), months, stayMonths);
        const principalPaid = loan - balanceLeft;
        const interestOverStay = paidOverStay - principalPaid;
        const costOverStay = interestOverStay + totalFees;
        const lifetimeInterest = monthly * months - loan;

        return {
          ...q,
          index: i,
          color: TONES[i],
          pointCost,
          totalFees,
          monthly,
          apr,
          costOverStay,
          interestOverStay,
          lifetimeInterest,
          totalLifetime: lifetimeInterest + totalFees,
          balanceLeft,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (rows.length === 0) return null;

    const bestOverStay = rows.reduce((a, b) => (b.costOverStay < a.costOverStay ? b : a));
    const bestMonthly = rows.reduce((a, b) => (b.monthly < a.monthly ? b : a));
    const bestUpfront = rows.reduce((a, b) => (b.totalFees < a.totalFees ? b : a));
    const worstOverStay = rows.reduce((a, b) => (b.costOverStay > a.costOverStay ? b : a));

    // Cumulative cost curves so you can see where the cheaper rate overtakes lower fees.
    const horizon = months;
    const curves = rows.map((row) => {
      const data: number[] = [];
      for (let m = 0; m <= horizon; m += 6) {
        const bal = balanceAfter(loan, n(row.rate), months, m);
        const paid = row.monthly * m;
        data.push(paid - (loan - bal) + row.totalFees);
      }
      return { label: row.name || `Lender ${row.index + 1}`, color: row.color, data };
    });

    return {
      rows,
      bestOverStay,
      bestMonthly,
      bestUpfront,
      savings: worstOverStay.costOverStay - bestOverStay.costOverStay,
      curves,
    };
  }, [loanAmount, term, stayYears, quotes]);

  return (
    <CalcShell
      slug="loan-estimate-comparison"
      intro="The lowest rate isn't always the cheapest loan. Points and fees can cost more than they save if you move or refinance first. Put three quotes side by side and compare them over the years you'll actually keep the loan."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["mortgage-payment", "effective-interest-rate", "should-i-refinance"]}
      disclaimer="For educational purposes only. Compare official Loan Estimates, which lenders must issue within three business days of an application, and check that each quote assumes the same loan amount, term, product, and lock period. APR here is calculated from the fees you enter and may differ from a lender's disclosed figure."
    >
      <Card title="The loan you're shopping" badge="SHARED TERMS" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="Loan amount" value={loanAmount} onChange={setLoanAmount} placeholder="400000" prefix="$" />
          <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
          <NumField
            label="Years you'll keep it"
            value={stayYears}
            onChange={setStayYears}
            placeholder="7"
            suffix="yrs"
            hint="Most loans end in 7-10 years."
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {quotes.map((q, i) => (
          <div key={i} className="border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-5">
              <input
                type="text"
                value={q.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={`Lender ${i + 1}`}
                className="text-sm font-medium text-gray-900 border-b border-gray-200 focus:outline-none focus:border-green-400 pb-1 w-full mr-2 bg-transparent"
              />
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: TONES[i] }} />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Rate" value={q.rate} onChange={(v) => update(i, { rate: v })} placeholder="6.625" suffix="%" step={0.125} />
                <NumField label="Points" value={q.points} onChange={(v) => update(i, { points: v })} placeholder="0" suffix="%" step={0.125} />
              </div>
              <NumField label="Lender fees" value={q.lenderFees} onChange={(v) => update(i, { lenderFees: v })} placeholder="1800" prefix="$" />
              <NumField label="Third-party fees" value={q.otherFees} onChange={(v) => update(i, { otherFees: v })} placeholder="3200" prefix="$" />
              <NumField label="Lender credits" value={q.credits} onChange={(v) => update(i, { credits: v })} placeholder="0" prefix="$" />
              {r?.rows.find((row) => row.index === i) && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                  {(() => {
                    const row = r.rows.find((x) => x.index === i)!;
                    return (
                      <>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-400">Payment</span>
                          <span className="text-sm font-medium text-gray-900">{fmt(row.monthly)}/mo</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-400">Cash to close</span>
                          <span className="text-sm font-medium text-gray-900">{fmt(row.totalFees)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs text-gray-400">APR</span>
                          <span className="text-sm font-medium text-gray-900">{pct(row.apr, 3)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Cheapest over ${n(stayYears)} years`}
              value={r.bestOverStay.name || `Lender ${r.bestOverStay.index + 1}`}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Its cost over that period" value={fmtK(r.bestOverStay.costOverStay)} sub="interest + fees" tone="green" />
              <Stat label="Savings vs. the priciest quote" value={fmtK(r.savings)} tone="green" />
              <Stat label="Lowest payment" value={`${fmt(r.bestMonthly.monthly)}/mo`} sub={r.bestMonthly.name} />
              <Stat label="Least cash at closing" value={fmt(r.bestUpfront.totalFees)} sub={r.bestUpfront.name} />
            </div>
            <Takeaway>
              Over {n(stayYears)} years,{" "}
              <strong>{r.bestOverStay.name || `Lender ${r.bestOverStay.index + 1}`}</strong> costs the
              least at {fmtK(r.bestOverStay.costOverStay)} in interest and fees combined.
              {r.bestOverStay.index !== r.bestMonthly.index && (
                <>
                  {" "}
                  Note it does <em>not</em> have the lowest monthly payment — that&apos;s{" "}
                  {r.bestMonthly.name || `Lender ${r.bestMonthly.index + 1}`} at {fmt(r.bestMonthly.monthly)}
                  /mo. Paying points buys a lower payment but only pays off if you keep the loan long
                  enough.
                </>
              )}
            </Takeaway>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Quote</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Rate</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">APR</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Payment</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Cash to close</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">{n(stayYears)}-yr cost</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium border-b border-gray-100">Lifetime cost</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.index} className={`border-b border-gray-50 ${row.index === r.bestOverStay.index ? "bg-green-50" : "hover:bg-gray-50"}`}>
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: row.color }} />
                        {row.name || `Lender ${row.index + 1}`}
                        {row.index === r.bestOverStay.index && <span className="ml-2 text-green-700">✓ best</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{pct(n(row.rate), 3)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{pct(row.apr, 3)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmt(row.monthly)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600">{fmt(row.totalFees)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-900">{fmtK(row.costOverStay)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{fmtK(row.totalLifetime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ChartCard title={`Total cost over ${n(stayYears)} years`}>
            <BarChart
              ariaLabel="Interest and fees paid by each lender over the period you keep the loan"
              height={220}
              bars={r.rows.map((row) => ({
                label: row.name || `Lender ${row.index + 1}`,
                segments: [
                  { label: "Interest", value: row.interestOverStay, color: row.color },
                  { label: "Fees & points", value: Math.max(0, row.totalFees), color: COLORS.gray },
                ],
              }))}
            />
          </ChartCard>

          <ChartCard title="Where the cheaper rate overtakes the lower fees">
            <LineChart
              ariaLabel="Cumulative interest and fees for each quote over the life of the loan"
              periodsPerYear={2}
              series={r.curves}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Each line starts at that lender&apos;s closing costs and climbs with interest. A quote that
                starts higher but rises more slowly wins eventually — the question is whether you keep the
                loan past the crossing point.
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter a loan amount and at least one lender&apos;s rate to compare quotes.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

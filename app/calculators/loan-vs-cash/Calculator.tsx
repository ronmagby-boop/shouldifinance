"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [fees, setFees] = useState<Num>("");
  const [investReturn, setInvestReturn] = useState<Num>("");
  const [taxRate, setTaxRate] = useState<Num>("");
  const [cashDiscount, setCashDiscount] = useState<Num>("");

  const loadExample = () => {
    setPrice(38000);
    setDown(5000);
    setRate(7.4);
    setTerm(60);
    setFees(300);
    setInvestReturn(5);
    setTaxRate(15);
    setCashDiscount(0);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setPrice("");
    setDown("");
    setRate("");
    setTerm("");
    setFees("");
    setInvestReturn("");
    setTaxRate("");
    setCashDiscount("");
  };

  const r = useMemo(() => {
    if (n(price) <= 0) return null;
    const months = Math.max(1, Math.round(n(term)));

    // Financing path: borrow, keep the cash invested.
    const financed = Math.max(0, n(price) - n(down));
    const monthly = payment(financed, n(rate), months);
    const schedule = amortize(financed, n(rate), months);
    if (!Number.isFinite(schedule.totalInterest)) return null;
    const totalInterest = schedule.totalInterest + n(fees);

    // Cash path: pay everything today, then invest the monthly payment instead.
    const cashPrice = n(price) - n(cashDiscount);
    const cashOutlay = cashPrice;

    const monthlyReturn = n(investReturn) / 100 / 12;
    let financePortfolio = cashPrice - n(down); // cash you did NOT spend
    let cashPortfolio = 0;
    const financeNet: number[] = [];
    const cashNet: number[] = [];
    const financeContrib = financePortfolio;
    let cashContrib = 0;

    for (let m = 1; m <= months; m++) {
      // Financing: portfolio grows, loan payment comes out of income either way,
      // so we track the portfolio against the remaining loan balance.
      financePortfolio *= 1 + monthlyReturn;
      const balance = schedule.balances[Math.min(m, schedule.balances.length - 1)] ?? 0;

      // Cash: no loan, so the payment amount gets invested each month instead.
      cashPortfolio = cashPortfolio * (1 + monthlyReturn) + monthly;
      cashContrib += monthly;

      const taxOn = (value: number, contributed: number) =>
        value - Math.max(0, value - contributed) * (n(taxRate) / 100);

      financeNet.push(taxOn(financePortfolio, financeContrib) - balance - n(fees));
      cashNet.push(taxOn(cashPortfolio, cashContrib));
    }

    const financeFinal = financeNet[financeNet.length - 1] ?? 0;
    const cashFinal = cashNet[cashNet.length - 1] ?? 0;
    const afterTaxReturn = n(investReturn) * (1 - n(taxRate) / 100);

    return {
      financed,
      monthly,
      totalInterest,
      cashOutlay,
      financeFinal,
      cashFinal,
      advantage: financeFinal - cashFinal,
      financeNet,
      cashNet,
      afterTaxReturn,
      spread: afterTaxReturn - n(rate),
      totalPaid: monthly * months + n(down) + n(fees),
      months,
    };
  }, [price, down, rate, term, fees, investReturn, taxRate, cashDiscount]);

  return (
    <CalcShell
      slug="loan-vs-cash"
      intro="Paying cash avoids interest. Financing keeps your cash invested. Whichever earns more wins — and with car loan rates where they are, that is usually closer than people expect."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["auto-affordability", "lease-vs-buy", "auto-loan-refinance"]}
      disclaimer="For educational purposes only. Assumes a steady investment return, which is not guaranteed, and that you genuinely invest the cash rather than spend it. Financing also requires qualifying credit and carries the risk of being upside down if the car depreciates faster than the loan amortizes. Not investment advice."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The purchase" badge="VEHICLE">
          <div className="space-y-4">
            <NumField label="Price out the door" value={price} onChange={setPrice} placeholder="38000" prefix="$" />
            <NumField
              label="Cash discount offered"
              value={cashDiscount}
              onChange={setCashDiscount}
              placeholder="0"
              prefix="$"
              hint="Some dealers discount for cash; many prefer financing and discount for that instead."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Down payment" value={down} onChange={setDown} placeholder="5000" prefix="$" />
              <NumField label="Loan fees" value={fees} onChange={setFees} placeholder="300" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Loan rate" value={rate} onChange={setRate} placeholder="7.4" suffix="%" step={0.25} />
              <NumField label="Loan term" value={term} onChange={setTerm} placeholder="60" suffix="mo" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Loan payment</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.monthly)}/mo</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="What your cash could earn" badge="ALTERNATIVE" badgeTone="blue">
          <div className="space-y-4">
            <NumField
              label="Investment or savings return"
              value={investReturn}
              onChange={setInvestReturn}
              placeholder="5"
              suffix="%"
              step={0.25}
              hint="A high-yield savings account or money market is the fair comparison — this money needs to stay safe."
            />
            <NumField label="Tax on those earnings" value={taxRate} onChange={setTaxRate} placeholder="15" suffix="%" step={1} />
            {r && (
              <>
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">After-tax return</span>
                  <span className="text-sm font-medium text-blue-800">{pct(r.afterTaxReturn, 2)}</span>
                </div>
                <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.spread > 0 ? "bg-blue-50" : "bg-green-50"}`}>
                  <span className={`text-xs font-medium ${r.spread > 0 ? "text-blue-700" : "text-green-700"}`}>
                    vs. your loan rate
                  </span>
                  <span className={`text-sm font-medium ${r.spread > 0 ? "text-blue-800" : "text-green-800"}`}>
                    {r.spread > 0 ? "+" : ""}{pct(r.spread, 2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This compares rates only, and charges the tax on your earnings every year. It does not
                  see {n(fees) > 0 && <>the {fmt(n(fees))} in loan fees, or </>}the fact that the two
                  sides are taxed on different amounts of gain — financing invests one lump sum, paying
                  cash builds up monthly. The projection below counts all of that, and is what the
                  results are based on.
                </p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                  <span className="text-xs text-gray-400">Total interest if you finance</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(r.totalInterest)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Pay cash</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.cashFinal)}</p>
                <p className="text-xs text-gray-400 mt-0.5">net position</p>
              </div>
              <div className={`p-4 text-center ${r.advantage > 0 ? "bg-[#1a2744]" : "bg-green-800"}`}>
                <p className="text-xs text-green-300 mb-0.5">
                  {r.advantage > 0 ? "Financing wins by" : "Paying cash wins by"}
                </p>
                <p className="text-2xl font-medium text-white">{fmt(Math.abs(r.advantage))}</p>
                <p className="text-xs text-green-300">after {r.months} months</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Finance it</p>
                <p className="text-lg font-medium text-gray-900">{fmtK(r.financeFinal)}</p>
                <p className="text-xs text-gray-400 mt-0.5">net position</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Cost of financing"
              value={fmt(r.totalInterest)}
              tone="gray"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Amount financed" value={fmtK(r.financed)} />
              <Stat label="Total paid over the loan" value={fmtK(r.totalPaid)} />
              <Stat label="Cash needed today" value={fmtK(r.cashOutlay)} tone="amber" />
              <Stat label="Loan rate vs. after-tax return" value={`${pct(n(rate), 2)} vs ${pct(r.afterTaxReturn, 2)}`} />
            </div>
            {/* Branch on the projection, the same figure the verdict tile uses. The
                rate line above compares rates alone, so it can point the other way —
                which used to print "Paying cash wins by" under a tile reading
                "Financing wins by", both quoting the same dollar figure. */}
            <Takeaway tone={r.advantage > 0 ? "blue" : "green"}>
              {r.advantage > 0 ? (
                <>
                  <strong>Financing wins by {fmt(Math.abs(r.advantage))}.</strong> Your cash earns{" "}
                  {pct(r.afterTaxReturn, 2)} after tax while the loan costs {pct(n(rate), 2)}.{" "}
                  {r.spread <= 0 ? (
                    <>
                      On rates alone that favours paying cash, but the projection taxes your earnings
                      once when you sell rather than every year, and here that is enough to turn it
                      around.
                    </>
                  ) : (
                    <>The gap is wide enough to carry the cost of borrowing.</>
                  )}{" "}
                  This only works if the money actually stays invested and you can comfortably make the
                  payment.
                </>
              ) : (
                <>
                  <strong>Paying cash wins by {fmt(Math.abs(r.advantage))}.</strong>{" "}
                  {r.spread > 0 ? (
                    <>
                      On rates alone financing looks slightly better — your cash earns{" "}
                      {pct(r.afterTaxReturn, 2)} after tax against a {pct(n(rate), 2)} loan — but that
                      margin is too thin to cover{n(fees) > 0 && <> the {fmt(n(fees))} in fees and</>}{" "}
                      the tax each side actually pays, so paying cash still comes out ahead.
                    </>
                  ) : (
                    <>
                      The loan costs {pct(n(rate), 2)} while your cash only earns{" "}
                      {pct(r.afterTaxReturn, 2)} after tax, so every month financed is a guaranteed loss
                      of the difference.
                    </>
                  )}{" "}
                  Keep enough in reserve for emergencies before writing the check.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Net position month by month">
            <LineChart
              ariaLabel="Net financial position when financing compared with paying cash"
              periodsPerYear={12}
              baselineZero
              series={[
                { label: "Finance & invest the cash", color: COLORS.blue, data: r.financeNet },
                { label: "Pay cash & invest the payment", color: COLORS.green, data: r.cashNet, dash: [6, 3] },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="amber">
                Both paths end up owning the same car, so it is excluded from both lines. What differs is
                cash: the financing path holds a portfolio against a shrinking loan, the cash path builds a
                portfolio from scratch. They converge as the loan is repaid.
              </Takeaway>
            </div>
          </ChartCard>

          <ChartCard title="What each path costs you">
            <BarChart
              ariaLabel="Interest paid when financing compared with investment earnings given up when paying cash"
              height={200}
              bars={[
                { label: "Interest if financed", segments: [{ label: "Interest", value: r.totalInterest, color: COLORS.amber }] },
                {
                  label: "Earnings given up if cash",
                  segments: [{ label: "Forgone earnings", value: Math.max(0, r.financeFinal - r.cashFinal + r.totalInterest), color: COLORS.blue }],
                },
              ]}
              valueFormat={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the vehicle price to compare financing against paying cash.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

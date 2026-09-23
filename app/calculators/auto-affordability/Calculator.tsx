"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, DonutChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/**
 * Total debt-to-income ceiling used to tighten the transportation budget: the
 * same 36% back-end ratio home-affordability treats as the standard, counting
 * every monthly obligation including the car.
 *
 * The 10% transportation guideline usually binds first — it only gives way
 * once other debts pass 26% of gross income — so this is a floor under the
 * answer rather than a replacement for it.
 */
const TOTAL_DTI_CEILING = 0.36;

/** What a lender may stretch to, which is not the same question. */
const LENDER_DTI = 0.45;

export default function Calculator() {
  const [income, setIncome] = useState<Num>("");
  const [debts, setDebts] = useState<Num>("");
  const [down, setDown] = useState<Num>("");
  const [tradeIn, setTradeIn] = useState<Num>("");
  const [tradeOwed, setTradeOwed] = useState<Num>("");
  const [rate, setRate] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  const [salesTax, setSalesTax] = useState<Num>("");
  const [insurance, setInsurance] = useState<Num>("");
  const [fuel, setFuel] = useState<Num>("");

  const loadExample = () => {
    setIncome(7200);
    setDebts(450);
    setDown(4000);
    setTradeIn(9000);
    setTradeOwed(3500);
    setRate(6.9);
    setTerm(60);
    setSalesTax(6.5);
    setInsurance(165);
    setFuel(180);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setIncome("");
    setDebts("");
    setDown("");
    setTradeIn("");
    setTradeOwed("");
    setRate("");
    setTerm("");
    setSalesTax("");
    setInsurance("");
    setFuel("");
  };

  const r = useMemo(() => {
    const gross = n(income);
    if (gross <= 0) return null;

    const cashDown = n(down) + Math.max(0, n(tradeIn) - n(tradeOwed));
    const negativeEquity = Math.max(0, n(tradeOwed) - n(tradeIn));
    const months = Math.max(1, Math.round(n(term)));

    /** Price affordable given a monthly loan-payment budget. */
    const priceFor = (loanBudget: number): number => {
      if (loanBudget <= 0) return 0;
      const r2 = n(rate) / 100 / 12;
      const financeable =
        r2 === 0 ? loanBudget * months : (loanBudget * (1 - Math.pow(1 + r2, -months))) / r2;
      // financeable = (price * (1 + tax)) - cashDown + negativeEquity
      const price = (financeable + cashDown - negativeEquity) / (1 + n(salesTax) / 100);
      return Math.max(0, price);
    };

    const ownership = n(insurance) + n(fuel);

    /* What is left for a car payment once every other monthly obligation and
     * the running costs are taken off a 36% total-debt ceiling. The other-debt
     * field used to reach only the lender bar, so two people on the same
     * income were told they could afford the same car whether they carried
     * $450 a month of other debt or none. */
    const debtRoom = Math.max(0, gross * TOTAL_DTI_CEILING - n(debts) - ownership);
    const guideline10 = Math.max(0, gross * 0.1 - ownership);
    const guideline15 = Math.max(0, gross * 0.15 - ownership);
    const boundByDebt = debtRoom < guideline10;

    const scenarios = [
      {
        name: "10% rule",
        note: "Total transportation costs stay under 10% of gross income, and all your debts stay under 36% — the conservative standard.",
        color: COLORS.green,
        budget: Math.min(guideline10, debtRoom),
      },
      {
        name: "15% of income",
        note: "A common middle ground when a car is central to your work or commute, still inside the 36% debt ceiling.",
        color: COLORS.blue,
        budget: Math.min(guideline15, debtRoom),
      },
      {
        name: "Lender maximum",
        note: "What a lender may approve at a 45% total debt-to-income ratio, counting the payments you already make. Approval is not permission.",
        color: COLORS.amber,
        budget: Math.max(0, gross * LENDER_DTI - n(debts) - ownership),
      },
    ].map((s) => {
      const price = priceFor(s.budget);
      const financed = Math.max(0, price * (1 + n(salesTax) / 100) - cashDown + negativeEquity);
      return {
        ...s,
        price,
        financed,
        loanPayment: payment(financed, n(rate), months),
        totalMonthly: s.budget + ownership,
        pctOfIncome: ((s.budget + ownership) / gross) * 100,
      };
    });

    const recommended = scenarios[0];
    // The 20/4/10 rule: 20% down, 4-year loan, 10% of income all-in.
    const rule20410Price = (() => {
      const budget = Math.min(guideline10, debtRoom);
      const r2 = n(rate) / 100 / 12;
      const financeable = r2 === 0 ? budget * 48 : (budget * (1 - Math.pow(1 + r2, -48))) / r2;
      return financeable / 0.8 / (1 + n(salesTax) / 100);
    })();

    return {
      scenarios,
      recommended,
      cashDown,
      negativeEquity,
      ownership,
      rule20410Price,
      guideline10,
      debtRoom,
      boundByDebt,
      /* Running costs alone can swallow the whole guideline, which leaves
       * nothing for a payment — a real answer, not a broken one. */
      noRoom: scenarios[0].budget <= 0,
      dtiWithCar: ((n(debts) + scenarios[0].budget + ownership) / gross) * 100,
      currentDti: (n(debts) / gross) * 100,
    };
  }, [income, debts, down, tradeIn, tradeOwed, rate, term, salesTax, insurance, fuel]);

  return (
    <CalcShell
      slug="auto-affordability"
      intro="A car payment is only part of the cost — insurance, fuel, and maintenance ride along with it. This works out a price range from your whole transportation budget, not just what a lender will approve."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["total-cost-of-ownership", "loan-vs-cash", "lease-vs-buy"]}
      disclaimer="For educational purposes only. Actual approval depends on credit score, income verification, and the lender's own limits. Insurance quotes vary widely by vehicle, so get a quote on the specific model before committing — a sports car and a sedan at the same price can differ by hundreds a month."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Your budget" badge="INCOME">
          <div className="space-y-4">
            <NumField label="Gross monthly income" value={income} onChange={setIncome} min={0} placeholder="7200" prefix="$" hint="Before tax, household total." />
            <NumField
              label="Other monthly debt payments"
              value={debts}
              onChange={setDebts}
              min={0}
              placeholder="450"
              prefix="$"
              hint="Rent or mortgage, student loans, credit cards. These hold the car payment down: everything you owe each month, the new car included, is kept under 36% of gross income."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Insurance/mo" value={insurance} onChange={setInsurance} min={0} placeholder="165" prefix="$" />
              <NumField label="Fuel & upkeep/mo" value={fuel} onChange={setFuel} min={0} placeholder="180" prefix="$" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Running costs before any payment</span>
                <span className="text-sm font-medium text-gray-900">{fmt(r.ownership)}/mo</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The deal" badge="FINANCING" badgeTone="green">
          <div className="space-y-4">
            <NumField label="Cash down payment" value={down} onChange={setDown} min={0} placeholder="4000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Trade-in value" value={tradeIn} onChange={setTradeIn} min={0} placeholder="9000" prefix="$" />
              <NumField label="Still owed on it" value={tradeOwed} onChange={setTradeOwed} min={0} placeholder="3500" prefix="$" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              Owe more than the trade is worth and the shortfall rolls into the new loan, which comes
              straight off the car you can afford rather than off the payment.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Loan rate" value={rate} onChange={setRate} min={0} placeholder="6.9" suffix="%" step={0.25} />
              <NumField label="Loan term" value={term} onChange={setTerm} min={1} placeholder="60" suffix="mo" />
            </div>
            <NumField label="Sales tax" value={salesTax} onChange={setSalesTax} min={0} placeholder="6.5" suffix="%" step={0.25} />
            {r && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.negativeEquity > 0 ? "bg-amber-50" : "bg-green-50"}`}>
                <span className={`text-xs font-medium ${r.negativeEquity > 0 ? "text-amber-700" : "text-green-700"}`}>
                  {r.negativeEquity > 0 ? "Negative equity rolled in" : "Total down payment"}
                </span>
                <span className={`text-sm font-medium ${r.negativeEquity > 0 ? "text-amber-800" : "text-green-800"}`}>
                  {fmt(r.negativeEquity > 0 ? r.negativeEquity : r.cashDown)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline label="A comfortable price to target" value={fmtK(r.recommended.price)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Loan payment" value={`${fmt(r.recommended.loanPayment)}/mo`} />
              <Stat label="All-in transportation" value={`${fmt(r.recommended.totalMonthly)}/mo`} sub={pct(r.recommended.pctOfIncome, 1) + " of income"} tone="green" />
              <Stat label="Amount financed" value={fmtK(r.recommended.financed)} />
              <Stat
                label="20/4/10 rule price"
                value={fmtK(r.rule20410Price)}
                sub="20% down, 4 years max, 10% of gross all in"
              />
              <Stat
                label="Held down by"
                value={r.boundByDebt ? "Your other debts" : "The 10% guideline"}
                tone={r.boundByDebt ? "amber" : "green"}
                sub={
                  r.boundByDebt
                    ? `${fmt(r.debtRoom)}/mo left under a 36% debt ceiling, against ${fmt(r.guideline10)} the 10% rule would allow`
                    : `${fmt(r.guideline10)}/mo, with ${fmt(r.debtRoom)} of room under the 36% debt ceiling`
                }
              />
            </div>
            {r.noRoom ? (
              <Takeaway tone="amber">
                <strong>There is no room for a car payment here.</strong>{" "}
                {r.guideline10 <= 0 ? (
                  <>
                    Insurance and fuel alone come to {fmt(r.ownership)} a month, which is already the
                    whole {fmt(n(income) * 0.1)} the 10% guideline allows for transportation. A cheaper
                    car to insure and run is the only thing that changes this — the payment is not the
                    problem.
                  </>
                ) : (
                  <>
                    Your {fmt(n(debts))} a month of other debts plus {fmt(r.ownership)} of running costs
                    already reach 36% of gross income, so a 36% ceiling leaves nothing for a payment.
                    Clearing other debt buys more room here than any deal on the car will.
                  </>
                )}
              </Takeaway>
            ) : (
            <Takeaway>
              At {fmtK(r.recommended.price)}, your total transportation cost lands at{" "}
              <strong>{fmt(r.recommended.totalMonthly)}/mo</strong> — {pct(r.recommended.pctOfIncome, 1)}{" "}
              of gross income, inside the 10% guideline. With your other debts that puts everything you
              owe at <strong>{pct(r.dtiWithCar, 1)}</strong> of gross, under the 36% ceiling.
              {r.boundByDebt && (
                <>
                  {" "}
                  That ceiling is what holds this figure down, not the 10% rule — on income alone you
                  could run to {fmt(r.guideline10)}/mo.
                </>
              )}
              {n(term) > 60 && (
                <>
                  {" "}
                  A {n(term)}-month loan stretches payments past the point where most cars are worth less
                  than the balance; 48 to 60 months is safer.
                </>
              )}
              {r.negativeEquity > 0 && (
                <>
                  {" "}
                  Rolling <strong>{fmt(r.negativeEquity)}</strong> of negative equity into the new loan
                  starts you underwater on day one, and takes{" "}
                  <strong>{fmt(r.negativeEquity / (1 + n(salesTax) / 100))}</strong> off the car you can
                  afford.
                </>
              )}
            </Takeaway>
            )}
          </div>

          <ChartCard title="Three price points">
            <BarChart
              ariaLabel="Affordable vehicle price under conservative, moderate, and lender-maximum budgets"
              height={220}
              bars={r.scenarios.map((s) => ({
                label: s.name,
                segments: [
                  { label: "Down payment", value: Math.max(0, Math.min(r.cashDown, s.price)), color: COLORS.gray },
                  { label: "Financed", value: Math.max(0, s.price - r.cashDown), color: s.color },
                ],
              }))}
            />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {r.scenarios.map((s) => (
                <div key={s.name} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-1">{fmtK(s.price)}</p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">
                    {fmt(s.loanPayment)}/mo loan · {fmt(s.totalMonthly)}/mo all in
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.note}</p>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="What you'd actually spend each month">
            <DonutChart
              ariaLabel="Monthly transportation cost split between loan payment, insurance, and fuel"
              centerLabel="per month"
              centerValue={fmt(r.recommended.totalMonthly)}
              slices={[
                { label: "Loan payment", value: r.recommended.loanPayment, color: COLORS.green },
                { label: "Insurance", value: n(insurance), color: COLORS.blue },
                { label: "Fuel & maintenance", value: n(fuel), color: COLORS.amber },
              ]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                The payment is usually just over half the real cost. Anyone budgeting on the payment alone
                is understating what the car takes out of each month by{" "}
                <strong>{fmt(r.ownership)}</strong>.
              </Takeaway>
            </div>
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

"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, LineChart, COLORS } from "../../components/Charts";
import { payment, balanceAfter } from "../../lib/finance";

export default function Calculator() {
  const [loan, setLoan] = useState<Num>("");
  const [baseRate, setBaseRate] = useState<Num>("");
  const [buyRate, setBuyRate] = useState<Num>("");
  const [cost, setCost] = useState<Num>("");
  const [stay, setStay] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");

  const loadExample = () => {
    setLoan(400000);
    setBaseRate(6.75);
    setBuyRate(6.25);
    setCost(8000);
    setStay(10);
    setTerm(30);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setLoan("");
    setBaseRate("");
    setBuyRate("");
    setCost("");
    setStay("");
    setTerm("");
  };

  const r = useMemo(() => {
    const L = n(loan);
    const term_m = Math.round(n(term) * 12);
    const stay_m = Math.round(n(stay) * 12);
    if (L <= 0 || term_m <= 0 || stay_m <= 0 || n(baseRate) <= 0 || n(buyRate) <= 0) return null;
    if (n(buyRate) >= n(baseRate)) return { invalid: true as const };

    const basePI = payment(L, n(baseRate), term_m);
    const buyPI = payment(L, n(buyRate), term_m);
    const monthlySaving = basePI - buyPI;

    /**
     * True cost of each option at month m: everything paid in so far, plus what
     * you still owe. Comparing both ways this way counts the fact that the
     * cheaper rate also pays principal down slightly faster.
     */
    const outlay = (rate: number, pi: number, upfront: number, m: number) =>
      upfront + pi * m + balanceAfter(L, rate, term_m, m);

    /**
     * Break-even is the cost over the monthly saving, the same definition
     * should-i-refinance uses. It deliberately ignores the faster principal
     * paydown on the cheaper rate: that is a real effect, but it is equity
     * rather than money back in your pocket, and counting it made this page
     * disagree with the refinance page about what break-even even means.
     */
    const breakEven = monthlySaving > 0 && n(cost) > 0 ? Math.ceil(n(cost) / monthlySaving) : null;

    // The chart still plots total cost including the balance owed, so its lines
    // cross earlier than break-even. That crossing is tracked separately rather
    // than being quietly relabelled as break-even.
    let costCrossover: number | null = null;
    const baseSeries: number[] = [];
    const buySeries: number[] = [];
    const difference: number[] = [];
    const horizon = Math.min(term_m, Math.max(stay_m, 1) * 2 + 24);
    for (let m = 0; m <= horizon; m++) {
      const b = outlay(n(baseRate), basePI, 0, m);
      const p = outlay(n(buyRate), buyPI, n(cost), m);
      baseSeries.push(b);
      buySeries.push(p);
      difference.push(b - p);
      if (costCrossover === null && m > 0 && p <= b) costCrossover = m;
    }

    const baseAtStay = outlay(n(baseRate), basePI, 0, stay_m);
    const buyAtStay = outlay(n(buyRate), buyPI, n(cost), stay_m);
    const netAtStay = baseAtStay - buyAtStay;

    // Interest paid over the holding period: payments made, less principal retired.
    const baseIntStay = basePI * stay_m - (L - balanceAfter(L, n(baseRate), term_m, stay_m));
    const buyIntStay = buyPI * stay_m - (L - balanceAfter(L, n(buyRate), term_m, stay_m));

    const pointsPct = L > 0 ? (n(cost) / L) * 100 : 0;
    const fullTermSaving = (basePI - buyPI) * term_m - n(cost);

    return {
      invalid: false as const,
      basePI, buyPI, monthlySaving, breakEven, costCrossover, baseSeries, buySeries, difference,
      baseAtStay, buyAtStay, netAtStay, stay_m, pointsPct,
      baseIntStay, buyIntStay, fullTermSaving,
      worthIt: netAtStay > 0,
    };
  }, [loan, baseRate, buyRate, cost, stay, term]);

  return (
    <CalcShell
      slug="rate-buydown"
      intro="Discount points buy a lower rate with cash today. That only pays off if you keep the loan long enough for the smaller payment to repay what you handed over. Find the month it crosses over."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["mortgage-payment", "should-i-refinance", "loan-estimate-comparison"]}
      disclaimer="For educational purposes only. Point pricing varies by lender and day, and the rate a given number of points buys is not fixed. Compare real Loan Estimates before paying for a buydown."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The loan" badge="SHARED">
          <div className="space-y-4">
            <NumField label="Loan amount" value={loan} onChange={setLoan} placeholder="400000" prefix="$" />
            <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
            <NumField
              label="How long you'll keep this loan"
              value={stay}
              onChange={setStay}
              placeholder="10"
              suffix="yrs"
              hint="Until you sell or refinance — not the full term, unless you really will keep it that long."
            />
          </div>
        </Card>

        <Card title="With and without points" badge="COMPARE" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate without points" value={baseRate} onChange={setBaseRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Rate with points" value={buyRate} onChange={setBuyRate} placeholder="6.25" suffix="%" step={0.125} />
            </div>
            <NumField
              label="Cost of the points"
              value={cost}
              onChange={setCost}
              placeholder="8000"
              prefix="$"
              hint={r && !r.invalid && r.pointsPct > 0 ? `That is ${r.pointsPct.toFixed(2)}% of the loan.` : "Paid at closing."}
            />
          </div>
        </Card>
      </div>

      {r && r.invalid ? (
        <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
          <Takeaway tone="red">
            The rate with points needs to be lower than the rate without them. Check the two rates above.
          </Takeaway>
        </div>
      ) : r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Monthly saving</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.monthlySaving)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(r.basePI)} → {fmt(r.buyPI)}</p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">Break-even</p>
                <p className="text-2xl font-medium text-white">
                  {r.breakEven === null ? "Never" : fmtMonths(r.breakEven)}
                </p>
                <p className="text-xs text-green-300">{fmt(n(cost))} ÷ {fmt(r.monthlySaving)}/mo saved</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Net over {fmtMonths(r.stay_m)}</p>
                <p className={`text-lg font-medium ${r.worthIt ? "text-green-700" : "text-red-600"}`}>
                  {r.netAtStay >= 0 ? "+" : "−"}{fmtK(Math.abs(r.netAtStay))}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  interest saved less the points, {r.worthIt ? "ahead" : "behind"}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label={`Where you stand after ${fmtMonths(r.stay_m)}`}
              value={`${r.netAtStay >= 0 ? "+" : "−"}${fmtK(Math.abs(r.netAtStay))}`}
              tone={r.worthIt ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Payment without points" value={`${fmt(r.basePI)}/mo`} />
              <Stat label="Payment with points" value={`${fmt(r.buyPI)}/mo`} tone="green" />
              <Stat label="Interest over that time" value={fmtK(r.buyIntStay)} sub={`vs ${fmtK(r.baseIntStay)}`} tone="green" />
              <Stat
                label="If you kept it the full term"
                value={`${r.fullTermSaving >= 0 ? "+" : "−"}${fmtK(Math.abs(r.fullTermSaving))}`}
                tone={r.fullTermSaving >= 0 ? "green" : "red"}
              />
            </div>
            <div className="space-y-2">
            <Takeaway tone={r.worthIt ? "green" : "amber"}>
              {r.breakEven === null ? (
                <>The smaller payment never repays the <strong>{fmt(n(cost))}</strong> you would hand over. Skip the points.</>
              ) : r.worthIt ? (
                <>
                  The points repay themselves after <strong>{fmtMonths(r.breakEven)}</strong>. Because you
                  expect to keep the loan <strong>{fmtMonths(r.stay_m)}</strong>, you come out{" "}
                  <strong>{fmtK(r.netAtStay)}</strong> ahead. Paying points is worth it here — provided you
                  really do stay that long.
                </>
              ) : (
                <>
                  Break-even lands at <strong>{fmtMonths(r.breakEven)}</strong>, which is after you expect
                  to be gone. You would be <strong>{fmtK(Math.abs(r.netAtStay))}</strong> down. Keep the
                  cash, or put it toward the down payment instead.
                </>
              )}
            </Takeaway>
            <Takeaway tone="blue">
              <strong>Points may be deductible if you itemize.</strong> On a purchase they are generally
              deductible in the year you pay them; on a refinance they usually have to be spread over
              the life of the loan instead. Around nine in ten filers take the standard deduction and get
              nothing back either way, so this is worth asking a tax preparer about rather than assuming
              — nothing on this page adjusts for it.
            </Takeaway>
            </div>
          </div>

          <ChartCard
            title="Total cost of each path"
            footnote="Everything paid in so far plus the balance still owed. These lines cross earlier than break-even above, because they also credit the faster principal paydown the cheaper rate buys."
          >
            <LineChart
              ariaLabel="Total cost with and without discount points over time"
              periodsPerYear={12}
              series={[
                { label: "No points", color: COLORS.gray, data: r.baseSeries },
                { label: "Points paid", color: COLORS.green, data: r.buySeries, dash: [6, 3] },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="How far ahead the points put you"
            footnote="The gap between the two lines above, on its own scale. It starts at minus the cost of the points and crosses zero when the cheaper rate has repaid them."
          >
            <LineChart
              ariaLabel="How far ahead paying points leaves you, month by month"
              periodsPerYear={12}
              baselineZero
              series={[{ label: "Points minus no points", color: COLORS.blue, data: r.difference }]}
            />
            <div className="mt-4">
              <Takeaway tone="blue">
                Above the line the points are ahead; below it they have not repaid yet. The two paths
                above never separate by more than a few pixels because they differ by{" "}
                <strong>{fmtK(Math.abs(r.netAtStay))}</strong> on an axis running to{" "}
                <strong>{fmtK(Math.max(...r.baseSeries))}</strong> — the same comparison, drawn where you
                can actually see it.
                {r.costCrossover !== null && (
                  <>
                    {" "}
                    It crosses zero at <strong>{fmtMonths(r.costCrossover)}</strong>, earlier than the{" "}
                    {r.breakEven === null ? "break-even" : fmtMonths(r.breakEven)} above, because this
                    view also credits the faster principal paydown.
                  </>
                )}
              </Takeaway>
            </div>
          </ChartCard>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the loan, both rates and what the points cost to find your break-even.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

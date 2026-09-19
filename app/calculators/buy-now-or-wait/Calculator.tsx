"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, pct, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, balanceAfter, typicalMonthlyRent } from "../../lib/finance";

export default function Calculator() {
  const [price, setPrice] = useState<Num>("");
  const [nowRate, setNowRate] = useState<Num>("");
  const [wait, setWait] = useState<Num>("");
  const [laterRate, setLaterRate] = useState<Num>("");
  const [appr, setAppr] = useState<Num>("");
  const [downPct, setDownPct] = useState<Num>("");
  const [term, setTerm] = useState<Num>("");
  /** What the waiting buyer pays to live somewhere meanwhile. */
  const [rent, setRent] = useState<Num>("");

  const loadExample = () => {
    setPrice(420000);
    setNowRate(6.75);
    setWait(18);
    setLaterRate(5.75);
    setAppr(4);
    setDownPct(10);
    setTerm(30);
    setRent(typicalMonthlyRent(420000));
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setPrice("");
    setNowRate("");
    setWait("");
    setLaterRate("");
    setAppr("");
    setDownPct("");
    setTerm("");
    setRent("");
  };

  const r = useMemo(() => {
    const P = n(price);
    const term_m = Math.round(n(term) * 12);
    const waitM = Math.round(n(wait));
    if (P <= 0 || term_m <= 0 || n(nowRate) <= 0 || n(laterRate) <= 0 || waitM <= 0) return null;

    const dp = Math.min(Math.max(n(downPct), 0), 100) / 100;
    const waitYears = waitM / 12;

    // Buy today
    const loanNow = P * (1 - dp);
    const piNow = payment(loanNow, n(nowRate), term_m);
    const interestNow = piNow * term_m - loanNow;
    const downNow = P * dp;
    const totalNow = downNow + piNow * term_m;

    // Buy after waiting, at a higher price and a lower rate
    const futurePrice = P * Math.pow(1 + n(appr) / 100, waitYears);
    const loanLater = futurePrice * (1 - dp);
    const piLater = payment(loanLater, n(laterRate), term_m);
    const interestLater = piLater * term_m - loanLater;
    const downLater = futurePrice * dp;
    // Waiting is not free: you live somewhere for those months, and the buy-now
    // buyer is retiring principal the whole time. Leaving rent out was enough to
    // reverse the verdict at any realistic figure.
    const rentTotal = Math.max(0, n(rent)) * waitM;
    const totalLater = rentTotal + downLater + piLater * term_m;

    // What each side actually spends over the waiting window. The buy-now
    // payments are split, because principal comes back as equity and interest
    // does not — that is the like-for-like against rent.
    const balAtWait = balanceAfter(loanNow, n(nowRate), term_m, waitM);
    const principalWhileWaiting = Math.max(0, loanNow - balAtWait);
    const paidWhileWaiting = piNow * waitM;
    const interestWhileWaiting = Math.max(0, paidWhileWaiting - principalWhileWaiting);

    /**
     * The price at which waiting stops helping: the future price whose payment
     * at the lower rate exactly matches today's payment. Payment is linear in
     * the loan amount, so scale rather than search.
     */
    // Solved on total cost, not on payment parity. Payment parity ignored both
    // the bigger down payment and the rent, which is why it read high.
    // Payment is linear in the loan, so the future price solves in closed form:
    //   rent + fp*dp + fp*(1-dp)*perDollar*term = totalNow
    const perDollarLater = payment(1, n(laterRate), term_m);
    const costPerFuturePriceDollar = dp + (1 - dp) * perDollarLater * term_m;
    const breakEvenPrice =
      costPerFuturePriceDollar > 0 ? Math.max(0, (totalNow - rentTotal) / costPerFuturePriceDollar) : 0;
    const maxTotalAppr = P > 0 ? (breakEvenPrice / P - 1) * 100 : 0;
    const maxAnnualAppr = P > 0 && waitYears > 0
      ? (Math.pow(breakEvenPrice / P, 1 / waitYears) - 1) * 100
      : 0;

    const monthlyGap = piLater - piNow;
    const totalGap = totalLater - totalNow;
    const waitingWins = totalGap < 0;
    const priceRise = futurePrice - P;

    return {
      loanNow, piNow, interestNow, downNow, totalNow,
      futurePrice, loanLater, piLater, interestLater, downLater, totalLater,
      breakEvenPrice, maxTotalAppr, maxAnnualAppr,
      monthlyGap, totalGap, waitingWins, priceRise, waitM, waitYears,
      rentTotal, principalWhileWaiting, interestWhileWaiting, paidWhileWaiting,
    };
  }, [price, nowRate, wait, laterRate, appr, downPct, term, rent]);

  return (
    <CalcShell
      slug="buy-now-or-wait"
      intro="Waiting for a lower rate only helps if prices stay still while you wait. Put today's price and rate against a future price and rate, and see how much the home can appreciate before the cheaper rate stops being worth it."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["mortgage-payment", "rent-vs-buy", "home-affordability"]}
      disclaimer="For educational purposes only. Nobody can forecast rates or prices — treat the future figures as assumptions to test, not predictions. Rent while waiting is counted, but taxes, insurance and maintenance are not — they fall on the owner either way."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="Buy today" badge="NOW">
          <div className="space-y-4">
            <NumField label="Home price today" value={price} onChange={setPrice} placeholder="420000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Rate today" value={nowRate} onChange={setNowRate} placeholder="6.75" suffix="%" step={0.125} />
              <NumField label="Down payment" value={downPct} onChange={setDownPct} placeholder="10" suffix="%" />
            </div>
            <NumField label="Loan term" value={term} onChange={setTerm} placeholder="30" suffix="yrs" />
          </div>
        </Card>

        <Card title="Or wait" badge="LATER" badgeTone="blue">
          <div className="space-y-4">
            <NumField label="How long you'd wait" value={wait} onChange={setWait} placeholder="18" suffix="mo" />
            <NumField
              label="Rent while you wait"
              value={rent}
              onChange={setRent}
              placeholder={String(typicalMonthlyRent(n(price) || 420000))}
              prefix="$"
              suffix="/mo"
              hint="You still live somewhere for those months, and this is usually the largest number on this page. Enter 0 only if you really would pay nothing — staying with family, say."
            />
            <NumField label="Rate you're hoping for" value={laterRate} onChange={setLaterRate} placeholder="5.75" suffix="%" step={0.125} />
            <NumField
              label="Home price growth while you wait"
              value={appr}
              onChange={setAppr}
              placeholder="4"
              suffix="%/yr"
              hint="The number that decides this. Try 0% and 6% to see how much it matters."
            />
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Buy now</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.piNow)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtK(r.loanNow)} loan</p>
              </div>
              <div className={`p-4 text-center ${r.waitingWins ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.waitingWins ? "Waiting wins by" : "Waiting costs you"}</p>
                <p className="text-2xl font-medium text-white">{fmtK(Math.abs(r.totalGap))}</p>
                <p className="text-xs text-white/70">over the life of the loan</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Buy in {fmtMonths(r.waitM)}</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.piLater)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtK(r.loanLater)} loan</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Home prices can rise this much before waiting stops paying"
              value={pct(r.maxAnnualAppr, 2)}
              unit="/yr"
              tone={r.maxAnnualAppr > 0 ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              <Stat label="Break-even price" value={fmtK(r.breakEvenPrice)} sub={`${pct(r.maxTotalAppr, 1)} above today`} />
              <Stat label="Price you assumed" value={fmtK(r.futurePrice)} sub={`+${fmtK(r.priceRise)}`} tone={r.waitingWins ? "green" : "amber"} />
              <Stat label="Monthly difference" value={`${r.monthlyGap >= 0 ? "+" : "−"}${fmt(Math.abs(r.monthlyGap))}`} tone={r.monthlyGap <= 0 ? "green" : "amber"} />
              <Stat label="Rent while you wait" value={fmtK(r.rentTotal)} sub={`${fmtMonths(r.waitM)} of paying to live`} tone="amber" />
              <Stat
                label="Equity you'd have meanwhile"
                value={fmtK(r.principalWhileWaiting)}
                sub={`principal in the first ${fmtMonths(r.waitM)}`}
                tone="green"
              />
              <Stat
                label="Extra down payment needed"
                value={fmtK(Math.max(0, r.downLater - r.downNow))}
                sub="already counted below"
                tone="amber"
              />
            </div>
            <Takeaway tone={r.waitingWins ? "green" : "amber"}>
              At <strong>{pct(n(appr), 1)}</strong> a year the home would cost{" "}
              <strong>{fmtK(r.futurePrice)}</strong> by the time you buy. Waiting is worth it only while
              prices grow slower than <strong>{pct(r.maxAnnualAppr, 2)}</strong> a year — past that, the
              bigger loan cancels out the cheaper rate.{" "}
              {r.waitingWins
                ? "On your assumptions, waiting comes out ahead."
                : "On your assumptions, buying now comes out ahead."}
            </Takeaway>
          </div>

          <ChartCard
            title="Total cost either way"
            footnote="Down payment plus every payment over the full term, and the rent paid while waiting."
          >
            <BarChart
              ariaLabel="Total cost of buying now compared with waiting"
              bars={[
                {
                  label: "Buy now",
                  segments: [
                    { label: "Down payment", value: r.downNow, color: COLORS.blue },
                    { label: "Principal", value: r.loanNow, color: COLORS.gray },
                    { label: "Interest", value: r.interestNow, color: COLORS.amber },
                  ],
                },
                {
                  label: `Wait ${fmtMonths(r.waitM)}`,
                  segments: [
                    { label: "Rent", value: r.rentTotal, color: COLORS.red },
                    { label: "Down payment", value: r.downLater, color: COLORS.blue },
                    { label: "Principal", value: r.loanLater, color: COLORS.gray },
                    { label: "Interest", value: r.interestLater, color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-900 mb-3">What this leaves out</h2>
            <Takeaway tone="blue">
              Over those {fmtMonths(r.waitM)} the buy-now payments come to{" "}
              <strong>{fmtK(r.paidWhileWaiting)}</strong>, but{" "}
              <strong>{fmtK(r.principalWhileWaiting)}</strong> of that is principal you keep, so the real
              cost is the <strong>{fmtK(r.interestWhileWaiting)}</strong> of interest — against{" "}
              <strong>{fmtK(r.rentTotal)}</strong> of rent, none of which comes back. What is still not
              counted: a rate you lock today is not permanent. If rates really do fall you can refinance,
              which is the strongest argument for buying now and repricing later.
            </Takeaway>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter today&apos;s price and rate, plus how long you&apos;d wait, to compare.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

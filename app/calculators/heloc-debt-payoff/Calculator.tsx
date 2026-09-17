"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

/** Most lenders lend up to about 85% of the home's value, mortgage included. */
const MAX_CLTV = 85;

export default function Calculator() {
  const [homeValue, setHomeValue] = useState<Num>("");
  const [mortgage, setMortgage] = useState<Num>("");
  const [debt, setDebt] = useState<Num>("");
  const [debtRate, setDebtRate] = useState<Num>("");
  const [debtPayment, setDebtPayment] = useState<Num>("");
  const [helocRate, setHelocRate] = useState<Num>("");
  const [helocTerm, setHelocTerm] = useState<Num>("");

  const loadExample = () => {
    setHomeValue(520000);
    setMortgage(310000);
    setDebt(34000);
    setDebtRate(22.9);
    setDebtPayment(850);
    setHelocRate(8.75);
    setHelocTerm(10);
  };

  const r = useMemo(() => {
    const D = n(debt);
    const term_m = Math.round(n(helocTerm) * 12);
    if (D <= 0 || n(debtRate) <= 0 || n(debtPayment) <= 0 || n(helocRate) < 0 || term_m <= 0) return null;

    // Keep the debt where it is, paying what you pay today.
    const keep = amortize(D, n(debtRate), 600, 0, n(debtPayment));
    const keepNeverClears = !Number.isFinite(keep.totalInterest);

    // Move it to a HELOC secured against the house.
    const helocPayment = payment(D, n(helocRate), term_m);
    const helocInterest = helocPayment * term_m - D;

    // Is there enough equity to borrow against?
    const V = n(homeValue);
    const maxBorrow = Math.max(0, V * (MAX_CLTV / 100) - n(mortgage));
    const enoughEquity = maxBorrow >= D;
    const equity = Math.max(0, V - n(mortgage));
    const cltvAfter = V > 0 ? ((n(mortgage) + D) / V) * 100 : 0;

    const interestSaved = keepNeverClears ? Infinity : keep.totalInterest - helocInterest;
    const monthlyChange = helocPayment - n(debtPayment);
    const better = keepNeverClears || interestSaved > 0;

    return {
      keep, keepNeverClears, helocPayment, helocInterest, term_m,
      maxBorrow, enoughEquity, equity, cltvAfter,
      interestSaved, monthlyChange, better,
      rateGap: n(debtRate) - n(helocRate),
    };
  }, [homeValue, mortgage, debt, debtRate, debtPayment, helocRate, helocTerm]);

  return (
    <CalcShell
      slug="heloc-debt-payoff"
      intro="A HELOC can cut a 23% credit card rate to single digits. It also turns debt you could walk away from into debt secured against your house. Both halves of that trade matter."
      onExample={loadExample}
      relatedSlugs={["debt-consolidation", "debt-payoff", "balance-transfer"]}
      disclaimer="For educational purposes only, and not advice to borrow against your home. HELOC rates are usually variable, so the payment shown can rise. Missing payments on a HELOC can cost you the house — unsecured debt carries no such risk."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The debt you'd pay off" badge="CURRENT">
          <div className="space-y-4">
            <NumField label="Total high-interest debt" value={debt} onChange={setDebt} placeholder="34000" prefix="$" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Average rate" value={debtRate} onChange={setDebtRate} placeholder="22.9" suffix="%" step={0.1} />
              <NumField label="Paying now" value={debtPayment} onChange={setDebtPayment} placeholder="850" prefix="$" />
            </div>
            {r && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400">Clear at this pace</span>
                <span className="text-sm font-medium text-gray-900">
                  {r.keepNeverClears ? "Never" : fmtMonths(r.keep.payoffMonths)}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card title="The home and the HELOC" badge="OFFER" badgeTone="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Home value" value={homeValue} onChange={setHomeValue} placeholder="520000" prefix="$" />
              <NumField label="Mortgage owed" value={mortgage} onChange={setMortgage} placeholder="310000" prefix="$" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="HELOC rate" value={helocRate} onChange={setHelocRate} placeholder="8.75" suffix="%" step={0.125} />
              <NumField label="HELOC term" value={helocTerm} onChange={setHelocTerm} placeholder="10" suffix="yrs" />
            </div>
            {r && (
              <div className={`rounded-xl px-4 py-3 flex justify-between items-center gap-2 ${r.enoughEquity ? "bg-green-50" : "bg-red-50"}`}>
                <span className={`text-xs font-medium ${r.enoughEquity ? "text-green-700" : "text-red-600"}`}>
                  You could borrow up to
                </span>
                <span className={`text-sm font-medium ${r.enoughEquity ? "text-green-800" : "text-red-700"}`}>
                  {fmt(r.maxBorrow)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {r ? (
        <>
          {!r.enoughEquity && (
            <div className="border border-red-200 rounded-2xl p-5 mb-4 bg-red-50">
              <Takeaway tone="red">
                Your equity does not stretch this far. At {MAX_CLTV}% combined loan-to-value you could
                borrow about <strong>{fmt(r.maxBorrow)}</strong>, but the debt is{" "}
                <strong>{fmt(n(debt))}</strong>. A HELOC cannot cover all of it — look at the
                consolidation or balance-transfer routes instead.
              </Takeaway>
            </div>
          )}

          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Keep the debt</p>
                <p className="text-lg font-medium text-gray-900">{fmt(n(debtPayment))}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.keepNeverClears ? "never clears" : fmtMonths(r.keep.payoffMonths)}
                </p>
              </div>
              <div className={`p-4 text-center ${r.better ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.better ? "Interest saved" : "Extra interest"}</p>
                <p className="text-2xl font-medium text-white">
                  {r.keepNeverClears ? "—" : fmtK(Math.abs(r.interestSaved))}
                </p>
                <p className="text-xs text-white/70">{r.rateGap.toFixed(1)} points lower</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Move to a HELOC</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.helocPayment)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtMonths(r.term_m)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Change to your monthly payment"
              value={`${r.monthlyChange >= 0 ? "+" : "−"}${fmt(Math.abs(r.monthlyChange))}`}
              tone={r.monthlyChange <= 0 ? "green" : "red"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Interest keeping it" value={r.keepNeverClears ? "Never clears" : fmtK(r.keep.totalInterest)} tone="amber" />
              <Stat label="Interest on the HELOC" value={fmtK(r.helocInterest)} tone="green" />
              <Stat label="Equity today" value={fmtK(r.equity)} />
              <Stat
                label="Loan-to-value after"
                value={`${r.cltvAfter.toFixed(0)}%`}
                tone={r.cltvAfter > 80 ? "amber" : "default"}
                sub={`${MAX_CLTV}% is the usual ceiling`}
              />
            </div>
            <Takeaway tone={r.better ? "green" : "amber"}>
              Dropping from <strong>{n(debtRate)}%</strong> to <strong>{n(helocRate)}%</strong>{" "}
              {r.keepNeverClears ? (
                <>turns a debt your current payment never clears into one that ends in <strong>{fmtMonths(r.term_m)}</strong>.</>
              ) : (
                <>
                  saves <strong>{fmtK(Math.abs(r.interestSaved))}</strong> in interest and clears the balance
                  in <strong>{fmtMonths(r.term_m)}</strong> instead of{" "}
                  <strong>{fmtMonths(r.keep.payoffMonths)}</strong>.
                </>
              )}
            </Takeaway>
          </div>

          <ChartCard title="Total cost of clearing the debt" footnote="The balance plus every dollar of interest.">
            <BarChart
              ariaLabel="Total cost of keeping high-interest debt compared with a HELOC"
              height={200}
              bars={[
                {
                  label: "Keep as is",
                  segments: [
                    { label: "Balance", value: n(debt), color: COLORS.gray },
                    { label: "Interest", value: Number.isFinite(r.keep.totalInterest) ? r.keep.totalInterest : 0, color: COLORS.red },
                  ],
                },
                {
                  label: "HELOC",
                  segments: [
                    { label: "Balance", value: n(debt), color: COLORS.gray },
                    { label: "Interest", value: r.helocInterest, color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="border border-red-200 rounded-2xl p-5 mb-4 bg-red-50">
            <h2 className="text-sm font-medium text-red-800 mb-3">Read this before you sign</h2>
            <div className="space-y-2">
              <Takeaway tone="red">
                <strong>You are converting unsecured debt into secured debt.</strong> Credit card debt is
                painful but your home is not on the line. A HELOC is a lien against the house — fall behind
                and foreclosure is on the table. The interest saving above is real, and so is that risk.
              </Takeaway>
              <Takeaway tone="amber">
                Most HELOC rates are variable. The <strong>{fmt(r.helocPayment)}/mo</strong> above assumes{" "}
                {n(helocRate)}% for the whole term; if rates rise, your payment rises with them. Many HELOCs
                are also interest-only during the draw period, then jump when repayment begins.
              </Takeaway>
              <Takeaway tone="blue">
                This only works once. If the cards go back to their old balances you will owe both, with
                your house backing the larger half. Be honest about whether the spending that created the
                debt has actually changed.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Enter the debt, what you pay on it now, and the HELOC you were offered.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

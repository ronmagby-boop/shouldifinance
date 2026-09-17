"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment, amortize } from "../../lib/finance";

type Debt = { balance: Num; rate: Num; min: Num };
const EMPTY: Debt = { balance: "", rate: "", min: "" };

export default function Calculator() {
  const [debts, setDebts] = useState<Debt[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [fee, setFee] = useState<Num>("");

  const setDebt = (i: number, key: keyof Debt, v: Num) =>
    setDebts(d => d.map((row, j) => (j === i ? { ...row, [key]: v } : row)));

  const loadExample = () => {
    setDebts([
      { balance: 8400, rate: 24.99, min: 250 },
      { balance: 5200, rate: 19.99, min: 160 },
      { balance: 11000, rate: 9.5, min: 290 },
      { ...EMPTY },
      { ...EMPTY },
    ]);
    setNewRate(11.9);
    setNewTerm(5);
    setFee(500);
  };

  const r = useMemo(() => {
    const live = debts.filter(d => n(d.balance) > 0 && n(d.min) > 0);
    if (live.length === 0 || n(newRate) < 0 || n(newTerm) <= 0) return null;

    // Current: each debt run at its own minimum payment.
    let totalInterest = 0;
    let longest = 0;
    let neverPaysOff = false;
    for (const d of live) {
      const res = amortize(n(d.balance), n(d.rate), 600, 0, n(d.min));
      if (!Number.isFinite(res.totalInterest)) {
        neverPaysOff = true;
        continue;
      }
      totalInterest += res.totalInterest;
      longest = Math.max(longest, res.payoffMonths);
    }

    const totalBalance = live.reduce((a, d) => a + n(d.balance), 0);
    const totalMin = live.reduce((a, d) => a + n(d.min), 0);
    const weightedRate = totalBalance > 0
      ? live.reduce((a, d) => a + n(d.balance) * n(d.rate), 0) / totalBalance
      : 0;

    // Consolidated: one loan covering every balance, plus any origination fee.
    const loan = totalBalance + n(fee);
    const term_m = Math.round(n(newTerm) * 12);
    const newPayment = payment(loan, n(newRate), term_m);
    const newInterest = newPayment * term_m - loan;

    const monthlyChange = newPayment - totalMin;
    const interestSaved = neverPaysOff ? Infinity : totalInterest - newInterest;
    const monthsSaved = neverPaysOff ? Infinity : longest - term_m;
    const better = neverPaysOff || interestSaved > 0;

    return {
      live, totalBalance, totalMin, weightedRate,
      totalInterest, longest, neverPaysOff,
      loan, newPayment, newInterest, term_m,
      monthlyChange, interestSaved, monthsSaved, better,
    };
  }, [debts, newRate, newTerm, fee]);

  return (
    <CalcShell
      slug="debt-consolidation"
      intro="One payment instead of five is easier to live with, but only helps your wallet if the new rate beats what you are paying now — after any fee. List what you owe and see both sides."
      onExample={loadExample}
      relatedSlugs={["debt-payoff", "balance-transfer", "heloc-debt-payoff"]}
      disclaimer="For educational purposes only. Consolidation loan offers depend on credit and income, and a longer term can lower the payment while raising total interest. Closing the old accounts can also move your credit score."
    >
      <Card title="What you owe now" badge="CURRENT" className="mb-4">
        <div className="space-y-3">
          <div className="hidden sm:grid grid-cols-[1fr_7rem_8rem] gap-3 px-1">
            <span className="text-xs font-medium text-gray-400">Balance</span>
            <span className="text-xs font-medium text-gray-400">Rate</span>
            <span className="text-xs font-medium text-gray-400">Minimum payment</span>
          </div>
          {debts.map((d, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_8rem] gap-3">
              <NumField label={`Debt ${i + 1}`} value={d.balance} onChange={v => setDebt(i, "balance", v)} placeholder="8400" prefix="$" />
              <NumField label="Rate" value={d.rate} onChange={v => setDebt(i, "rate", v)} placeholder="24.99" suffix="%" step={0.01} />
              <NumField label="Min/mo" value={d.min} onChange={v => setDebt(i, "min", v)} placeholder="250" prefix="$" />
            </div>
          ))}
          {debts.length < 5 && (
            <button
              onClick={() => setDebts(d => [...d, { ...EMPTY }])}
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              + Add another debt
            </button>
          )}
        </div>
      </Card>

      <Card title="The consolidation loan" badge="OFFER" badgeTone="blue" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="Rate offered" value={newRate} onChange={setNewRate} placeholder="11.9" suffix="%" step={0.1} />
          <NumField label="Term" value={newTerm} onChange={setNewTerm} placeholder="5" suffix="yrs" />
          <NumField label="Origination fee" value={fee} onChange={setFee} placeholder="500" prefix="$" />
        </div>
      </Card>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Paying now</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.totalMin)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.live.length} debts, avg {r.weightedRate.toFixed(1)}%</p>
              </div>
              <div className={`p-4 text-center ${r.better ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">{r.better ? "Interest saved" : "Extra interest"}</p>
                <p className="text-2xl font-medium text-white">
                  {r.neverPaysOff ? "—" : fmtK(Math.abs(r.interestSaved))}
                </p>
                <p className="text-xs text-white/70">{r.neverPaysOff ? "minimums never clear the debt" : "over the payoff"}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Consolidated</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.newPayment)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">one payment for {fmtMonths(r.term_m)}</p>
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
              <Stat label="Total owed" value={fmtK(r.totalBalance)} sub={n(fee) > 0 ? `${fmtK(r.loan)} with fee` : undefined} />
              <Stat label="Average rate now" value={`${r.weightedRate.toFixed(2)}%`} tone="amber" />
              <Stat label="Interest if nothing changes" value={r.neverPaysOff ? "Never clears" : fmtK(r.totalInterest)} tone="amber" />
              <Stat label="Interest consolidated" value={fmtK(r.newInterest)} tone={r.better ? "green" : "amber"} />
            </div>
            {r.neverPaysOff ? (
              <Takeaway tone="red">
                At least one of these debts has a minimum payment too small to cover its interest, so it
                never gets paid off. Consolidating at <strong>{n(newRate)}%</strong> clears everything in{" "}
                <strong>{fmtMonths(r.term_m)}</strong> — that alone is the argument.
              </Takeaway>
            ) : (
              <Takeaway tone={r.better ? "green" : "amber"}>
                Your balances average <strong>{r.weightedRate.toFixed(1)}%</strong>. At{" "}
                <strong>{n(newRate)}%</strong> over <strong>{fmtMonths(r.term_m)}</strong>, consolidating{" "}
                {r.better ? "saves" : "costs an extra"} <strong>{fmtK(Math.abs(r.interestSaved))}</strong> in
                interest and {r.monthlyChange <= 0 ? "lowers" : "raises"} your monthly payment by{" "}
                <strong>{fmt(Math.abs(r.monthlyChange))}</strong>.
                {r.monthsSaved < 0 && (
                  <> Note the payoff takes <strong>{fmtMonths(Math.abs(r.monthsSaved))}</strong> longer.</>
                )}
              </Takeaway>
            )}
          </div>

          <ChartCard title="What each route costs" footnote="Principal plus all the interest paid to clear it.">
            <BarChart
              ariaLabel="Total cost of keeping current debts compared with consolidating"
              height={200}
              bars={[
                {
                  label: "Keep as is",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: Number.isFinite(r.totalInterest) ? r.totalInterest : 0, color: COLORS.amber },
                  ],
                },
                {
                  label: "Consolidate",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Fee", value: n(fee), color: COLORS.purple },
                    { label: "Interest", value: r.newInterest, color: COLORS.amber },
                  ],
                },
              ]}
            />
          </ChartCard>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4">
            <Takeaway tone="blue">
              A lower payment often comes from a longer term rather than a better rate — check the interest
              figures above, not just the monthly number. And consolidation only works if the freed-up cards
              stay unused; running the balances back up leaves you with both the loan and the cards.
            </Takeaway>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Add at least one debt with a balance and minimum payment, plus the loan you were offered.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

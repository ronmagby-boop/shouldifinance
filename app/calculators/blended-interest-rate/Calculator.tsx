"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import CalcShell from "../../components/CalcShell";
import DebtList, { BLANK_DEBT, type DebtRow } from "../../components/DebtList";
import { Card, Stat, Takeaway, EmptyState, fmt, pct, n, has } from "../../components/Inputs";

/**
 * A payment has to beat the month's interest or the balance never falls.
 * Relative rather than exact, for the reason debt-payoff gives: a payment
 * quoted as a percentage of the balance lands a fraction of a cent either side
 * of the interest, and an exact `<=` would flag it at random. Same guard.
 */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;
const monthlyInterest = (balance: number, rate: number) => (balance * rate) / 100 / 12;

export default function Calculator() {
  const [debts, setDebts] = useState<DebtRow[]>([{ ...BLANK_DEBT }, { ...BLANK_DEBT }, { ...BLANK_DEBT }]);

  const update = (i: number, patch: Partial<DebtRow>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK_DEBT }]);
  const removeDebt = (i: number) => setDebts((d) => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d));

  const loadExample = () => {
    // The mortgage is most of the balance and pulls the blend to 7.04%, which
    // is close to its own 6.5% and nowhere near the two cards. The cards are
    // 2.8% of what is owed and 10.2% of the interest — the gap this page is for.
    setDebts([
      { name: "Mortgage", balance: 285000, rate: 6.5, pmt: 1896, payoff: true },
      { name: "Student loan", balance: 26800, rate: 5.8, pmt: 295, payoff: true },
      { name: "Car loan", balance: 21400, rate: 7.4, pmt: 465, payoff: true },
      { name: "Credit card", balance: 7900, rate: 24.99, pmt: 240, payoff: true },
      { name: "Store card", balance: 1650, rate: 29.99, pmt: 55, payoff: true },
    ]);
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDebts([{ ...BLANK_DEBT }, { ...BLANK_DEBT }, { ...BLANK_DEBT }]);
  };

  /**
   * Per-debt figures, keyed by row so the list can flag a row in place.
   *
   * A row counts once it has a balance and a rate. A blank rate is not read as
   * 0%: a debt with no rate typed yet would otherwise drag the blend down
   * while looking unfinished, and a genuine 0% can still be entered as 0.
   */
  const rows = useMemo(
    () =>
      debts.map((d, i) => {
        const balance = n(d.balance);
        const rate = n(d.rate);
        const interest = monthlyInterest(balance, rate);
        const hasPayment = has(d.pmt);
        const pmt = n(d.pmt);
        return {
          index: i,
          name: d.name.trim() || `Debt ${i + 1}`,
          balance,
          rate,
          interest,
          hasPayment,
          pmt,
          counts: d.payoff && balance > 0 && has(d.rate),
          // Balance × monthly rate, not the payment, decides this: the payment
          // is only compared against it.
          neverAmortizes: balance > 0 && has(d.rate) && hasPayment && pmt <= interest * INTEREST_ONLY_EPSILON,
        };
      }),
    [debts],
  );

  const r = useMemo(() => {
    const live = rows.filter((d) => d.counts);
    if (live.length === 0) return null;

    // Balances and rates only. The payment appears nowhere in these three.
    const totalBalance = live.reduce((a, d) => a + d.balance, 0);
    const blended = live.reduce((a, d) => a + d.balance * d.rate, 0) / totalBalance;
    const totalInterest = live.reduce((a, d) => a + d.interest, 0);

    const ranked = live
      .map((d) => ({
        ...d,
        balanceShare: d.balance / totalBalance,
        // Zero only when every rate is zero; then nobody's share is meaningful.
        interestShare: totalInterest > 0 ? d.interest / totalInterest : 0,
        // Where a payment was entered: the month's interest comes out first,
        // and whatever is left reduces the balance.
        toInterest: d.hasPayment ? Math.min(d.interest, d.pmt) : 0,
        toPrincipal: d.hasPayment ? Math.max(0, d.pmt - d.interest) : 0,
      }))
      .sort((a, b) => b.interest - a.interest || b.balance - a.balance);

    const largest = ranked.reduce((a, d) => (d.balance > a.balance ? d : a));
    // The debt the blend understates most: the widest gap between its share of
    // the interest and its share of the balance. Not simply the highest rate —
    // a tiny balance at 30% can be further above the blend and still matter
    // less than a larger one at 25%.
    const outlier = ranked.reduce((a, d) =>
      d.interestShare - d.balanceShare > a.interestShare - a.balanceShare ? d : a,
    );
    const sameRate = ranked.every((d) => d.rate === ranked[0].rate);

    const paying = ranked.filter((d) => d.hasPayment);
    const paid = paying.reduce((a, d) => a + d.pmt, 0);
    const paidToInterest = paying.reduce((a, d) => a + d.toInterest, 0);
    const paidToPrincipal = paying.reduce((a, d) => a + d.toPrincipal, 0);
    // Interest the payment does not reach, which is added to the balance.
    const unpaidInterest = paying.reduce((a, d) => a + Math.max(0, d.interest - d.pmt), 0);

    return {
      ranked, totalBalance, blended, totalInterest,
      largest, outlier, sameRate,
      paying, paid, paidToInterest, paidToPrincipal, unpaidInterest,
      stuck: ranked.filter((d) => d.neverAmortizes),
      unpaidCount: ranked.length - paying.length,
    };
  }, [rows]);

  /**
   * The narrative's branch, decided once so the hero cell's caption and the
   * takeaway cannot tell different stories about the same blend.
   *   single — one debt, so the blend is its rate
   *   flat   — several debts, one rate, so there is nothing to hide
   *   hidden — the largest balance pulls the blend toward its own rate, and a
   *            smaller debt carries far more of the interest than its size
   *   led    — the largest balance is itself the outlier, so the blend leans
   *            toward the expensive end rather than hiding it
   */
  const story = !r
    ? null
    : r.ranked.length === 1
      ? "single"
      : r.sameRate
        ? "flat"
        : r.largest.index !== r.outlier.index
          ? "hidden"
          : "led";

  return (
    <CalcShell
      slug="blended-interest-rate"
      intro="List what you owe and the rate on each. We'll weight every rate by its balance to find the one rate your debt blends to, add up what it costs in interest each month, and show which debts that interest actually comes from."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-payoff", "debt-consolidation", "refinance-to-pay-off-debt", "effective-interest-rate"]}
      disclaimer="For educational purposes only. Monthly interest is estimated as balance × rate ÷ 12. Card issuers charge on the average daily balance and compound daily, and installment loans follow their own schedules, so a statement will differ slightly from these figures. Assumes the rates stay where they are."
    >
      <Card title="What you owe" badge="UNTICK TO LEAVE ONE OUT" className="mb-4">
        <DebtList
          debts={debts}
          onUpdate={update}
          onAdd={addDebt}
          onRemove={removeDebt}
          paymentLabel="Monthly payment"
          balancePlaceholder="7900"
          ratePlaceholder="24.99"
          paymentPlaceholder="240"
          checkboxAction="Include"
          rowNote={(_, i) => {
            const row = rows[i];
            if (!row?.counts || !row.neverAmortizes) return null;
            return (
              <p className="text-xs text-red-700 leading-relaxed mt-1 xl:pl-10">
                <strong>This payment never pays it down.</strong> {fmt(row.pmt)} against{" "}
                {fmt(row.interest)} of interest a month leaves nothing for the balance
                {row.pmt < row.interest ? ", which grows instead" : ""}.
              </p>
            );
          }}
        />
        <p className="text-xs text-gray-400 leading-relaxed mt-3">
          The payment is optional and never changes the blended rate. It is only used to split what you
          pay each month into interest and principal.
        </p>
      </Card>

      {r && story ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center" data-x-stat="Total owed">
                <p className="text-xs text-gray-400 mb-1">Total owed</p>
                <p className="text-lg font-medium text-gray-900" data-x-value>{fmt(r.totalBalance)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.ranked.length} {r.ranked.length === 1 ? "debt" : "debts"}
                </p>
              </div>
              <div className="p-4 text-center bg-green-800">
                <p className="text-xs text-green-300 mb-0.5">Blended rate</p>
                <p className="text-2xl font-medium text-white" data-x-headline="Blended rate">{pct(r.blended, 2)}</p>
                <p className="text-xs text-green-300">
                  {story === "single"
                    ? "one debt, so its own rate"
                    : story === "flat"
                      ? "every debt at the same rate"
                      : "weighted by balance"}
                </p>
              </div>
              <div className="p-4 text-center" data-x-stat="Interest each month">
                <p className="text-xs text-gray-400 mb-1">Interest each month</p>
                <p className="text-lg font-medium text-gray-900" data-x-value>{fmt(r.totalInterest)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(r.totalInterest * 12)} a year</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Takeaway tone="blue">
              {story === "single" && (
                <>
                  With one debt there is nothing to blend: <strong>{pct(r.blended, 2)}</strong> is simply its
                  rate, and it costs <strong>{fmt(r.totalInterest)}</strong> a month in interest. Add the rest
                  of what you owe to see where it sits among them.
                </>
              )}
              {story === "flat" && (
                <>
                  Every debt here carries <strong>{pct(r.blended, 2)}</strong>, so the blend is that rate and
                  each debt&apos;s share of the <strong>{fmt(r.totalInterest)}</strong> a month in interest is
                  exactly its share of the balance.
                </>
              )}
              {story === "hidden" && (
                <>
                  Your debts blend to <strong>{pct(r.blended, 2)}</strong>, which costs{" "}
                  <strong>{fmt(r.totalInterest)}</strong> a month. That average is weighted by balance, so{" "}
                  {r.largest.name} at {pct(r.largest.rate, 2)} — {pct(r.largest.balanceShare * 100, 0)} of what
                  you owe — pulls it toward its own rate. {r.outlier.name} at{" "}
                  <strong>{pct(r.outlier.rate, 2)}</strong> is {pct(r.outlier.balanceShare * 100, 1)} of the
                  balance and <strong>{pct(r.outlier.interestShare * 100, 1)}</strong> of the interest, and
                  the blend barely shows it.
                </>
              )}
              {story === "led" && (
                <>
                  Your debts blend to <strong>{pct(r.blended, 2)}</strong>, which costs{" "}
                  <strong>{fmt(r.totalInterest)}</strong> a month. Here the largest balance is also the most
                  expensive — {r.largest.name} at {pct(r.largest.rate, 2)} is{" "}
                  {pct(r.largest.balanceShare * 100, 0)} of what you owe and{" "}
                  <strong>{pct(r.largest.interestShare * 100, 1)}</strong> of the interest — so the blend
                  leans toward the high end rather than hiding it.
                </>
              )}
            </Takeaway>
          </div>

          <Card title="Where the interest comes from" badge="RANKED" badgeTone="amber" className="mb-4">
            <ol className="space-y-3">
              {r.ranked.map((d, idx) => (
                <li
                  key={d.index}
                  className="border border-gray-100 rounded-xl p-3 bg-white"
                  data-x-stat={`${d.name} monthly interest`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-gray-900 min-w-0">
                      <span className="text-gray-400 mr-2">{idx + 1}.</span>
                      <span className="font-medium break-words">{d.name}</span>
                      <span className="text-gray-400"> · {pct(d.rate, 2)}</span>
                    </p>
                    <p className="text-sm font-medium text-gray-900 whitespace-nowrap" data-x-value>
                      {fmt(d.interest)}/mo
                    </p>
                  </div>

                  {/* Two bars on one scale. Where the amber one outruns the gray
                      one, the debt costs more than its size suggests. */}
                  <div className="mt-2 space-y-1" aria-hidden="true">
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${d.interestShare * 100}%` }} />
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-gray-400" style={{ width: `${d.balanceShare * 100}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    <span className="text-amber-700 font-medium">{pct(d.interestShare * 100, 1)} of the interest</span>
                    {" · "}
                    {pct(d.balanceShare * 100, 1)} of the balance
                  </p>

                  {d.hasPayment && (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {d.neverAmortizes ? (
                        <span className="text-red-700">
                          {d.pmt > 0
                            ? `All of the ${fmt(d.pmt)} payment goes to interest — none reaches the balance.`
                            : "With no payment, none of the interest is paid and the balance grows."}
                        </span>
                      ) : (
                        <>
                          Of the {fmt(d.pmt)} payment, {fmt(d.toInterest)} is interest (
                          {pct((d.toInterest / d.pmt) * 100, 0)}) and {fmt(d.toPrincipal)} is principal (
                          {pct((d.toPrincipal / d.pmt) * 100, 0)}).
                        </>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <p className="text-xs text-gray-400 leading-relaxed mt-3">
              <span className="inline-block w-3 h-2 rounded-full bg-amber-500 mr-1 align-middle" aria-hidden="true" />
              share of the monthly interest{" "}
              <span className="inline-block w-3 h-2 rounded-full bg-gray-400 mx-1 align-middle" aria-hidden="true" />
              share of the balance
            </p>
          </Card>

          {r.paid > 0 && (
            <Card title="Where this month's payments go" badge="INTEREST VS. PRINCIPAL" className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <Stat label="Paid each month" value={fmt(r.paid)} sub={`across ${r.paying.length} ${r.paying.length === 1 ? "debt" : "debts"}`} />
                <Stat
                  label="To interest"
                  value={fmt(r.paidToInterest)}
                  sub={`${pct((r.paidToInterest / r.paid) * 100, 1)} of the payments`}
                  tone="amber"
                />
                <Stat
                  label="To principal"
                  value={fmt(r.paidToPrincipal)}
                  sub={`${pct((r.paidToPrincipal / r.paid) * 100, 1)} of the payments`}
                  tone="green"
                />
              </div>
              {/* One bar, the whole payment. Principal and interest sum to it
                  exactly, because a payment below the interest is capped at
                  the interest rather than counted as negative principal. */}
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex" aria-hidden="true">
                <div className="h-full bg-amber-500" style={{ width: `${(r.paidToInterest / r.paid) * 100}%` }} />
                <div className="h-full bg-green-700" style={{ width: `${(r.paidToPrincipal / r.paid) * 100}%` }} />
              </div>
              <div className="space-y-1 mt-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  The interest share is set by the balances and rates, not by the payment: each debt&apos;s
                  interest for the month comes out first, and whatever is left reduces what you owe.
                </p>
                {r.unpaidInterest > 0 && (
                  <p className="text-xs text-red-700 leading-relaxed">
                    {fmt(r.unpaidInterest)} a month of interest is not covered by the payments on{" "}
                    {r.stuck.filter((d) => d.pmt < d.interest).map((d) => d.name).join(", ")} and is added
                    to the balance instead.
                  </p>
                )}
                {r.unpaidCount > 0 && (
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {r.unpaidCount === 1 ? "One debt has" : `${r.unpaidCount} debts have`} no payment entered
                    and {r.unpaidCount === 1 ? "is" : "are"} left out of this split, though{" "}
                    {r.unpaidCount === 1 ? "it still counts" : "they still count"} in the blended rate above.
                  </p>
                )}
              </div>
            </Card>
          )}

          <div className="border border-gray-100 rounded-2xl p-5 mb-4 bg-gray-50 space-y-2">
            <p className="text-sm font-medium text-gray-900">A blended rate, not an effective rate</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              This page averages the rates you are carrying today, each weighted by its balance. That is a
              different number from an effective rate, which is about one loan: the{" "}
              <Link href="/calculators/effective-interest-rate" className="text-green-700 underline underline-offset-2">
                effective interest rate calculator
              </Link>{" "}
              takes a quoted rate and adds the points and fees paid to get it, over the years you keep the
              loan. Use this one to see what your debt as a whole costs; use that one to price a single
              offer.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Neither says what order to pay things off in. The{" "}
              <Link href="/calculators/debt-payoff" className="text-green-700 underline underline-offset-2">
                debt payoff calculator
              </Link>{" "}
              compares the two usual orders on the same list of debts.
            </p>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>Add at least one debt with a balance and a rate to see your blended rate.</EmptyState>
        </div>
      )}
    </CalcShell>
  );
}

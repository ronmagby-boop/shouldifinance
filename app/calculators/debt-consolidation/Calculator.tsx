"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import CalcShell from "../../components/CalcShell";
import DebtList, { BLANK_DEBT, type DebtRow } from "../../components/DebtList";
import {
  Card, NumField, Headline, Stat, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/**
 * A minimum that does not cover the month's interest never clears the debt.
 * Relative rather than exact: a minimum quoted as a percentage of the balance
 * lands a fraction of a cent either side and an exact `<=` would call that a
 * stalemate at random. Same guard as debt-payoff.
 */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;

/** One debt run at its own minimum until it clears. No rollover. */
function atMinimum(balance: number, rate: number, min: number) {
  const r = rate / 100 / 12;
  let bal = balance;
  let interest = 0;
  let months = 0;
  for (let i = 0; i < 1200 && bal > 0.005; i++) {
    const int = bal * r;
    if (min <= int * INTEREST_ONLY_EPSILON) return { interest: Infinity, months: Infinity };
    interest += int;
    bal -= Math.min(min - int, bal);
    months = i + 1;
  }
  return { interest, months };
}

export default function Calculator() {
  const [debts, setDebts] = useState<DebtRow[]>([{ ...BLANK_DEBT }]);
  const [newRate, setNewRate] = useState<Num>("");
  const [newTerm, setNewTerm] = useState<Num>("");
  const [fee, setFee] = useState<Num>("");
  /** Optional. Blank means "assume I can borrow whatever I need". */
  const [cap, setCap] = useState<Num>("");

  const update = (i: number, patch: Partial<DebtRow>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK_DEBT }]);
  const removeDebt = (i: number) => setDebts((d) => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d));

  const loadExample = () => {
    // All three start checked, including the 9.5% car loan, because that is
    // what a lender's "roll it all in" offer looks like. The row flags what it
    // costs — teaching it with the mistake on screen beats hiding the debt.
    setDebts([
      { name: "Credit card", balance: 8400, rate: 24.99, pmt: 250, payoff: true },
      { name: "Store card", balance: 5200, rate: 19.99, pmt: 160, payoff: true },
      { name: "Car loan", balance: 11000, rate: 9.5, pmt: 290, payoff: true },
    ]);
    setNewRate(11.9);
    setNewTerm(5);
    setFee(500);
    setCap("");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDebts([{ ...BLANK_DEBT }]);
    setNewRate("");
    setNewTerm("");
    setFee("");
    setCap("");
  };

  const rateOffered = n(newRate);
  const termMonths = Math.round(n(newTerm) * 12);

  /**
   * Which debts a borrowing cap can reach, best first.
   *
   * Every dollar moved earns the gap between the two rates, so the loan fills
   * highest rate first and stops dead at any debt priced at or below the loan
   * — room left over is no reason to move money uphill.
   *
   * Whole debts only. A partial payoff is the mathematically better answer,
   * but the leftover balance needs a minimum payment and this page cannot know
   * one: a card's minimum is a percentage of the balance and would fall, an
   * installment loan's is fixed and the term would shorten instead. Inventing
   * either would quietly move the baseline everything is measured against, so
   * a debt that does not fit whole is skipped and a smaller one behind it is
   * considered instead.
   */
  const recommendation = useMemo(() => {
    const capValue = n(cap);
    if (capValue <= 0 || rateOffered <= 0) return null;
    const available = capValue - n(fee);
    const ranked = debts
      .map((d, i) => ({ i, balance: n(d.balance), rate: n(d.rate), live: n(d.balance) > 0 && n(d.pmt) > 0 }))
      .filter((d) => d.live)
      .sort((a, b) => b.rate - a.rate);

    const picked = new Set<number>();
    let room = available;
    let skipped = 0;
    for (const d of ranked) {
      if (d.rate <= rateOffered) break;
      if (d.balance <= room) {
        picked.add(d.i);
        room -= d.balance;
      } else {
        skipped += 1;
      }
    }
    return { picked, room: Math.max(0, room), available, skipped, capValue };
  }, [cap, fee, debts, rateOffered]);

  /**
   * Apply the recommendation when the numbers behind it change, but not when
   * the user ticks a box — the key deliberately leaves `payoff` out, so a
   * manual override survives until an input actually moves.
   */
  const appliedKey = useRef("");
  const recPicked = recommendation?.picked;
  useEffect(() => {
    if (!recPicked) {
      appliedKey.current = "";
      return;
    }
    const key = JSON.stringify([cap, fee, newRate, debts.map((d) => [d.balance, d.rate, d.pmt])]);
    if (key === appliedKey.current) return;
    appliedKey.current = key;
    setDebts((ds) => ds.map((d, i) => (d.payoff === recPicked.has(i) ? d : { ...d, payoff: recPicked.has(i) })));
  }, [recPicked, cap, fee, newRate, debts]);

  const r = useMemo(() => {
    const live = debts
      .map((d, i) => ({
        index: i,
        name: d.name.trim() || `Debt ${i + 1}`,
        balance: n(d.balance),
        rate: n(d.rate),
        min: n(d.pmt),
        payoff: d.payoff,
      }))
      .filter((d) => d.balance > 0 && d.min > 0);

    if (live.length === 0 || rateOffered < 0 || termMonths <= 0) return null;

    const rows = live.map((d) => {
      const keep = atMinimum(d.balance, d.rate, d.min);
      // This balance alone, moved into the loan on the loan's own terms.
      const moveInterest = payment(d.balance, rateOffered, termMonths) * termMonths - d.balance;
      return {
        ...d,
        keepInterest: keep.interest,
        keepMonths: keep.months,
        moveInterest,
        // Positive means moving it costs more than leaving it alone.
        movePenalty: Number.isFinite(keep.interest) ? moveInterest - keep.interest : -Infinity,
        stuck: !Number.isFinite(keep.interest),
        belowLoanRate: d.rate < rateOffered,
      };
    });

    const chosen = rows.filter((d) => d.payoff);
    const kept = rows.filter((d) => !d.payoff);
    const stuck = rows.filter((d) => d.stuck);
    const keptStuck = kept.filter((d) => d.stuck);

    const totalBalance = rows.reduce((a, d) => a + d.balance, 0);
    const totalMin = rows.reduce((a, d) => a + d.min, 0);
    const weightedRate = totalBalance > 0
      ? rows.reduce((a, d) => a + d.balance * d.rate, 0) / totalBalance
      : 0;

    const chosenBalance = chosen.reduce((a, d) => a + d.balance, 0);
    // The fee is financed, so it rides on the loan and earns interest too.
    const loan = chosenBalance > 0 ? chosenBalance + n(fee) : 0;
    const newPayment = loan > 0 ? payment(loan, rateOffered, termMonths) : 0;
    const loanInterest = loan > 0 ? newPayment * termMonths - loan : 0;

    const keptMin = kept.reduce((a, d) => a + d.min, 0);
    const keptInterest = kept.reduce((a, d) => a + d.keepInterest, 0);
    const keptLongest = kept.reduce((a, d) => Math.max(a, Number.isFinite(d.keepMonths) ? d.keepMonths : 0), 0);

    // Baseline: every debt at its own minimum until it clears. Nothing rolls
    // over onto anything else, which is what "if nothing changes" means here.
    const interestNow = rows.reduce((a, d) => a + d.keepInterest, 0);
    const interestAfter = loanInterest + keptInterest;

    const monthlyNow = totalMin;
    const monthlyAfter = newPayment + keptMin;
    const monthlyChange = monthlyAfter - monthlyNow;

    // Net of the fee. The fee is a real cost of consolidating and the intro
    // promises the comparison is made after it.
    const totalSaved = Number.isFinite(interestNow)
      ? interestNow - interestAfter - n(fee)
      : Infinity;
    const interestOnlySaved = Number.isFinite(interestNow) ? interestNow - interestAfter : Infinity;

    const longestNow = rows.reduce((a, d) => Math.max(a, Number.isFinite(d.keepMonths) ? d.keepMonths : 0), 0);
    const doneAfter = Math.max(chosen.length > 0 ? termMonths : 0, keptLongest);

    const better = stuck.length > 0 ? keptStuck.length === 0 : totalSaved > 0;
    const costlyMoves = chosen.filter((d) => d.belowLoanRate);
    const costlyTotal = costlyMoves.reduce((a, d) => a + (Number.isFinite(d.movePenalty) ? d.movePenalty : 0), 0);

    return {
      rows, chosen, kept, stuck, keptStuck,
      totalBalance, totalMin, weightedRate,
      chosenBalance, loan, newPayment, loanInterest,
      keptMin, keptInterest, keptLongest,
      interestNow, interestAfter, interestOnlySaved, totalSaved,
      monthlyNow, monthlyAfter, monthlyChange,
      longestNow, doneAfter, better,
      costlyMoves, costlyTotal,
      neverClears: !Number.isFinite(interestNow),
    };
  }, [debts, rateOffered, termMonths, fee]);

  return (
    <CalcShell
      slug="debt-consolidation"
      intro="One payment instead of five is easier to live with, but only helps your wallet if the new rate beats what you are paying now — after any fee. Tick the debts you would roll in, leave the cheap ones out, and see both sides."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["refinance-to-pay-off-debt", "debt-payoff", "balance-transfer", "heloc-debt-payoff"]}
      disclaimer="For educational purposes only. Consolidation loan offers depend on credit and income, and a longer term can lower the payment while raising total interest. Closing the old accounts can also move your credit score."
    >
      <Card title="What you owe now" badge="TICK WHAT YOU'D ROLL IN" className="mb-4">
        <DebtList
          debts={debts}
          onUpdate={update}
          onAdd={addDebt}
          onRemove={removeDebt}
          paymentLabel="Minimum"
          balancePlaceholder="8400"
          ratePlaceholder="24.99"
          paymentPlaceholder="250"
          checkboxAction="Consolidate"
          rowNote={(d, i) => {
            const row = r?.rows.find((x) => x.index === i);
            if (!row) return null;
            if (row.stuck) {
              return (
                <p className="text-xs text-red-700 leading-relaxed mt-1 xl:pl-10">
                  This minimum doesn&apos;t cover the month&apos;s interest, so the balance grows and it
                  never clears on its own. Consolidating is the way out of that.
                </p>
              );
            }
            if (!d.payoff || !row.belowLoanRate) return null;
            return (
              <p className="text-xs text-amber-700 leading-relaxed mt-1 xl:pl-10">
                <strong>{row.rate}% is below the {rateOffered}% you were offered.</strong> Rolling this one
                in costs about {fmt(row.movePenalty)} more than leaving it where it is
                {Number.isFinite(row.keepMonths) && (
                  <> — it clears on its own in {fmtMonths(row.keepMonths)}</>
                )}
                . Untick it unless you want the simplicity.
              </p>
            );
          }}
        />
      </Card>

      <Card title="The consolidation loan" badge="OFFER" badgeTone="blue" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <NumField label="Rate offered" value={newRate} onChange={setNewRate} min={0} placeholder="11.9" suffix="%" step={0.1} />
          <NumField label="Term" value={newTerm} onChange={setNewTerm} min={0} placeholder="5" suffix="yrs" />
          <NumField label="Origination fee" value={fee} onChange={setFee} min={0} placeholder="500" prefix="$" />
        </div>
        <NumField
          label="I can borrow up to"
          value={cap}
          onChange={setCap}
          min={0}
          placeholder="15000"
          prefix="$"
          hint="Optional. Enter a limit and the ticks above are set to the debts worth paying off within it — highest rate first, stopping at anything priced below the loan. You can change them afterwards."
        />
        {recommendation && r && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 mt-3 space-y-1">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>
                {r.chosen.length > 0
                  ? `Recommended: pay off ${r.chosen.map((d) => d.name).join(", ")}.`
                  : "Nothing here is worth borrowing for."}
              </strong>{" "}
              {fmt(recommendation.capValue)} of borrowing, less the {fmt(n(fee))} fee, leaves{" "}
              {fmt(recommendation.available)} for balances. {fmt(recommendation.room)} of that is unused —
              whole debts only, because a part-paid balance needs a new minimum payment and this page
              can&apos;t know what it would be.
            </p>
            {recommendation.skipped > 0 && (
              <p className="text-xs text-blue-800 leading-relaxed">
                {recommendation.skipped === 1 ? "One debt was" : `${recommendation.skipped} debts were`}{" "}
                skipped for being larger than the room left.
              </p>
            )}
          </div>
        )}
      </Card>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Paying now</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.monthlyNow)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.rows.length} {r.rows.length === 1 ? "debt" : "debts"}, avg {r.weightedRate.toFixed(1)}%
                </p>
              </div>
              <div className={`p-4 text-center ${r.better ? "bg-green-800" : "bg-amber-600"}`}>
                <p className="text-xs text-white/70 mb-0.5">
                  {r.better ? "Saved, after the fee" : "Extra cost, after the fee"}
                </p>
                <p className="text-2xl font-medium text-white">
                  {r.neverClears ? "—" : fmtK(Math.abs(r.totalSaved))}
                </p>
                <p className="text-xs text-white/70">
                  {r.neverClears ? "minimums never clear the debt" : `interest less the ${fmt(n(fee))} fee`}
                </p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">After consolidating</p>
                <p className="text-lg font-medium text-gray-900">{fmt(r.monthlyAfter)}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.kept.length > 0
                    ? `loan plus ${r.kept.length} kept ${r.kept.length === 1 ? "debt" : "debts"}`
                    : `one payment for ${fmtMonths(termMonths)}`}
                </p>
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
              <Stat
                label="Rolled into the loan"
                value={fmtK(r.chosenBalance)}
                sub={n(fee) > 0 ? `${fmtK(r.loan)} with the fee` : `of ${fmtK(r.totalBalance)} owed`}
              />
              <Stat label="Average rate now" value={`${r.weightedRate.toFixed(2)}%`} tone="amber" />
              <Stat
                label="Interest if nothing changes"
                value={r.neverClears ? "Never clears" : fmtK(r.interestNow)}
                sub="each debt at its own minimum"
                tone="amber"
              />
              <Stat
                label="Interest after"
                value={fmtK(r.interestAfter)}
                sub={r.kept.length > 0 ? "loan plus kept debts" : "the loan alone"}
                tone={r.better ? "green" : "amber"}
              />
            </div>
            {r.neverClears ? (
              <Takeaway tone={r.keptStuck.length > 0 ? "red" : "green"}>
                {r.stuck.map((d) => d.name).join(", ")}{" "}
                {r.stuck.length === 1 ? "has a minimum" : "have minimums"} too small to cover the interest,
                so {r.stuck.length === 1 ? "it never gets" : "they never get"} paid off.{" "}
                {r.keptStuck.length > 0 ? (
                  <>
                    <strong>
                      {r.keptStuck.map((d) => d.name).join(", ")} {r.keptStuck.length === 1 ? "is" : "are"} still outside the loan
                    </strong>{" "}
                    — tick {r.keptStuck.length === 1 ? "it" : "them"} or nothing here changes that.
                  </>
                ) : (
                  <>
                    Consolidating at <strong>{rateOffered}%</strong> clears everything in{" "}
                    <strong>{fmtMonths(termMonths)}</strong> — that alone is the argument.
                  </>
                )}
              </Takeaway>
            ) : (
              <Takeaway tone={r.better ? "green" : "amber"}>
                Your balances average <strong>{r.weightedRate.toFixed(1)}%</strong>. Rolling{" "}
                {fmtK(r.chosenBalance)} of them into a <strong>{rateOffered}%</strong> loan over{" "}
                <strong>{fmtMonths(termMonths)}</strong>{" "}
                {r.better ? "saves" : "costs an extra"} <strong>{fmtK(Math.abs(r.totalSaved))}</strong>{" "}
                once the {fmt(n(fee))} fee is counted, and{" "}
                {r.monthlyChange <= 0 ? "lowers" : "raises"} what you pay each month by{" "}
                <strong>{fmt(Math.abs(r.monthlyChange))}</strong>.
                {r.costlyMoves.length > 0 && (
                  <>
                    {" "}
                    <strong>
                      Leaving {r.costlyMoves.map((d) => d.name).join(" and ")} out would save a further{" "}
                      {fmtK(r.costlyTotal)}
                    </strong>{" "}
                    — {r.costlyMoves.length === 1 ? "that rate is" : "those rates are"} already below the
                    loan.
                  </>
                )}
                {r.doneAfter > r.longestNow && (
                  <> Note the payoff takes <strong>{fmtMonths(r.doneAfter - r.longestNow)}</strong> longer.</>
                )}
              </Takeaway>
            )}
          </div>

          <ChartCard
            title="What each route costs"
            footnote="Principal plus all the interest paid to clear it, and the fee where there is one."
          >
            <BarChart
              ariaLabel="Total cost of keeping current debts compared with consolidating"
              height={200}
              bars={[
                {
                  label: "Keep as is",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: Number.isFinite(r.interestNow) ? r.interestNow : 0, color: COLORS.amber },
                  ],
                },
                {
                  label: "Consolidate",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Fee", value: n(fee), color: COLORS.purple },
                    { label: "Interest", value: r.interestAfter, color: COLORS.amber },
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

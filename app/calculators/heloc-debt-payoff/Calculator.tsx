"use client";
import { useMemo, useState } from "react";
import CalcShell from "../../components/CalcShell";
import DebtList, { BLANK_DEBT, type DebtRow } from "../../components/DebtList";
import {
  Card, NumField, Headline, Takeaway, EmptyState,
  fmt, fmtK, months as fmtMonths, n, type Num,
} from "../../components/Inputs";
import { ChartCard, BarChart, COLORS } from "../../components/Charts";
import { payment } from "../../lib/finance";

/** Same guard as debt-payoff and debt-consolidation. */
const INTEREST_ONLY_EPSILON = 1 + 1e-9;

/** The variable-rate scenario each panel shows, in percentage points. */
const RATE_SHOCK = 2;

type Kind = "cashflow" | "faster" | "minimum" | "custom";

/** "A", "A and B", "A, B and C" — not "A and B and C". */
const listNames = (xs: { name: string }[]): string =>
  xs.length <= 1
    ? xs[0]?.name ?? ""
    : xs.length === 2
      ? `${xs[0].name} and ${xs[1].name}`
      : `${xs.slice(0, -1).map((x) => x.name).join(", ")} and ${xs[xs.length - 1].name}`;

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

type Scenario = ReturnType<typeof buildScenario>;

/**
 * One way of paying the line, start to finish.
 *
 * The draw period charges interest and accepts whatever the borrower sends;
 * anything above the month's interest comes off the principal. Whatever is
 * left when the draw ends then has to amortise over the repayment period,
 * which is where the payment jumps.
 *
 * Every figure on the page comes out of here. The headline, the panels and
 * the takeaway all read the same objects, so the copy cannot drift from the
 * model the way it did when the term was modelled in one place and described
 * in another.
 */
function buildScenario(
  kind: Kind,
  label: string,
  draw: number,
  monthlyPayment: number,
  rate: number,
  drawMonths: number,
  repayMonths: number,
  keptInterest: number,
  keptMin: number,
  interestNow: number,
) {
  const monthlyRate = rate / 100 / 12;
  let bal = draw;
  let drawInterest = 0;
  let drawPaid = 0;
  let clearedInDraw = 0;
  for (let m = 1; m <= drawMonths && bal > 0.005; m++) {
    const int = bal * monthlyRate;
    drawInterest += int;
    const applied = Math.min(monthlyPayment, bal + int);
    drawPaid += applied;
    bal = bal + int - applied;
    if (bal <= 0.005) {
      bal = 0;
      clearedInDraw = m;
    }
  }

  const balanceAtRepay = Math.max(0, bal);
  const amortising = balanceAtRepay > 0.005;
  const repayPayment = amortising ? payment(balanceAtRepay, rate, repayMonths) : 0;
  const repayInterest = amortising ? repayPayment * repayMonths - balanceAtRepay : 0;
  const repayPaymentShocked = amortising ? payment(balanceAtRepay, rate + RATE_SHOCK, repayMonths) : 0;

  const helocInterest = drawInterest + repayInterest;
  return {
    kind,
    label,
    drawPayment: monthlyPayment,
    monthlyAfter: monthlyPayment + keptMin,
    drawPaid,
    balanceAtRepay,
    balanceUnmoved: draw > 0 && balanceAtRepay >= draw - 0.005,
    clearedInDraw,
    amortising,
    repayPayment,
    repayPaymentShocked,
    jump: repayPayment - monthlyPayment,
    jumpPct: monthlyPayment > 0 ? (repayPayment / monthlyPayment - 1) * 100 : 0,
    helocInterest,
    months: clearedInDraw > 0 ? clearedInDraw : drawMonths + repayMonths,
    // Kept debts sit on both sides of this and cancel out.
    saved: Number.isFinite(interestNow) ? interestNow - (helocInterest + keptInterest) : Infinity,
  };
}

export default function Calculator() {
  const [debts, setDebts] = useState<DebtRow[]>([{ ...BLANK_DEBT }]);
  const [homeValue, setHomeValue] = useState<Num>("");
  const [mortgage, setMortgage] = useState<Num>("");
  const [helocRate, setHelocRate] = useState<Num>("");
  const [drawYears, setDrawYears] = useState<Num>("");
  const [repayYears, setRepayYears] = useState<Num>("");
  /** Optional fourth scenario. Blank shows just the three anchors. */
  const [drawAmount, setDrawAmount] = useState<Num>("");

  const update = (i: number, patch: Partial<DebtRow>) =>
    setDebts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addDebt = () => setDebts((d) => [...d, { ...BLANK_DEBT }]);
  const removeDebt = (i: number) => setDebts((d) => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d));

  const loadExample = () => {
    // $34,000 across three balances with $850 of minimums between them, so the
    // "what I pay now" anchor is derived rather than asserted. The auto loan is
    // below the HELOC rate and starts ticked, because rolling in the cheap debt
    // alongside the expensive is exactly the move worth flagging.
    setDebts([
      { name: "Credit card", balance: 18500, rate: 24.99, pmt: 460, payoff: true },
      { name: "Store card", balance: 5500, rate: 27.99, pmt: 165, payoff: true },
      { name: "Auto loan", balance: 10000, rate: 6.9, pmt: 225, payoff: true },
    ]);
    setHomeValue(520000);
    setMortgage(310000);
    setHelocRate(8.75);
    setDrawYears(10);
    setRepayYears(20);
    setDrawAmount("");
  };

  /** Back to the page's initial state: every field, flag and row. */
  const clearExample = () => {
    setDebts([{ ...BLANK_DEBT }]);
    setHomeValue("");
    setMortgage("");
    setHelocRate("");
    setDrawYears("");
    setRepayYears("");
    setDrawAmount("");
  };

  const rate = n(helocRate);
  const drawMonths = Math.round(n(drawYears) * 12);
  const repayMonths = Math.round(n(repayYears) * 12);

  const r = useMemo(() => {
    const rows = debts
      .map((d, i) => ({
        index: i,
        name: d.name.trim() || `Debt ${i + 1}`,
        balance: n(d.balance),
        rate: n(d.rate),
        min: n(d.pmt),
        payoff: d.payoff,
      }))
      .filter((d) => d.balance > 0 && d.min > 0)
      .map((d) => {
        const keep = atMinimum(d.balance, d.rate, d.min);
        // Isolates the rate: the same balance, over the same number of months
        // it would have taken at its own minimum, priced at the HELOC's rate.
        const atHelocRate = Number.isFinite(keep.months)
          ? payment(d.balance, rate, keep.months) * keep.months - d.balance
          : Infinity;
        return {
          ...d,
          keepInterest: keep.interest,
          keepMonths: keep.months,
          rateOnlyPenalty: Number.isFinite(keep.interest) ? atHelocRate - keep.interest : -Infinity,
          stuck: !Number.isFinite(keep.interest),
          notCheaper: d.rate <= rate,
        };
      });

    if (rows.length === 0 || rate < 0 || drawMonths <= 0 || repayMonths <= 0) return null;

    const chosen = rows.filter((d) => d.payoff);
    const kept = rows.filter((d) => !d.payoff);
    const stuck = rows.filter((d) => d.stuck);
    const keptStuck = kept.filter((d) => d.stuck);

    const draw = chosen.reduce((a, d) => a + d.balance, 0);
    const interestOnlyPayment = (draw * rate) / 100 / 12;
    /** What the ticked debts cost today. */
    const payNowAmount = chosen.reduce((a, d) => a + d.min, 0);

    // Baseline: every debt at its own minimum until it clears, no rollover.
    const interestNow = rows.reduce((a, d) => a + d.keepInterest, 0);
    const keptInterest = kept.reduce((a, d) => a + d.keepInterest, 0);
    const keptMin = kept.reduce((a, d) => a + d.min, 0);
    const chosenInterest = chosen.reduce((a, d) => a + d.keepInterest, 0);

    const run = (kind: Kind, label: string, pmt: number) =>
      buildScenario(kind, label, draw, pmt, rate, drawMonths, repayMonths, keptInterest, keptMin, interestNow);

    /* ---- 1. The cash-flow answer. ---------------------------------------
     * The payment that clears the draw on the date the ticked debts would
     * have cleared anyway. Same debt-free date, smaller monthly, less
     * interest — which is the honest version of "frees up cash", as opposed
     * to the interest-only minimum, which frees up more and never ends.
     *
     * Derived from the baseline: the longest of the ticked debts' own payoff
     * times. Capped at the draw period so the payment is constant and there
     * is no recast; if the baseline runs past the draw, this clears sooner
     * than the baseline rather than later, and the panel reports its real
     * payoff time either way.
     */
    const chosenAllFinite = chosen.length > 0 && chosen.every((d) => Number.isFinite(d.keepMonths));
    const baselineMonths = chosenAllFinite
      ? chosen.reduce((a, d) => Math.max(a, d.keepMonths), 0)
      : 0;
    const sameTimelineTarget = Math.min(baselineMonths, drawMonths);
    const cashFlowScenario = sameTimelineTarget > 0 && draw > 0
      ? run("cashflow", "Free up cash flow", payment(draw, rate, sameTimelineTarget))
      : null;

    /* What the ticked debts actually cost per month, averaged over the
     * baseline — because the $850 does not last: each debt drops out as it
     * clears, so the saving is widest on day one and narrows from there. */
    const avgCurrentOutlay = baselineMonths > 0 ? (draw + chosenInterest) / baselineMonths : 0;
    const freedToday = cashFlowScenario ? payNowAmount - cashFlowScenario.drawPayment : 0;
    const freedAverage = cashFlowScenario ? avgCurrentOutlay - cashFlowScenario.drawPayment : 0;

    /* ---- 2 and 3. Faster, and the warning. ------------------------------ */
    /* When the interest-only minimum is already above what these debts cost
     * today, "keep paying what you pay now" is not an option the lender
     * offers — the floor is higher. The scenario is still built so the copy
     * has something to read, but it stops being a panel of its own, because
     * it would be the interest-only panel under a second name. */
    const payNowDistinct = payNowAmount > interestOnlyPayment + 0.5;
    const payNowScenario = run("faster", "Pay it off faster", Math.max(payNowAmount, interestOnlyPayment));
    const minimumScenario = run("minimum", "Interest-only minimum", interestOnlyPayment);

    /* ---- Anything the reader wants instead. ------------------------------
     * Tested on the figure that would actually be paid, not the one typed:
     * an amount under the interest-only minimum is clamped up to it and
     * would otherwise duplicate a panel under a label saying otherwise. */
    const customAmount = n(drawAmount);
    const effectiveCustom = Math.max(customAmount, interestOnlyPayment);
    const distinct = (a: number, b: number) => Math.abs(a - b) > 0.5;
    const custom = customAmount > 0
      && distinct(effectiveCustom, interestOnlyPayment)
      && distinct(effectiveCustom, payNowScenario.drawPayment)
      && (!cashFlowScenario || distinct(effectiveCustom, cashFlowScenario.drawPayment))
      ? run("custom", `Paying ${fmt(effectiveCustom)}/mo`, effectiveCustom)
      : null;
    const customUnderInterest = customAmount > 0 && customAmount < interestOnlyPayment;

    const totalBalance = rows.reduce((a, d) => a + d.balance, 0);
    const monthlyNow = rows.reduce((a, d) => a + d.min, 0);
    const weightedRate = totalBalance > 0
      ? rows.reduce((a, d) => a + d.balance * d.rate, 0) / totalBalance
      : 0;
    /** The rate the HELOC is actually replacing — ticked debts only. */
    const chosenBlended = draw > 0 ? chosen.reduce((a, d) => a + d.balance * d.rate, 0) / draw : 0;

    /* ---- Equity. Information, not a gate. -------------------------------- */
    const value = n(homeValue);
    const equity = Math.max(0, value - n(mortgage));
    const cltvBefore = value > 0 ? (n(mortgage) / value) * 100 : 0;
    const cltvAfter = value > 0 ? ((n(mortgage) + draw) / value) * 100 : 0;

    /* ---- The answer, and the reason for it. ------------------------------
     * Cheaper means cheaper than the blend it replaces. The sentence under
     * the answer still reads its numbers off the scenarios, so a "no" that
     * sits above a panel showing a saving says what that saving really is:
     * the effect of paying faster, not of the rate.
     */
    const cheaperRate = rate < chosenBlended;

    return {
      rows, chosen, kept, stuck, keptStuck,
      draw, totalBalance, weightedRate, chosenBlended, monthlyNow, payNowAmount,
      interestOnlyPayment, interestNow, keptMin,
      cashFlowScenario, payNowScenario, payNowDistinct, minimumScenario, custom, customUnderInterest,
      baselineMonths, sameTimelineTarget, avgCurrentOutlay, freedToday, freedAverage,
      cheaperRate,
      equity, cltvBefore, cltvAfter, value,
      costlyMoves: chosen.filter((d) => d.notCheaper),
      neverClears: !Number.isFinite(interestNow),
    };
  }, [debts, homeValue, mortgage, rate, drawMonths, repayMonths, drawAmount]);

  const panels: Scenario[] = r
    ? [
        ...(r.cashFlowScenario ? [r.cashFlowScenario] : []),
        ...(r.payNowDistinct ? [r.payNowScenario] : []),
        r.minimumScenario,
        ...(r.custom ? [r.custom] : []),
      ]
    : [];
  // Both class strings written out in full so Tailwind sees them.
  const panelGrid = panels.length >= 4
    ? "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
    : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4";

  const line = (k: string, v: string, tone = "text-gray-900") => (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-400">{k}</span>
      <span className={`text-sm font-medium ${tone}`}>{v}</span>
    </div>
  );

  return (
    <CalcShell
      slug="heloc-debt-payoff"
      intro="A HELOC can cut a 25% credit card rate to single digits, which is why it looks like breathing room. What it ends up costing depends more on how you pay it than on the rate. Here is what each way of paying it actually does."
      onExample={loadExample}
      onClear={clearExample}
      relatedSlugs={["debt-consolidation", "refinance-to-pay-off-debt", "debt-payoff", "balance-transfer"]}
      disclaimer="For educational purposes only, and not a commitment to lend. HELOC rates are usually variable, so the payments shown can rise, and the rate you are offered depends on your credit and your equity."
    >
      <Card title="The debts you'd pay off" badge="TICK WHAT THE HELOC COVERS" className="mb-4">
        <DebtList
          debts={debts}
          onUpdate={update}
          onAdd={addDebt}
          onRemove={removeDebt}
          paymentLabel="Minimum"
          balancePlaceholder="18500"
          ratePlaceholder="24.99"
          paymentPlaceholder="460"
          checkboxAction="Pay off with the HELOC"
          rowNote={(d, i) => {
            const row = r?.rows.find((x) => x.index === i);
            if (!row) return null;
            if (row.stuck) {
              return (
                <p className="text-xs text-red-700 leading-relaxed mt-1 xl:pl-10">
                  This minimum doesn&apos;t cover the month&apos;s interest, so the balance grows and it
                  never clears on its own.
                </p>
              );
            }
            if (!d.payoff || !row.notCheaper) return null;
            return (
              <p className="text-xs text-amber-700 leading-relaxed mt-1 xl:pl-10">
                <strong>
                  {row.rate}% is {row.rate === rate ? "the same as" : "below"} the {rate}% HELOC rate.
                </strong>{" "}
                Rolling this one in costs about {fmt(row.rateOnlyPenalty)} more in interest over the same{" "}
                {fmtMonths(row.keepMonths)} it would take on its own. Untick it unless you want the
                simplicity.
              </p>
            );
          }}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="The home" badge="EQUITY" className="h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Home value" value={homeValue} onChange={setHomeValue} min={0} placeholder="520000" prefix="$" />
              <NumField label="Mortgage owed" value={mortgage} onChange={setMortgage} min={0} placeholder="310000" prefix="$" />
            </div>
            {r && r.value > 0 && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                {line("Equity today", fmt(r.equity))}
                {line("Combined loan-to-value", `${r.cltvBefore.toFixed(1)}% → ${r.cltvAfter.toFixed(1)}%`)}
                <p className="text-xs text-gray-400 leading-relaxed">
                  Mortgage plus the {fmt(r.draw)} draw, over the home&apos;s value. Lenders commonly cap
                  combined loan-to-value, and where that cap sits depends on the lender and on you — this
                  page doesn&apos;t guess at it.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title="The HELOC" badge="OFFER" badgeTone="blue" className="h-full">
          <div className="space-y-4">
            {/* Three across only from sm: at 390px the card is 335px wide, and
                a year field with a "yrs" suffix needs more than the 88px that
                leaves — "20" was clipping. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <NumField label="Rate" value={helocRate} onChange={setHelocRate} min={0} placeholder="8.75" suffix="%" step={0.125} />
              </div>
              <NumField label="Draw period" value={drawYears} onChange={setDrawYears} min={0} placeholder="10" suffix="yrs" />
              <NumField label="Repayment" value={repayYears} onChange={setRepayYears} min={0} placeholder="20" suffix="yrs" />
            </div>
            <NumField
              label="Try a different draw payment"
              value={drawAmount}
              onChange={setDrawAmount}
              min={0}
              placeholder={r ? String(Math.round((r.interestOnlyPayment + r.payNowAmount) / 2)) : "500"}
              prefix="$"
              hint={
                r && r.customUnderInterest
                  ? `Below the ${fmt(r.interestOnlyPayment)}/mo interest, so in practice it would be the interest-only minimum — a HELOC won't let the balance grow.`
                  : "Optional. The panels below already cover the three that matter; anything else you enter appears beside them."
              }
            />
          </div>
        </Card>
      </div>

      {r ? (
        <>
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <Headline
              label="Should you use a HELOC here?"
              value={
                r.neverClears
                  ? "Not enough to go on"
                  : r.cheaperRate
                    ? "Yes, at these rates — if you pay it down"
                    : "No, not at these rates"
              }
              tone={r.neverClears ? "gray" : r.cheaperRate ? "green" : "red"}
            />
            <Takeaway tone={r.neverClears ? "amber" : r.cheaperRate ? "green" : "red"}>
              {r.neverClears ? (
                <>
                  {listNames(r.stuck)}{" "}
                  {r.stuck.length === 1 ? "has a minimum" : "have minimums"} too small to cover the
                  interest, so {r.stuck.length === 1 ? "it never clears" : "they never clear"} and there is
                  no honest figure to compare a HELOC against.{" "}
                  {r.keptStuck.length > 0 && (
                    <>
                      <strong>
                        {listNames(r.keptStuck)} {r.keptStuck.length === 1 ? "is" : "are"}{" "}
                        still outside the HELOC
                      </strong>{" "}
                      — tick {r.keptStuck.length === 1 ? "it" : "them"} or nothing here changes that.
                    </>
                  )}
                </>
              ) : r.cheaperRate && r.cashFlowScenario ? (
                <>
                  On these numbers, yes — {rate}% sits below the{" "}
                  <strong>{r.chosenBlended.toFixed(1)}%</strong> these balances average now. Pay{" "}
                  <strong>{fmt(r.cashFlowScenario.drawPayment)}/mo</strong> and you are debt-free on the
                  same timeline you are already on, {fmtMonths(r.cashFlowScenario.months)} from now, while
                  keeping <strong>{fmt(Math.abs(r.freedToday))}</strong> a month today and paying{" "}
                  <strong>{fmtK(r.cashFlowScenario.saved)}</strong> less interest.
                  {r.payNowDistinct && (
                    <>
                      {" "}
                      Keep paying the {fmt(r.payNowScenario.drawPayment)}/mo you pay now and it is gone in{" "}
                      <strong>{fmtMonths(r.payNowScenario.months)}</strong> instead.
                    </>
                  )}
                </>
              ) : r.cheaperRate ? (
                <>
                  On these numbers the rate is in your favour — {rate}% against the{" "}
                  <strong>{r.chosenBlended.toFixed(1)}%</strong> these balances average — but the payments
                  entered never clear them, so there is no timeline to match. Keep paying{" "}
                  {fmt(r.payNowScenario.drawPayment)}/mo and the line is gone in{" "}
                  <strong>{fmtMonths(r.payNowScenario.months)}</strong>.
                </>
              ) : r.payNowScenario.saved > 0 ? (
                <>
                  On these numbers, no — {rate}% is at or above the{" "}
                  <strong>{r.chosenBlended.toFixed(1)}%</strong> these balances already average, so the
                  rate is not what would be helping you. The{" "}
                  <strong>{fmtK(r.payNowScenario.saved)}</strong> the{" "}
                  {r.payNowDistinct ? "second" : "faster"} panel shows comes entirely from paying{" "}
                  {fmt(r.payNowScenario.drawPayment)}/mo rather than the minimums — and you can send that
                  straight at these debts instead.
                </>
              ) : (
                <>
                  On these numbers, no — {rate}% is at or above the{" "}
                  <strong>{r.chosenBlended.toFixed(1)}%</strong> these balances already average, and it
                  costs more however you pay it.{" "}
                  {r.payNowDistinct ? (
                    <>
                      The interest-only minimum costs{" "}
                      <strong>{fmtK(Math.abs(r.minimumScenario.saved))}</strong> more, and even at{" "}
                      {fmt(r.payNowScenario.drawPayment)}/mo it is{" "}
                      <strong>{fmtK(Math.abs(r.payNowScenario.saved))}</strong> more.
                    </>
                  ) : (
                    <>
                      The interest-only minimum alone is {fmt(r.interestOnlyPayment)}/mo — more than the{" "}
                      {fmt(r.payNowAmount)}/mo these debts cost you today — and it runs{" "}
                      <strong>{fmtK(Math.abs(r.minimumScenario.saved))}</strong> over.
                    </>
                  )}
                </>
              )}
              {r.costlyMoves.length > 0 && (
                <>
                  {" "}
                  <strong>
                    {listNames(r.costlyMoves)}{" "}
                    {r.costlyMoves.length === 1 ? "is" : "are"} already at or below {rate}%
                  </strong>{" "}
                  — untick {r.costlyMoves.length === 1 ? "it" : "them"} and the rest of this still works.
                </>
              )}
            </Takeaway>
            <p className="text-xs text-gray-400 leading-relaxed mt-3">
              Every panel is measured against the same baseline: each debt left where it is, paid at its
              own minimum until it clears, nothing rolled over —{" "}
              {r.neverClears ? "which these minimums never do" : `${fmtK(r.interestNow)} of interest`}.
            </p>
          </div>

          <div className={panelGrid}>
            {panels.map((s) => {
              const good = s.saved > 0;
              const tag =
                s.kind === "cashflow" ? "same debt-free date"
                  : s.kind === "faster" ? "what you pay today"
                    : s.kind === "minimum" ? "the bare minimum"
                      : "your figure";
              return (
                <div
                  key={s.label}
                  className={`border rounded-2xl p-5 ${good ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-4">
                    <h3 className="text-sm font-medium text-gray-900">{s.label}</h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">{tag}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2 mb-3">
                    {line("During the draw", `${fmt(s.drawPayment)}/mo`)}
                    {s.kind === "cashflow" && r.cashFlowScenario && (
                      <>
                        {line(
                          r.freedToday >= 0 ? "Freed up today" : "More per month today",
                          `${fmt(Math.abs(r.freedToday))}/mo`,
                          r.freedToday >= 0 ? "text-green-700" : "text-red-700",
                        )}
                        {line(
                          r.freedAverage >= 0 ? "Freed up on average" : "More per month on average",
                          `${fmt(Math.abs(r.freedAverage))}/mo`,
                          r.freedAverage >= 0 ? "text-green-700" : "text-red-700",
                        )}
                      </>
                    )}
                    {s.amortising
                      ? line("Once repayment starts", `${fmt(s.repayPayment)}/mo`, "text-amber-700")
                      : line("Once repayment starts", "Already paid off", "text-green-700")}
                    {s.amortising && line("The jump", `+${fmt(s.jump)} (${s.jumpPct.toFixed(0)}%)`, "text-amber-700")}
                    {s.amortising &&
                      line(`If the rate rose ${RATE_SHOCK} points`, `${fmt(s.repayPaymentShocked)}/mo`, "text-amber-700")}
                    {line("Time to clear", fmtMonths(s.months))}
                    {line("Total interest", fmtK(s.helocInterest))}
                  </div>
                  {s.kind === "cashflow" && (
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      The {fmt(r.payNowAmount)}/mo you pay now shrinks as each debt clears, so the{" "}
                      {fmt(Math.abs(r.freedToday))} is today&apos;s gap, not a figure that holds for{" "}
                      {fmtMonths(s.months)}. The average over that time is{" "}
                      {fmt(Math.abs(r.freedAverage))}/mo; the interest line above is what actually settles
                      it.
                    </p>
                  )}
                  {s.balanceUnmoved && (
                    <p className="text-xs text-red-800 leading-relaxed mb-3">
                      After {fmtMonths(drawMonths)} you would still owe{" "}
                      <strong>{fmt(s.balanceAtRepay)}</strong>. You would have paid {fmt(s.drawPaid)} and
                      reduced the debt by nothing.
                    </p>
                  )}
                  <p className={`text-sm font-medium ${good ? "text-green-800" : "text-red-800"}`}>
                    {good ? "Saves" : "Costs"} {fmtK(Math.abs(s.saved))}{" "}
                    {good ? "against keeping the debts" : "more than keeping the debts"}
                  </p>
                  {r.keptMin > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {fmt(s.monthlyAfter)}/mo all in, counting the debts you left out.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <ChartCard title="Total cost of clearing the debt" footnote="The balances plus every dollar of interest.">
            <BarChart
              ariaLabel="Total cost of keeping the debts compared with each way of paying the HELOC"
              height={220}
              bars={[
                {
                  label: "Keep as is",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: Number.isFinite(r.interestNow) ? r.interestNow : 0, color: COLORS.red },
                  ],
                },
                ...panels.map((s) => ({
                  label:
                    s.kind === "cashflow" ? "Cash flow"
                      : s.kind === "faster" ? "Pay faster"
                        : s.kind === "minimum" ? "Minimum"
                          : "Your figure",
                  segments: [
                    { label: "Balances", value: r.totalBalance, color: COLORS.gray },
                    { label: "Interest", value: s.helocInterest, color: COLORS.amber },
                  ],
                })),
              ]}
            />
          </ChartCard>

          {/* Was a red panel led by a secured-debt warning. The warning is gone;
              what is left is a rate note, a tax note and a behavioural one, so
              the styling is neutral to match. */}
          <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Before you sign</h2>
            <div className="space-y-2">
              <Takeaway tone="amber">
                Most HELOC rates are variable. Every panel assumes {rate}% throughout and shows what{" "}
                {RATE_SHOCK} points would do to the repayment-period payment. Nothing stops it moving
                further than that.
              </Takeaway>
              <Takeaway tone="blue">
                Interest on a HELOC is only deductible when the money buys, builds or substantially
                improves the home securing it — paying off cards or a car does not qualify, and that rule
                is now permanent. Assume no tax break here.
              </Takeaway>
              <Takeaway tone="blue">
                This goes wrong the same way every time: the cards get cleared, then used again, and you
                end up owing both the HELOC and the cards.
              </Takeaway>
            </div>
          </div>
        </>
      ) : (
        <div className="border border-gray-200 rounded-2xl mb-4 bg-gray-50">
          <EmptyState>
            Add at least one debt with a balance and minimum payment, then the HELOC&apos;s rate, draw
            period and repayment period.
          </EmptyState>
        </div>
      )}
    </CalcShell>
  );
}
